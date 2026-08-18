import type { Metadata } from "next";
import { Suspense } from "react";
import { CardTableSkeleton } from "@/components/skeletons";
import { PageMain } from "@/components/page-main";
import { SalesOrderList } from "@/components/sales-order-list";
import { SearchForm } from "@/components/order-search-form";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchForm query={query} action="/sales-orders" />
          <Button
            className="h-11 w-full sm:h-9 sm:w-fit"
            render={<Link href="/sales-orders/new" />}
            nativeButton={false}
          >
            <PlusIcon className="size-4" />
            New sales order
          </Button>
        </div>
        <HydrateClient>
          <Suspense fallback={<CardTableSkeleton columns={10} rows={8} />}>
            <SalesOrderList search={query} />
          </Suspense>
        </HydrateClient>
      </PageMain>
    </>
  );
}
