/**
 * Receiving, and the row lock that keeps two of them from losing each other.
 */
import { describe, expect, it } from "vitest";

import { OrderItemStatus, OrderStatus } from "@/generated/prisma/client";
import { receiveStock } from "@/server/services/receiving";

import { db, findDrift } from "./helpers/db";
import {
  createLocation,
  createOrderWithLine,
  createSku,
  TEST_USER_ID,
} from "./helpers/fixtures";

const receipt = (
  orderItemId: number,
  overrides: Record<string, unknown> = {},
) =>
  ({
    orderItemId,
    receivedQuantity: 5,
    sku: "SKU-1",
    location: "STAGE",
    lpn: "LPN-1",
    uom: "EACH",
    vehicleNumber: "TRK-1",
    receivedBy: TEST_USER_ID,
    ...overrides,
  }) as Parameters<typeof receiveStock>[1];

async function setup(orderedQuantity = 10) {
  await createSku("SKU-1");
  await createLocation("STAGE");
  return await createOrderWithLine({
    orderNumber: "ORD-RECV",
    sku: "SKU-1",
    orderedQuantity,
  });
}

describe("receiveStock", () => {
  it("records the receipt, the ledger entry and the line status together", async () => {
    const { orderItem } = await setup();

    await db.$transaction((tx) => receiveStock(tx, receipt(orderItem.id)));

    const line = await db.orderItem.findUniqueOrThrow({
      where: { id: orderItem.id },
    });
    expect(line.receivedQuantity).toBe(5);
    // Part of the line has arrived, so it is RECEIVING rather than RECEIVED.
    expect(line.status).toBe(OrderItemStatus.RECEIVING);

    const order = await db.order.findUniqueOrThrow({
      where: { orderNumber: "ORD-RECV" },
    });
    expect(order.status).toBe(OrderStatus.IN_PROGRESS);

    expect(await findDrift()).toEqual([]);
  });

  it("marks the line RECEIVED and the order COMPLETED once it is all in", async () => {
    const { orderItem } = await setup();

    await db.$transaction((tx) =>
      receiveStock(tx, receipt(orderItem.id, { receivedQuantity: 10 })),
    );

    const line = await db.orderItem.findUniqueOrThrow({
      where: { id: orderItem.id },
    });
    expect(line.status).toBe(OrderItemStatus.RECEIVED);

    const order = await db.order.findUniqueOrThrow({
      where: { orderNumber: "ORD-RECV" },
    });
    expect(order.status).toBe(OrderStatus.COMPLETED);
  });

  it("refuses to receive more than was ordered", async () => {
    const { orderItem } = await setup();

    await expect(
      db.$transaction((tx) =>
        receiveStock(tx, receipt(orderItem.id, { receivedQuantity: 11 })),
      ),
    ).rejects.toThrow(/Cannot receive more than ordered/);

    expect(await db.receiveItem.count()).toBe(0);
  });

  it("refuses a SKU that does not match the line", async () => {
    const { orderItem } = await setup();
    await createSku("SKU-OTHER");

    await expect(
      db.$transaction((tx) =>
        receiveStock(tx, receipt(orderItem.id, { sku: "SKU-OTHER" })),
      ),
    ).rejects.toThrow(/SKU does not match this order line/);
  });

  it("refuses an unknown or inactive location", async () => {
    const { orderItem } = await setup();
    await createLocation("CLOSED", { status: false });

    await expect(
      db.$transaction((tx) =>
        receiveStock(tx, receipt(orderItem.id, { location: "NOWHERE" })),
      ),
    ).rejects.toThrow(/does not exist/);

    await expect(
      db.$transaction((tx) =>
        receiveStock(tx, receipt(orderItem.id, { location: "CLOSED" })),
      ),
    ).rejects.toThrow(/is not active/);
  });

  it("refuses to reuse an LPN", async () => {
    const { orderItem } = await setup();

    await db.$transaction((tx) => receiveStock(tx, receipt(orderItem.id)));

    await expect(
      db.$transaction((tx) => receiveStock(tx, receipt(orderItem.id))),
    ).rejects.toThrow(/has already been received/);
  });

  /**
   * The reason `lockOrderItem` exists.
   *
   * Postgres runs at READ COMMITTED. Without the `FOR UPDATE` both transactions
   * read `receivedQuantity = 0`, both decide 6 fits under the ordered 10, and
   * the second write clobbers the first — 12 units received against an order
   * for 10, with the line reading 6. With the lock, the second transaction
   * blocks until the first commits, re-reads 6, and correctly refuses.
   */
  it("serialises concurrent receipts on one line", async () => {
    const { orderItem } = await setup(10);

    const results = await Promise.allSettled([
      db.$transaction((tx) =>
        receiveStock(
          tx,
          receipt(orderItem.id, { receivedQuantity: 6, lpn: "LPN-A" }),
        ),
      ),
      db.$transaction((tx) =>
        receiveStock(
          tx,
          receipt(orderItem.id, { receivedQuantity: 6, lpn: "LPN-B" }),
        ),
      ),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(String(rejected[0]!.reason)).toMatch(
      /Cannot receive more than ordered/,
    );

    const line = await db.orderItem.findUniqueOrThrow({
      where: { id: orderItem.id },
    });
    expect(line.receivedQuantity).toBe(6);
    expect(line.receivedQuantity).toBeLessThanOrEqual(line.orderedQuantity);
    expect(await findDrift()).toEqual([]);
  });
});
