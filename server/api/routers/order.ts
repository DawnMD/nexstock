import { createTRPCRouter, privateProcedure } from "@/server/api/trpc";

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
});
