import { createTRPCRouter, privateProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const putawayRouter = createTRPCRouter({
  getAllLPNs: privateProcedure.query(async ({ ctx }) => {
    const lpns = await ctx.db.receiveItem.findMany({
      select: {
        lpn: true,
        sku: true,
        receivedQuantity: true,
        location: true,
        vehicleNumber: true,
        receivedAt: true,
        orderItem: {
          select: {
            Sku: {
              select: {
                description: true,
              },
            },
          },
        },
        putaways: {
          select: {
            quantity: true,
          },
        },
      },
    });

    // Filter out LPNs that have been fully putaway
    return lpns.filter((lpn) => {
      const totalPutawayQuantity = lpn.putaways.reduce(
        (sum, putaway) => sum + putaway.quantity,
        0,
      );
      return totalPutawayQuantity < lpn.receivedQuantity;
    });
  }),

  searchLPNs: privateProcedure
    .input(
      z.object({
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const lpns = await ctx.db.receiveItem.findMany({
        where: {
          OR: [
            {
              lpn: {
                contains: input.search,
                mode: "insensitive",
              },
            },
            {
              sku: {
                contains: input.search,
                mode: "insensitive",
              },
            },
          ],
        },
        select: {
          lpn: true,
          sku: true,
          receivedQuantity: true,
          location: true,
          vehicleNumber: true,
          receivedAt: true,
          orderItem: {
            select: {
              Sku: {
                select: {
                  description: true,
                },
              },
            },
          },
        },
      });
      return lpns;
    }),

  getLocations: privateProcedure.query(async ({ ctx }) => {
    const locations = await ctx.db.location.findMany({
      where: {
        status: true, // Only active locations
      },
      select: {
        location: true,
        zone: true,
        aisle: true,
        description: true,
      },
      orderBy: {
        location: "asc",
      },
    });
    return locations;
  }),

  createPutaway: privateProcedure
    .input(
      z.object({
        lpn: z.string(),
        sku: z.string(),
        quantity: z.number().int().positive(),
        fromLocation: z.string(),
        toLocation: z.string(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the location exists
      const location = await ctx.db.location.findUnique({
        where: { location: input.toLocation },
      });

      if (!location) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid destination location",
        });
      }

      // Find the receive item for this LPN
      const receiveItem = await ctx.db.receiveItem.findFirst({
        where: { lpn: input.lpn },
      });

      if (!receiveItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Receive item not found for this LPN",
        });
      }

      // Create the putaway record
      const putaway = await ctx.db.putaway.create({
        data: {
          lpn: input.lpn,
          sku: input.sku,
          quantity: input.quantity,
          fromLocation: input.fromLocation,
          toLocation: input.toLocation,
          putawayBy: ctx.userId,
          notes: input.notes,
          receiveItemId: receiveItem.id,
        },
      });

      return putaway;
    }),

  getLPNDetails: privateProcedure
    .input(z.object({ lpn: z.string() }))
    .query(async ({ ctx, input }) => {
      const lpnDetails = await ctx.db.receiveItem.findFirst({
        where: { lpn: input.lpn },
        select: {
          lpn: true,
          sku: true,
          receivedQuantity: true,
          location: true,
          vehicleNumber: true,
          receivedAt: true,
          receivedNotes: true,
          lot: true,
          lotExpiryDate: true,
          uom: true,
          orderItem: {
            select: {
              Sku: {
                select: {
                  description: true,
                },
              },
            },
          },
        },
      });

      if (!lpnDetails) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "LPN not found",
        });
      }

      return lpnDetails;
    }),
});
