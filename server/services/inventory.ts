/**
 * The inventory core.
 *
 * Every quantity question in the app resolves here. Stock only ever moves by
 * `recordMovement`, which writes an append-only `InventoryMovement` row and
 * folds it into the materialised `InventoryBalance` in the same statement pair,
 * inside the caller's transaction. That is the invariant the rest of Phase 2
 * rests on:
 *
 *     sum(InventoryMovement.quantity) for a key === InventoryBalance.quantity
 *
 * Reconciling with the order lines: a line's on-hand across all its LPNs equals
 * `OrderItem.receivedQuantity - OrderItem.rejectedQuantity`. Receipts and
 * adjustments move `receivedQuantity`, QC rejections move `rejectedQuantity`,
 * and a putaway is a net-zero pair, so the two sides stay in step.
 */
import type { Prisma } from "@prisma/client";
import { MovementReason, MovementRefType } from "@prisma/client";
import { badRequest } from "@/server/services/errors";

/**
 * `InventoryBalance` keys on `lot`, and Postgres treats NULLs as distinct in a
 * unique index — a nullable lot would mean un-lotted stock never accumulates
 * into one row. "" is the un-lotted sentinel everywhere below the API boundary.
 */
export function normalizeLot(lot: string | null | undefined): string {
  return lot?.trim() ?? "";
}

export interface MovementRef {
  type: MovementRefType;
  /** `Adjustment.id` is a cuid and the rest are ints, so this is stringified. */
  id: string | number;
}

export interface MovementInput {
  sku: string;
  lpn: string;
  lot?: string | null;
  location: string;
  /** Signed. Positive puts stock in, negative takes it out. Never zero. */
  quantity: number;
  reason: MovementReason;
  ref: MovementRef;
  createdBy: string;
  notes?: string;
}

export interface StockKey {
  sku: string;
  location: string;
  lot?: string | null;
  lpn: string;
}

/**
 * Move stock and record why.
 *
 * The balance upsert uses an atomic `increment`, so concurrent movements against
 * one key serialise on the row rather than clobbering each other. The
 * post-update check is what actually enforces "you cannot remove stock that
 * isn't there": `increment` can't be made conditional, but the value it returns
 * is the committed one, so a negative result rolls the whole transaction back.
 */
export async function recordMovement(
  tx: Prisma.TransactionClient,
  input: MovementInput,
): Promise<void> {
  if (!Number.isInteger(input.quantity)) {
    throw badRequest("Inventory movements must be whole units");
  }

  if (input.quantity === 0) {
    throw badRequest("Inventory movements cannot be zero");
  }

  const lot = normalizeLot(input.lot);

  await tx.inventoryMovement.create({
    data: {
      sku: input.sku,
      lpn: input.lpn,
      lot,
      location: input.location,
      quantity: input.quantity,
      reason: input.reason,
      refType: input.ref.type,
      refId: String(input.ref.id),
      notes: input.notes,
      createdBy: input.createdBy,
    },
  });

  const balance = await tx.inventoryBalance.upsert({
    where: {
      sku_location_lot_lpn: {
        sku: input.sku,
        location: input.location,
        lot,
        lpn: input.lpn,
      },
    },
    create: {
      sku: input.sku,
      location: input.location,
      lot,
      lpn: input.lpn,
      quantity: input.quantity,
    },
    update: {
      quantity: { increment: input.quantity },
    },
    select: { quantity: true },
  });

  if (balance.quantity < 0) {
    throw badRequest(
      `Not enough stock: ${input.sku} on LPN ${input.lpn} at ${input.location} would go to ${balance.quantity}`,
    );
  }
}

/** On-hand for one exact key. Zero when no balance row exists yet. */
export async function getBalance(
  tx: Prisma.TransactionClient,
  key: StockKey,
): Promise<number> {
  const balance = await tx.inventoryBalance.findUnique({
    where: {
      sku_location_lot_lpn: {
        sku: key.sku,
        location: key.location,
        lot: normalizeLot(key.lot),
        lpn: key.lpn,
      },
    },
    select: { quantity: true },
  });

  return balance?.quantity ?? 0;
}

/** Where an LPN's stock actually is right now, heaviest location first. */
export async function balancesForLpn(
  tx: Prisma.TransactionClient,
  lpn: string,
) {
  return await tx.inventoryBalance.findMany({
    where: { lpn, quantity: { gt: 0 } },
    select: { sku: true, location: true, lot: true, lpn: true, quantity: true },
    orderBy: [{ quantity: "desc" }, { location: "asc" }],
  });
}

/**
 * The balances belonging to an order line, oldest receipt first.
 *
 * QC and adjustments act on an `OrderItem`, which has no location or LPN of its
 * own — the stock is spread across the line's receipts, possibly already put
 * away. This resolves the line to the concrete keys its stock sits on so those
 * flows can allocate against them.
 */
async function balancesForOrderItem(
  tx: Prisma.TransactionClient,
  orderItemId: number,
) {
  const receipts = await tx.receiveItem.findMany({
    where: { orderItemId },
    select: { lpn: true },
    // FIFO: the oldest pallet is the one a warehouse consumes first.
    orderBy: [{ receivedAt: "asc" }, { id: "asc" }],
  });

  if (receipts.length === 0) return [];

  const lpns = receipts.map((receipt) => receipt.lpn);
  const balances = await tx.inventoryBalance.findMany({
    where: { lpn: { in: lpns }, quantity: { gt: 0 } },
    select: { sku: true, location: true, lot: true, lpn: true, quantity: true },
  });

  // Prisma can't order by "the sequence those LPNs were received in", so the
  // FIFO ordering is reapplied here.
  const receiptOrder = new Map(lpns.map((lpn, index) => [lpn, index]));
  return balances.sort(
    (a, b) =>
      (receiptOrder.get(a.lpn) ?? 0) - (receiptOrder.get(b.lpn) ?? 0) ||
      a.location.localeCompare(b.location),
  );
}

/** Total on-hand across every LPN belonging to an order line. */
export async function onHandForOrderItem(
  tx: Prisma.TransactionClient,
  orderItemId: number,
): Promise<number> {
  const balances = await balancesForOrderItem(tx, orderItemId);
  return balances.reduce((sum, balance) => sum + balance.quantity, 0);
}

interface AllocationInput {
  orderItemId: number;
  quantity: number;
  reason: MovementReason;
  ref: MovementRef;
  createdBy: string;
  notes?: string;
}

/**
 * Take `quantity` units off an order line, FIFO across its receipts.
 *
 * Used by QC rejections and shortage adjustments, neither of which names a
 * location. Emits one movement per balance it draws down, so the ledger still
 * says exactly where the stock left from.
 */
export async function consumeFromOrderItem(
  tx: Prisma.TransactionClient,
  input: AllocationInput,
): Promise<void> {
  const balances = await balancesForOrderItem(tx, input.orderItemId);
  const available = balances.reduce(
    (sum, balance) => sum + balance.quantity,
    0,
  );

  if (available < input.quantity) {
    throw badRequest(
      `Only ${available} units are on hand for this line, cannot remove ${input.quantity}`,
    );
  }

  let remaining = input.quantity;

  for (const balance of balances) {
    if (remaining <= 0) break;

    const take = Math.min(remaining, balance.quantity);
    await recordMovement(tx, {
      sku: balance.sku,
      lpn: balance.lpn,
      lot: balance.lot,
      location: balance.location,
      quantity: -take,
      reason: input.reason,
      ref: input.ref,
      createdBy: input.createdBy,
      notes: input.notes,
    });
    remaining -= take;
  }
}

/**
 * Put `quantity` units onto an order line.
 *
 * An overage adjustment doesn't say where the extra units are either. They go
 * onto the line's most recent receipt, at the location that receipt's stock is
 * currently sitting in — that pallet is the one the operator just counted. A
 * line with nothing received against it has no pallet to add to, which is a
 * real error rather than something to guess at.
 */
export async function addToOrderItem(
  tx: Prisma.TransactionClient,
  input: AllocationInput,
): Promise<void> {
  const latestReceipt = await tx.receiveItem.findFirst({
    where: { orderItemId: input.orderItemId },
    select: { lpn: true, sku: true, lot: true, location: true },
    orderBy: [{ receivedAt: "desc" }, { id: "desc" }],
  });

  if (!latestReceipt) {
    throw badRequest(
      "Cannot add stock to a line that has never been received against",
    );
  }

  const existing = await balancesForLpn(tx, latestReceipt.lpn);
  const target = existing[0];

  await recordMovement(tx, {
    sku: target?.sku ?? latestReceipt.sku,
    lpn: latestReceipt.lpn,
    lot: target?.lot ?? latestReceipt.lot,
    // Falling back to the receipt location covers the case where the pallet has
    // been fully drawn down to zero and has no positive balance to point at.
    location: target?.location ?? latestReceipt.location,
    quantity: input.quantity,
    reason: input.reason,
    ref: input.ref,
    createdBy: input.createdBy,
    notes: input.notes,
  });
}

export { MovementReason, MovementRefType };
