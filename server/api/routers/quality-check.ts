import { lockOrderItem, syncOrderStatus } from "@/server/api/order-status";
import { createTRPCRouter, privateProcedure } from "@/server/api/trpc";
import { OrderItemStatus, OrderStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const qualityCheckRouter = createTRPCRouter({
  getAllOrderNumbers: privateProcedure.query(async ({ ctx }) => {
    const orderNumbers = await ctx.db.order.findMany({
      select: {
        orderNumber: true,
        vendor: {
          select: {
            name: true,
          },
        },
        businessUnit: true,
        _count: {
          select: {
            items: true,
          },
        },
      },
      where: {
        status: {
          in: [OrderStatus.NEW, OrderStatus.IN_PROGRESS],
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
              Sku: true,
              qualityCheck: {
                select: {
                  qualityCheckStatus: true,
                  inspectedQuantity: true,
                },
              },
              orderedQuantity: true,
              receivedQuantity: true,
              rejectedQuantity: true,
              id: true,
            },
          },
          dockBookings: {
            select: {
              dockId: true,
              activities: {
                select: {
                  activityType: true,
                },
              },
            },
          },
        },
      });

      return orderItems;
    }),
  getQualityCheckItems: privateProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input: { id } }) => {
      return await ctx.db.orderItem.findUnique({
        where: { id },
        include: {
          Order: {
            include: {
              dockBookings: {
                select: {
                  dockId: true,
                  activities: {
                    select: {
                      activityType: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    }),
  updateQualityCheckStatus: privateProcedure
    .input(
      z
        .object({
          id: z.number().int().positive(),
          rejectedQuantity: z.number().int().nonnegative(),
          inspectedQuantity: z.number().int().positive(),
          remarks: z.string().optional(),
        })
        .refine((data) => data.rejectedQuantity <= data.inspectedQuantity, {
          message: "Rejected quantity cannot exceed inspected quantity",
          path: ["rejectedQuantity"],
        }),
    )
    .mutation(
      async ({
        ctx,
        input: { id, rejectedQuantity, inspectedQuantity, remarks },
      }) => {
        return await ctx.db.$transaction(async (tx) => {
          // A re-inspection reads the running rejected total and writes it
          // back, so it has to be serialised against receipts and adjustments.
          await lockOrderItem(tx, id);

          const orderItem = await tx.orderItem.findUnique({
            where: { id },
            select: {
              orderId: true,
              receivedQuantity: true,
              rejectedQuantity: true,
            },
          });

          if (!orderItem) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Order item not found",
            });
          }

          // You cannot inspect goods that have not arrived.
          if (inspectedQuantity > orderItem.receivedQuantity) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Cannot inspect more than was received. Received: ${orderItem.receivedQuantity}, attempting to inspect: ${inspectedQuantity}`,
            });
          }

          const newRejectedQuantity =
            orderItem.rejectedQuantity + rejectedQuantity;

          if (newRejectedQuantity > orderItem.receivedQuantity) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Cannot reject more than was received. Received: ${orderItem.receivedQuantity}, already rejected: ${orderItem.rejectedQuantity}, attempting to reject: ${rejectedQuantity}`,
            });
          }

          // `qualityCheckStatus` is the pass/fail verdict, not "a check
          // happened" — it was hardcoded true, so a 100% rejection recorded as
          // passed. The presence of the row is what means "inspected".
          const passed = rejectedQuantity === 0;

          // upsert, not create: QualityCheck.orderItemId is unique, so a
          // re-inspection or a double-clicked submit used to throw P2002.
          await tx.qualityCheck.upsert({
            where: { orderItemId: id },
            create: {
              orderItemId: id,
              qualityCheckStatus: passed,
              inspectedBy: ctx.userId,
              inspectedQuantity,
              remarks,
            },
            update: {
              qualityCheckStatus: passed,
              inspectedBy: ctx.userId,
              inspectedAt: new Date(),
              inspectedQuantity,
              remarks,
            },
          });

          const updatedOrderItem = await tx.orderItem.update({
            where: { id },
            data: {
              rejectedQuantity: { increment: rejectedQuantity },
              ...(newRejectedQuantity >= orderItem.receivedQuantity
                ? { status: OrderItemStatus.REJECTED }
                : {}),
            },
          });

          await syncOrderStatus(tx, orderItem.orderId);

          return updatedOrderItem;
        });
      },
    ),
});
