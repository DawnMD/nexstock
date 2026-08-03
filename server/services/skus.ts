/**
 * SKU master data.
 *
 * `Sku` had no create/update/delete path anywhere in the app — every row came
 * from the seed, and half its columns were decoration. `weight` and `cbm` are
 * read by the putaway capacity check in `locations.ts`, and `qualityCheck`
 * drives whether a line needs inspecting, so they are worth being able to edit.
 */
import type { Prisma } from "@prisma/client";
import { badRequest, conflict, notFound } from "@/server/services/errors";

export interface SkuInput {
  sku: string;
  description: string;
  department: string;
  uom?: string | null;
  weight?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  cbm?: number | null;
  qualityCheck?: boolean;
  hasShelfLife?: boolean;
  shelfLifeDays?: number | null;
  storageType?: string | null;
  storageZone?: string | null;
  isActive?: boolean;
}

export async function createSku(
  tx: Prisma.TransactionClient,
  input: SkuInput & { createdBy: string },
) {
  const { createdBy, ...data } = input;

  const existing = await tx.sku.findUnique({
    where: { sku: data.sku },
    select: { id: true },
  });

  if (existing) {
    throw conflict(`SKU ${data.sku} already exists`);
  }

  return await tx.sku.create({
    data: { ...data, createdBy, updatedBy: createdBy },
  });
}

export async function updateSku(
  tx: Prisma.TransactionClient,
  input: SkuInput & { updatedBy: string },
) {
  const { sku, updatedBy, ...data } = input;

  const existing = await tx.sku.findUnique({
    where: { sku },
    select: { id: true },
  });

  if (!existing) {
    throw notFound(`SKU ${sku} not found`);
  }

  return await tx.sku.update({
    where: { sku },
    data: { ...data, updatedBy },
  });
}

/**
 * Order lines and the ledger reference SKUs under `Restrict`, so a SKU that has
 * ever been ordered can't be removed without taking its history with it. Those
 * are deactivated instead — `isActive` is what the pickers filter on.
 */
export async function deleteSku(tx: Prisma.TransactionClient, sku: string) {
  const existing = await tx.sku.findUnique({
    where: { sku },
    select: {
      id: true,
      _count: {
        select: { OrderItem: true, inventoryMovements: true },
      },
    },
  });

  if (!existing) {
    throw notFound(`SKU ${sku} not found`);
  }

  const onHand = await tx.inventoryBalance.aggregate({
    where: { sku, quantity: { gt: 0 } },
    _sum: { quantity: true },
  });

  if ((onHand._sum.quantity ?? 0) > 0) {
    throw badRequest(
      `SKU ${sku} still has ${onHand._sum.quantity} units on hand and cannot be removed`,
    );
  }

  const hasHistory =
    existing._count.OrderItem > 0 || existing._count.inventoryMovements > 0;

  if (hasHistory) {
    await tx.sku.update({ where: { sku }, data: { isActive: false } });
    return { deleted: false, deactivated: true };
  }

  await tx.sku.delete({ where: { sku } });
  return { deleted: true, deactivated: false };
}
