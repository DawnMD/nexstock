/**
 * Putaway, and the rack capacity limits it enforces.
 */
import { describe, expect, it } from "vitest";

import { MovementReason } from "@/generated/prisma/client";
import { createPutaway } from "@/server/services/putaway";
import { receiveStock } from "@/server/services/receiving";

import { db, findDrift } from "./helpers/db";
import {
  createLocation,
  createOrderWithLine,
  createSku,
  TEST_USER_ID,
} from "./helpers/fixtures";

async function receivedPallet(
  options: {
    quantity?: number;
    skuWeight?: number | null;
    skuCbm?: number | null;
  } = {},
) {
  await createSku("SKU-1", {
    weight: options.skuWeight ?? null,
    cbm: options.skuCbm ?? null,
  });
  await createLocation("STAGE");
  const { orderItem } = await createOrderWithLine({
    orderNumber: "ORD-PUT",
    sku: "SKU-1",
    orderedQuantity: 100,
  });

  await db.$transaction((tx) =>
    receiveStock(tx, {
      orderItemId: orderItem.id,
      receivedQuantity: options.quantity ?? 10,
      sku: "SKU-1",
      location: "STAGE",
      lpn: "LPN-1",
      uom: "EACH",
      vehicleNumber: "TRK-1",
      receivedBy: TEST_USER_ID,
    }),
  );

  return orderItem;
}

const putaway = (overrides: Record<string, unknown> = {}) =>
  db.$transaction((tx) =>
    createPutaway(tx, {
      lpn: "LPN-1",
      sku: "SKU-1",
      quantity: 10,
      fromLocation: "STAGE",
      toLocation: "A-01",
      putawayBy: TEST_USER_ID,
      ...overrides,
    }),
  );

describe("createPutaway", () => {
  it("moves stock as a net-zero pair of ledger rows", async () => {
    await receivedPallet();
    await createLocation("A-01");

    await putaway();

    const balances = await db.inventoryBalance.findMany({
      orderBy: { location: "asc" },
      select: { location: true, quantity: true },
    });
    expect(balances).toEqual([
      { location: "A-01", quantity: 10 },
      { location: "STAGE", quantity: 0 },
    ]);

    const movements = await db.inventoryMovement.findMany({
      where: {
        reason: {
          in: [MovementReason.PUTAWAY_OUT, MovementReason.PUTAWAY_IN],
        },
      },
    });
    // A putaway changes where stock is, never how much of it exists.
    expect(movements.reduce((sum, m) => sum + m.quantity, 0)).toBe(0);
    expect(await findDrift()).toEqual([]);
  });

  it("supports a partial move, leaving the rest at source", async () => {
    await receivedPallet({ quantity: 10 });
    await createLocation("A-01");

    await putaway({ quantity: 4 });

    const balances = await db.inventoryBalance.findMany({
      orderBy: { location: "asc" },
      select: { location: true, quantity: true },
    });
    expect(balances).toEqual([
      { location: "A-01", quantity: 4 },
      { location: "STAGE", quantity: 6 },
    ]);
  });

  /**
   * The capability the putaway screen could not reach: once a pallet had been
   * put away, the UI kept offering its receiving bay as the source, where the
   * balance was now zero.
   */
  it("moves a pallet on again from storage", async () => {
    await receivedPallet();
    await createLocation("A-01");
    await createLocation("A-02");

    await putaway({ toLocation: "A-01" });
    await putaway({ fromLocation: "A-01", toLocation: "A-02" });

    const balances = await db.inventoryBalance.findMany({
      where: { quantity: { gt: 0 } },
      select: { location: true, quantity: true },
    });
    expect(balances).toEqual([{ location: "A-02", quantity: 10 }]);
    expect(await findDrift()).toEqual([]);
  });

  it("refuses to move more than is at the source", async () => {
    await receivedPallet({ quantity: 10 });
    await createLocation("A-01");

    await expect(putaway({ quantity: 11 })).rejects.toThrow(
      /Cannot put away more than is in STAGE/,
    );
  });

  it("refuses a source with nothing in it", async () => {
    await receivedPallet();
    await createLocation("A-01");
    await createLocation("A-02");

    await putaway({ toLocation: "A-01" });

    await expect(putaway({ fromLocation: "STAGE" })).rejects.toThrow(
      /has no stock in STAGE/,
    );
  });

  it("refuses a mismatched SKU, an identical destination, and an inactive rack", async () => {
    await receivedPallet();
    await createSku("SKU-OTHER");
    await createLocation("A-01");
    await createLocation("CLOSED", { status: false });

    await expect(putaway({ sku: "SKU-OTHER" })).rejects.toThrow(
      /holds SKU-1, not SKU-OTHER/,
    );
    await expect(putaway({ toLocation: "STAGE" })).rejects.toThrow(
      /must differ from the source/,
    );
    await expect(putaway({ toLocation: "CLOSED" })).rejects.toThrow(
      /is not active/,
    );
  });

  it("refuses a move that would exceed the rack's weight rating", async () => {
    await receivedPallet({ quantity: 10, skuWeight: 30 });
    await createLocation("A-01", { weightCapacity: 200 });

    // 10 units at 30kg is 300kg into a 200kg rack.
    await expect(putaway({ quantity: 10 })).rejects.toThrow(
      /holds 200 weight units/,
    );

    // Six fit.
    await putaway({ quantity: 6 });
    const balance = await db.inventoryBalance.findFirstOrThrow({
      where: { location: "A-01" },
    });
    expect(balance.quantity).toBe(6);
  });

  it("counts what is already in the rack against its volume rating", async () => {
    await receivedPallet({ quantity: 10, skuCbm: 1 });
    await createLocation("A-01", { cbm: 8 });

    await putaway({ quantity: 5 });
    // 5 cbm already there, 5 more would make 10 against a rating of 8.
    await expect(putaway({ quantity: 5 })).rejects.toThrow(/holds 8 cbm/);
  });

  it("does not check capacity when the rack or the SKU is unrated", async () => {
    // Keeps seeded data usable rather than blocking every move on complete
    // master data.
    await receivedPallet({ quantity: 10, skuWeight: null });
    await createLocation("A-01", { weightCapacity: 1 });

    await putaway({ quantity: 10 });
    expect(
      (
        await db.inventoryBalance.findFirstOrThrow({
          where: { location: "A-01" },
        })
      ).quantity,
    ).toBe(10);
  });
});
