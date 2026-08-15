/**
 * Quality check: rejecting stock, and putting it back when a check is reset.
 */
import { describe, expect, it } from "vitest";

import { MovementReason, OrderItemStatus } from "@/generated/prisma/client";
import {
  recordQualityCheck,
  resetQualityCheck,
} from "@/server/services/quality";
import { receiveStock } from "@/server/services/receiving";

import { db, findDrift } from "./helpers/db";
import {
  createLocation,
  createOrderWithLine,
  createSku,
  TEST_USER_ID,
} from "./helpers/fixtures";

async function receivedLine(receivedQuantity = 10) {
  await createSku("SKU-1");
  await createLocation("STAGE");
  const { orderItem } = await createOrderWithLine({
    orderNumber: "ORD-QC",
    sku: "SKU-1",
    orderedQuantity: 10,
  });

  await db.$transaction((tx) =>
    receiveStock(tx, {
      orderItemId: orderItem.id,
      receivedQuantity,
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

const check = (orderItemId: number, rejected: number, inspected = 10) =>
  db.$transaction((tx) =>
    recordQualityCheck(tx, {
      orderItemId,
      rejectedQuantity: rejected,
      inspectedQuantity: inspected,
      inspectedBy: TEST_USER_ID,
    }),
  );

describe("recordQualityCheck", () => {
  it("passes a clean inspection without moving any stock", async () => {
    const orderItem = await receivedLine();

    await check(orderItem.id, 0);

    const qc = await db.qualityCheck.findUniqueOrThrow({
      where: { orderItemId: orderItem.id },
    });
    expect(qc.qualityCheckStatus).toBe(true);
    expect(qc.descrepencyQuantity).toBe(0);

    const balance = await db.inventoryBalance.findFirstOrThrow();
    expect(balance.quantity).toBe(10);
  });

  it("draws rejected units out of the ledger", async () => {
    const orderItem = await receivedLine();

    await check(orderItem.id, 4);

    const qc = await db.qualityCheck.findUniqueOrThrow({
      where: { orderItemId: orderItem.id },
    });
    expect(qc.qualityCheckStatus).toBe(false);
    // Written for the first time; it was declared and defaulted to 0 forever.
    expect(qc.descrepencyQuantity).toBe(4);

    const line = await db.orderItem.findUniqueOrThrow({
      where: { id: orderItem.id },
    });
    expect(line.rejectedQuantity).toBe(4);

    // Rejected stock is gone, not merely annotated — this is what stopped
    // rejected units from staying putaway-able.
    const balance = await db.inventoryBalance.findFirstOrThrow();
    expect(balance.quantity).toBe(6);
    expect(await findDrift()).toEqual([]);
  });

  it("marks the line REJECTED when everything received fails", async () => {
    const orderItem = await receivedLine();

    await check(orderItem.id, 10);

    const line = await db.orderItem.findUniqueOrThrow({
      where: { id: orderItem.id },
    });
    expect(line.status).toBe(OrderItemStatus.REJECTED);
  });

  it("refuses to inspect or reject more than was received", async () => {
    const orderItem = await receivedLine(5);

    await expect(check(orderItem.id, 0, 6)).rejects.toThrow(
      /Cannot inspect more than was received/,
    );
    await expect(check(orderItem.id, 6, 5)).rejects.toThrow(
      /Cannot reject more than was received/,
    );
  });

  /**
   * The double-submit case the old `upsert` was supposed to cover and did not:
   * the second pass measured itself against the already-updated total, rejected
   * the same units again, and left `rejectedQuantity` accumulated against an
   * `inspectedQuantity` that had been overwritten.
   */
  it("refuses a second check on a line that already has one", async () => {
    const orderItem = await receivedLine();

    await check(orderItem.id, 2);
    await expect(check(orderItem.id, 2)).rejects.toThrow(
      /already been inspected/,
    );

    const line = await db.orderItem.findUniqueOrThrow({
      where: { id: orderItem.id },
    });
    expect(line.rejectedQuantity).toBe(2);
    expect(await db.qualityCheck.count()).toBe(1);
  });
});

describe("resetQualityCheck", () => {
  it("puts the rejected units back and makes the line inspectable again", async () => {
    const orderItem = await receivedLine();
    await check(orderItem.id, 4);

    await db.$transaction((tx) =>
      resetQualityCheck(tx, {
        orderItemId: orderItem.id,
        resetBy: TEST_USER_ID,
      }),
    );

    const balance = await db.inventoryBalance.findFirstOrThrow();
    expect(balance.quantity).toBe(10);

    const line = await db.orderItem.findUniqueOrThrow({
      where: { id: orderItem.id },
    });
    expect(line.rejectedQuantity).toBe(0);
    // Back to a state the QC screen offers "Start QC" for.
    expect(line.status).toBe(OrderItemStatus.RECEIVED);
    expect(
      await db.qualityCheck.findUnique({
        where: { orderItemId: orderItem.id },
      }),
    ).toBeNull();

    expect(await findDrift()).toEqual([]);
  });

  it("reverses by compensating entry, leaving the original rejection in place", async () => {
    const orderItem = await receivedLine();
    await check(orderItem.id, 4);

    await db.$transaction((tx) =>
      resetQualityCheck(tx, {
        orderItemId: orderItem.id,
        resetBy: TEST_USER_ID,
      }),
    );

    // The ledger is append-only: the reset must not delete history.
    const rejections = await db.inventoryMovement.findMany({
      where: { reason: MovementReason.QC_REJECT },
    });
    const reversals = await db.inventoryMovement.findMany({
      where: { reason: MovementReason.QC_REVERSAL },
    });

    expect(rejections).toHaveLength(1);
    expect(rejections[0]?.quantity).toBe(-4);
    expect(reversals).toHaveLength(1);
    expect(reversals[0]?.quantity).toBe(4);
    // The reversal lands back on the exact key the rejection took it from.
    expect(reversals[0]?.lpn).toBe(rejections[0]?.lpn);
    expect(reversals[0]?.location).toBe(rejections[0]?.location);
  });

  it("lets the line be re-inspected with a different verdict", async () => {
    const orderItem = await receivedLine();
    await check(orderItem.id, 10);

    await db.$transaction((tx) =>
      resetQualityCheck(tx, {
        orderItemId: orderItem.id,
        resetBy: TEST_USER_ID,
      }),
    );
    await check(orderItem.id, 1);

    const line = await db.orderItem.findUniqueOrThrow({
      where: { id: orderItem.id },
    });
    expect(line.rejectedQuantity).toBe(1);
    expect(line.status).toBe(OrderItemStatus.RECEIVED);

    const balance = await db.inventoryBalance.findFirstOrThrow();
    expect(balance.quantity).toBe(9);
    expect(await findDrift()).toEqual([]);
  });

  it("refuses to reset a line that was never inspected", async () => {
    const orderItem = await receivedLine();

    await expect(
      db.$transaction((tx) =>
        resetQualityCheck(tx, {
          orderItemId: orderItem.id,
          resetBy: TEST_USER_ID,
        }),
      ),
    ).rejects.toThrow(/nothing to reset/);
  });
});
