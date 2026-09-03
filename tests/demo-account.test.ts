/**
 * The read-only demo account.
 *
 * The public demo signs in as a real, verified user so every screen behaves
 * exactly as it does for an operator. What stops it changing anything is
 * `writeProcedure`, on the server — not a disabled button — so this suite
 * checks both halves: reads still work, and every kind of write is refused.
 */
import { beforeEach, describe, expect, it } from "vitest";

import { createRouterClient } from "@orpc/server";

import type { Context } from "@/server/api/context";
import { router } from "@/server/api/root";
import { AdjustmentType } from "@/generated/prisma/client";

import { db } from "./helpers/db";
import {
  createDockAndVehicleType,
  createLocation,
  createSku,
  createOrderWithLine,
  TEST_USER_ID,
} from "./helpers/fixtures";

const DEMO_USER_ID = "test-demo-actor";
const SHARED_DEMO_USER_ID = "test-shared-demo-actor";

const callerFor = (userId: string) =>
  createRouterClient(router, {
    context: (): Context => ({
      db: db as unknown as Context["db"],
      session: null,
      userId,
      headers: new Headers(),
    }),
  });

const demo = callerFor(DEMO_USER_ID);
const sharedDemo = callerFor(SHARED_DEMO_USER_ID);
const operator = callerFor(TEST_USER_ID);

beforeEach(async () => {
  await db.user.upsert({
    where: { id: DEMO_USER_ID },
    create: {
      id: DEMO_USER_ID,
      name: "Demo Visitor",
      email: "demo-visitor@nexstock.test",
      emailVerified: true,
      isDemo: true,
    },
    update: { isDemo: true },
  });
  await db.user.upsert({
    where: { id: SHARED_DEMO_USER_ID },
    create: {
      id: SHARED_DEMO_USER_ID,
      name: "Shared Demo Visitor",
      email: "shared-demo@nexstock.test",
      emailVerified: true,
      isDemo: true,
    },
    update: { isDemo: true },
  });
});

describe("a demo account", () => {
  it("can read every screen's data", async () => {
    await createSku("SKU-1");
    await createLocation("A-01");
    await createOrderWithLine({
      orderNumber: "ORD-DEMO",
      sku: "SKU-1",
      orderedQuantity: 5,
    });

    // Reads are not special-cased anywhere: the demo sees exactly what an
    // operator sees.
    await expect(demo.sku.getSkus({})).resolves.toHaveLength(1);
    await expect(demo.location.getLocations({})).resolves.toHaveLength(1);
    await expect(demo.inventory.getSummary()).resolves.toBeDefined();
    await expect(demo.reports.getSummary({})).resolves.toBeDefined();
    await expect(
      demo.order.getOrderDetailsByOrderNumber({ orderNumber: "ORD-DEMO" }),
    ).resolves.toBeDefined();
  });

  it("is refused every kind of write", async () => {
    await createSku("SKU-1");
    await createLocation("A-01");
    const { orderItem } = await createOrderWithLine({
      orderNumber: "ORD-DEMO",
      sku: "SKU-1",
      orderedQuantity: 5,
    });
    const { dock, vehicleType } = await createDockAndVehicleType();

    const forbidden = /read-only demo account/;

    // Master data.
    await expect(
      demo.sku.createSku({
        sku: "SKU-NEW",
        description: "Nope",
        department: "TEST",
        qualityCheck: false,
        hasShelfLife: false,
        isActive: true,
      }),
    ).rejects.toThrow(forbidden);
    await expect(demo.sku.deleteSku({ sku: "SKU-1" })).rejects.toThrow(
      forbidden,
    );
    await expect(
      demo.location.deleteLocation({ location: "A-01" }),
    ).rejects.toThrow(forbidden);

    // Inbound.
    await expect(
      demo.order.createDockBooking({
        orderNumber: "ORD-DEMO",
        dockId: dock.id,
        vehicleTypeId: vehicleType.id,
        vehicleNumber: "TRK-DEMO",
        weight: 100,
        queue: 1,
        cbm: 10,
        driverName: "Nobody",
      }),
    ).rejects.toThrow(forbidden);
    await expect(
      demo.receive.updateReceiveStatus({
        id: orderItem.id,
        receivedQuantity: 1,
        sku: "SKU-1",
        location: "A-01",
        lpn: "LPN-DEMO",
        uom: "EACH",
        vehicleNumber: "TRK-DEMO",
      }),
    ).rejects.toThrow(forbidden);
    await expect(
      demo.qualityCheck.updateQualityCheckStatus({
        id: orderItem.id,
        rejectedQuantity: 0,
        inspectedQuantity: 1,
      }),
    ).rejects.toThrow(forbidden);
    await expect(
      demo.adjustments.createAdjustmentBatch({
        adjustments: [
          {
            orderItemId: orderItem.id,
            quantity: 1,
            orderNumber: "ORD-DEMO",
            adjustmentType: AdjustmentType.ADDITION,
          },
        ],
      }),
    ).rejects.toThrow(forbidden);

    // Outbound.
    await expect(
      demo.outbound.allocate({ orderNumber: "SO-DEMO" }),
    ).rejects.toThrow(forbidden);
    await expect(
      demo.outbound.confirmPick({ pickTaskId: 1, pickedQuantity: 1 }),
    ).rejects.toThrow(forbidden);

    // Nothing got through.
    expect(await db.receiveItem.count()).toBe(0);
    expect(await db.dockBooking.count()).toBe(0);
    expect(await db.adjustment.count()).toBe(0);
    expect(await db.sku.count()).toBe(1);
  });

  /**
   * The guard reads `isDemo` from the database rather than the session, so
   * clearing the flag takes effect on the next call rather than whenever the
   * five-minute session cache happens to expire.
   */
  it("regains write access the moment the flag is cleared", async () => {
    await createSku("SKU-1");

    await expect(demo.sku.deleteSku({ sku: "SKU-1" })).rejects.toThrow(
      /read-only demo account/,
    );

    await db.user.update({
      where: { id: DEMO_USER_ID },
      data: { isDemo: false },
    });

    await expect(demo.sku.deleteSku({ sku: "SKU-1" })).resolves.toEqual({
      deleted: true,
      deactivated: false,
    });
  });
});

describe("an ordinary account", () => {
  it("is not affected by the guard", async () => {
    await createSku("SKU-1");

    await expect(operator.sku.deleteSku({ sku: "SKU-1" })).resolves.toEqual({
      deleted: true,
      deactivated: false,
    });
  });
});

describe("the configured shared demo account", () => {
  it("can write when shared-writable mode is enabled", async () => {
    await createSku("SKU-1");

    await expect(sharedDemo.sku.deleteSku({ sku: "SKU-1" })).resolves.toEqual({
      deleted: true,
      deactivated: false,
    });
  });
});
