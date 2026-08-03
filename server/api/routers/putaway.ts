import { createTRPCRouter, privateProcedure } from "@/server/api/trpc";
import { balancesForLpn, getBalance } from "@/server/services/inventory";
import { createPutaway } from "@/server/services/putaway";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const SEARCH_RESULT_LIMIT = 50;
const WORKLIST_LIMIT = 200;

/**
 * A pallet needs putting away while stock is still sitting in the location it
 * was received into. Asking the ledger rather than summing past putaways means
 * QC rejections and shortage adjustments also take it off the worklist.
 */
interface WorklistRow {
  lpn: string;
  sku: string;
  description: string;
  receivedQuantity: number;
  remainingQuantity: number;
  location: string;
  vehicleNumber: string;
  receivedAt: Date;
}

export const putawayRouter = createTRPCRouter({
  getAllLPNs: privateProcedure.query(async ({ ctx }) => {
    // Raw SQL because the filter correlates two columns across tables
    // (a balance sitting at *its own receipt's* location), which Prisma's query
    // API can't express. Doing it here rather than in JS keeps the row count
    // bounded instead of loading every receipt ever made.
    return await ctx.db.$queryRaw<WorklistRow[]>`
      SELECT ri."lpn",
             ri."sku",
             s."description",
             ri."receivedQuantity",
             ib."quantity" AS "remainingQuantity",
             ri."location",
             ri."vehicleNumber",
             ri."receivedAt"
      FROM "ReceiveItem" ri
      JOIN "InventoryBalance" ib
        ON ib."lpn" = ri."lpn"
       AND ib."sku" = ri."sku"
       AND ib."location" = ri."location"
      JOIN "Sku" s ON s."sku" = ri."sku"
      WHERE ib."quantity" > 0
      ORDER BY ri."receivedAt" DESC
      LIMIT ${WORKLIST_LIMIT}
    `;
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
      return await ctx.db.$transaction((tx) =>
        createPutaway(tx, { ...input, putawayBy: ctx.userId }),
      );
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

      // What is still in the receiving location is what there is left to put
      // away — this comes from the ledger, so rejected and written-off units are
      // already gone rather than being offered up for putaway.
      const [remainingQuantity, currentLocations] = await Promise.all([
        getBalance(ctx.db, {
          sku: lpnDetails.sku,
          location: lpnDetails.location,
          lot: lpnDetails.lot,
          lpn: lpnDetails.lpn,
        }),
        balancesForLpn(ctx.db, lpnDetails.lpn),
      ]);

      // Summed from the putaway records rather than derived from the remaining
      // balance: a QC rejection also drops the balance, and calling those units
      // "put away" would be a lie.
      const putawayQuantity = lpnDetails.putaways.reduce(
        (sum, putaway) => sum + putaway.quantity,
        0,
      );

      return {
        ...lpnDetails,
        remainingQuantity,
        putawayQuantity,
        // Where this pallet's stock actually sits now. `location` above is the
        // bay it was received into and never changes; this is the answer to
        // "where is it?", which used to be wrong the moment anything moved.
        currentLocations,
      };
    }),
});
