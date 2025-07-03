import { createTRPCRouter, privateProcedure } from "@/server/api/trpc";
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
              Sku: true,
              orderedQuantity: true,
              status: true,
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
