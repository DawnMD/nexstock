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
});
