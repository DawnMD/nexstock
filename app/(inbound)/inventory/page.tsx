import type { Metadata } from "next";
import { InventorySummary } from "@/components/inventory-summary";
import { InventoryViews } from "@/components/inventory-views";
import { SearchForm } from "@/components/order-search-form";
import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { api, HydrateClient } from "@/trpc/server";
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

  void api.inventory.getSummary.prefetch();
  void api.inventory.getDrift.prefetch();
  void api.inventory.getBySku.prefetch({ search: query });
  void api.inventory.getByLocation.prefetch({ search: query });
  void api.inventory.getByZone.prefetch();
  void api.inventory.getBalances.prefetch({ search: query });

  return (
    <>
      <SiteHeader title="Inventory" />
      <PageMain className="flex flex-col gap-6 p-4">
        <HydrateClient>
          <InventorySummary />
        </HydrateClient>

        <SearchForm query={query} action="/inventory" />

        <HydrateClient>
          <InventoryViews search={query} />
        </HydrateClient>
      </PageMain>
    </>
  );
}
