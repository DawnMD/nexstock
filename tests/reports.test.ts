/**
 * The report queries.
 *
 * These are almost all `$queryRaw`, which means TypeScript checks nothing about
 * them — a bad cast or a missing column is a runtime error against a real
 * Postgres and nothing earlier. So every procedure is executed here, both
 * against an empty database and against one with a full inbound-to-outbound
 * history behind it.
 *
 * This suite exists because one of them shipped broken: `round(double
 * precision, int)` does not exist in Postgres — only the `numeric` overload —
 * and the location utilisation query hit it on every call.
 */
import { describe, expect, it } from "vitest";

import { createCaller } from "@/server/api/root";
import type { createTRPCContext } from "@/server/api/trpc";
import { AdjustmentType } from "@/generated/prisma/client";
import { applyAdjustmentBatch } from "@/server/services/adjustments";
import { allocateSalesOrder } from "@/server/services/allocation";
import { recordDockActivity, createDockBooking } from "@/server/services/dock";
import {
  confirmPick,
  confirmShipment,
  DISPATCH_LOCATION,
  packCarton,
} from "@/server/services/picking";
import { recordQualityCheck } from "@/server/services/quality";

import { db } from "./helpers/db";
import {
  createDockAndVehicleType,
  createLocation,
  createSalesOrderWithLine,
  createSku,
  stockInStorage,
  TEST_USER_ID,
} from "./helpers/fixtures";

/**
 * A caller wired to the test database. `privateProcedure` only needs a
 * `userId`, so the session is the minimum shape that satisfies it rather than a
 * real Better Auth session.
 */
type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const api = createCaller(
  (): Context => ({
    // The app's client is constructed with explicit log levels, so its type
    // carries them in a generic the test client has no reason to match. Nothing
    // here touches `$on`, which is the only thing that generic affects.
    db: db as unknown as Context["db"],
    session: null,
    userId: TEST_USER_ID,
    headers: new Headers(),
  }),
);

/** Runs the full inbound → outbound story so every report has data. */
async function busyWarehouse() {
  await createSku("SKU-1", { weight: 2, cbm: 0.5 });
  await createLocation("STAGE");
  await createLocation(DISPATCH_LOCATION);
  await createLocation("A-01", { cbm: 100, weightCapacity: 5000 });

  const orderItem = await stockInStorage({
    sku: "SKU-1",
    lpn: "LPN-A",
    quantity: 40,
    location: "A-01",
    orderNumber: "PO-REPORTS",
  });

  // A rejection and an adjustment, so the quality report has a non-zero rate.
  await db.$transaction((tx) =>
    recordQualityCheck(tx, {
      orderItemId: orderItem.id,
      inspectedQuantity: 40,
      rejectedQuantity: 4,
      inspectedBy: TEST_USER_ID,
    }),
  );
  await db.$transaction((tx) =>
    applyAdjustmentBatch(tx, {
      adjustedBy: TEST_USER_ID,
      adjustments: [
        {
          orderItemId: orderItem.id,
          quantity: 2,
          orderNumber: "PO-REPORTS",
          adjustmentType: AdjustmentType.SUBTRACTION,
        },
      ],
    }),
  );

  // A vehicle through the whole dock lifecycle, so turnaround has a row.
  const { dock, vehicleType } = await createDockAndVehicleType();
  await db.$transaction((tx) =>
    createDockBooking(tx, {
      orderNumber: "PO-REPORTS",
      dockId: dock.id,
      vehicleTypeId: vehicleType.id,
      vehicleNumber: "TRK-REP",
      weight: 1000,
      queue: 1,
      cbm: 20,
      driverName: "Reporter",
    }),
  );
  for (const activityType of [
    "CHECK_IN",
    "OPEN",
    "CLOSE",
    "CHECK_OUT",
  ] as const) {
    await db.$transaction((tx) =>
      recordDockActivity(tx, {
        orderNumber: "PO-REPORTS",
        vehicleNumber: "TRK-REP",
        activityType,
        createdBy: TEST_USER_ID,
      }),
    );
  }

  // And a sales order all the way out of the door.
  await createSalesOrderWithLine({
    orderNumber: "SO-REPORTS",
    sku: "SKU-1",
    orderedQuantity: 10,
  });
  await db.$transaction((tx) =>
    allocateSalesOrder(tx, { orderNumber: "SO-REPORTS" }),
  );
  const task = await db.pickTask.findFirstOrThrow({
    where: { orderId: "SO-REPORTS" },
  });
  await db.$transaction((tx) =>
    confirmPick(tx, {
      pickTaskId: task.id,
      pickedQuantity: task.quantity,
      pickedBy: TEST_USER_ID,
    }),
  );
  const carton = await db.$transaction((tx) =>
    packCarton(tx, {
      cartonNumber: "CTN-REP",
      pickTaskIds: [task.id],
      packedBy: TEST_USER_ID,
    }),
  );
  await db.$transaction((tx) =>
    confirmShipment(tx, {
      shipmentNumber: "SHP-REP",
      orderNumber: "SO-REPORTS",
      carrier: "Reporter Freight",
      cartonIds: [carton.id],
      shippedBy: TEST_USER_ID,
    }),
  );
}

describe("every report runs against an empty database", () => {
  // The queries have to survive zero rows: SUM over nothing is NULL, and a
  // COALESCE missed there is a null where the screen expects a number.
  it("returns empty results rather than throwing", async () => {
    await expect(api.reports.getReceivingThroughput({})).resolves.toEqual([]);
    await expect(api.reports.getShippingThroughput({})).resolves.toEqual([]);
    await expect(api.reports.getQualityBySku({})).resolves.toEqual([]);
    await expect(api.reports.getDockTurnaround({})).resolves.toEqual([]);
    await expect(api.reports.getStockAging()).resolves.toEqual([]);
    await expect(api.reports.getLocationUtilisation()).resolves.toEqual([]);

    const summary = await api.reports.getSummary({});
    expect(summary.unitsReceived).toBe(0);
    expect(summary.unitsOnHand).toBe(0);
    expect(summary.unitsRejected).toBe(0);
  });
});

describe("every report runs against a warehouse with history", () => {
  it("reports receiving and shipping throughput", async () => {
    await busyWarehouse();

    const receiving = await api.reports.getReceivingThroughput({});
    expect(receiving.length).toBeGreaterThan(0);
    expect(receiving[0]?.units).toBe(40);

    const shipping = await api.reports.getShippingThroughput({});
    expect(shipping.length).toBe(1);
    // The SHIP movements are negative; the report reports the magnitude.
    expect(shipping[0]?.units).toBe(10);
    expect(shipping[0]?.shipments).toBe(1);
  });

  it("reports a reject rate per SKU", async () => {
    await busyWarehouse();

    const quality = await api.reports.getQualityBySku({});
    const row = quality.find((entry) => entry.sku === "SKU-1");
    expect(row).toBeDefined();
    // 4 rejected of 38 received (40 less the shortage adjustment).
    expect(row?.rejected).toBe(4);
    expect(row?.rejectRate).toBeGreaterThan(0);
  });

  it("reports dock turnaround only for completed lifecycles", async () => {
    await busyWarehouse();

    const turnaround = await api.reports.getDockTurnaround({});
    expect(turnaround).toHaveLength(1);
    expect(turnaround[0]?.vehicleNumber).toBe("TRK-REP");
    expect(turnaround[0]?.dockName).toBe("DOCK-1");
    expect(turnaround[0]?.minutesOnDock).toBeGreaterThanOrEqual(0);
  });

  it("buckets stock by age from its receipt", async () => {
    await busyWarehouse();

    const aging = await api.reports.getStockAging();
    expect(aging.length).toBeGreaterThan(0);
    // Everything was received just now.
    expect(aging[0]?.bucket).toBe("0-6 days");
    expect(aging[0]?.units).toBeGreaterThan(0);
  });

  /**
   * The regression this suite was written for. `Sku.cbm` is a Float, so the SUM
   * is double precision, and `round(double precision, int)` does not exist —
   * this threw `42883` on every call until both operands were cast to numeric.
   */
  it("reports location utilisation, with unrated racks distinguished from empty ones", async () => {
    await busyWarehouse();

    const utilisation = await api.reports.getLocationUtilisation();

    const rated = utilisation.find((row) => row.location === "A-01");
    expect(rated).toBeDefined();
    expect(rated?.ratedCbm).toBe(100);
    expect(rated?.utilisation).toBeGreaterThan(0);

    // STAGE is created by the fixture without a cbm rating, so it reports
    // nothing rather than 0% — "unrated" and "empty" are different answers.
    const unrated = utilisation.find((row) => row.location === "STAGE");
    expect(unrated?.utilisation).toBeNull();
  });

  it("rolls the headline numbers up", async () => {
    await busyWarehouse();

    const summary = await api.reports.getSummary({});
    expect(summary.unitsReceived).toBe(40);
    expect(summary.receipts).toBe(1);
    expect(summary.shipments).toBe(1);
    expect(summary.unitsRejected).toBe(4);
    // 40 received, less 4 rejected, less 2 adjusted away, less 10 shipped.
    expect(summary.unitsOnHand).toBe(24);
  });
});
