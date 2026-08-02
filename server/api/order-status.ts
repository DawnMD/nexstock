import type { Prisma } from "@prisma/client";
import { OrderItemStatus, OrderStatus } from "@prisma/client";

const RESOLVED_ITEM_STATUSES: OrderItemStatus[] = [
  OrderItemStatus.RECEIVED,
  OrderItemStatus.REJECTED,
];

/**
 * The receipt status a line should carry for a given quantity. Adjustments can
 * move `receivedQuantity` in either direction, so this is derived rather than
 * only advanced forwards.
 */
export function receiveStatusFor(
  receivedQuantity: number,
  orderedQuantity: number,
): OrderItemStatus {
  if (receivedQuantity <= 0) return OrderItemStatus.NOT_RECEIVED;
  return receivedQuantity >= orderedQuantity
    ? OrderItemStatus.RECEIVED
    : OrderItemStatus.RECEIVING;
}

/**
 * Recompute `Order.status` from its line items.
 *
 * Nothing used to write this column, so every order sat at `NEW` forever and
 * the quality check order list (which filters on NEW/IN_PROGRESS) grew without
 * bound. Call this from any transaction that moves a line item's status.
 *
 * - COMPLETED once every line is resolved (fully received, or rejected)
 * - IN_PROGRESS once any line has been touched
 * - NEW while nothing has been received
 *
 * CANCELLED is set by hand and is never overwritten here.
 */
export async function syncOrderStatus(
  tx: Prisma.TransactionClient,
  orderNumber: string,
): Promise<OrderStatus | null> {
  const items = await tx.orderItem.findMany({
    where: { orderId: orderNumber },
    select: { status: true },
  });

  if (items.length === 0) {
    return null;
  }

  const status = items.every((item) =>
    RESOLVED_ITEM_STATUSES.includes(item.status),
  )
    ? OrderStatus.COMPLETED
    : items.some((item) => item.status !== OrderItemStatus.NOT_RECEIVED)
      ? OrderStatus.IN_PROGRESS
      : OrderStatus.NEW;

  await tx.order.updateMany({
    where: { orderNumber, status: { not: OrderStatus.CANCELLED } },
    data: { status },
  });

  return status;
}

/**
 * Take a row-level lock on an order item for the rest of the transaction.
 *
 * Postgres runs at READ COMMITTED, so two concurrent receipts (or a receipt
 * racing a QC or an adjustment) would otherwise both read the same
 * `receivedQuantity`, both pass their ceiling check, and one write would be
 * lost. Every mutation that reads a quantity and then writes it takes this lock
 * first, which serialises them on the row.
 */
export async function lockOrderItem(
  tx: Prisma.TransactionClient,
  orderItemId: number,
): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "OrderItem" WHERE id = ${orderItemId} FOR UPDATE`;
}
