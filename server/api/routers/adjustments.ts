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
          // Search filter - match SKU or order number if search term provided
          where: input.search
            ? {
                OR: [
                  { orderItem: { Sku: { sku: { contains: input.search } } } },
                  { order: { orderNumber: { contains: input.search } } },
                ],
              }
            : undefined,
          // Select only needed fields
          select: {
            orderItem: {
              select: {
                Sku: {
                  select: {
                    sku: true,
                  },
                },
              },
            },
            order: {
              select: {
                orderNumber: true,
                vendor: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            adjustedQuantity: true,
            reason: true,
            adjustmentType: true,
          },
        }),
        // Get total count with same search filter for pagination
        ctx.db.adjustment.count({
          where: input.search
            ? {
                OR: [
                  { orderItem: { Sku: { sku: { contains: input.search } } } },
                  { order: { orderNumber: { contains: input.search } } },
                ],
              }
            : undefined,
        }),
      ]);

      // Return paginated results with pagination metadata
      return {
        items: adjustments,
        pagination: {
          totalCount: count,
          totalPages: Math.ceil(count / input.limit),
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
            reason: z.string(),
            orderNumber: z.string(),
            notes: z.string().optional(),
            adjustmentType: z.nativeEnum(AdjustmentType),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { adjustments } = input;
      // const skuMap = await ctx.db.orderItem.findMany({
      //   where: {
      //     Sku: { sku: { in: adjustments.map((adj) => adj.sku) } },
      //   },
      //   select: {
      //     id: true,
      //     Sku: {
      //       select: {
      //         sku: true,
      //       },
      //     },
      //     orderId: true,
      //   },
      // });

      // const skuToItem = Object.fromEntries(
      //   skuMap.map((item) => [item.Sku.sku, item]),
      // );

      const batch = await ctx.db.adjustmentBatch.create({
        data: {
          adjustedBy: ctx.userId,
          reference: `Batch - ${new Date().toISOString()}`,
          adjustments: {
            create: adjustments.map((adj) => {
              return {
                orderItem: {
                  connect: {
                    id: adj.orderItemId,
                  },
                },
                order: {
                  connect: {
                    orderNumber: adj.orderNumber,
                  },
                },
                reason: adj.reason,
                adjustmentType: adj.adjustmentType,
                adjustedQuantity: adj.quantity,
                adjustedBy: ctx.userId,
              };
            }),
          },
        },
      });

      return { batchId: batch.id };
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
        },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      return order;
    }),
});
