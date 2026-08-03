import { createTRPCRouter, privateProcedure } from "@/server/api/trpc";
import { createSku, deleteSku, updateSku } from "@/server/services/skus";
import { z } from "zod";

const LIST_LIMIT = 100;

const skuFields = {
  description: z.string().min(1, "Description is required"),
  department: z.string().min(1, "Department is required"),
  uom: z.string().nullish(),
  weight: z.number().nonnegative().nullish(),
  length: z.number().nonnegative().nullish(),
  width: z.number().nonnegative().nullish(),
  height: z.number().nonnegative().nullish(),
  cbm: z.number().nonnegative().nullish(),
  qualityCheck: z.boolean().default(false),
  hasShelfLife: z.boolean().default(false),
  shelfLifeDays: z.number().int().positive().nullish(),
  storageType: z.string().nullish(),
  storageZone: z.string().nullish(),
  isActive: z.boolean().default(true),
};

export const skuRouter = createTRPCRouter({
  getSkus: privateProcedure
    .input(z.object({ search: z.string().nullish() }))
    .query(async ({ ctx, input }) => {
      const term = input.search?.trim();

      const skus = await ctx.db.sku.findMany({
        where: term
          ? {
              OR: [
                { sku: { contains: term, mode: "insensitive" } },
                { description: { contains: term, mode: "insensitive" } },
                { department: { contains: term, mode: "insensitive" } },
              ],
            }
          : undefined,
        orderBy: { sku: "asc" },
        take: LIST_LIMIT,
      });

      const balances = await ctx.db.inventoryBalance.groupBy({
        by: ["sku"],
        where: {
          quantity: { gt: 0 },
          sku: { in: skus.map((sku) => sku.sku) },
        },
        _sum: { quantity: true },
      });
      const onHand = new Map(
        balances.map((row) => [row.sku, row._sum.quantity ?? 0]),
      );

      return skus.map((sku) => ({
        ...sku,
        onHand: onHand.get(sku.sku) ?? 0,
      }));
    }),

  createSku: privateProcedure
    .input(
      z.object({
        sku: z.string().min(1, "SKU code is required"),
        ...skuFields,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction((tx) =>
        createSku(tx, { ...input, createdBy: ctx.userId }),
      );
    }),

  updateSku: privateProcedure
    .input(
      z.object({
        sku: z.string().min(1),
        ...skuFields,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction((tx) =>
        updateSku(tx, { ...input, updatedBy: ctx.userId }),
      );
    }),

  deleteSku: privateProcedure
    .input(z.object({ sku: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction((tx) => deleteSku(tx, input.sku));
    }),
});
