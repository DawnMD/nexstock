/**
 * Adjustments: manual corrections to what a line is recorded as having received.
 *
 * An adjustment used to write a ledger row and stop there, leaving the audit
 * trail and the quantity as two competing answers. It now moves
 * `OrderItem.receivedQuantity` and the inventory ledger in the same transaction.
 */
import type { Prisma } from "@/generated/prisma/client";
import { AdjustmentType, OrderItemStatus } from "@/generated/prisma/client";
import { badRequest, notFound } from "@/server/services/errors";
import {
  addToOrderItem,
  consumeFromOrderItem,
  MovementReason,
  MovementRefType,
} from "@/server/services/inventory";
import {
  lockOrderItem,
  receiveStatusFor,
  syncOrderStatus,
} from "@/server/services/order-status";

export interface AdjustmentInput {
  orderItemId: number;
  quantity: number;
  orderNumber: string;
  adjustmentType: AdjustmentType;
  notes?: string;
}

export async function applyAdjustmentBatch(
  tx: Prisma.TransactionClient,
  input: { adjustments: AdjustmentInput[]; adjustedBy: string },
) {
  // Lock the lines in a stable order so two concurrent batches touching the same
  // order can't deadlock against each other.
  const adjustments = [...input.adjustments].sort(
    (a, b) => a.orderItemId - b.orderItemId,
  );

  const created: { id: string; orderItemId: number }[] = [];
  const touchedOrders = new Set<string>();

  for (const adjustment of adjustments) {
    await lockOrderItem(tx, adjustment.orderItemId);

    const orderItem = await tx.orderItem.findUnique({
      where: { id: adjustment.orderItemId },
      select: {
        orderId: true,
        orderedQuantity: true,
        receivedQuantity: true,
        status: true,
      },
    });

    if (!orderItem) {
      throw notFound(`Order item ${adjustment.orderItemId} not found`);
    }

    // `orderItemId` and `orderNumber` arrive as independent client-supplied
    // foreign keys. Without this check an adjustment shows up on one order's
    // ledger while pointing at another order's line.
    if (orderItem.orderId !== adjustment.orderNumber) {
      throw badRequest(
        `Order item ${adjustment.orderItemId} belongs to order ${orderItem.orderId}, not ${adjustment.orderNumber}`,
      );
    }

    const isAddition = adjustment.adjustmentType === AdjustmentType.ADDITION;
    const delta = isAddition ? adjustment.quantity : -adjustment.quantity;
    const newReceivedQuantity = orderItem.receivedQuantity + delta;

    // A shortage can only write off stock that is actually on hand.
    if (newReceivedQuantity < 0) {
      throw badRequest(
        `Cannot subtract ${adjustment.quantity} from order item ${adjustment.orderItemId}: only ${orderItem.receivedQuantity} received`,
      );
    }

    const record = await tx.adjustment.create({
      data: {
        adjustedBy: input.adjustedBy,
        adjustmentType: adjustment.adjustmentType,
        adjustedQuantity: adjustment.quantity,
        reason: adjustment.notes,
        orderId: adjustment.orderNumber,
        orderItemId: adjustment.orderItemId,
      },
      select: { id: true, orderItemId: true },
    });

    // The correction has to land on real stock, not just on a counter. An
    // overage goes onto the line's most recent pallet; a shortage comes off its
    // pallets oldest first.
    const allocation = {
      orderItemId: adjustment.orderItemId,
      quantity: adjustment.quantity,
      ref: { type: MovementRefType.ADJUSTMENT, id: record.id },
      createdBy: input.adjustedBy,
      notes: adjustment.notes,
    };

    if (isAddition) {
      await addToOrderItem(tx, {
        ...allocation,
        reason: MovementReason.ADJUSTMENT_ADD,
      });
    } else {
      await consumeFromOrderItem(tx, {
        ...allocation,
        reason: MovementReason.ADJUSTMENT_SUB,
      });
    }

    await tx.orderItem.update({
      where: { id: adjustment.orderItemId },
      data: {
        receivedQuantity: { increment: delta },
        // A rejected line stays rejected; otherwise the receipt status follows
        // the corrected quantity.
        ...(orderItem.status === OrderItemStatus.REJECTED
          ? {}
          : {
              status: receiveStatusFor(
                newReceivedQuantity,
                orderItem.orderedQuantity,
              ),
            }),
      },
    });

    created.push(record);
    touchedOrders.add(orderItem.orderId);
  }

  for (const orderNumber of touchedOrders) {
    await syncOrderStatus(tx, orderNumber);
  }

  return created;
}
