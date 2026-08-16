import { calculateOrderStats } from "@/lib/order-utils";
import { privateProcedure, writeProcedure } from "@/server/api/orpc";
import type { Prisma } from "@/generated/prisma/client";
import { ActivityType } from "@/generated/prisma/client";
import {
  createDockBooking,
  deleteDockBooking,
  recordDockActivity,
  updateDockBooking,
} from "@/server/services/dock";
import { endOfDay, startOfDay } from "date-fns";
import { z } from "zod";

/**
 * Shared by create and update. `weight`/`cbm`/`queue` are bounded here as well
 * as in the service: this is what puts the message under the right field in the
 * booking form, and the service is what holds when something else calls it.
 */
const dockBookingFields = {
  dockId: z.number().int().positive(),
  vehicleTypeId: z.number().int().positive(),
  vehicleNumber: z.string().min(1, "Vehicle number is required"),
  weight: z.number().int().nonnegative(),
  queue: z.number().int().positive(),
  cbm: z.number().int().nonnegative(),
  driverName: z.string().min(1, "Driver name is required"),
  driverPhone: z.string().optional(),
  eta: z.date().optional(),
};

export const orderRouter = {
  getPaginatedOrders: privateProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        pageIndex: z.number().default(0),
        search: z.string().nullish(),
      }),
    )
    .handler(async ({ context: ctx, input }) => {
      const limit = input.limit;
      const { pageIndex, search } = input;

      const where: Prisma.OrderWhereInput = search
        ? {
            OR: [
              { orderNumber: { contains: search, mode: "insensitive" } },
              {
                vendor: {
                  reference: { contains: search, mode: "insensitive" },
                },
              },
            ],
          }
        : {};

      const skip = pageIndex * limit;

      const [items, totalCount] = await Promise.all([
        ctx.db.order.findMany({
          where,
          skip,
          take: limit,
          include: {
            vendor: {
              select: {
                id: true,
                name: true,
                reference: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc", // Always show most recent orders first
          },
        }),
        ctx.db.order.count({ where }),
      ]);

      // Calculate pagination metadata
      const hasNextPage = skip + limit < totalCount;
      const hasPreviousPage = pageIndex > 0;
      const currentPage = pageIndex + 1;

      return {
        items,
        pagination: {
          hasNextPage,
          hasPreviousPage,
          totalCount,
          currentPage,
          totalPages: Math.ceil(totalCount / limit),
          limit,
          pageIndex,
        },
      };
    }),
  getOrderDetailsByOrderNumber: privateProcedure
    .input(
      z.object({
        orderNumber: z.string(),
      }),
    )
    .handler(async ({ context: ctx, input }) => {
      const orderDetails = await ctx.db.order.findUnique({
        where: { orderNumber: input.orderNumber },
        include: {
          vendor: {
            select: {
              name: true,
              reference: true,
            },
          },
          items: {
            select: {
              id: true,
              description: true,
              status: true,
              receivedQuantity: true,
              rejectedQuantity: true,
              Sku: {
                select: {
                  id: true,
                  sku: true,
                },
              },
              department: true,
              qualityCheck: {
                select: {
                  qualityCheckStatus: true,
                },
              },
              orderedQuantity: true,
              adjustments: {
                select: {
                  adjustedQuantity: true,
                  adjustmentType: true,
                },
              },
            },
          },
        },
      });
      return orderDetails;
    }),

  getDockBookingsByOrderNumber: privateProcedure
    .input(
      z.object({
        orderNumber: z.string(),
      }),
    )
    .handler(async ({ context: ctx, input }) => {
      const dockBookings = await ctx.db.dockBooking.findMany({
        where: { orderId: input.orderNumber },
        include: {
          dock: {
            select: {
              id: true,
              name: true,
            },
          },
          vehicleType: {
            select: {
              id: true,
              type: true,
              description: true,
              unloadTime: true,
            },
          },
          // Drives the delete confirmation: a booking with activities against it
          // can't be removed, and the dialog says so before the operator tries.
          _count: { select: { activities: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return dockBookings;
    }),

  getAvailableDocks: privateProcedure.handler(async ({ context: ctx }) => {
    const docks = await ctx.db.dock.findMany({
      where: { status: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });
    return docks;
  }),

  getVehicleTypes: privateProcedure.handler(async ({ context: ctx }) => {
    const vehicleTypes = await ctx.db.vehicleType.findMany({
      select: {
        id: true,
        type: true,
        description: true,
        unloadTime: true,
      },
      orderBy: { type: "asc" },
    });
    return vehicleTypes;
  }),

  deleteDockBooking: writeProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .handler(async ({ context: ctx, input }) => {
      return await ctx.db.$transaction((tx) => deleteDockBooking(tx, input.id));
    }),

  createDockBooking: writeProcedure
    .input(
      z.object({
        orderNumber: z.string().min(1),
        ...dockBookingFields,
      }),
    )
    .handler(async ({ context: ctx, input }) => {
      return await ctx.db.$transaction((tx) => createDockBooking(tx, input));
    }),
  getOrderStats: privateProcedure
    .input(
      z.object({
        date: z.string().nullish(),
      }),
    )
    .handler(async ({ context: ctx, input }) => {
      const selectedDate = input.date ? new Date(input.date) : new Date();

      const orderGroups = await ctx.db.order.groupBy({
        by: ["orderType"],
        _count: {
          orderNumber: true,
        },
        where: {
          dockBookings: {
            some: {
              eta: {
                gte: startOfDay(selectedDate),
                lte: endOfDay(selectedDate),
              },
            },
          },
        },
      });

      return calculateOrderStats(orderGroups);
    }),
  getTodayDockSchedule: privateProcedure
    .input(
      z.object({
        search: z.string().nullish(),
        date: z.string().nullish(),
      }),
    )
    .handler(async ({ context: ctx, input }) => {
      const selectedDate = input.date ? new Date(input.date) : new Date();
      const where: Prisma.DockBookingWhereInput = {
        ...(input.search && {
          OR: [
            {
              vehicleNumber: { contains: input.search, mode: "insensitive" },
            },
            {
              order: {
                orderNumber: { contains: input.search, mode: "insensitive" },
              },
            },
          ],
        }),
        // Filter on `eta`, not `createdAt`. This is the *schedule*: the question
        // is which vehicles are due on the chosen day, not which bookings
        // happened to be typed in that day. `getOrderStats` above already keys
        // off `eta`, so the two date pickers used to disagree — picking the same
        // day on /dashboard and /dock-booking returned different bookings.
        eta: {
          gte: startOfDay(selectedDate),
          lte: endOfDay(selectedDate),
        },
      };

      const dockBookings = await ctx.db.dockBooking.findMany({
        where,
        include: {
          dock: {
            select: {
              id: true,
              name: true,
            },
          },
          vehicleType: {
            select: {
              id: true,
              type: true,
            },
          },
          activities: {
            select: {
              activityType: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
        orderBy: {
          queue: "asc",
        },
      });

      return dockBookings;
    }),
  getDockBookingByVehicleNumberAndOrderNumber: privateProcedure
    .input(
      z.object({
        vehicleNumber: z.string(),
        orderNumber: z.string(),
      }),
    )
    .handler(async ({ context: ctx, input }) => {
      const dockBooking = await ctx.db.dockBooking.findFirst({
        where: {
          vehicleNumber: input.vehicleNumber,
          orderId: input.orderNumber,
        },
        include: {
          dock: {
            select: {
              name: true,
            },
          },
          vehicleType: {
            select: {
              type: true,
            },
          },
        },
      });
      return dockBooking;
    }),
  updateDockActivity: writeProcedure
    .input(
      z.object({
        vehicleNumber: z.string().min(1),
        activity: z.enum(ActivityType),
        notes: z.string().optional(),
        containerCondition: z.boolean().optional(),
        orderNumber: z.string().min(1),
      }),
    )
    .handler(async ({ context: ctx, input }) => {
      return await ctx.db.$transaction((tx) =>
        recordDockActivity(tx, {
          orderNumber: input.orderNumber,
          vehicleNumber: input.vehicleNumber,
          activityType: input.activity,
          notes: input.notes,
          containerCondition: input.containerCondition,
          createdBy: ctx.userId,
        }),
      );
    }),
  updateDockBooking: writeProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        orderNumber: z.string().min(1),
        ...dockBookingFields,
      }),
    )
    .handler(async ({ context: ctx, input }) => {
      return await ctx.db.$transaction((tx) => updateDockBooking(tx, input));
    }),
};
