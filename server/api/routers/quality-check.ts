import { createTRPCRouter, privateProcedure } from "@/server/api/trpc";
import { OrderStatus } from "@prisma/client";
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
                },
              },
              orderedQuantity: true,
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
                include: {
                  activities: {
                    select: {
                      activityType: true,
                    },
                  },
                },
                select: {
                  dockId: true,
                },
              },
            },
          },
        },
      });
    }),
  updateQualityCheckStatus: privateProcedure
    .input(
      z.object({
        id: z.number(),
        rejectedQuantity: z.number(),
        inspectedQuantity: z.number(),
      }),
    )
    .mutation(
      async ({ ctx, input: { id, rejectedQuantity, inspectedQuantity } }) => {
        return await ctx.db.orderItem.update({
          where: { id },
          data: {
            qualityCheck: {
              create: {
                qualityCheckStatus: true,
                inspectedBy: ctx.userId,
                inspectedQuantity,
              },
            },
            rejectedQuantity: rejectedQuantity,
          },
        });
      },
    ),
});
