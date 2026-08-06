/**
 * Putaway: moving a pallet out of the receiving bay and into a storage location.
 *
 * A putaway doesn't change how much stock exists, only where it is, so it is a
 * matched pair of ledger rows that nets to zero. The available quantity now
 * comes from the balance at the source location rather than from
 * `receivedQuantity` minus past putaways, which means QC rejections and
 * shortage adjustments correctly reduce what can be moved.
 */
import type { Prisma } from "@/generated/prisma/client";
import { badRequest, notFound } from "@/server/services/errors";
import {
  getBalance,
  MovementReason,
  MovementRefType,
  recordMovement,
} from "@/server/services/inventory";
import { assertLocationCapacity } from "@/server/services/locations";

export interface CreatePutawayInput {
  lpn: string;
  sku: string;
  quantity: number;
  fromLocation: string;
  toLocation: string;
  notes?: string;
  putawayBy: string;
}

export async function createPutaway(
  tx: Prisma.TransactionClient,
  input: CreatePutawayInput,
) {
  // Serialise putaways against this LPN. Without the lock two requests both read
  // the same balance, both pass the check below, and more units move than exist.
  await tx.$queryRaw`SELECT id FROM "ReceiveItem" WHERE lpn = ${input.lpn} FOR UPDATE`;

  // findUnique, not findFirst: `lpn` is unique, so this is guaranteed to be the
  // same row the operator was shown by getLPNDetails.
  const receiveItem = await tx.receiveItem.findUnique({
    where: { lpn: input.lpn },
    select: { id: true, sku: true, lot: true },
  });

  if (!receiveItem) {
    throw notFound("Receive item not found for this LPN");
  }

  if (receiveItem.sku !== input.sku) {
    throw badRequest(
      `LPN ${input.lpn} holds ${receiveItem.sku}, not ${input.sku}`,
    );
  }

  if (input.toLocation === input.fromLocation) {
    throw badRequest("Destination location must differ from the source");
  }

  const destination = await tx.location.findUnique({
    where: { location: input.toLocation },
    select: { status: true },
  });

  if (!destination) {
    throw badRequest("Invalid destination location");
  }

  if (!destination.status) {
    throw badRequest(`Location ${input.toLocation} is not active`);
  }

  // Stock can only leave from where it actually is. Asking the ledger rather
  // than the receipt also means a pallet can be moved on again from storage,
  // not just out of the bay it was received into.
  const available = await getBalance(tx, {
    sku: input.sku,
    location: input.fromLocation,
    lot: receiveItem.lot,
    lpn: input.lpn,
  });

  if (available <= 0) {
    throw badRequest(`LPN ${input.lpn} has no stock in ${input.fromLocation}`);
  }

  if (input.quantity > available) {
    throw badRequest(
      `Cannot put away more than is in ${input.fromLocation}. On hand: ${available}, attempting: ${input.quantity}`,
    );
  }

  await assertLocationCapacity(tx, {
    location: input.toLocation,
    sku: input.sku,
    quantity: input.quantity,
  });

  const putaway = await tx.putaway.create({
    data: {
      lpn: input.lpn,
      sku: input.sku,
      quantity: input.quantity,
      fromLocation: input.fromLocation,
      toLocation: input.toLocation,
      putawayBy: input.putawayBy,
      notes: input.notes,
      receiveItemId: receiveItem.id,
    },
  });

  const ref = { type: MovementRefType.PUTAWAY, id: putaway.id };
  const movement = {
    sku: input.sku,
    lpn: input.lpn,
    lot: receiveItem.lot,
    ref,
    createdBy: input.putawayBy,
    notes: input.notes,
  };

  await recordMovement(tx, {
    ...movement,
    location: input.fromLocation,
    quantity: -input.quantity,
    reason: MovementReason.PUTAWAY_OUT,
  });

  await recordMovement(tx, {
    ...movement,
    location: input.toLocation,
    quantity: input.quantity,
    reason: MovementReason.PUTAWAY_IN,
  });

  return putaway;
}
