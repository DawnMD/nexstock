import {
  lockOrderItem,
  receiveStatusFor,
  syncOrderStatus,
} from "@/server/api/order-status";
import { createTRPCRouter, privateProcedure } from "@/server/api/trpc";
import type { Prisma } from "@prisma/client";
import { AdjustmentType, OrderItemStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

/**
 * Match an adjustment by SKU, order number, or adjustment id. `mode:
 * "insensitive"` matters here: order numbers and cuid ids are stored in a
 * fixed case, so a case-sensitive `contains` silently found nothing.
 */
const adjustmentSearchFilter = (
  search: string | null | undefined,
): Prisma.AdjustmentWhereInput | undefined => {
  const term = search?.trim();
  if (!term) return undefined;

  return {
    OR: [
      {
        orderItem: {
          Sku: { sku: { contains: term, mode: "insensitive" } },
        },
      },
      { order: { orderNumber: { contains: term, mode: "insensitive" } } },
      { id: { contains: term, mode: "insensitive" } },
    ],
  };
};

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
      const where = adjustmentSearchFilter(input.search);

      // Execute both queries in a transaction for consistency
      const [adjustments, count] = await ctx.db.$transaction([
        // Get paginated adjustments with search filter
        ctx.db.adjustment.findMany({
          take: input.limit, // Number of items per page
          skip: input.limit * input.pageIndex, // Skip items for pagination
          // LIMIT/OFFSET without an ORDER BY lets Postgres return rows in any
          // order, so the same row could show on two pages while another never
          // appeared. `id` breaks ties between adjustments created together.
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          where,
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
        ctx.db.adjustment.count({ where }),
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
        adjustments: z
          .array(
            z.object({
              orderItemId: z.number().int().positive(),
              quantity: z.number().int().positive(),
              notes: z.string().optional(),
              orderNumber: z.string().min(1),
              adjustmentType: z.nativeEnum(AdjustmentType),
            }),
          )
          .min(1, "At least one adjustment is required")
          .max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        // Lock the lines in a stable order so two concurrent batches touching
        // the same order can't deadlock against each other.
        const adjustments = [...input.adjustments].sort(
          (a, b) => a.orderItemId - b.orderItemId,
        );

        const created: { id: string; orderItemId: number }[] = [];
        const touchedOrders = new Set<string>();

        for (const adjustment of adjustments) {
          await lockOrderItem(tx, adjustment.orderItemId);

          const orderItem = await tx.orderItem.findUnique({
            where: { id: adjustment.orderItemId },
            select: {
              orderId: true,
              orderedQuantity: true,
              receivedQuantity: true,
              status: true,
            },
          });

          if (!orderItem) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Order item ${adjustment.orderItemId} not found`,
            });
          }

          // `orderItemId` and `orderNumber` arrive as independent client-supplied
          // foreign keys. Without this check an adjustment shows up on one
          // order's ledger while pointing at another order's line.
          if (orderItem.orderId !== adjustment.orderNumber) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Order item ${adjustment.orderItemId} belongs to order ${orderItem.orderId}, not ${adjustment.orderNumber}`,
            });
          }

          const delta =
            adjustment.adjustmentType === AdjustmentType.ADDITION
              ? adjustment.quantity
              : -adjustment.quantity;
          const newReceivedQuantity = orderItem.receivedQuantity + delta;

          // A shortage can only write off stock that is actually on hand.
          if (newReceivedQuantity < 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Cannot subtract ${adjustment.quantity} from order item ${adjustment.orderItemId}: only ${orderItem.receivedQuantity} received`,
            });
          }

          const record = await tx.adjustment.create({
            data: {
              adjustedBy: ctx.userId,
              adjustmentType: adjustment.adjustmentType,
              adjustedQuantity: adjustment.quantity,
              reason: adjustment.notes,
              orderId: adjustment.orderNumber,
              orderItemId: adjustment.orderItemId,
            },
            select: { id: true, orderItemId: true },
          });

          // The ledger row and the quantity move together, otherwise they are
          // two competing answers to "how much came in".
          await tx.orderItem.update({
            where: { id: adjustment.orderItemId },
            data: {
              receivedQuantity: { increment: delta },
              // A rejected line stays rejected; otherwise the receipt status
              // follows the corrected quantity.
              ...(orderItem.status === OrderItemStatus.REJECTED
                ? {}
                : {
                    status: receiveStatusFor(
                      newReceivedQuantity,
                      orderItem.orderedQuantity,
                    ),
                  }),
            },
          });

          created.push(record);
          touchedOrders.add(orderItem.orderId);
        }

        for (const orderNumber of touchedOrders) {
          await syncOrderStatus(tx, orderNumber);
        }

        return created;
      });
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
  /**
   * Pre-flight for the "add adjustment" dialog: does this order exist and does
   * it have anything to adjust?
   *
   * This used to be a `.mutation` that rejected any order with an adjustment
   * already on it, which permanently capped an order at a single correction —
   * warehouses correct the same order repeatedly. It is a read, so it is a
   * query; the invariants that actually matter (the line belongs to the order,
   * the quantity stays non-negative) are enforced inside
   * `createAdjustmentBatch`'s transaction, where a concurrent write can't slip
   * between the check and the insert.
   */
  checkOrder: privateProcedure
    .input(z.object({ orderNumber: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.db.order.findUnique({
        where: { orderNumber: input.orderNumber },
        select: {
          id: true,
          orderNumber: true,
          _count: { select: { items: true } },
        },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Order ${input.orderNumber} not found`,
        });
      }

      if (order._count.items === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Order has no line items to adjust",
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
