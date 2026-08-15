/**
 * Picking, packing and shipping — the three steps that take stock back out.
 *
 * Each one goes through `recordMovement` exactly as the inbound flows do, so the
 * ledger keeps explaining the whole warehouse and `getDrift` keeps reconciling
 * across both directions.
 *
 * A pick is a net-zero pair, like a putaway: units leave the rack and land in
 * the dispatch bay, so total stock is unchanged and only the location moves.
 * Packing writes no movement at all — a carton is a grouping for dispatch, and
 * the units are already in the bay. Shipping is the only operation in the entire
 * system that reduces stock on hand without being a write-off.
 */
import type { Prisma } from "@/generated/prisma/client";
import {
  PickTaskStatus,
  SalesOrderItemStatus,
  SalesOrderStatus,
  ShipmentStatus,
} from "@/generated/prisma/client";
import { badRequest, conflict, notFound } from "@/server/services/errors";
import {
  getBalance,
  MovementReason,
  MovementRefType,
  recordMovement,
} from "@/server/services/inventory";
import { syncSalesOrderStatus } from "@/server/services/allocation";

/**
 * Where picked stock waits for its truck. Received goods land in `STAGE` and
 * outbound goods leave from here; both are ordinary `Location` rows so the
 * ledger treats them like any rack.
 */
export const DISPATCH_LOCATION = "DISPATCH";

export interface ConfirmPickInput {
  pickTaskId: number;
  /** Short picks are real — the rack is empty, the pallet is damaged. */
  pickedQuantity: number;
  pickedBy: string;
  dispatchLocation?: string;
}

export async function confirmPick(
  tx: Prisma.TransactionClient,
  input: ConfirmPickInput,
) {
  const dispatchLocation = input.dispatchLocation ?? DISPATCH_LOCATION;

  // Serialise against a double-submitted confirm, which would otherwise move the
  // stock twice.
  await tx.$queryRaw`SELECT id FROM "PickTask" WHERE id = ${input.pickTaskId} FOR UPDATE`;

  const task = await tx.pickTask.findUnique({
    where: { id: input.pickTaskId },
    select: {
      id: true,
      orderId: true,
      orderItemId: true,
      sku: true,
      lpn: true,
      lot: true,
      fromLocation: true,
      quantity: true,
      status: true,
    },
  });

  if (!task) throw notFound(`Pick task ${input.pickTaskId} not found`);

  if (task.status !== PickTaskStatus.PENDING) {
    throw conflict(
      `Pick task ${input.pickTaskId} is already ${task.status.toLowerCase()}`,
    );
  }

  if (input.pickedQuantity < 0) {
    throw badRequest("Picked quantity cannot be negative");
  }

  if (input.pickedQuantity > task.quantity) {
    throw badRequest(
      `Cannot pick more than was allocated. Allocated: ${task.quantity}, picking: ${input.pickedQuantity}`,
    );
  }

  const destination = await tx.location.findUnique({
    where: { location: dispatchLocation },
    select: { status: true },
  });

  if (!destination) {
    throw badRequest(`Dispatch location ${dispatchLocation} does not exist`);
  }

  if (!destination.status) {
    throw badRequest(`Dispatch location ${dispatchLocation} is not active`);
  }

  if (input.pickedQuantity > 0) {
    // Allocation reserved this against a balance read at the time; the rack can
    // have been drawn down since by a QC rejection or an adjustment, so what is
    // actually there is checked again here rather than trusted.
    const available = await getBalance(tx, {
      sku: task.sku,
      location: task.fromLocation,
      lot: task.lot,
      lpn: task.lpn,
    });

    if (available < input.pickedQuantity) {
      throw badRequest(
        `Only ${available} units of ${task.sku} are in ${task.fromLocation}, cannot pick ${input.pickedQuantity}`,
      );
    }

    const movement = {
      sku: task.sku,
      lpn: task.lpn,
      lot: task.lot,
      ref: { type: MovementRefType.PICK_TASK, id: task.id },
      createdBy: input.pickedBy,
    };

    await recordMovement(tx, {
      ...movement,
      location: task.fromLocation,
      quantity: -input.pickedQuantity,
      reason: MovementReason.PICK_OUT,
    });

    await recordMovement(tx, {
      ...movement,
      location: dispatchLocation,
      quantity: input.pickedQuantity,
      reason: MovementReason.PICK_IN,
    });
  }

  await tx.pickTask.update({
    where: { id: task.id },
    data: {
      pickedQuantity: input.pickedQuantity,
      status: PickTaskStatus.PICKED,
      pickedBy: input.pickedBy,
      pickedAt: new Date(),
    },
  });

  // The reservation is discharged whether it was filled or short: the units that
  // were not there are no longer promised to anyone.
  const item = await tx.salesOrderItem.update({
    where: { id: task.orderItemId },
    data: {
      allocatedQuantity: { decrement: task.quantity },
      pickedQuantity: { increment: input.pickedQuantity },
    },
    select: {
      orderedQuantity: true,
      allocatedQuantity: true,
      pickedQuantity: true,
      shippedQuantity: true,
    },
  });

  await tx.salesOrderItem.update({
    where: { id: task.orderItemId },
    data: { status: itemStatusFor(item) },
  });

  await syncSalesOrderStatus(tx, task.orderId);

  return await tx.pickTask.findUniqueOrThrow({ where: { id: task.id } });
}

function itemStatusFor(item: {
  orderedQuantity: number;
  allocatedQuantity: number;
  pickedQuantity: number;
  shippedQuantity: number;
}): SalesOrderItemStatus {
  if (
    item.shippedQuantity >= item.orderedQuantity &&
    item.shippedQuantity > 0
  ) {
    return SalesOrderItemStatus.SHIPPED;
  }
  if (item.pickedQuantity >= item.orderedQuantity) {
    return SalesOrderItemStatus.PICKED;
  }
  if (item.allocatedQuantity > 0) {
    return SalesOrderItemStatus.ALLOCATED;
  }
  // Nothing outstanding and not filled: the picker found less than was promised.
  if (item.pickedQuantity > 0) return SalesOrderItemStatus.SHORT;
  return SalesOrderItemStatus.PENDING;
}

/**
 * Undo a confirmed pick, sending the units back to the rack they came from.
 *
 * Same shape as `resetQualityCheck`: the ledger is append-only, so the reversal
 * is a compensating pair of entries derived from the movements the pick actually
 * wrote, not a delete.
 */
export async function reversePick(
  tx: Prisma.TransactionClient,
  input: { pickTaskId: number; reversedBy: string },
) {
  await tx.$queryRaw`SELECT id FROM "PickTask" WHERE id = ${input.pickTaskId} FOR UPDATE`;

  const task = await tx.pickTask.findUnique({
    where: { id: input.pickTaskId },
    select: {
      id: true,
      orderId: true,
      orderItemId: true,
      quantity: true,
      pickedQuantity: true,
      status: true,
      cartonId: true,
    },
  });

  if (!task) throw notFound(`Pick task ${input.pickTaskId} not found`);

  if (task.status !== PickTaskStatus.PICKED) {
    throw badRequest("Only a picked task can be reversed");
  }

  if (task.cartonId != null) {
    throw badRequest(
      "This pick has been packed into a carton. Unpack the carton before reversing it.",
    );
  }

  const movements = await tx.inventoryMovement.findMany({
    where: {
      refType: MovementRefType.PICK_TASK,
      refId: String(task.id),
      reason: { in: [MovementReason.PICK_OUT, MovementReason.PICK_IN] },
    },
    select: { sku: true, lpn: true, lot: true, location: true, quantity: true },
  });

  for (const movement of movements) {
    await recordMovement(tx, {
      sku: movement.sku,
      lpn: movement.lpn,
      lot: movement.lot,
      location: movement.location,
      quantity: -movement.quantity,
      reason: MovementReason.PICK_REVERSAL,
      ref: { type: MovementRefType.PICK_TASK, id: task.id },
      createdBy: input.reversedBy,
      notes: `Reversal of pick task ${task.id}`,
    });
  }

  // Back to PENDING rather than CANCELLED: the work still needs doing, and the
  // reservation it carried is restored with it.
  await tx.pickTask.update({
    where: { id: task.id },
    data: {
      status: PickTaskStatus.PENDING,
      pickedQuantity: 0,
      pickedBy: null,
      pickedAt: null,
    },
  });

  const item = await tx.salesOrderItem.update({
    where: { id: task.orderItemId },
    data: {
      allocatedQuantity: { increment: task.quantity },
      pickedQuantity: { decrement: task.pickedQuantity },
    },
    select: {
      orderedQuantity: true,
      allocatedQuantity: true,
      pickedQuantity: true,
      shippedQuantity: true,
    },
  });

  await tx.salesOrderItem.update({
    where: { id: task.orderItemId },
    data: { status: itemStatusFor(item) },
  });

  await syncSalesOrderStatus(tx, task.orderId);

  return { reversed: task.id };
}

/**
 * Group picked lines into a carton for dispatch.
 *
 * Deliberately writes no `InventoryMovement`: the units are already in the
 * dispatch bay, and a carton says how they are boxed rather than where they are.
 * Putting a movement here would double-count them.
 */
export async function packCarton(
  tx: Prisma.TransactionClient,
  input: {
    cartonNumber: string;
    pickTaskIds: number[];
    weight?: number | null;
    packedBy: string;
  },
) {
  if (input.pickTaskIds.length === 0) {
    throw badRequest("A carton has to contain at least one picked line");
  }

  const existing = await tx.carton.findUnique({
    where: { cartonNumber: input.cartonNumber },
    select: { id: true },
  });

  if (existing) {
    throw conflict(`Carton ${input.cartonNumber} already exists`);
  }

  const tasks = await tx.pickTask.findMany({
    where: { id: { in: input.pickTaskIds } },
    select: { id: true, status: true, cartonId: true, pickedQuantity: true },
  });

  if (tasks.length !== input.pickTaskIds.length) {
    throw notFound("One or more of those pick tasks does not exist");
  }

  for (const task of tasks) {
    if (task.status !== PickTaskStatus.PICKED) {
      throw badRequest(`Pick task ${task.id} has not been picked yet`);
    }
    if (task.cartonId != null) {
      throw conflict(`Pick task ${task.id} is already in a carton`);
    }
    if (task.pickedQuantity <= 0) {
      throw badRequest(
        `Pick task ${task.id} came up empty and has nothing to pack`,
      );
    }
  }

  const carton = await tx.carton.create({
    data: {
      cartonNumber: input.cartonNumber,
      weight: input.weight,
      packedBy: input.packedBy,
    },
  });

  await tx.pickTask.updateMany({
    where: { id: { in: input.pickTaskIds } },
    data: { cartonId: carton.id },
  });

  return carton;
}

/**
 * Send the cartons out. This is the point at which the business stops owning the
 * stock, so it is the only thing here that writes a one-sided negative movement.
 */
export async function confirmShipment(
  tx: Prisma.TransactionClient,
  input: {
    shipmentNumber: string;
    orderNumber: string;
    carrier: string;
    trackingNumber?: string;
    cartonIds: number[];
    shippedBy: string;
    dispatchLocation?: string;
  },
) {
  const dispatchLocation = input.dispatchLocation ?? DISPATCH_LOCATION;

  const order = await tx.salesOrder.findUnique({
    where: { orderNumber: input.orderNumber },
    select: { status: true },
  });

  if (!order) throw notFound(`Sales order ${input.orderNumber} not found`);
  if (order.status === SalesOrderStatus.CANCELLED) {
    throw badRequest("A cancelled sales order cannot be shipped");
  }

  const duplicate = await tx.shipment.findUnique({
    where: { shipmentNumber: input.shipmentNumber },
    select: { id: true },
  });
  if (duplicate) {
    throw conflict(`Shipment ${input.shipmentNumber} already exists`);
  }

  if (input.cartonIds.length === 0) {
    throw badRequest("A shipment has to contain at least one carton");
  }

  const cartons = await tx.carton.findMany({
    where: { id: { in: input.cartonIds } },
    select: {
      id: true,
      cartonNumber: true,
      shipmentId: true,
      contents: {
        select: {
          id: true,
          orderId: true,
          orderItemId: true,
          sku: true,
          lpn: true,
          lot: true,
          pickedQuantity: true,
        },
      },
    },
  });

  if (cartons.length !== input.cartonIds.length) {
    throw notFound("One or more of those cartons does not exist");
  }

  for (const carton of cartons) {
    if (carton.shipmentId != null) {
      throw conflict(`Carton ${carton.cartonNumber} has already shipped`);
    }
    for (const task of carton.contents) {
      if (task.orderId !== input.orderNumber) {
        throw badRequest(
          `Carton ${carton.cartonNumber} holds stock for order ${task.orderId}, not ${input.orderNumber}`,
        );
      }
    }
  }

  const shipment = await tx.shipment.create({
    data: {
      shipmentNumber: input.shipmentNumber,
      orderId: input.orderNumber,
      carrier: input.carrier,
      trackingNumber: input.trackingNumber,
      status: ShipmentStatus.SHIPPED,
      shippedBy: input.shippedBy,
      shippedAt: new Date(),
    },
  });

  await tx.carton.updateMany({
    where: { id: { in: input.cartonIds } },
    data: { shipmentId: shipment.id },
  });

  const shippedByItem = new Map<number, number>();

  for (const carton of cartons) {
    for (const task of carton.contents) {
      await recordMovement(tx, {
        sku: task.sku,
        lpn: task.lpn,
        lot: task.lot,
        location: dispatchLocation,
        quantity: -task.pickedQuantity,
        reason: MovementReason.SHIP,
        ref: { type: MovementRefType.SHIPMENT, id: shipment.id },
        createdBy: input.shippedBy,
        notes: `Shipment ${input.shipmentNumber}, carton ${carton.cartonNumber}`,
      });

      shippedByItem.set(
        task.orderItemId,
        (shippedByItem.get(task.orderItemId) ?? 0) + task.pickedQuantity,
      );
    }
  }

  for (const [orderItemId, quantity] of shippedByItem) {
    const item = await tx.salesOrderItem.update({
      where: { id: orderItemId },
      data: { shippedQuantity: { increment: quantity } },
      select: {
        orderedQuantity: true,
        allocatedQuantity: true,
        pickedQuantity: true,
        shippedQuantity: true,
      },
    });

    await tx.salesOrderItem.update({
      where: { id: orderItemId },
      data: { status: itemStatusFor(item) },
    });
  }

  await syncSalesOrderStatus(tx, input.orderNumber);

  return shipment;
}
