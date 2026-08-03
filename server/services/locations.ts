/**
 * Location master data and the physical limits it implies.
 *
 * `Location` was read-only and entirely seed-dependent, and its
 * `weightCapacity` / `cbm` columns were never read by anything — a rack could be
 * filled past its rating without complaint. Both are enforced on putaway now.
 */
import type { Prisma } from "@prisma/client";
import { badRequest, conflict, notFound } from "@/server/services/errors";

export interface LocationInput {
  location: string;
  zone: string;
  aisle: string;
  length: number;
  width: number;
  height: number;
  cbm?: number | null;
  weightCapacity?: number | null;
  description?: string | null;
  status?: boolean;
}

export async function createLocation(
  tx: Prisma.TransactionClient,
  input: LocationInput & { createdBy: string },
) {
  const { createdBy, ...data } = input;

  const existing = await tx.location.findUnique({
    where: { location: data.location },
    select: { id: true },
  });

  if (existing) {
    throw conflict(`Location ${data.location} already exists`);
  }

  return await tx.location.create({
    data: { ...data, createdBy, updatedBy: createdBy },
  });
}

export async function updateLocation(
  tx: Prisma.TransactionClient,
  input: Omit<LocationInput, "location"> & {
    location: string;
    updatedBy: string;
  },
) {
  const { location, updatedBy, ...data } = input;

  const existing = await tx.location.findUnique({
    where: { location },
    select: { id: true },
  });

  if (!existing) {
    throw notFound(`Location ${location} not found`);
  }

  return await tx.location.update({
    where: { location },
    data: { ...data, updatedBy },
  });
}

/**
 * Locations are referenced by receipts, putaways and the ledger under
 * `Restrict`, so deleting one that has ever been used would throw a raw
 * `P2003`. Stock on hand is the check that matters; the rest is history worth
 * keeping, so a used-but-empty location is deactivated rather than removed.
 */
export async function deleteLocation(
  tx: Prisma.TransactionClient,
  location: string,
) {
  const existing = await tx.location.findUnique({
    where: { location },
    select: {
      id: true,
      _count: {
        select: {
          receiveItems: true,
          putawaysIn: true,
          putawaysOut: true,
          inventoryMovements: true,
        },
      },
    },
  });

  if (!existing) {
    throw notFound(`Location ${location} not found`);
  }

  const onHand = await tx.inventoryBalance.aggregate({
    where: { location, quantity: { gt: 0 } },
    _sum: { quantity: true },
  });

  if ((onHand._sum.quantity ?? 0) > 0) {
    throw badRequest(
      `Location ${location} still holds ${onHand._sum.quantity} units and cannot be removed`,
    );
  }

  const hasHistory =
    existing._count.receiveItems > 0 ||
    existing._count.putawaysIn > 0 ||
    existing._count.putawaysOut > 0 ||
    existing._count.inventoryMovements > 0;

  if (hasHistory) {
    await tx.location.update({
      where: { location },
      data: { status: false },
    });
    return { deleted: false, deactivated: true };
  }

  await tx.location.delete({ where: { location } });
  return { deleted: true, deactivated: false };
}

/**
 * Reject a move that would push a location past its weight or volume rating.
 *
 * Both ratings are optional on `Location` and both `Sku.weight` / `Sku.cbm` are
 * optional too — an unrated location or an unmeasured SKU simply isn't checked,
 * which keeps seeded data usable rather than blocking every putaway on complete
 * master data.
 */
export async function assertLocationCapacity(
  tx: Prisma.TransactionClient,
  input: { location: string; sku: string; quantity: number },
) {
  const [location, sku] = await Promise.all([
    tx.location.findUnique({
      where: { location: input.location },
      select: { weightCapacity: true, cbm: true },
    }),
    tx.sku.findUnique({
      where: { sku: input.sku },
      select: { weight: true, cbm: true },
    }),
  ]);

  if (!location || !sku) return;
  if (location.weightCapacity == null && location.cbm == null) return;
  if (sku.weight == null && sku.cbm == null) return;

  const balances = await tx.inventoryBalance.findMany({
    where: { location: input.location, quantity: { gt: 0 } },
    select: { sku: true, quantity: true },
  });

  // One row per SKU present, so the per-unit weight/cbm lookup is a single query
  // rather than one per balance.
  const occupyingSkus = await tx.sku.findMany({
    where: { sku: { in: [...new Set(balances.map((b) => b.sku))] } },
    select: { sku: true, weight: true, cbm: true },
  });
  const bySku = new Map(occupyingSkus.map((entry) => [entry.sku, entry]));

  let usedWeight = 0;
  let usedCbm = 0;

  for (const balance of balances) {
    const attributes = bySku.get(balance.sku);
    usedWeight += (attributes?.weight ?? 0) * balance.quantity;
    usedCbm += (attributes?.cbm ?? 0) * balance.quantity;
  }

  if (location.weightCapacity != null && sku.weight != null) {
    const incoming = sku.weight * input.quantity;
    if (usedWeight + incoming > location.weightCapacity) {
      throw badRequest(
        `Location ${input.location} holds ${location.weightCapacity} weight units; ${usedWeight} is already there and this move adds ${incoming}`,
      );
    }
  }

  if (location.cbm != null && sku.cbm != null) {
    const incoming = sku.cbm * input.quantity;
    if (usedCbm + incoming > location.cbm) {
      throw badRequest(
        `Location ${input.location} holds ${location.cbm} cbm; ${usedCbm} is already there and this move adds ${incoming}`,
      );
    }
  }
}
