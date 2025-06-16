import { createTRPCRouter, privateProcedure } from "@/server/api/trpc";
import { z } from "zod";

export const orderRouter = createTRPCRouter({
  getAllOrders: privateProcedure.query(async ({ ctx }) => {
    const orders = await ctx.db.order.findMany({
      include: {
        vendor: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return orders;
  }),

  getOrderDetails: privateProcedure
    .input(
      z.object({
        id: z
          .string()
          .transform((val) => parseInt(val, 10))
          .refine((val) => !isNaN(val), {
            message: "ID must be a valid number",
          }),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orderDetails = await ctx.db.order.findUnique({
        where: { id: input.id },
        include: {
          vendor: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!orderDetails) {
        throw new Error("Order not found");
      }

      return orderDetails;
    }),
});
