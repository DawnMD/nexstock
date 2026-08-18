import { privateProcedure, writeProcedure } from "@/server/api/orpc";
import { receiveStock } from "@/server/services/receiving";
import { z } from "zod";

/**
 * Search results are capped rather than paged: this feeds a scan-and-search
 * palette, where an operator either scans an exact barcode or types enough of
 * one to narrow it. Nobody scrolls to result 51.
 */
const SEARCH_RESULT_LIMIT = 50;

export const receiveRouter = {
  getAllOrderNumbers: privateProcedure
    .input(z.object({ search: z.string().nullish() }))
    .handler(async ({ context: ctx, input }) => {
      // This used to have no `where` and no `take`, so every order ever raised
      // was serialised to the browser on each visit to /receive and filtered
      // client-side. Filtering in Postgres also means a match on the vendor
      // name works, which the client-side filter over order numbers could not
      // do.
      const term = input.search?.trim();

      const orderNumbers = await ctx.db.order.findMany({
        where: term
          ? {
              OR: [
                { orderNumber: { contains: term, mode: "insensitive" } },
                { vendor: { name: { contains: term, mode: "insensitive" } } },
              ],
            }
          : undefined,
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
        orderBy: { createdAt: "desc" },
        take: SEARCH_RESULT_LIMIT,
      });
      return orderNumbers;
    }),
  getOrderItems: privateProcedure
    .input(
      z.object({
        orderNumber: z.string(),
      }),
    )
    .handler(async ({ context: ctx, input }) => {
      const orderItems = await ctx.db.order.findUnique({
        where: {
          orderNumber: input.orderNumber,
        },
        select: {
          items: {
            select: {
              id: true,
              Sku: {
                select: {
                  sku: true,
                  description: true,
                },
              },
              orderedQuantity: true,
              receivedQuantity: true,
              status: true,
              qualityCheck: {
                select: {
                  qualityCheckStatus: true,
                },
              },
            },
          },
          vendor: {
            select: {
              name: true,
            },
          },
          createdAt: true,
        },
      });

      return orderItems;
    }),
  getReceiveItem: privateProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ context: ctx, input: { id } }) => {
      return await ctx.db.orderItem.findUnique({
        where: { id },
        select: {
          Sku: {
            select: {
              sku: true,
              description: true,
            },
          },
          description: true,
          department: true,
          orderedQuantity: true,
          receivedQuantity: true,
          qualityCheck: {
            select: {
              qualityCheckStatus: true,
            },
          },
        },
      });
    }),
  getOrderVehicles: privateProcedure
    .input(z.object({ orderNumber: z.string() }))
    .handler(async ({ context: ctx, input }) => {
      const dockBookings = await ctx.db.dockBooking.findMany({
        where: { orderId: input.orderNumber },
        select: {
          vehicleNumber: true,
        },
      });
      return dockBookings;
    }),

  getReceivedItemsByOrder: privateProcedure
    .input(
      z.object({
        orderNumber: z.string(),
      }),
    )
    .handler(async ({ context: ctx, input }) => {
      const receivedItems = await ctx.db.receiveItem.findMany({
        where: {
          orderItem: {
            Order: {
              orderNumber: input.orderNumber,
            },
          },
        },
        select: {
          id: true,
          lpn: true,
          sku: true,
          location: true,
          receivedQuantity: true,
          uom: true,
        },
        orderBy: {
          receivedAt: "desc",
        },
      });
      return receivedItems;
    }),

  updateReceiveStatus: writeProcedure
    .input(
      z.object({
        id: z.number(),
        receivedQuantity: z
          .number()
          .min(1, "Received quantity must be at least 1"),
        sku: z.string(),
        receivedNotes: z.string().optional(),
        location: z.string().min(1, "Location is required"),
        lpn: z.string().min(1, "LPN is required"),
        lot: z.string().optional(),
        manufacturedDate: z.date().optional().nullable(),
        uom: z.string(),
        lotExpiryDate: z.date().optional().nullable(),
        vehicleNumber: z.string().min(1, "Vehicle number is required"),
      }),
    )
    .handler(async ({ context: ctx, input }) => {
      const { id, ...receiveData } = input;

      return await ctx.db.$transaction((tx) =>
        receiveStock(tx, {
          orderItemId: id,
          receivedBy: ctx.userId,
          ...receiveData,
        }),
      );
    }),
};
