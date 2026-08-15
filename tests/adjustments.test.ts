/**
 * Adjustments: correcting what a line is recorded as having received, and
 * moving the stock to match.
 */
import { describe, expect, it } from "vitest";

import { AdjustmentType, OrderItemStatus } from "@/generated/prisma/client";
import { applyAdjustmentBatch } from "@/server/services/adjustments";
import { receiveStock } from "@/server/services/receiving";

import { db, findDrift } from "./helpers/db";
import {
  createLocation,
  createOrderWithLine,
  createSku,
  TEST_USER_ID,
} from "./helpers/fixtures";

async function receivedLine(
  options: { received?: number; ordered?: number } = {},
) {
  await createSku("SKU-1");
  await createLocation("STAGE");
  const { orderItem } = await createOrderWithLine({
    orderNumber: "ORD-ADJ",
    sku: "SKU-1",
    orderedQuantity: options.ordered ?? 10,
  });

  if (options.received !== 0) {
    await db.$transaction((tx) =>
      receiveStock(tx, {
        orderItemId: orderItem.id,
        receivedQuantity: options.received ?? 10,
        sku: "SKU-1",
        location: "STAGE",
        lpn: "LPN-1",
        uom: "EACH",
        vehicleNumber: "TRK-1",
        receivedBy: TEST_USER_ID,
      }),
    );
  }

  return orderItem;
}

const adjust = (
  orderItemId: number,
  adjustmentType: AdjustmentType,
  quantity: number,
  orderNumber = "ORD-ADJ",
) =>
  db.$transaction((tx) =>
    applyAdjustmentBatch(tx, {
      adjustedBy: TEST_USER_ID,
      adjustments: [{ orderItemId, quantity, orderNumber, adjustmentType }],
    }),
  );

describe("applyAdjustmentBatch", () => {
  it("writes a shortage off the line and out of the ledger together", async () => {
    const orderItem = await receivedLine();

    await adjust(orderItem.id, AdjustmentType.SUBTRACTION, 3);

    const line = await db.orderItem.findUniqueOrThrow({
      where: { id: orderItem.id },
    });
    expect(line.receivedQuantity).toBe(7);
    // An adjustment used to move only the counter, leaving the ledger and the
    // quantity as two competing answers.
    expect((await db.inventoryBalance.findFirstOrThrow()).quantity).toBe(7);
    expect(line.status).toBe(OrderItemStatus.RECEIVING);
    expect(await findDrift()).toEqual([]);
  });

  it("puts an overage onto the line's most recent pallet", async () => {
    const orderItem = await receivedLine({ received: 5 });

    await adjust(orderItem.id, AdjustmentType.ADDITION, 2);

    const line = await db.orderItem.findUniqueOrThrow({
      where: { id: orderItem.id },
    });
    expect(line.receivedQuantity).toBe(7);
    expect((await db.inventoryBalance.findFirstOrThrow()).quantity).toBe(7);
    expect(await findDrift()).toEqual([]);
  });

  it("allows an overage past the ordered quantity", async () => {
    // Deliberate asymmetry with `receiveStock`, which caps at the ordered
    // quantity: a vendor really can ship more than the PO says, and the books
    // have to be correctable to match the dock.
    const orderItem = await receivedLine({ ordered: 10, received: 10 });

    await adjust(orderItem.id, AdjustmentType.ADDITION, 3);

    const line = await db.orderItem.findUniqueOrThrow({
      where: { id: orderItem.id },
    });
    expect(line.receivedQuantity).toBe(13);
    expect(line.orderedQuantity).toBe(10);
    expect(await findDrift()).toEqual([]);
  });

  it("refuses a shortage bigger than what was received", async () => {
    const orderItem = await receivedLine({ received: 4 });

    await expect(
      adjust(orderItem.id, AdjustmentType.SUBTRACTION, 5),
    ).rejects.toThrow(/only 4 received/);

    expect(await db.adjustment.count()).toBe(0);
  });

  it("refuses an overage on a line nothing has been received against", async () => {
    const orderItem = await receivedLine({ received: 0 });

    await expect(
      adjust(orderItem.id, AdjustmentType.ADDITION, 2),
    ).rejects.toThrow(/never been received against/);
  });

  /**
   * `orderItemId` and `orderNumber` arrive as two independent client-supplied
   * keys. Without the cross-check an adjustment shows on one order's ledger
   * while pointing at another order's line.
   */
  it("refuses a line that belongs to a different order", async () => {
    const orderItem = await receivedLine();
    await createOrderWithLine({
      orderNumber: "ORD-OTHER",
      sku: "SKU-1",
      orderedQuantity: 5,
    });

    await expect(
      adjust(orderItem.id, AdjustmentType.SUBTRACTION, 1, "ORD-OTHER"),
    ).rejects.toThrow(/belongs to order ORD-ADJ/);
  });

  it("rolls the whole batch back when one entry in it fails", async () => {
    await createSku("SKU-1");
    await createLocation("STAGE");
    const { order } = await createOrderWithLine({
      orderNumber: "ORD-BATCH",
      sku: "SKU-1",
      orderedQuantity: 10,
    });
    await db.orderItem.create({
      data: {
        description: "Second line",
        department: "TEST",
        orderedQuantity: 10,
        orderId: order.orderNumber,
        skuId: "SKU-1",
      },
    });

    const lines = await db.orderItem.findMany({
      where: { orderId: "ORD-BATCH" },
      orderBy: { id: "asc" },
    });
    const [first, second] = lines;
    if (!first || !second) throw new Error("fixture lines missing");

    await db.$transaction((tx) =>
      receiveStock(tx, {
        orderItemId: first.id,
        receivedQuantity: 10,
        sku: "SKU-1",
        location: "STAGE",
        lpn: "LPN-1",
        uom: "EACH",
        vehicleNumber: "TRK-1",
        receivedBy: TEST_USER_ID,
      }),
    );

    // The first entry is fine; the second has nothing received to subtract from.
    await expect(
      db.$transaction((tx) =>
        applyAdjustmentBatch(tx, {
          adjustedBy: TEST_USER_ID,
          adjustments: [
            {
              orderItemId: first.id,
              quantity: 2,
              orderNumber: "ORD-BATCH",
              adjustmentType: AdjustmentType.SUBTRACTION,
            },
            {
              orderItemId: second.id,
              quantity: 1,
              orderNumber: "ORD-BATCH",
              adjustmentType: AdjustmentType.SUBTRACTION,
            },
          ],
        }),
      ),
    ).rejects.toThrow();

    // Nothing from the batch survives, including the entry that would have
    // succeeded on its own.
    expect(await db.adjustment.count()).toBe(0);
    expect(
      (await db.orderItem.findUniqueOrThrow({ where: { id: first.id } }))
        .receivedQuantity,
    ).toBe(10);
    expect(await findDrift()).toEqual([]);
  });
});
