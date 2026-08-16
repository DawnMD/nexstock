import { privateProcedure, writeProcedure } from "@/server/api/orpc";
import type { Prisma } from "@/generated/prisma/client";
import { PickTaskStatus, SalesOrderStatus } from "@/generated/prisma/client";
import {
  allocateSalesOrder,
  cancelAllocation,
} from "@/server/services/allocation";
import {
  confirmPick,
  confirmShipment,
  packCarton,
  reversePick,
} from "@/server/services/picking";
import {
  cancelSalesOrder,
  createSalesOrder,
} from "@/server/services/sales-orders";
import { z } from "zod";

const LIST_LIMIT = 50;

const salesOrderSearchFilter = (
  search: string | null | undefined,
): Prisma.SalesOrderWhereInput | undefined => {
  const term = search?.trim();
  if (!term) return undefined;

  return {
    OR: [
      { orderNumber: { contains: term, mode: "insensitive" } },
      { customer: { name: { contains: term, mode: "insensitive" } } },
      { customerReference: { contains: term, mode: "insensitive" } },
    ],
  };
};

export const outboundRouter = {
  getCustomers: privateProcedure.handler(async ({ context: ctx }) => {
    return await ctx.db.customer.findMany({
      select: { reference: true, name: true, city: true },
      orderBy: { name: "asc" },
    });
  }),

  getSalesOrders: privateProcedure
    .input(z.object({ search: z.string().nullish() }))
    .handler(async ({ context: ctx, input }) => {
      const orders = await ctx.db.salesOrder.findMany({
        where: salesOrderSearchFilter(input.search),
        select: {
          orderNumber: true,
          status: true,
          requestedShipDate: true,
          createdAt: true,
          customer: { select: { name: true, reference: true } },
          items: {
            select: {
              orderedQuantity: true,
              allocatedQuantity: true,
              pickedQuantity: true,
              shippedQuantity: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }, { orderNumber: "desc" }],
        take: LIST_LIMIT,
      });

      // Rolled up here rather than in the table, so the list and the detail
      // screen cannot disagree about what "half picked" means.
      return orders.map(({ items, ...order }) => ({
        ...order,
        lineCount: items.length,
        orderedQuantity: items.reduce((n, i) => n + i.orderedQuantity, 0),
        allocatedQuantity: items.reduce((n, i) => n + i.allocatedQuantity, 0),
        pickedQuantity: items.reduce((n, i) => n + i.pickedQuantity, 0),
        shippedQuantity: items.reduce((n, i) => n + i.shippedQuantity, 0),
      }));
    }),

  getSalesOrder: privateProcedure
    .input(z.object({ orderNumber: z.string().min(1) }))
    .handler(async ({ context: ctx, input }) => {
      return await ctx.db.salesOrder.findUnique({
        where: { orderNumber: input.orderNumber },
        include: {
          customer: true,
          items: {
            include: { skuRef: { select: { description: true, uom: true } } },
            orderBy: { id: "asc" },
          },
          pickTasks: {
            orderBy: [{ status: "asc" }, { id: "asc" }],
            include: { carton: { select: { cartonNumber: true } } },
          },
          shipments: {
            orderBy: { createdAt: "desc" },
            include: { cartons: { select: { cartonNumber: true } } },
          },
        },
      });
    }),

  /** The picker's worklist: everything reserved and not yet fetched. */
  getPickList: privateProcedure
    .input(z.object({ orderNumber: z.string().nullish() }))
    .handler(async ({ context: ctx, input }) => {
      return await ctx.db.pickTask.findMany({
        where: {
          status: PickTaskStatus.PENDING,
          ...(input.orderNumber ? { orderId: input.orderNumber } : {}),
        },
        select: {
          id: true,
          orderId: true,
          sku: true,
          lpn: true,
          lot: true,
          fromLocation: true,
          quantity: true,
          order: { select: { customer: { select: { name: true } } } },
        },
        // Location order, because that is the order a picker walks the aisles in.
        orderBy: [{ fromLocation: "asc" }, { id: "asc" }],
        take: 200,
      });
    }),

  /** Picked lines that are not in a carton yet. */
  getPackList: privateProcedure
    .input(z.object({ orderNumber: z.string().min(1) }))
    .handler(async ({ context: ctx, input }) => {
      return await ctx.db.pickTask.findMany({
        where: {
          orderId: input.orderNumber,
          status: PickTaskStatus.PICKED,
          cartonId: null,
          pickedQuantity: { gt: 0 },
        },
        select: {
          id: true,
          sku: true,
          lpn: true,
          lot: true,
          pickedQuantity: true,
        },
        orderBy: { id: "asc" },
      });
    }),

  /** Cartons packed for an order and not yet on a shipment. */
  getUnshippedCartons: privateProcedure
    .input(z.object({ orderNumber: z.string().min(1) }))
    .handler(async ({ context: ctx, input }) => {
      return await ctx.db.carton.findMany({
        where: {
          shipmentId: null,
          contents: { some: { orderId: input.orderNumber } },
        },
        select: {
          id: true,
          cartonNumber: true,
          weight: true,
          packedAt: true,
          contents: {
            select: { sku: true, pickedQuantity: true },
          },
        },
        orderBy: { id: "asc" },
      });
    }),

  createSalesOrder: writeProcedure
    .input(
      z.object({
        orderNumber: z.string().min(1, "Order number is required"),
        customerReference: z.string().min(1, "Customer is required"),
        requestedShipDate: z.date().nullish(),
        notes: z.string().nullish(),
        lines: z
          .array(
            z.object({
              sku: z.string().min(1),
              orderedQuantity: z.number().int().positive(),
            }),
          )
          .min(1, "At least one line is required")
          .max(100),
      }),
    )
    .handler(async ({ context: ctx, input }) => {
      return await ctx.db.$transaction((tx) =>
        createSalesOrder(tx, { ...input, createdBy: ctx.userId }),
      );
    }),

  allocate: writeProcedure
    .input(z.object({ orderNumber: z.string().min(1) }))
    .handler(async ({ context: ctx, input }) => {
      return await ctx.db.$transaction((tx) =>
        allocateSalesOrder(tx, { orderNumber: input.orderNumber }),
      );
    }),

  cancelAllocation: writeProcedure
    .input(z.object({ orderNumber: z.string().min(1) }))
    .handler(async ({ context: ctx, input }) => {
      return await ctx.db.$transaction((tx) =>
        cancelAllocation(tx, input.orderNumber),
      );
    }),

  confirmPick: writeProcedure
    .input(
      z.object({
        pickTaskId: z.number().int().positive(),
        pickedQuantity: z.number().int().nonnegative(),
      }),
    )
    .handler(async ({ context: ctx, input }) => {
      return await ctx.db.$transaction((tx) =>
        confirmPick(tx, { ...input, pickedBy: ctx.userId }),
      );
    }),

  reversePick: writeProcedure
    .input(z.object({ pickTaskId: z.number().int().positive() }))
    .handler(async ({ context: ctx, input }) => {
      return await ctx.db.$transaction((tx) =>
        reversePick(tx, {
          pickTaskId: input.pickTaskId,
          reversedBy: ctx.userId,
        }),
      );
    }),

  packCarton: writeProcedure
    .input(
      z.object({
        cartonNumber: z.string().min(1, "Carton number is required"),
        pickTaskIds: z.array(z.number().int().positive()).min(1).max(200),
        weight: z.number().nonnegative().nullish(),
      }),
    )
    .handler(async ({ context: ctx, input }) => {
      return await ctx.db.$transaction((tx) =>
        packCarton(tx, { ...input, packedBy: ctx.userId }),
      );
    }),

  confirmShipment: writeProcedure
    .input(
      z.object({
        shipmentNumber: z.string().min(1, "Shipment number is required"),
        orderNumber: z.string().min(1),
        carrier: z.string().min(1, "Carrier is required"),
        trackingNumber: z.string().optional(),
        cartonIds: z.array(z.number().int().positive()).min(1).max(200),
      }),
    )
    .handler(async ({ context: ctx, input }) => {
      return await ctx.db.$transaction((tx) =>
        confirmShipment(tx, { ...input, shippedBy: ctx.userId }),
      );
    }),

  cancelSalesOrder: writeProcedure
    .input(z.object({ orderNumber: z.string().min(1) }))
    .handler(async ({ context: ctx, input }) => {
      return await ctx.db.$transaction((tx) =>
        cancelSalesOrder(tx, {
          orderNumber: input.orderNumber,
          cancelledBy: ctx.userId,
        }),
      );
    }),

  /** Headline numbers for the outbound board. */
  getSummary: privateProcedure.handler(async ({ context: ctx }) => {
    const [open, pending, packed, shipped] = await ctx.db.$transaction([
      ctx.db.salesOrder.count({
        where: {
          status: {
            in: [
              SalesOrderStatus.NEW,
              SalesOrderStatus.ALLOCATED,
              SalesOrderStatus.PICKING,
              SalesOrderStatus.PICKED,
            ],
          },
        },
      }),
      ctx.db.pickTask.count({ where: { status: PickTaskStatus.PENDING } }),
      ctx.db.carton.count({ where: { shipmentId: null } }),
      ctx.db.shipment.count(),
    ]);

    return {
      openOrders: open,
      pendingPicks: pending,
      cartonsAwaitingDispatch: packed,
      shipments: shipped,
    };
  }),
};
