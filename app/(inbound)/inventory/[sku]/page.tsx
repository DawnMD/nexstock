import type { Metadata } from "next";
import { Suspense } from "react";
import { CardTableSkeleton, TableSkeleton } from "@/components/skeletons";
import { InventoryMovements } from "@/components/inventory-movements";
import { InventorySkuBalances } from "@/components/inventory-sku-balances";
import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { HydrateClient, prefetch, serverOrpc } from "@/orpc/server";
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

  // Not awaited, like every other page: `shouldDehydrateQuery` includes pending
  // queries, so these stream into the boundary below instead of holding up the
  // whole RSC render until Postgres answers both.
  prefetch(serverOrpc.inventory.getBalances.queryOptions({ input: { sku } }));
  prefetch(serverOrpc.inventory.getMovements.queryOptions({ input: { sku } }));

  return (
    <>
      <SiteHeader title={`Inventory · ${sku}`} />
      <PageMain className="flex flex-col gap-6 p-4">
        <HydrateClient>
          <Suspense fallback={<CardTableSkeleton columns={6} rows={6} />}>
            <InventorySkuBalances sku={sku} />
          </Suspense>
        </HydrateClient>

        <div>
          <h3 className="mb-3 text-lg font-semibold">Movement history</h3>
          <div className="bg-card rounded-lg border">
            <HydrateClient>
              <Suspense fallback={<TableSkeleton columns={7} rows={8} />}>
                <InventoryMovements sku={sku} />
              </Suspense>
            </HydrateClient>
          </div>
        </div>
      </PageMain>
    </>
  );
}
