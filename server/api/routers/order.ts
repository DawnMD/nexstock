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
        // Define a Zod schema for the input
        id: z // Define a field named 'id'
          .string() // Specify that 'id' should be a string
          .transform((val) => parseInt(val, 10)) // Transform the string to an integer using base 10
          .refine((val) => !isNaN(val), {
            // Validate that the transformed value is a valid number
            message: "ID must be a valid number", // Custom error message if validation fails
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
      return orderDetails;
    }),
});
