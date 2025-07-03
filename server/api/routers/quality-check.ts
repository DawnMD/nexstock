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
});
