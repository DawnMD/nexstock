import { createTRPCRouter, privateProcedure } from "@/server/api/trpc";

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
});
