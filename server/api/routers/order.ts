import { z } from "zod";
import { calculateOrderStats } from "@/lib/order-utils";
import { createTRPCRouter, privateProcedure } from "@/server/api/trpc";

export const orderRouter = createTRPCRouter({
  getPaginatedOrders: privateProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        pageIndex: z.number().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const limit = input.limit;
        const { pageIndex } = input;

        // Get total count for metadata
        const totalCount = await ctx.db.order.count();

        // Calculate skip for offset-based pagination
        const skip = pageIndex * limit;

        // Fetch orders with vendor data
        const items = await ctx.db.order.findMany({
          take: limit,
          skip,
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
        });

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
});
