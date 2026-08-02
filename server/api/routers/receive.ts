import {
  lockOrderItem,
  receiveStatusFor,
  syncOrderStatus,
} from "@/server/api/order-status";
import { createTRPCRouter, privateProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
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

      // Start a transaction
      return await ctx.db.$transaction(async (tx) => {
        // Serialise concurrent receipts against this line. Without the lock two
        // requests both read the old receivedQuantity, both pass the ceiling
        // check below, and one receipt is silently lost.
        await lockOrderItem(tx, id);

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

        // The SKU is client-supplied and is written straight onto the
        // ReceiveItem, which is what every downstream putaway query keys off.
        // It has to agree with the line being received against.
        if (receiveData.sku !== currentOrderItem.skuId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `SKU does not match this order line. Expected ${currentOrderItem.skuId}, received ${receiveData.sku}`,
          });
        }

        // ReceiveItem.location is a foreign key now, so check it here to get a
        // readable error instead of a raw Prisma constraint violation.
        const location = await tx.location.findUnique({
          where: { location: receiveData.location },
          select: { status: true },
        });

        if (!location) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Location ${receiveData.location} does not exist`,
          });
        }

        // An LPN is a pallet label, so it is unique across the warehouse. The
        // database enforces this; the check is here for a readable message.
        const existingReceiveItem = await tx.receiveItem.findUnique({
          where: { lpn: receiveData.lpn },
          select: { id: true },
        });

        if (existingReceiveItem) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `LPN ${receiveData.lpn} has already been received`,
          });
        }

        const newReceivedQuantity =
          currentOrderItem.receivedQuantity + receiveData.receivedQuantity;

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
            receivedBy: ctx.userId,
            receivedAt: new Date(),
            ...receiveData,
          },
        });

        // Update order item status and accumulate received quantity
        const updatedOrderItem = await tx.orderItem.update({
          where: { id },
          data: {
            status: receiveStatusFor(
              newReceivedQuantity,
              currentOrderItem.orderedQuantity,
            ),
            receivedQuantity: { increment: receiveData.receivedQuantity },
          },
        });

        await syncOrderStatus(tx, currentOrderItem.orderId);

        return updatedOrderItem;
      });
    }),
});
