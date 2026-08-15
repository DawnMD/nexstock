/**
 * Dock bookings and the vehicle lifecycle that runs on top of them.
 *
 * This module is the odd one out historically: every other flow in the app went
 * through a service with real invariants, while dock booking talked to Prisma
 * straight from the router. It accepted any `dockId` (a bad one surfaced as a raw
 * `P2003` and a 500), let two vehicles sit on one dock at the same time, let two
 * bookings share a queue position, and wrote dock activities in any order at all —
 * a vehicle could be checked out before it had ever checked in.
 *
 * The `CHECK_IN → OPEN → CLOSE → CHECK_OUT` lifecycle in the README was, until
 * now, enforced only by which buttons `dock-booking-list.tsx` chose to render.
 */
import type { Prisma } from "@/generated/prisma/client";
import { ActivityType } from "@/generated/prisma/client";
import {
  badRequest,
  conflict,
  notFound,
  preconditionFailed,
} from "@/server/services/errors";

/**
 * The lifecycle, in order. Index position is the whole state machine: a step is
 * allowed exactly when its immediate predecessor has been recorded and it has
 * not been recorded itself.
 */
const ACTIVITY_SEQUENCE = [
  ActivityType.CHECK_IN,
  ActivityType.OPEN,
  ActivityType.CLOSE,
  ActivityType.CHECK_OUT,
] as const;

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  [ActivityType.CHECK_IN]: "check in",
  [ActivityType.OPEN]: "open",
  [ActivityType.CLOSE]: "close",
  [ActivityType.CHECK_OUT]: "check out",
};

export interface DockBookingInput {
  orderNumber: string;
  dockId: number;
  vehicleTypeId: number;
  vehicleNumber: string;
  weight: number;
  queue: number;
  cbm: number;
  driverName: string;
  driverPhone?: string;
  eta?: Date;
}

const bookingInclude = {
  dock: { select: { id: true, name: true } },
  vehicleType: {
    select: { id: true, type: true, description: true, unloadTime: true },
  },
} satisfies Prisma.DockBookingInclude;

/**
 * Validate the parts of a booking that the database cannot.
 *
 * `excludeBookingId` is set on update so a booking doesn't collide with itself.
 */
async function assertBookingIsPlaceable(
  tx: Prisma.TransactionClient,
  input: DockBookingInput,
  excludeBookingId?: number,
) {
  if (input.weight < 0) throw badRequest("Weight cannot be negative");
  if (input.cbm < 0) throw badRequest("CBM cannot be negative");
  if (input.queue < 1) throw badRequest("Queue position starts at 1");

  const [order, dock, vehicleType] = await Promise.all([
    tx.order.findUnique({
      where: { orderNumber: input.orderNumber },
      select: { orderNumber: true },
    }),
    tx.dock.findUnique({
      where: { id: input.dockId },
      select: { name: true, status: true },
    }),
    tx.vehicleType.findUnique({
      where: { id: input.vehicleTypeId },
      select: { id: true },
    }),
  ]);

  // These three are foreign keys. Checking them here turns a raw Prisma P2003
  // (which reaches the operator as a 500) into a message that names what is
  // actually missing.
  if (!order) throw notFound(`Order ${input.orderNumber} not found`);
  if (!dock) throw notFound(`Dock ${input.dockId} not found`);
  if (!vehicleType)
    throw notFound(`Vehicle type ${input.vehicleTypeId} not found`);

  if (!dock.status) {
    throw badRequest(`Dock ${dock.name} is not active`);
  }

  const otherBookings = {
    ...(excludeBookingId != null ? { id: { not: excludeBookingId } } : {}),
  };

  // A vehicle arrives against an order once. Two bookings for the same plate on
  // one order is a double entry, and it makes `getDockBookingByVehicleNumber…`
  // (a findFirst) silently pick one of them.
  const duplicateVehicle = await tx.dockBooking.findFirst({
    where: {
      ...otherBookings,
      orderId: input.orderNumber,
      vehicleNumber: input.vehicleNumber,
    },
    select: { id: true },
  });

  if (duplicateVehicle) {
    throw conflict(
      `Vehicle ${input.vehicleNumber} is already booked on order ${input.orderNumber}`,
    );
  }

  // The dock board sorts on `queue`, so duplicates within an order make the
  // unload order ambiguous.
  const duplicateQueue = await tx.dockBooking.findFirst({
    where: {
      ...otherBookings,
      orderId: input.orderNumber,
      queue: input.queue,
    },
    select: { vehicleNumber: true },
  });

  if (duplicateQueue) {
    throw conflict(
      `Queue position ${input.queue} on order ${input.orderNumber} is already taken by vehicle ${duplicateQueue.vehicleNumber}`,
    );
  }

  // A dock takes one vehicle at a time. `eta` is the only scheduling column on
  // the model, so an exact collision is the strongest claim that can honestly be
  // made here — bookings without an eta are unscheduled and not checked.
  if (input.eta) {
    const dockTaken = await tx.dockBooking.findFirst({
      where: { ...otherBookings, dockId: input.dockId, eta: input.eta },
      select: { vehicleNumber: true },
    });

    if (dockTaken) {
      throw conflict(
        `Dock ${dock.name} is already booked at that time by vehicle ${dockTaken.vehicleNumber}`,
      );
    }
  }
}

export async function createDockBooking(
  tx: Prisma.TransactionClient,
  input: DockBookingInput,
) {
  await assertBookingIsPlaceable(tx, input);

  const { orderNumber, ...data } = input;

  return await tx.dockBooking.create({
    data: { ...data, orderId: orderNumber },
    include: bookingInclude,
  });
}

export async function updateDockBooking(
  tx: Prisma.TransactionClient,
  input: DockBookingInput & { id: number },
) {
  const { id, orderNumber, ...data } = input;

  const existing = await tx.dockBooking.findUnique({
    where: { id },
    select: { orderId: true },
  });

  if (!existing) throw notFound(`Dock booking ${id} not found`);

  // `orderNumber` arrives from the client alongside the id. Without this the
  // edit form could move a booking onto a different order, orphaning the
  // activities recorded against it.
  if (existing.orderId !== orderNumber) {
    throw badRequest(
      `Dock booking ${id} belongs to order ${existing.orderId}, not ${orderNumber}`,
    );
  }

  await assertBookingIsPlaceable(tx, input, id);

  return await tx.dockBooking.update({
    where: { id },
    data,
    include: bookingInclude,
  });
}

/**
 * `DockActivity` is `onDelete: Cascade`, so removing a booking takes its whole
 * check-in/open/close/check-out trail with it. A vehicle that has already been
 * worked is history worth keeping, so once anything has been recorded against it
 * the booking can no longer be deleted.
 */
export async function deleteDockBooking(
  tx: Prisma.TransactionClient,
  id: number,
) {
  const existing = await tx.dockBooking.findUnique({
    where: { id },
    select: {
      vehicleNumber: true,
      _count: { select: { activities: true } },
    },
  });

  if (!existing) throw notFound(`Dock booking ${id} not found`);

  if (existing._count.activities > 0) {
    throw badRequest(
      `Vehicle ${existing.vehicleNumber} has already been worked (${existing._count.activities} activities recorded) and its booking cannot be deleted`,
    );
  }

  return await tx.dockBooking.delete({ where: { id }, select: { id: true } });
}

export interface DockActivityInput {
  orderNumber: string;
  vehicleNumber: string;
  activityType: ActivityType;
  notes?: string;
  containerCondition?: boolean;
  createdBy: string;
}

export async function recordDockActivity(
  tx: Prisma.TransactionClient,
  input: DockActivityInput,
) {
  const booking = await tx.dockBooking.findFirst({
    where: {
      vehicleNumber: input.vehicleNumber,
      orderId: input.orderNumber,
    },
    select: { id: true },
  });

  if (!booking) {
    throw notFound(
      `No dock booking for vehicle ${input.vehicleNumber} on order ${input.orderNumber}`,
    );
  }

  // Serialise activity writes against this booking. Without the lock a
  // double-submitted form has both requests read the same activity list, both
  // find the step unrecorded, and both insert it.
  await tx.$queryRaw`SELECT id FROM "DockBooking" WHERE id = ${booking.id} FOR UPDATE`;

  const recorded = await tx.dockActivity.findMany({
    where: { dockBookingId: booking.id },
    select: { activityType: true },
  });
  const done = new Set(recorded.map((activity) => activity.activityType));

  if (done.has(input.activityType)) {
    throw conflict(
      `Vehicle ${input.vehicleNumber} has already been recorded as "${ACTIVITY_LABELS[input.activityType]}"`,
    );
  }

  const step = ACTIVITY_SEQUENCE.indexOf(input.activityType);
  const previous = ACTIVITY_SEQUENCE[step - 1];

  if (previous !== undefined && !done.has(previous)) {
    throw preconditionFailed(
      `Vehicle ${input.vehicleNumber} has to ${ACTIVITY_LABELS[previous]} before it can ${ACTIVITY_LABELS[input.activityType]}`,
    );
  }

  return await tx.dockActivity.create({
    data: {
      activityType: input.activityType,
      dockBookingId: booking.id,
      createdBy: input.createdBy,
      updatedBy: input.createdBy,
      notes: input.notes,
      // Only the OPEN step inspects the container; leaving the column at its
      // `false` default for the other steps would read as "bad condition"
      // everywhere rather than "not applicable".
      containerCondition: input.containerCondition ?? false,
    },
  });
}

export { ACTIVITY_SEQUENCE };
