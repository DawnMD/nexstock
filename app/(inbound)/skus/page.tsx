import { SearchForm } from "@/components/order-search-form";
import { SiteHeader } from "@/components/site-header";
import { SkuMaster } from "@/components/sku-master";
import { api, HydrateClient } from "@/trpc/server";
import { auth } from "@clerk/nextjs/server";

export default async function SkusPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string | null }>;
}) {
  await auth.protect();

  const { query } = await searchParams;

  void api.sku.getSkus.prefetch({ search: query });

  return (
    <>
      <SiteHeader title="SKUs" />
      <main className="flex flex-col gap-6 p-4">
        <SearchForm query={query} action="/skus" />
        <HydrateClient>
          <SkuMaster search={query} />
        </HydrateClient>
      </main>
    </>
  );
}
