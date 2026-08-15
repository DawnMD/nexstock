/**
 * The inventory core: the ledger, the materialised balance, and the promise that
 * the two always agree.
 */
import { describe, expect, it } from "vitest";

import { MovementReason, MovementRefType } from "@/generated/prisma/client";
import {
  consumeFromOrderItem,
  getBalance,
  normalizeLot,
  onHandForOrderItem,
  recordMovement,
} from "@/server/services/inventory";
import { receiveStock } from "@/server/services/receiving";

import { db, findDrift } from "./helpers/db";
import {
  createLocation,
  createOrderWithLine,
  createSku,
  TEST_USER_ID,
} from "./helpers/fixtures";

const movement = (
  overrides: Partial<Parameters<typeof recordMovement>[1]>,
) => ({
  sku: "SKU-1",
  lpn: "LPN-1",
  location: "STAGE",
  quantity: 10,
  reason: MovementReason.RECEIPT,
  ref: { type: MovementRefType.RECEIVE_ITEM, id: 1 },
  createdBy: TEST_USER_ID,
  ...overrides,
});

describe("normalizeLot", () => {
  it("collapses every absent-lot spelling onto one sentinel", () => {
    // `InventoryBalance` keys on lot and Postgres treats NULLs as distinct in a
    // unique index, so un-lotted stock would never accumulate into a single row
    // if any of these produced something different.
    expect(normalizeLot(null)).toBe("");
    expect(normalizeLot(undefined)).toBe("");
    expect(normalizeLot("  ")).toBe("");
    expect(normalizeLot(" LOT-A ")).toBe("LOT-A");
  });
});

describe("recordMovement", () => {
  it("writes a ledger row and folds it into the balance", async () => {
    await createSku("SKU-1");
    await createLocation("STAGE");

    await db.$transaction((tx) => recordMovement(tx, movement({})));

    const balance = await db.inventoryBalance.findFirst({
      where: { sku: "SKU-1", lpn: "LPN-1" },
    });
    expect(balance?.quantity).toBe(10);
    expect(await findDrift()).toEqual([]);
  });

  it("accumulates onto one balance row for repeated movements", async () => {
    await createSku("SKU-1");
    await createLocation("STAGE");

    await db.$transaction(async (tx) => {
      await recordMovement(tx, movement({ quantity: 10 }));
      await recordMovement(tx, movement({ quantity: 5 }));
      await recordMovement(tx, movement({ quantity: -3 }));
    });

    expect(await db.inventoryBalance.count()).toBe(1);
    const balance = await db.inventoryBalance.findFirst();
    expect(balance?.quantity).toBe(12);
    expect(await findDrift()).toEqual([]);
  });

  it("refuses to take a balance negative, and rolls the whole thing back", async () => {
    await createSku("SKU-1");
    await createLocation("STAGE");

    await db.$transaction((tx) =>
      recordMovement(tx, movement({ quantity: 4 })),
    );

    await expect(
      db.$transaction((tx) => recordMovement(tx, movement({ quantity: -5 }))),
    ).rejects.toThrow(/Not enough stock/);

    // The rejected movement must leave nothing behind: the ledger insert happens
    // before the balance check, so only the rollback keeps the two consistent.
    expect(await db.inventoryMovement.count()).toBe(1);
    const balance = await db.inventoryBalance.findFirst();
    expect(balance?.quantity).toBe(4);
    expect(await findDrift()).toEqual([]);
  });

  it("rejects zero and fractional quantities", async () => {
    await createSku("SKU-1");
    await createLocation("STAGE");

    await expect(
      db.$transaction((tx) => recordMovement(tx, movement({ quantity: 0 }))),
    ).rejects.toThrow(/cannot be zero/);

    await expect(
      db.$transaction((tx) => recordMovement(tx, movement({ quantity: 1.5 }))),
    ).rejects.toThrow(/whole units/);

    expect(await db.inventoryMovement.count()).toBe(0);
  });

  it("keys un-lotted stock onto a single balance however the lot is spelled", async () => {
    await createSku("SKU-1");
    await createLocation("STAGE");

    await db.$transaction(async (tx) => {
      await recordMovement(tx, movement({ lot: null, quantity: 5 }));
      await recordMovement(tx, movement({ lot: undefined, quantity: 5 }));
      await recordMovement(tx, movement({ lot: "   ", quantity: 5 }));
    });

    expect(await db.inventoryBalance.count()).toBe(1);
    expect(
      await db.$transaction((tx) =>
        getBalance(tx, { sku: "SKU-1", location: "STAGE", lpn: "LPN-1" }),
      ),
    ).toBe(15);
  });
});

describe("consumeFromOrderItem", () => {
  it("draws down oldest receipt first and spans pallets when it has to", async () => {
    await createSku("SKU-1");
    await createLocation("STAGE");
    const { orderItem } = await createOrderWithLine({
      orderNumber: "ORD-FIFO",
      sku: "SKU-1",
      orderedQuantity: 30,
    });

    // Three pallets, received in a known order.
    for (const [index, lpn] of ["LPN-A", "LPN-B", "LPN-C"].entries()) {
      await db.$transaction((tx) =>
        receiveStock(tx, {
          orderItemId: orderItem.id,
          receivedQuantity: 10,
          sku: "SKU-1",
          location: "STAGE",
          lpn,
          uom: "EACH",
          vehicleNumber: `TRK-${index}`,
          receivedBy: TEST_USER_ID,
        }),
      );
    }

    // 15 units: all of the oldest pallet, then half of the next.
    await db.$transaction((tx) =>
      consumeFromOrderItem(tx, {
        orderItemId: orderItem.id,
        quantity: 15,
        reason: MovementReason.QC_REJECT,
        ref: { type: MovementRefType.QUALITY_CHECK, id: 1 },
        createdBy: TEST_USER_ID,
      }),
    );

    const balances = await db.inventoryBalance.findMany({
      orderBy: { lpn: "asc" },
      select: { lpn: true, quantity: true },
    });

    expect(balances).toEqual([
      { lpn: "LPN-A", quantity: 0 },
      { lpn: "LPN-B", quantity: 5 },
      { lpn: "LPN-C", quantity: 10 },
    ]);
    expect(await findDrift()).toEqual([]);
  });

  it("refuses to take more than the line has on hand", async () => {
    await createSku("SKU-1");
    await createLocation("STAGE");
    const { orderItem } = await createOrderWithLine({
      orderNumber: "ORD-SHORT",
      sku: "SKU-1",
      orderedQuantity: 10,
    });

    await db.$transaction((tx) =>
      receiveStock(tx, {
        orderItemId: orderItem.id,
        receivedQuantity: 6,
        sku: "SKU-1",
        location: "STAGE",
        lpn: "LPN-A",
        uom: "EACH",
        vehicleNumber: "TRK-1",
        receivedBy: TEST_USER_ID,
      }),
    );

    await expect(
      db.$transaction((tx) =>
        consumeFromOrderItem(tx, {
          orderItemId: orderItem.id,
          quantity: 7,
          reason: MovementReason.QC_REJECT,
          ref: { type: MovementRefType.QUALITY_CHECK, id: 1 },
          createdBy: TEST_USER_ID,
        }),
      ),
    ).rejects.toThrow(/Only 6 units are on hand/);

    expect(
      await db.$transaction((tx) => onHandForOrderItem(tx, orderItem.id)),
    ).toBe(6);
  });
});
