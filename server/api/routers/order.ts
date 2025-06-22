import { createTRPCRouter, privateProcedure } from "@/server/api/trpc";
import { z } from "zod";

export const orderRouter = createTRPCRouter({
  getAllOrders: privateProcedure.query(async ({ ctx }) => {
    const orders = await ctx.db.order.findMany({
      include: {
        vendor: {
          select: {
            name: true,
            reference: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return orders;
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
      await ctx.db.dockBooking.delete({ where: { id: input.id } });
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
});
