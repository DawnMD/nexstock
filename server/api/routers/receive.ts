import { createTRPCRouter, privateProcedure } from "@/server/api/trpc";
import { receiveStock } from "@/server/services/receiving";
import { z } from "zod";

export const receiveRouter = createTRPCRouter({
  getAllOrderNumbers: privateProcedure.query(async ({ ctx }) => {
    const orderNumbers = await ctx.db.order.findMany({
      select: {
        orderNumber: true,
        vendor: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
    });
    return orderNumbers;
  }),
  getOrderItems: privateProcedure
    .input(
      z.object({
        orderNumber: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orderItems = await ctx.db.order.findUnique({
        where: {
          orderNumber: input.orderNumber,
        },
        select: {
          items: {
            select: {
              id: true,
              Sku: {
                select: {
                  sku: true,
                  description: true,
                },
              },
              orderedQuantity: true,
              receivedQuantity: true,
              status: true,
              qualityCheck: {
                select: {
                  qualityCheckStatus: true,
                },
              },
            },
          },
          vendor: {
            select: {
              name: true,
            },
          },
          createdAt: true,
        },
      });

      return orderItems;
    }),
  getReceiveItem: privateProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input: { id } }) => {
      return await ctx.db.orderItem.findUnique({
        where: { id },
        select: {
          Sku: {
            select: {
              sku: true,
              description: true,
            },
          },
          description: true,
          department: true,
          orderedQuantity: true,
          receivedQuantity: true,
          qualityCheck: {
            select: {
              qualityCheckStatus: true,
            },
          },
        },
      });
    }),
  getOrderVehicles: privateProcedure
    .input(z.object({ orderNumber: z.string() }))
    .query(async ({ ctx, input }) => {
      const dockBookings = await ctx.db.dockBooking.findMany({
        where: { orderId: input.orderNumber },
        select: {
          vehicleNumber: true,
        },
      });
      return dockBookings;
    }),

  getReceivedItemsByOrder: privateProcedure
    .input(
      z.object({
        orderNumber: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const receivedItems = await ctx.db.receiveItem.findMany({
        where: {
          orderItem: {
            Order: {
              orderNumber: input.orderNumber,
            },
          },
        },
        select: {
          id: true,
          lpn: true,
          sku: true,
          location: true,
          receivedQuantity: true,
          uom: true,
        },
        orderBy: {
          receivedAt: "desc",
        },
      });
      return receivedItems;
    }),

  updateReceiveStatus: privateProcedure
    .input(
      z.object({
        id: z.number(),
        receivedQuantity: z
          .number()
          .min(1, "Received quantity must be at least 1"),
        sku: z.string(),
        receivedNotes: z.string().optional(),
        location: z.string().min(1, "Location is required"),
        lpn: z.string().min(1, "LPN is required"),
        lot: z.string().optional(),
        manufacturedDate: z.date().optional().nullable(),
        uom: z.string(),
        lotExpiryDate: z.date().optional().nullable(),
        vehicleNumber: z.string().min(1, "Vehicle number is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...receiveData } = input;

      return await ctx.db.$transaction((tx) =>
        receiveStock(tx, {
          orderItemId: id,
          receivedBy: ctx.userId,
          ...receiveData,
        }),
      );
    }),
});
