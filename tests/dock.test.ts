/**
 * Dock bookings and the vehicle lifecycle.
 *
 * None of these rules existed on the server until the dock service was written —
 * the router wrote whatever it was handed, and the ordering below was enforced
 * only by which buttons the dock list happened to render.
 */
import { describe, expect, it } from "vitest";

import { ActivityType } from "@/generated/prisma/client";
import {
  createDockBooking,
  deleteDockBooking,
  recordDockActivity,
  updateDockBooking,
} from "@/server/services/dock";

import { db } from "./helpers/db";
import {
  createDockAndVehicleType,
  createOrderWithLine,
  createSku,
  TEST_USER_ID,
} from "./helpers/fixtures";

async function setup() {
  await createSku("SKU-1");
  await createOrderWithLine({
    orderNumber: "ORD-DOCK",
    sku: "SKU-1",
    orderedQuantity: 10,
  });
  const { dock, vehicleType } = await createDockAndVehicleType();
  return { dock, vehicleType };
}

const booking = (
  dockId: number,
  vehicleTypeId: number,
  overrides: Record<string, unknown> = {},
) =>
  ({
    orderNumber: "ORD-DOCK",
    dockId,
    vehicleTypeId,
    vehicleNumber: "TRK-1",
    weight: 1000,
    queue: 1,
    cbm: 20,
    driverName: "Alex Driver",
    ...overrides,
  }) as Parameters<typeof createDockBooking>[1];

const activity = (activityType: ActivityType, vehicleNumber = "TRK-1") =>
  db.$transaction((tx) =>
    recordDockActivity(tx, {
      orderNumber: "ORD-DOCK",
      vehicleNumber,
      activityType,
      createdBy: TEST_USER_ID,
    }),
  );

describe("createDockBooking", () => {
  it("creates a booking against a real order, dock and vehicle type", async () => {
    const { dock, vehicleType } = await setup();

    const created = await db.$transaction((tx) =>
      createDockBooking(tx, booking(dock.id, vehicleType.id)),
    );

    expect(created.orderId).toBe("ORD-DOCK");
    expect(created.dock.name).toBe("DOCK-1");
  });

  it("names the missing record instead of failing on a foreign key", async () => {
    const { dock, vehicleType } = await setup();

    await expect(
      db.$transaction((tx) =>
        createDockBooking(tx, booking(9999, vehicleType.id)),
      ),
    ).rejects.toThrow(/Dock 9999 not found/);

    await expect(
      db.$transaction((tx) => createDockBooking(tx, booking(dock.id, 9999))),
    ).rejects.toThrow(/Vehicle type 9999 not found/);

    await expect(
      db.$transaction((tx) =>
        createDockBooking(
          tx,
          booking(dock.id, vehicleType.id, { orderNumber: "ORD-NOPE" }),
        ),
      ),
    ).rejects.toThrow(/Order ORD-NOPE not found/);
  });

  it("refuses an inactive dock", async () => {
    const { dock, vehicleType } = await setup();
    await db.dock.update({ where: { id: dock.id }, data: { status: false } });

    await expect(
      db.$transaction((tx) =>
        createDockBooking(tx, booking(dock.id, vehicleType.id)),
      ),
    ).rejects.toThrow(/is not active/);
  });

  it("refuses negative weight or cbm and a queue below 1", async () => {
    const { dock, vehicleType } = await setup();

    await expect(
      db.$transaction((tx) =>
        createDockBooking(tx, booking(dock.id, vehicleType.id, { weight: -1 })),
      ),
    ).rejects.toThrow(/Weight cannot be negative/);

    await expect(
      db.$transaction((tx) =>
        createDockBooking(tx, booking(dock.id, vehicleType.id, { cbm: -1 })),
      ),
    ).rejects.toThrow(/CBM cannot be negative/);

    await expect(
      db.$transaction((tx) =>
        createDockBooking(tx, booking(dock.id, vehicleType.id, { queue: 0 })),
      ),
    ).rejects.toThrow(/Queue position starts at 1/);
  });

  it("refuses a duplicate vehicle or queue position on one order", async () => {
    const { dock, vehicleType } = await setup();

    await db.$transaction((tx) =>
      createDockBooking(tx, booking(dock.id, vehicleType.id)),
    );

    await expect(
      db.$transaction((tx) =>
        createDockBooking(tx, booking(dock.id, vehicleType.id, { queue: 2 })),
      ),
    ).rejects.toThrow(/already booked on order/);

    await expect(
      db.$transaction((tx) =>
        createDockBooking(
          tx,
          booking(dock.id, vehicleType.id, { vehicleNumber: "TRK-2" }),
        ),
      ),
    ).rejects.toThrow(/Queue position 1 .* is already taken/);
  });

  it("refuses two vehicles on one dock at the same time", async () => {
    const { dock, vehicleType } = await setup();
    const eta = new Date("2026-09-01T09:00:00.000Z");

    await db.$transaction((tx) =>
      createDockBooking(tx, booking(dock.id, vehicleType.id, { eta })),
    );

    await expect(
      db.$transaction((tx) =>
        createDockBooking(
          tx,
          booking(dock.id, vehicleType.id, {
            eta,
            vehicleNumber: "TRK-2",
            queue: 2,
          }),
        ),
      ),
    ).rejects.toThrow(/already booked at that time/);
  });
});

describe("updateDockBooking", () => {
  it("does not collide with itself", async () => {
    const { dock, vehicleType } = await setup();
    const created = await db.$transaction((tx) =>
      createDockBooking(tx, booking(dock.id, vehicleType.id)),
    );

    const updated = await db.$transaction((tx) =>
      updateDockBooking(tx, {
        ...booking(dock.id, vehicleType.id, { driverName: "Sam Driver" }),
        id: created.id,
      }),
    );

    expect(updated.driverName).toBe("Sam Driver");
  });

  it("refuses to move a booking onto a different order", async () => {
    const { dock, vehicleType } = await setup();
    await createOrderWithLine({
      orderNumber: "ORD-OTHER",
      sku: "SKU-1",
      orderedQuantity: 5,
    });
    const created = await db.$transaction((tx) =>
      createDockBooking(tx, booking(dock.id, vehicleType.id)),
    );

    await expect(
      db.$transaction((tx) =>
        updateDockBooking(tx, {
          ...booking(dock.id, vehicleType.id, { orderNumber: "ORD-OTHER" }),
          id: created.id,
        }),
      ),
    ).rejects.toThrow(/belongs to order ORD-DOCK/);
  });
});

describe("recordDockActivity", () => {
  it("accepts the lifecycle in order", async () => {
    const { dock, vehicleType } = await setup();
    await db.$transaction((tx) =>
      createDockBooking(tx, booking(dock.id, vehicleType.id)),
    );

    await activity(ActivityType.CHECK_IN);
    await activity(ActivityType.OPEN);
    await activity(ActivityType.CLOSE);
    await activity(ActivityType.CHECK_OUT);

    expect(await db.dockActivity.count()).toBe(4);
  });

  it("refuses a step whose predecessor has not happened", async () => {
    const { dock, vehicleType } = await setup();
    await db.$transaction((tx) =>
      createDockBooking(tx, booking(dock.id, vehicleType.id)),
    );

    // A vehicle that never arrived cannot check out.
    await expect(activity(ActivityType.CHECK_OUT)).rejects.toThrow(
      /has to close before it can check out/,
    );
    await expect(activity(ActivityType.OPEN)).rejects.toThrow(
      /has to check in before it can open/,
    );

    await activity(ActivityType.CHECK_IN);
    await expect(activity(ActivityType.CLOSE)).rejects.toThrow(
      /has to open before it can close/,
    );

    expect(await db.dockActivity.count()).toBe(1);
  });

  it("refuses to record the same step twice", async () => {
    const { dock, vehicleType } = await setup();
    await db.$transaction((tx) =>
      createDockBooking(tx, booking(dock.id, vehicleType.id)),
    );

    await activity(ActivityType.CHECK_IN);
    await expect(activity(ActivityType.CHECK_IN)).rejects.toThrow(
      /already been recorded/,
    );
  });

  it("records at most one activity when a submit is double-fired", async () => {
    const { dock, vehicleType } = await setup();
    await db.$transaction((tx) =>
      createDockBooking(tx, booking(dock.id, vehicleType.id)),
    );

    const results = await Promise.allSettled([
      activity(ActivityType.CHECK_IN),
      activity(ActivityType.CHECK_IN),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.dockActivity.count()).toBe(1);
  });

  it("reports a vehicle that has no booking on the order", async () => {
    await setup();

    await expect(activity(ActivityType.CHECK_IN, "TRK-NOPE")).rejects.toThrow(
      /No dock booking for vehicle TRK-NOPE/,
    );
  });
});

describe("deleteDockBooking", () => {
  it("removes a booking nothing has been recorded against", async () => {
    const { dock, vehicleType } = await setup();
    const created = await db.$transaction((tx) =>
      createDockBooking(tx, booking(dock.id, vehicleType.id)),
    );

    await db.$transaction((tx) => deleteDockBooking(tx, created.id));
    expect(await db.dockBooking.count()).toBe(0);
  });

  it("refuses to delete a vehicle that has been worked", async () => {
    const { dock, vehicleType } = await setup();
    const created = await db.$transaction((tx) =>
      createDockBooking(tx, booking(dock.id, vehicleType.id)),
    );
    await activity(ActivityType.CHECK_IN);

    // DockActivity cascades, so this would have silently erased the audit trail.
    await expect(
      db.$transaction((tx) => deleteDockBooking(tx, created.id)),
    ).rejects.toThrow(/has already been worked/);

    expect(await db.dockActivity.count()).toBe(1);
  });
});
