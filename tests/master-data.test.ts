/**
 * SKU and location master data.
 *
 * Both are referenced under `Restrict` by receipts, putaways and the ledger, so
 * the interesting behaviour is what happens to a record that has history: it is
 * deactivated rather than deleted, and never while it still holds stock.
 */
import { describe, expect, it } from "vitest";

import {
  createLocation as createLocationService,
  deleteLocation,
  updateLocation,
} from "@/server/services/locations";
import {
  createSku as createSkuService,
  deleteSku,
} from "@/server/services/skus";
import { receiveStock } from "@/server/services/receiving";

import { db } from "./helpers/db";
import {
  createLocation,
  createOrderWithLine,
  createSku,
  TEST_USER_ID,
} from "./helpers/fixtures";

describe("locations", () => {
  it("refuses to create one twice", async () => {
    await createLocation("A-01");

    await expect(
      db.$transaction((tx) =>
        createLocationService(tx, {
          location: "A-01",
          zone: "A",
          aisle: "01",
          length: 1,
          width: 1,
          height: 1,
          createdBy: TEST_USER_ID,
        }),
      ),
    ).rejects.toThrow(/already exists/);
  });

  it("reports an update to one that does not exist", async () => {
    await expect(
      db.$transaction((tx) =>
        updateLocation(tx, {
          location: "NOPE",
          zone: "A",
          aisle: "01",
          length: 1,
          width: 1,
          height: 1,
          updatedBy: TEST_USER_ID,
        }),
      ),
    ).rejects.toThrow(/not found/);
  });

  it("deletes one that was never used", async () => {
    await createLocation("A-01");

    const result = await db.$transaction((tx) => deleteLocation(tx, "A-01"));

    expect(result).toEqual({ deleted: true, deactivated: false });
    expect(await db.location.count()).toBe(0);
  });

  it("deactivates one with history instead of taking the history with it", async () => {
    await createSku("SKU-1");
    await createLocation("STAGE");
    await createLocation("A-01");
    const { orderItem } = await createOrderWithLine({
      orderNumber: "ORD-LOC",
      sku: "SKU-1",
      orderedQuantity: 10,
    });

    await db.$transaction((tx) =>
      receiveStock(tx, {
        orderItemId: orderItem.id,
        receivedQuantity: 10,
        sku: "SKU-1",
        location: "STAGE",
        lpn: "LPN-1",
        uom: "EACH",
        vehicleNumber: "TRK-1",
        receivedBy: TEST_USER_ID,
      }),
    );

    // Still holding stock: refused outright.
    await expect(
      db.$transaction((tx) => deleteLocation(tx, "STAGE")),
    ).rejects.toThrow(/still holds 10 units/);

    // Empty it, and the location survives as an inactive record.
    await db.inventoryBalance.updateMany({
      where: { location: "STAGE" },
      data: { quantity: 0 },
    });

    const result = await db.$transaction((tx) => deleteLocation(tx, "STAGE"));
    expect(result).toEqual({ deleted: false, deactivated: true });
    expect(
      (await db.location.findUniqueOrThrow({ where: { location: "STAGE" } }))
        .status,
    ).toBe(false);
  });
});

describe("skus", () => {
  it("refuses to create one twice", async () => {
    await createSku("SKU-1");

    await expect(
      db.$transaction((tx) =>
        createSkuService(tx, {
          sku: "SKU-1",
          description: "Duplicate",
          department: "TEST",
          createdBy: TEST_USER_ID,
        }),
      ),
    ).rejects.toThrow(/already exists/);
  });

  it("deactivates one that has been ordered rather than deleting it", async () => {
    await createSku("SKU-1");
    await createOrderWithLine({
      orderNumber: "ORD-SKU",
      sku: "SKU-1",
      orderedQuantity: 10,
    });

    const result = await db.$transaction((tx) => deleteSku(tx, "SKU-1"));

    expect(result).toEqual({ deleted: false, deactivated: true });
    expect(
      (await db.sku.findUniqueOrThrow({ where: { sku: "SKU-1" } })).isActive,
    ).toBe(false);
  });

  it("refuses to remove one that still has stock on hand", async () => {
    await createSku("SKU-1");
    await createLocation("STAGE");
    const { orderItem } = await createOrderWithLine({
      orderNumber: "ORD-SKU2",
      sku: "SKU-1",
      orderedQuantity: 10,
    });

    await db.$transaction((tx) =>
      receiveStock(tx, {
        orderItemId: orderItem.id,
        receivedQuantity: 10,
        sku: "SKU-1",
        location: "STAGE",
        lpn: "LPN-1",
        uom: "EACH",
        vehicleNumber: "TRK-1",
        receivedBy: TEST_USER_ID,
      }),
    );

    await expect(
      db.$transaction((tx) => deleteSku(tx, "SKU-1")),
    ).rejects.toThrow(/still has 10 units on hand/);
  });
});
