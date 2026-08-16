import type { Metadata } from "next";
import { Suspense } from "react";
import { CardTableSkeleton } from "@/components/skeletons";
import { PageMain } from "@/components/page-main";
import { SalesOrderList } from "@/components/sales-order-list";
import { SearchForm } from "@/components/order-search-form";
import { SiteHeader } from "@/components/site-header";
import { HydrateClient, prefetch, serverOrpc } from "@/orpc/server";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Sales Orders",
  description: "Outbound orders, from allocation through to dispatch.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ query?: string | null }>;
}) {
  await requireSession();

  const { query } = await searchParams;

  prefetch(
    serverOrpc.outbound.getSalesOrders.queryOptions({
      input: { search: query },
    }),
  );

  return (
    <>
      <SiteHeader title="Sales Orders" />
      <PageMain className="flex flex-col gap-4 p-4">
        <SearchForm query={query} action="/sales-orders" />
        <HydrateClient>
          <Suspense fallback={<CardTableSkeleton columns={10} rows={8} />}>
            <SalesOrderList search={query} />
          </Suspense>
        </HydrateClient>
      </PageMain>
    </>
  );
}
