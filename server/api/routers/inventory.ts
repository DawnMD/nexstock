import { createTRPCRouter, privateProcedure } from "@/server/api/trpc";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

const PAGE_LIMIT = 50;
const MOVEMENT_LIMIT = 100;

/**
 * Match a balance by any of the four things that identify it. All four are
 * stored in a fixed case, so `mode: "insensitive"` is what makes a lowercase
 * scan or a half-remembered SKU find anything.
 */
const balanceSearchFilter = (
  search: string | null | undefined,
): Prisma.InventoryBalanceWhereInput | undefined => {
  const term = search?.trim();
  if (!term) return undefined;

  return {
    OR: [
      { sku: { contains: term, mode: "insensitive" } },
      { location: { contains: term, mode: "insensitive" } },
      { lot: { contains: term, mode: "insensitive" } },
      { lpn: { contains: term, mode: "insensitive" } },
    ],
  };
};

export const inventoryRouter = createTRPCRouter({
  /** Headline numbers for the top of the inventory screen. */
  getSummary: privateProcedure.query(async ({ ctx }) => {
    const [totals, skus, locations, movements] = await ctx.db.$transaction([
      ctx.db.inventoryBalance.aggregate({
        where: { quantity: { gt: 0 } },
        _sum: { quantity: true },
      }),
      ctx.db.inventoryBalance.findMany({
        where: { quantity: { gt: 0 } },
        distinct: ["sku"],
        select: { sku: true },
      }),
      ctx.db.inventoryBalance.findMany({
        where: { quantity: { gt: 0 } },
        distinct: ["location"],
        select: { location: true },
      }),
      ctx.db.inventoryMovement.count(),
    ]);

    return {
      unitsOnHand: totals._sum.quantity ?? 0,
      skuCount: skus.length,
      locationCount: locations.length,
      movementCount: movements,
    };
  }),

  /** On-hand rolled up by SKU, with the SKU's description and unit of measure. */
  getBySku: privateProcedure
    .input(z.object({ search: z.string().nullish() }))
    .query(async ({ ctx, input }) => {
      const grouped = await ctx.db.inventoryBalance.groupBy({
        by: ["sku"],
        where: { quantity: { gt: 0 }, ...balanceSearchFilter(input.search) },
        _sum: { quantity: true },
        _count: { _all: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: PAGE_LIMIT,
      });

      const skus = await ctx.db.sku.findMany({
        where: { sku: { in: grouped.map((row) => row.sku) } },
        select: { sku: true, description: true, uom: true, department: true },
      });
      const bySku = new Map(skus.map((sku) => [sku.sku, sku]));

      return grouped.map((row) => ({
        sku: row.sku,
        description: bySku.get(row.sku)?.description ?? "",
        uom: bySku.get(row.sku)?.uom ?? "EA",
        department: bySku.get(row.sku)?.department ?? "",
        quantity: row._sum.quantity ?? 0,
        placements: row._count._all,
      }));
    }),

  /** On-hand rolled up by location, with the zone and aisle it sits in. */
  getByLocation: privateProcedure
    .input(z.object({ search: z.string().nullish() }))
    .query(async ({ ctx, input }) => {
      const grouped = await ctx.db.inventoryBalance.groupBy({
        by: ["location"],
        where: { quantity: { gt: 0 }, ...balanceSearchFilter(input.search) },
        _sum: { quantity: true },
        _count: { _all: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: PAGE_LIMIT,
      });

      const locations = await ctx.db.location.findMany({
        where: { location: { in: grouped.map((row) => row.location) } },
        select: { location: true, zone: true, aisle: true, status: true },
      });
      const byLocation = new Map(
        locations.map((location) => [location.location, location]),
      );

      return grouped.map((row) => ({
        location: row.location,
        zone: byLocation.get(row.location)?.zone ?? "",
        aisle: byLocation.get(row.location)?.aisle ?? "",
        active: byLocation.get(row.location)?.status ?? true,
        quantity: row._sum.quantity ?? 0,
        skuCount: row._count._all,
      }));
    }),

  /** Every individual balance row: the exact (sku, location, lot, lpn) keys. */
  getBalances: privateProcedure
    .input(
      z.object({
        search: z.string().nullish(),
        sku: z.string().nullish(),
        location: z.string().nullish(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await ctx.db.inventoryBalance.findMany({
        where: {
          quantity: { gt: 0 },
          ...(input.sku ? { sku: input.sku } : {}),
          ...(input.location ? { location: input.location } : {}),
          ...balanceSearchFilter(input.search),
        },
        select: {
          id: true,
          sku: true,
          location: true,
          lot: true,
          lpn: true,
          quantity: true,
          updatedAt: true,
          skuRef: { select: { description: true, uom: true } },
          locationRef: { select: { zone: true, aisle: true } },
        },
        orderBy: [{ sku: "asc" }, { location: "asc" }, { lpn: "asc" }],
        take: PAGE_LIMIT,
      });
    }),

  /**
   * The ledger behind a balance.
   *
   * Narrowing by any subset of the key works, so this answers both "how did
   * this exact pallet get here" and "everything that has ever happened to this
   * SKU". Newest first, because the last movement is the one being questioned.
   */
  getMovements: privateProcedure
    .input(
      z.object({
        sku: z.string().nullish(),
        location: z.string().nullish(),
        lot: z.string().nullish(),
        lpn: z.string().nullish(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await ctx.db.inventoryMovement.findMany({
        where: {
          ...(input.sku ? { sku: input.sku } : {}),
          ...(input.location ? { location: input.location } : {}),
          ...(input.lot != null ? { lot: input.lot } : {}),
          ...(input.lpn ? { lpn: input.lpn } : {}),
        },
        select: {
          id: true,
          sku: true,
          lpn: true,
          lot: true,
          location: true,
          quantity: true,
          reason: true,
          refType: true,
          refId: true,
          notes: true,
          createdBy: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: MOVEMENT_LIMIT,
      });
    }),

  /**
   * On-hand by warehouse zone. `InventoryBalance` doesn't carry the zone — it is
   * a `Location` attribute — so this is the one place the two have to be joined
   * and summed rather than grouped directly.
   */
  getByZone: privateProcedure.query(async ({ ctx }) => {
    return await ctx.db.$queryRaw<
      { zone: string; quantity: number; locationCount: number }[]
    >`
      SELECT l."zone",
             SUM(b."quantity")::int AS "quantity",
             COUNT(DISTINCT b."location")::int AS "locationCount"
      FROM "InventoryBalance" b
      JOIN "Location" l ON l."location" = b."location"
      WHERE b."quantity" > 0
      GROUP BY l."zone"
      ORDER BY SUM(b."quantity") DESC
    `;
  }),

  /**
   * Reconciliation check: does the ledger still add up to the balances?
   *
   * This is the invariant the whole inventory core rests on, so the screen shows
   * it rather than asking anyone to take it on trust. It should always return an
   * empty array.
   */
  getDrift: privateProcedure.query(async ({ ctx }) => {
    return await ctx.db.$queryRaw<
      {
        sku: string;
        location: string;
        lot: string;
        lpn: string;
        ledger: number;
        balance: number;
      }[]
    >`
      SELECT COALESCE(m."sku", b."sku")           AS "sku",
             COALESCE(m."location", b."location") AS "location",
             COALESCE(m."lot", b."lot")           AS "lot",
             COALESCE(m."lpn", b."lpn")           AS "lpn",
             COALESCE(m."ledger", 0)::int         AS "ledger",
             COALESCE(b."quantity", 0)::int       AS "balance"
      FROM (
        SELECT "sku", "location", "lot", "lpn", SUM("quantity") AS "ledger"
        FROM "InventoryMovement"
        GROUP BY "sku", "location", "lot", "lpn"
      ) m
      FULL JOIN "InventoryBalance" b
        ON b."sku" = m."sku"
       AND b."location" = m."location"
       AND b."lot" = m."lot"
       AND b."lpn" = m."lpn"
      WHERE COALESCE(m."ledger", 0) <> COALESCE(b."quantity", 0)
    `;
  }),
});
