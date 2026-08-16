import type { Metadata } from "next";
import { Suspense } from "react";
import { CardTableSkeleton } from "@/components/skeletons";
import { SearchForm } from "@/components/order-search-form";
import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { SkuMaster } from "@/components/sku-master";
import { HydrateClient, prefetch, serverOrpc } from "@/orpc/server";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "SKUs",
  description:
    "The SKU catalogue used across receiving, quality check, and inventory.",
};

export default async function SkusPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string | null }>;
}) {
  await requireSession();

  const { query } = await searchParams;

  prefetch(serverOrpc.sku.getSkus.queryOptions({ input: { search: query } }));

  return (
    <>
      <SiteHeader title="SKUs" />
      <PageMain className="flex flex-col gap-6 p-4">
        <SearchForm query={query} action="/skus" />
        <HydrateClient>
          <Suspense fallback={<CardTableSkeleton columns={7} />}>
            <SkuMaster search={query} />
          </Suspense>
        </HydrateClient>
      </PageMain>
    </>
  );
}
