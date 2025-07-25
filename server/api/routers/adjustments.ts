import { createTRPCRouter, privateProcedure } from "@/server/api/trpc";
import { AdjustmentType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const adjustmentsRouter = createTRPCRouter({
  getAdjustments: privateProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        pageIndex: z.number().default(0),
        search: z.string().nullish(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Execute both queries in a transaction for consistency
      const [adjustments, count] = await ctx.db.$transaction([
        // Get paginated adjustments with search filter
        ctx.db.adjustment.findMany({
          take: input.limit, // Number of items per page
          skip: input.limit * input.pageIndex, // Skip items for pagination
          // Search filter - match SKU, order number, or adjustment ID if search term provided
          where: input.search
            ? {
                OR: [
                  {
                    orderItem: { Sku: { sku: { contains: input.search } } },
                  },
                  {
                    order: { orderNumber: { contains: input.search } },
                  },
                  {
                    id: {
                      contains: input.search,
                    },
                  },
                ],
              }
            : undefined,
          select: {
            id: true,
            createdAt: true,
            adjustedQuantity: true,
            adjustmentType: true,
            reason: true,
            orderItem: {
              select: {
                Sku: {
                  select: {
                    sku: true,
                  },
                },
                description: true,
              },
            },
            order: {
              select: {
                orderNumber: true,
                vendor: {
                  select: {
                    name: true,
                    reference: true,
                  },
                },
              },
            },
          },
        }),
        // Get total count with same search filter for pagination
        ctx.db.adjustment.count({
          where: input.search
            ? {
                OR: [
                  {
                    orderItem: { Sku: { sku: { contains: input.search } } },
                  },
                  {
                    order: { orderNumber: { contains: input.search } },
                  },
                  {
                    id: {
                      contains: input.search,
                    },
                  },
                ],
              }
            : undefined,
        }),
      ]);

      // Calculate pagination metadata
      const hasNextPage = input.pageIndex < Math.ceil(count / input.limit) - 1;
      const hasPreviousPage = input.pageIndex > 0;
      const currentPage = input.pageIndex + 1;

      // Return paginated results with pagination metadata
      return {
        items: adjustments,
        pagination: {
          hasNextPage,
          hasPreviousPage,
          totalCount: count,
          currentPage,
          totalPages: Math.ceil(count / input.limit),
          limit: input.limit,
          pageIndex: input.pageIndex,
        },
      };
    }),
  createAdjustmentBatch: privateProcedure
    .input(
      z.object({
        adjustments: z.array(
          z.object({
            orderItemId: z.number(),
            quantity: z.number().int().positive(),
            notes: z.string().optional(),
            orderNumber: z.string(),
            adjustmentType: z.nativeEnum(AdjustmentType),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.adjustment.createMany({
        data: input.adjustments.map((adj) => ({
          adjustedBy: ctx.userId,
          adjustmentType: adj.adjustmentType,
          adjustedQuantity: adj.quantity,
          reason: adj.notes,
          orderId: adj.orderNumber,
          orderItemId: adj.orderItemId,
        })),
      });

      return null;
    }),
  getOrderInfo: privateProcedure
    .input(z.object({ orderNumber: z.string() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { orderNumber: input.orderNumber },
        select: {
          orderNumber: true,
          createdAt: true,
          businessUnit: true,
          vendor: {
            select: {
              name: true,
              reference: true,
            },
          },
          items: {
            select: {
              id: true,
              skuId: true,
            },
          },
          adjustments: {
            select: {
              id: true,
            },
          },
        },
      });

      return order;
    }),
  checkOrder: privateProcedure
    .input(z.object({ orderNumber: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { orderNumber: input.orderNumber },
        select: {
          id: true,
          orderNumber: true,
          adjustments: {
            select: {
              id: true,
            },
          },
        },
      });

      // Check if order exists
      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      // Check if order has adjustments
      if (order.adjustments.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Order has adjustments",
        });
      }

      return order;
    }),
  getAdjustmentInfo: privateProcedure
    .input(z.object({ adjustmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const adjustment = await ctx.db.adjustment.findUnique({
        where: { id: input.adjustmentId },
        include: {
          order: {
            select: {
              orderNumber: true,
              vendor: {
                select: {
                  name: true,
                  reference: true,
                },
              },
              businessUnit: true,
            },
          },
          orderItem: {
            select: {
              skuId: true,
            },
          },
        },
      });

      return adjustment;
    }),
});
