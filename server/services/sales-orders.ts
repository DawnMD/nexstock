/**
 * Sales order master data — the outbound counterpart of a purchase `Order`.
 */
import type { Prisma } from "@/generated/prisma/client";
import { SalesOrderStatus } from "@/generated/prisma/client";
import { badRequest, conflict, notFound } from "@/server/services/errors";
import { syncSalesOrderStatus } from "@/server/services/allocation";

export interface SalesOrderInput {
  orderNumber: string;
  customerReference: string;
  requestedShipDate?: Date | null;
  notes?: string | null;
  lines: { sku: string; orderedQuantity: number }[];
}

export async function createSalesOrder(
  tx: Prisma.TransactionClient,
  input: SalesOrderInput & { createdBy: string },
) {
  const { createdBy, lines, ...data } = input;

  if (lines.length === 0) {
    throw badRequest("A sales order needs at least one line");
  }

  const existing = await tx.salesOrder.findUnique({
    where: { orderNumber: data.orderNumber },
    select: { id: true },
  });
  if (existing) {
    throw conflict(`Sales order ${data.orderNumber} already exists`);
  }

  const customer = await tx.customer.findUnique({
    where: { reference: data.customerReference },
    select: { id: true },
  });
  if (!customer) {
    throw notFound(`Customer ${data.customerReference} not found`);
  }

  // `SalesOrderItem.sku` is a foreign key, so an unknown or retired SKU is
  // caught here with a message naming it rather than as a raw constraint error.
  const skus = [...new Set(lines.map((line) => line.sku))];
  const known = await tx.sku.findMany({
    where: { sku: { in: skus } },
    select: { sku: true, isActive: true },
  });
  const bySku = new Map(known.map((entry) => [entry.sku, entry]));

  for (const sku of skus) {
    const record = bySku.get(sku);
    if (!record) throw notFound(`SKU ${sku} not found`);
    if (!record.isActive) throw badRequest(`SKU ${sku} is not active`);
  }

  for (const line of lines) {
    if (line.orderedQuantity <= 0) {
      throw badRequest(`Line for ${line.sku} must order at least one unit`);
    }
  }

  return await tx.salesOrder.create({
    data: {
      ...data,
      createdBy,
      updatedBy: createdBy,
      items: {
        create: lines.map((line) => ({
          sku: line.sku,
          orderedQuantity: line.orderedQuantity,
        })),
      },
    },
    include: { items: true, customer: true },
  });
}

/**
 * Cancel an order. Only possible while nothing has physically moved: once stock
 * has been picked it is sitting in the dispatch bay and has to be put back
 * (`reversePick`) before the order can be written off.
 */
export async function cancelSalesOrder(
  tx: Prisma.TransactionClient,
  input: { orderNumber: string; cancelledBy: string },
) {
  const order = await tx.salesOrder.findUnique({
    where: { orderNumber: input.orderNumber },
    select: {
      status: true,
      items: { select: { pickedQuantity: true, shippedQuantity: true } },
    },
  });

  if (!order) throw notFound(`Sales order ${input.orderNumber} not found`);

  if (order.status === SalesOrderStatus.CANCELLED) {
    throw conflict("This sales order is already cancelled");
  }

  const moved = order.items.reduce(
    (sum, item) => sum + item.pickedQuantity + item.shippedQuantity,
    0,
  );

  if (moved > 0) {
    throw badRequest(
      "Stock has already been picked against this order. Reverse the picks before cancelling it.",
    );
  }

  // Free anything still reserved, then park the order.
  await tx.pickTask.updateMany({
    where: { orderId: input.orderNumber, status: "PENDING" },
    data: { status: "CANCELLED" },
  });

  await tx.salesOrderItem.updateMany({
    where: { orderId: input.orderNumber },
    data: { allocatedQuantity: 0, status: "PENDING" },
  });

  return await tx.salesOrder.update({
    where: { orderNumber: input.orderNumber },
    data: {
      status: SalesOrderStatus.CANCELLED,
      updatedBy: input.cancelledBy,
    },
  });
}

export { syncSalesOrderStatus };
