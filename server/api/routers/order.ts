import { calculateOrderStats } from "@/lib/order-utils";
import { createTRPCRouter, privateProcedure } from "@/server/api/trpc";
import type { Prisma } from "@prisma/client";
import { ActivityType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { endOfDay, startOfDay } from "date-fns";
import { z } from "zod";

export const orderRouter = createTRPCRouter({
  getPaginatedOrders: privateProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        pageIndex: z.number().default(0),
        search: z.string().nullish(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
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
      } catch (error) {
        throw new Error(
          `Failed to fetch paginated orders: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }),
  getOrderDetailsByOrderNumber: privateProcedure
    .input(
      z.object({
        orderNumber: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
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
              sku: true,
              department: true,
              qualityCheck: true,
              orderedQuantity: true,
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
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { orderNumber: input.orderNumber },
        select: { id: true },
      });

      if (!order) {
        return [];
      }

      const dockBookings = await ctx.db.dockBooking.findMany({
        where: { orderId: order.id },
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
        },
        orderBy: { createdAt: "desc" },
      });

      return dockBookings;
    }),

  getAvailableDocks: privateProcedure.query(async ({ ctx }) => {
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

  getVehicleTypes: privateProcedure.query(async ({ ctx }) => {
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

  deleteDockBooking: privateProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const deletedBooking = await ctx.db.dockBooking.delete({
        where: { id: input.id },
        select: {
          id: true,
        },
      });
      return deletedBooking;
    }),

  createDockBooking: privateProcedure
    .input(
      z.object({
        orderNumber: z.string(),
        dockId: z.number(),
        vehicleTypeId: z.number(),
        vehicleNumber: z.string(),
        weight: z.number(),
        queue: z.number(),
        cbm: z.number(),
        driverName: z.string(),
        driverPhone: z.string().optional(),
        eta: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { orderNumber: input.orderNumber },
        select: { id: true },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      const dockBooking = await ctx.db.dockBooking.create({
        data: {
          orderId: order.id,
          dockId: input.dockId,
          vehicleTypeId: input.vehicleTypeId,
          vehicleNumber: input.vehicleNumber,
          weight: input.weight,
          queue: input.queue,
          cbm: input.cbm,
          driverName: input.driverName,
          driverPhone: input.driverPhone,
          eta: input.eta,
        },
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
        },
      });

      return dockBooking;
    }),
  getOrderStats: privateProcedure.query(async ({ ctx }) => {
    const orderGroups = await ctx.db.order.groupBy({
      by: ["orderType"],
      _count: {
        orderNumber: true,
      },
    });

    return calculateOrderStats(orderGroups);
  }),
  getTodayDockSchedule: privateProcedure.query(async ({ ctx }) => {
    const dockBookings = await ctx.db.dockBooking.findMany({
      where: {
        createdAt: {
          gte: startOfDay(new Date()),
          lt: endOfDay(new Date()),
        },
      },
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
        order: {
          select: {
            orderNumber: true,
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
    .query(async ({ ctx, input }) => {
      const dockBooking = await ctx.db.dockBooking.findFirst({
        where: {
          vehicleNumber: input.vehicleNumber,
          order: {
            orderNumber: input.orderNumber,
          },
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
  updateDockActivity: privateProcedure
    .input(
      z.object({
        vehicleNumber: z.string(),
        activity: z.nativeEnum(ActivityType),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Find the dock booking by vehicle number
      const dockBooking = await ctx.db.dockBooking.findFirst({
        where: {
          vehicleNumber: input.vehicleNumber,
        },
      });

      if (!dockBooking) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Dock booking not found for vehicle number ${input.vehicleNumber}`,
        });
      }

      // Create a new dock activity
      const dockActivity = await ctx.db.dockActivity.create({
        data: {
          activityType: input.activity,
          dockBookingId: dockBooking.id,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
          notes: input.notes,
        },
      });

      return dockActivity;
    }),
  // get the last activity for a vehicle, will implement the redirection later
  getVehicleLastActivity: privateProcedure
    .input(z.object({ vehicleNumber: z.string(), orderNumber: z.string() }))
    .query(async ({ ctx, input }) => {
      const lastActivity = await ctx.db.dockActivity.findFirst({
        where: {
          AND: [
            {
              dockBooking: {
                vehicleNumber: input.vehicleNumber,
              },
            },
            {
              dockBooking: {
                order: {
                  orderNumber: input.orderNumber,
                },
              },
            },
          ],
        },
        orderBy: { createdAt: "desc" },
      });

      return lastActivity;
    }),
});
