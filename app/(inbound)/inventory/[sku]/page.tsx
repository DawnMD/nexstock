import type { Metadata } from "next";
import { InventoryMovements } from "@/components/inventory-movements";
import { InventorySkuBalances } from "@/components/inventory-sku-balances";
import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { api, HydrateClient } from "@/trpc/server";
import { requireSession } from "@/lib/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sku: string }>;
}): Promise<Metadata> {
  const { sku } = await params;
  return {
    title: `${sku} · Inventory`,
    description: `Stock balances and movement history for SKU ${sku}.`,
  };
}

export default async function InventorySkuPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  await requireSession();

  const { sku } = await params;

  await Promise.all([
    api.inventory.getBalances.prefetch({ sku }),
    api.inventory.getMovements.prefetch({ sku }),
  ]);

  return (
    <>
      <SiteHeader title={`Inventory · ${sku}`} />
      <PageMain className="flex flex-col gap-6 p-4">
        <HydrateClient>
          <InventorySkuBalances sku={sku} />
        </HydrateClient>

        <div>
          <h3 className="mb-3 text-lg font-semibold">Movement history</h3>
          <div className="bg-card rounded-lg border">
            <HydrateClient>
              <InventoryMovements sku={sku} />
            </HydrateClient>
          </div>
        </div>
      </PageMain>
    </>
  );
}
