import { createTRPCRouter, privateProcedure } from "@/server/api/trpc";
import { OrderItemStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const ReceiveSkuFormSchema = z.object({
  receivedQuantity: z.number().min(1, "Received quantity must be at least 1"),
  receivedBy: z.string().min(1, "Receiver name is required"),
  receivedAt: z.date(),
  sku: z.string(),
  receivedNotes: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  lpn: z.string().min(1, "LPN is required"),
  lot: z.string().optional(),
  manufacturedDate: z.date().optional().nullable(),
  uom: z.string(),
  lotExpiryDate: z.date().optional().nullable(),
  vehicleNumber: z.string().min(1, "Vehicle number is required"),
});

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
              Sku: true,
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
          businessUnit: true,
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
        include: {
          Sku: true,
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

  checkLpnUniqueness: privateProcedure
    .input(
      z.object({
        lpn: z.string(),
        orderNumber: z.string(),
        sku: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Find any receive items with the same LPN for this order and SKU
      const existingReceiveItem = await ctx.db.receiveItem.findFirst({
        where: {
          lpn: input.lpn,
          sku: input.sku,
          orderItem: {
            orderId: input.orderNumber,
          },
        },
      });

      return {
        isUnique: !existingReceiveItem,
      };
    }),

  updateReceiveStatus: privateProcedure
    .input(
      z.object({
        id: z.number(),
        ...ReceiveSkuFormSchema.shape,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...receiveData } = input;

      // Start a transaction
      return await ctx.db.$transaction(async (tx) => {
        // Get current order item to check quantities
        const currentOrderItem = await tx.orderItem.findUnique({
          where: { id },
          select: {
            orderedQuantity: true,
            receivedQuantity: true,
            orderId: true,
            skuId: true,
          },
        });

        if (!currentOrderItem) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Order item not found",
          });
        }

        // Check if LPN is already used for this SKU in this order
        const existingReceiveItem = await tx.receiveItem.findFirst({
          where: {
            lpn: receiveData.lpn,
            sku: currentOrderItem.skuId,
            orderItem: {
              orderId: currentOrderItem.orderId,
            },
          },
        });

        if (existingReceiveItem) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This LPN is already used for this SKU in this order",
          });
        }

        const newReceivedQuantity =
          (currentOrderItem.receivedQuantity || 0) +
          receiveData.receivedQuantity;

        // Check if we're not receiving more than ordered
        if (newReceivedQuantity > currentOrderItem.orderedQuantity) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot receive more than ordered quantity. Ordered: ${currentOrderItem.orderedQuantity}, Already received: ${currentOrderItem.receivedQuantity}, Attempting to receive: ${receiveData.receivedQuantity}`,
          });
        }

        // Create receive item record
        await tx.receiveItem.create({
          data: {
            orderItemId: id,
            ...receiveData,
          },
        });

        // Update order item status and accumulate received quantity
        const updatedOrderItem = await tx.orderItem.update({
          where: { id },
          data: {
            status:
              newReceivedQuantity === currentOrderItem.orderedQuantity
                ? OrderItemStatus.RECEIVED
                : OrderItemStatus.RECEIVING,
            receivedQuantity: newReceivedQuantity,
          },
        });

        return updatedOrderItem;
      });
    }),
});
