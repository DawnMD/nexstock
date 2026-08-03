/**
 * Quality check: inspecting received goods and writing off what fails.
 *
 * A rejection used to be a pure audit row — `rejectedQuantity` went up and
 * nothing else moved, so rejected units stayed putaway-able and on-hand was
 * overstated. It now draws the units out of the ledger as well.
 */
import type { Prisma } from "@prisma/client";
import { OrderItemStatus } from "@prisma/client";
import { badRequest, notFound } from "@/server/services/errors";
import {
  consumeFromOrderItem,
  MovementReason,
  MovementRefType,
} from "@/server/services/inventory";
import { lockOrderItem, syncOrderStatus } from "@/server/services/order-status";

export interface QualityCheckInput {
  orderItemId: number;
  rejectedQuantity: number;
  inspectedQuantity: number;
  remarks?: string;
  inspectedBy: string;
}

export async function recordQualityCheck(
  tx: Prisma.TransactionClient,
  input: QualityCheckInput,
) {
  const { orderItemId, rejectedQuantity, inspectedQuantity, remarks } = input;

  // A re-inspection reads the running rejected total and writes it back, so it
  // has to be serialised against receipts and adjustments.
  await lockOrderItem(tx, orderItemId);

  const orderItem = await tx.orderItem.findUnique({
    where: { id: orderItemId },
    select: {
      orderId: true,
      receivedQuantity: true,
      rejectedQuantity: true,
    },
  });

  if (!orderItem) {
    throw notFound("Order item not found");
  }

  // You cannot inspect goods that have not arrived.
  if (inspectedQuantity > orderItem.receivedQuantity) {
    throw badRequest(
      `Cannot inspect more than was received. Received: ${orderItem.receivedQuantity}, attempting to inspect: ${inspectedQuantity}`,
    );
  }

  const newRejectedQuantity = orderItem.rejectedQuantity + rejectedQuantity;

  if (newRejectedQuantity > orderItem.receivedQuantity) {
    throw badRequest(
      `Cannot reject more than was received. Received: ${orderItem.receivedQuantity}, already rejected: ${orderItem.rejectedQuantity}, attempting to reject: ${rejectedQuantity}`,
    );
  }

  // `qualityCheckStatus` is the pass/fail verdict, not "a check happened" — the
  // presence of the row is what means "inspected".
  const passed = rejectedQuantity === 0;

  // upsert, not create: QualityCheck.orderItemId is unique, so a re-inspection
  // or a double-clicked submit would otherwise throw P2002.
  const qualityCheck = await tx.qualityCheck.upsert({
    where: { orderItemId },
    create: {
      orderItemId,
      qualityCheckStatus: passed,
      inspectedBy: input.inspectedBy,
      inspectedQuantity,
      remarks,
    },
    update: {
      qualityCheckStatus: passed,
      inspectedBy: input.inspectedBy,
      inspectedAt: new Date(),
      inspectedQuantity,
      remarks,
    },
    select: { id: true },
  });

  // Rejected units leave stock. FIFO across the line's pallets, because a check
  // is recorded against the order line rather than against one LPN.
  if (rejectedQuantity > 0) {
    await consumeFromOrderItem(tx, {
      orderItemId,
      quantity: rejectedQuantity,
      reason: MovementReason.QC_REJECT,
      ref: { type: MovementRefType.QUALITY_CHECK, id: qualityCheck.id },
      createdBy: input.inspectedBy,
      notes: remarks,
    });
  }

  const updatedOrderItem = await tx.orderItem.update({
    where: { id: orderItemId },
    data: {
      rejectedQuantity: { increment: rejectedQuantity },
      ...(newRejectedQuantity >= orderItem.receivedQuantity
        ? { status: OrderItemStatus.REJECTED }
        : {}),
    },
  });

  await syncOrderStatus(tx, orderItem.orderId);

  return updatedOrderItem;
}
