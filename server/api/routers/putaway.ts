import { createTRPCRouter, privateProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const SEARCH_RESULT_LIMIT = 50;

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
      // `contains: undefined` makes Prisma drop the filter entirely, which would
      // return every ReceiveItem ever created. Treat a blank search as no results.
      const search = input.search?.trim();
      if (!search) {
        return [];
      }

      const lpns = await ctx.db.receiveItem.findMany({
        take: SEARCH_RESULT_LIMIT,
        orderBy: {
          receivedAt: "desc",
        },
        where: {
          OR: [
            {
              lpn: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              sku: {
                contains: search,
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
        lpn: z.string().min(1),
        sku: z.string().min(1),
        quantity: z.number().int().positive(),
        fromLocation: z.string().min(1),
        toLocation: z.string().min(1),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        // Serialise putaways against this LPN. Without the lock two requests
        // both read the same putaway history and both pass the remaining
        // quantity check below, moving more units than were received.
        await tx.$queryRaw`SELECT id FROM "ReceiveItem" WHERE lpn = ${input.lpn} FOR UPDATE`;

        // findUnique, not findFirst: `lpn` is unique now, so this is guaranteed
        // to be the same row the operator was shown by getLPNDetails.
        const receiveItem = await tx.receiveItem.findUnique({
          where: { lpn: input.lpn },
          select: {
            id: true,
            sku: true,
            location: true,
            receivedQuantity: true,
            putaways: { select: { quantity: true } },
          },
        });

        if (!receiveItem) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Receive item not found for this LPN",
          });
        }

        if (receiveItem.sku !== input.sku) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `LPN ${input.lpn} holds ${receiveItem.sku}, not ${input.sku}`,
          });
        }

        // Stock can only leave where it actually is. This also keeps the
        // Putaway.fromLocation foreign key satisfied.
        if (receiveItem.location !== input.fromLocation) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `LPN ${input.lpn} is in ${receiveItem.location}, not ${input.fromLocation}`,
          });
        }

        if (input.toLocation === input.fromLocation) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Destination location must differ from the source",
          });
        }

        // Verify the destination location exists and is active
        const location = await tx.location.findUnique({
          where: { location: input.toLocation },
          select: { status: true },
        });

        if (!location) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid destination location",
          });
        }

        if (!location.status) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Location ${input.toLocation} is not active`,
          });
        }

        const alreadyPutAway = receiveItem.putaways.reduce(
          (sum, putaway) => sum + putaway.quantity,
          0,
        );
        const remainingQuantity = receiveItem.receivedQuantity - alreadyPutAway;

        if (input.quantity > remainingQuantity) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot put away more than remains on this LPN. Received: ${receiveItem.receivedQuantity}, already put away: ${alreadyPutAway}, attempting: ${input.quantity}`,
          });
        }

        // Create the putaway record
        const putaway = await tx.putaway.create({
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
      });
    }),

  getLPNDetails: privateProcedure
    .input(z.object({ lpn: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const lpnDetails = await ctx.db.receiveItem.findUnique({
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
          putaways: {
            select: { quantity: true },
          },
        },
      });

      if (!lpnDetails) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "LPN not found",
        });
      }

      // An LPN can be put away across several moves, so the form needs what is
      // still in staging rather than the full received quantity.
      const putawayQuantity = lpnDetails.putaways.reduce(
        (sum, putaway) => sum + putaway.quantity,
        0,
      );

      return {
        ...lpnDetails,
        putawayQuantity,
        remainingQuantity: lpnDetails.receivedQuantity - putawayQuantity,
      };
    }),
});
