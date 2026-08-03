/**
 * Receiving: goods arriving off a vehicle and onto a pallet.
 *
 * A receipt is the only way stock enters the warehouse, so this is where the
 * inventory ledger gets its first entry for every unit.
 */
import type { Prisma } from "@prisma/client";
import { badRequest, notFound } from "@/server/services/errors";
import {
  MovementReason,
  MovementRefType,
  recordMovement,
} from "@/server/services/inventory";
import {
  lockOrderItem,
  receiveStatusFor,
  syncOrderStatus,
} from "@/server/services/order-status";

export interface ReceiveStockInput {
  orderItemId: number;
  receivedQuantity: number;
  sku: string;
  location: string;
  lpn: string;
  uom: string;
  vehicleNumber: string;
  receivedNotes?: string;
  lot?: string;
  manufacturedDate?: Date | null;
  lotExpiryDate?: Date | null;
  receivedBy: string;
}

export async function receiveStock(
  tx: Prisma.TransactionClient,
  input: ReceiveStockInput,
) {
  const { orderItemId, receivedBy, ...receiveData } = input;

  // Serialise concurrent receipts against this line. Without the lock two
  // requests both read the old receivedQuantity, both pass the ceiling check
  // below, and one receipt is silently lost.
  await lockOrderItem(tx, orderItemId);

  const currentOrderItem = await tx.orderItem.findUnique({
    where: { id: orderItemId },
    select: {
      orderedQuantity: true,
      receivedQuantity: true,
      orderId: true,
      skuId: true,
    },
  });

  if (!currentOrderItem) {
    throw notFound("Order item not found");
  }

  // The SKU is client-supplied and is written straight onto the ReceiveItem,
  // which is what every downstream putaway query keys off. It has to agree with
  // the line being received against.
  if (receiveData.sku !== currentOrderItem.skuId) {
    throw badRequest(
      `SKU does not match this order line. Expected ${currentOrderItem.skuId}, received ${receiveData.sku}`,
    );
  }

  // ReceiveItem.location is a foreign key, so check it here to get a readable
  // error instead of a raw Prisma constraint violation.
  const location = await tx.location.findUnique({
    where: { location: receiveData.location },
    select: { status: true },
  });

  if (!location) {
    throw badRequest(`Location ${receiveData.location} does not exist`);
  }

  if (!location.status) {
    throw badRequest(`Location ${receiveData.location} is not active`);
  }

  // An LPN is a pallet label, so it is unique across the warehouse. The database
  // enforces this; the check is here for a readable message.
  const existingReceiveItem = await tx.receiveItem.findUnique({
    where: { lpn: receiveData.lpn },
    select: { id: true },
  });

  if (existingReceiveItem) {
    throw badRequest(`LPN ${receiveData.lpn} has already been received`);
  }

  const newReceivedQuantity =
    currentOrderItem.receivedQuantity + receiveData.receivedQuantity;

  if (newReceivedQuantity > currentOrderItem.orderedQuantity) {
    throw badRequest(
      `Cannot receive more than ordered quantity. Ordered: ${currentOrderItem.orderedQuantity}, Already received: ${currentOrderItem.receivedQuantity}, Attempting to receive: ${receiveData.receivedQuantity}`,
    );
  }

  const receiveItem = await tx.receiveItem.create({
    data: {
      orderItemId,
      receivedBy,
      receivedAt: new Date(),
      ...receiveData,
    },
    select: { id: true },
  });

  // The stock is now physically in the receiving location. This is the entry
  // point for every unit in the ledger.
  await recordMovement(tx, {
    sku: receiveData.sku,
    lpn: receiveData.lpn,
    lot: receiveData.lot,
    location: receiveData.location,
    quantity: receiveData.receivedQuantity,
    reason: MovementReason.RECEIPT,
    ref: { type: MovementRefType.RECEIVE_ITEM, id: receiveItem.id },
    createdBy: receivedBy,
    notes: receiveData.receivedNotes,
  });

  const updatedOrderItem = await tx.orderItem.update({
    where: { id: orderItemId },
    data: {
      status: receiveStatusFor(
        newReceivedQuantity,
        currentOrderItem.orderedQuantity,
      ),
      receivedQuantity: { increment: receiveData.receivedQuantity },
    },
  });

  await syncOrderStatus(tx, currentOrderItem.orderId);

  return updatedOrderItem;
}
