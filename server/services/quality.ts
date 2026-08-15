/**
 * Quality check: inspecting received goods and writing off what fails.
 *
 * A rejection used to be a pure audit row — `rejectedQuantity` went up and
 * nothing else moved, so rejected units stayed putaway-able and on-hand was
 * overstated. It now draws the units out of the ledger as well.
 */
import type { Prisma } from "@/generated/prisma/client";
import { OrderItemStatus } from "@/generated/prisma/client";
import { badRequest, conflict, notFound } from "@/server/services/errors";
import {
  consumeFromOrderItem,
  MovementReason,
  MovementRefType,
  recordMovement,
} from "@/server/services/inventory";
import {
  lockOrderItem,
  receiveStatusFor,
  syncOrderStatus,
} from "@/server/services/order-status";

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

  // This reads the running rejected total and writes it back, so it has to be
  // serialised against receipts and adjustments — and against a second copy of
  // itself from a double-clicked submit.
  await lockOrderItem(tx, orderItemId);

  const orderItem = await tx.orderItem.findUnique({
    where: { id: orderItemId },
    select: {
      orderId: true,
      receivedQuantity: true,
      rejectedQuantity: true,
      qualityCheck: { select: { id: true } },
    },
  });

  if (!orderItem) {
    throw notFound("Order item not found");
  }

  // One check per line. This was an upsert that re-ran the whole flow, which
  // meant a double-clicked submit passed the ceiling check twice and rejected
  // the same units twice — `rejectedQuantity` accumulated while
  // `inspectedQuantity` was overwritten, so the two stopped describing the same
  // inspection. Re-inspecting now goes through `resetQualityCheck` first, which
  // puts the rejected stock back before anything is recorded again.
  if (orderItem.qualityCheck) {
    throw conflict(
      "This line has already been inspected. Reset the quality check before inspecting it again.",
    );
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

  const qualityCheck = await tx.qualityCheck.create({
    data: {
      orderItemId,
      qualityCheckStatus: passed,
      inspectedBy: input.inspectedBy,
      inspectedQuantity,
      // The count that failed, so the row on its own says what the inspection
      // found. It was declared, defaulted to 0, and never written.
      descrepencyQuantity: rejectedQuantity,
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

/**
 * Undo an inspection so the line can be checked again.
 *
 * The screen has offered a "Reset QC" button since the quality check flow was
 * written, with nothing behind it — no handler, no procedure. Doing it properly
 * means three things have to move together, which is why it is one transaction:
 *
 *  1. the units the rejection wrote off go back into the ledger,
 *  2. `OrderItem.rejectedQuantity` and its status come back with them,
 *  3. the `QualityCheck` row goes, which is what makes the line inspectable
 *     again — the presence of that row is what "inspected" means everywhere.
 *
 * The reversal is worked out from the ledger rather than from any column: the
 * `QC_REJECT` movements carrying this check's id are the authoritative record of
 * what it actually took, and they are what has to be given back.
 */
export async function resetQualityCheck(
  tx: Prisma.TransactionClient,
  input: { orderItemId: number; resetBy: string },
) {
  const { orderItemId } = input;

  await lockOrderItem(tx, orderItemId);

  const orderItem = await tx.orderItem.findUnique({
    where: { id: orderItemId },
    select: {
      orderId: true,
      orderedQuantity: true,
      receivedQuantity: true,
      rejectedQuantity: true,
      qualityCheck: { select: { id: true } },
    },
  });

  if (!orderItem) {
    throw notFound("Order item not found");
  }

  if (!orderItem.qualityCheck) {
    throw badRequest(
      "This line has not been inspected, so there is nothing to reset",
    );
  }

  const qualityCheckId = orderItem.qualityCheck.id;

  const rejections = await tx.inventoryMovement.findMany({
    where: {
      refType: MovementRefType.QUALITY_CHECK,
      refId: String(qualityCheckId),
      reason: MovementReason.QC_REJECT,
    },
    select: { sku: true, lpn: true, lot: true, location: true, quantity: true },
  });

  let restored = 0;

  for (const rejection of rejections) {
    // `QC_REJECT` rows are negative, so negating gives the quantity to put back,
    // onto the exact key it came off.
    const quantity = -rejection.quantity;

    await recordMovement(tx, {
      sku: rejection.sku,
      lpn: rejection.lpn,
      lot: rejection.lot,
      location: rejection.location,
      quantity,
      reason: MovementReason.QC_REVERSAL,
      ref: { type: MovementRefType.QUALITY_CHECK, id: qualityCheckId },
      createdBy: input.resetBy,
      notes: `Reset of quality check ${qualityCheckId}`,
    });

    restored += quantity;
  }

  // Clamp rather than trusting the subtraction: an adjustment could have moved
  // `rejectedQuantity` since the check ran, and the column must never go
  // negative.
  const newRejectedQuantity = Math.max(
    orderItem.rejectedQuantity - restored,
    0,
  );

  await tx.qualityCheck.delete({ where: { id: qualityCheckId } });

  const updatedOrderItem = await tx.orderItem.update({
    where: { id: orderItemId },
    data: {
      rejectedQuantity: newRejectedQuantity,
      // The line may have been parked at REJECTED by the check being undone, so
      // the status is re-derived from the quantities rather than left behind.
      status: receiveStatusFor(
        orderItem.receivedQuantity,
        orderItem.orderedQuantity,
      ),
    },
  });

  await syncOrderStatus(tx, orderItem.orderId);

  return updatedOrderItem;
}
