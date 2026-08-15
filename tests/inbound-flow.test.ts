/**
 * The whole inbound flow on one order line, end to end.
 *
 * This is the scenario `prisma/verify-inventory.ts` used to walk by hand against
 * a live database. It is here instead so it runs on every push, and so a
 * regression names the step that broke rather than printing a FAIL line.
 */
import { describe, expect, it } from "vitest";

import { AdjustmentType, OrderStatus } from "@/generated/prisma/client";
import { applyAdjustmentBatch } from "@/server/services/adjustments";
import { onHandForOrderItem } from "@/server/services/inventory";
import { createPutaway } from "@/server/services/putaway";
import { recordQualityCheck } from "@/server/services/quality";
import { receiveStock } from "@/server/services/receiving";

import { db, findDrift } from "./helpers/db";
import {
  createLocation,
  createOrderWithLine,
  createSku,
  TEST_USER_ID,
} from "./helpers/fixtures";

const onHand = (orderItemId: number) =>
  db.$transaction((tx) => onHandForOrderItem(tx, orderItemId));

describe("receive → quality check → adjust → putaway", () => {
  it("keeps the ledger, the balances and the order line in step at every step", async () => {
    await createSku("SKU-1", { weight: 1, cbm: 1 });
    await createLocation("STAGE");
    await createLocation("A-01", { cbm: 500, weightCapacity: 500 });
    const { orderItem } = await createOrderWithLine({
      orderNumber: "ORD-FLOW",
      sku: "SKU-1",
      orderedQuantity: 20,
    });

    // 1. Receive a pallet of 20 into the staging bay.
    await db.$transaction((tx) =>
      receiveStock(tx, {
        orderItemId: orderItem.id,
        receivedQuantity: 20,
        sku: "SKU-1",
        location: "STAGE",
        lpn: "LPN-FLOW",
        uom: "EACH",
        vehicleNumber: "TRK-1",
        receivedBy: TEST_USER_ID,
      }),
    );
    expect(await onHand(orderItem.id)).toBe(20);

    // 2. Inspect, rejecting 5. Rejected units leave stock rather than just
    //    incrementing a counter.
    await db.$transaction((tx) =>
      recordQualityCheck(tx, {
        orderItemId: orderItem.id,
        inspectedQuantity: 20,
        rejectedQuantity: 5,
        inspectedBy: TEST_USER_ID,
      }),
    );
    expect(await onHand(orderItem.id)).toBe(15);

    // 3. A shortage adjustment writes off 3 more.
    await db.$transaction((tx) =>
      applyAdjustmentBatch(tx, {
        adjustedBy: TEST_USER_ID,
        adjustments: [
          {
            orderItemId: orderItem.id,
            quantity: 3,
            orderNumber: "ORD-FLOW",
            adjustmentType: AdjustmentType.SUBTRACTION,
          },
        ],
      }),
    );
    expect(await onHand(orderItem.id)).toBe(12);

    // 4. Put the remainder away. A putaway moves stock without creating or
    //    destroying any, so the on-hand total is unchanged.
    await db.$transaction((tx) =>
      createPutaway(tx, {
        lpn: "LPN-FLOW",
        sku: "SKU-1",
        quantity: 12,
        fromLocation: "STAGE",
        toLocation: "A-01",
        putawayBy: TEST_USER_ID,
      }),
    );
    expect(await onHand(orderItem.id)).toBe(12);

    const balances = await db.inventoryBalance.findMany({
      orderBy: { location: "asc" },
      select: { location: true, quantity: true },
    });
    expect(balances).toEqual([
      { location: "A-01", quantity: 12 },
      { location: "STAGE", quantity: 0 },
    ]);

    // The reconciliation the whole inventory core rests on.
    expect(await findDrift()).toEqual([]);

    // And nothing anywhere went negative along the way.
    expect(
      await db.inventoryBalance.count({ where: { quantity: { lt: 0 } } }),
    ).toBe(0);

    // The order line's own accounting agrees with the ledger:
    // received - rejected === on hand.
    const line = await db.orderItem.findUniqueOrThrow({
      where: { id: orderItem.id },
    });
    expect(line.receivedQuantity - line.rejectedQuantity).toBe(12);

    const order = await db.order.findUniqueOrThrow({
      where: { orderNumber: "ORD-FLOW" },
    });
    expect(order.status).toBe(OrderStatus.IN_PROGRESS);
  });
});
