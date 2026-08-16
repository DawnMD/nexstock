import { privateProcedure, writeProcedure } from "@/server/api/orpc";
import {
  createLocation,
  deleteLocation,
  updateLocation,
} from "@/server/services/locations";
import { z } from "zod";

const LIST_LIMIT = 100;

const locationFields = {
  zone: z.string().min(1, "Zone is required"),
  aisle: z.string().min(1, "Aisle is required"),
  length: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  cbm: z.number().int().nonnegative().nullish(),
  weightCapacity: z.number().int().nonnegative().nullish(),
  description: z.string().nullish(),
  status: z.boolean().default(true),
};

export const locationRouter = {
  getLocations: privateProcedure
    .input(z.object({ search: z.string().nullish() }))
    .handler(async ({ context: ctx, input }) => {
      const term = input.search?.trim();

      const locations = await ctx.db.location.findMany({
        where: term
          ? {
              OR: [
                { location: { contains: term, mode: "insensitive" } },
                { zone: { contains: term, mode: "insensitive" } },
                { aisle: { contains: term, mode: "insensitive" } },
                { description: { contains: term, mode: "insensitive" } },
              ],
            }
          : undefined,
        orderBy: { location: "asc" },
        take: LIST_LIMIT,
      });

      // On-hand per location, so the table can show what a rack is holding and
      // warn before anyone tries to delete one that isn't empty.
      const balances = await ctx.db.inventoryBalance.groupBy({
        by: ["location"],
        where: {
          quantity: { gt: 0 },
          location: { in: locations.map((location) => location.location) },
        },
        _sum: { quantity: true },
      });
      const onHand = new Map(
        balances.map((row) => [row.location, row._sum.quantity ?? 0]),
      );

      return locations.map((location) => ({
        ...location,
        onHand: onHand.get(location.location) ?? 0,
      }));
    }),

  createLocation: writeProcedure
    .input(
      z.object({
        location: z.string().min(1, "Location code is required"),
        ...locationFields,
      }),
    )
    .handler(async ({ context: ctx, input }) => {
      return await ctx.db.$transaction((tx) =>
        createLocation(tx, { ...input, createdBy: ctx.userId }),
      );
    }),

  updateLocation: writeProcedure
    .input(
      z.object({
        location: z.string().min(1),
        ...locationFields,
      }),
    )
    .handler(async ({ context: ctx, input }) => {
      return await ctx.db.$transaction((tx) =>
        updateLocation(tx, { ...input, updatedBy: ctx.userId }),
      );
    }),

  deleteLocation: writeProcedure
    .input(z.object({ location: z.string().min(1) }))
    .handler(async ({ context: ctx, input }) => {
      return await ctx.db.$transaction((tx) =>
        deleteLocation(tx, input.location),
      );
    }),
};
