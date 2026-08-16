import type { Metadata } from "next";
import { Suspense } from "react";
import { StatCardsSkeleton, TabbedTableSkeleton } from "@/components/skeletons";
import { InventorySummary } from "@/components/inventory-summary";
import { InventoryViews } from "@/components/inventory-views";
import { SearchForm } from "@/components/order-search-form";
import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { HydrateClient, prefetch, serverOrpc } from "@/orpc/server";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Inventory",
  description: "Live stock balances by SKU across every storage location.",
};

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string | null }>;
}) {
  await requireSession();

  const { query } = await searchParams;

  prefetch(serverOrpc.inventory.getSummary.queryOptions());
  prefetch(serverOrpc.inventory.getDrift.queryOptions());
  prefetch(
    serverOrpc.inventory.getBySku.queryOptions({ input: { search: query } }),
  );
  prefetch(
    serverOrpc.inventory.getByLocation.queryOptions({
      input: { search: query },
    }),
  );
  prefetch(serverOrpc.inventory.getByZone.queryOptions());
  prefetch(
    serverOrpc.inventory.getBalances.queryOptions({ input: { search: query } }),
  );

  return (
    <>
      <SiteHeader title="Inventory" />
      <PageMain className="flex flex-col gap-6 p-4">
        <HydrateClient>
          <Suspense fallback={<StatCardsSkeleton withIcon />}>
            <InventorySummary />
          </Suspense>
        </HydrateClient>

        <SearchForm query={query} action="/inventory" />

        <HydrateClient>
          <Suspense fallback={<TabbedTableSkeleton columns={5} />}>
            <InventoryViews search={query} />
          </Suspense>
        </HydrateClient>
      </PageMain>
    </>
  );
}
