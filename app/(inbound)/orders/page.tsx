import type { Metadata } from "next";
import { Suspense } from "react";
import { DataTableSkeleton } from "@/components/skeletons";
import { OrderTable } from "@/components/order-table";
import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { HydrateClient, prefetch, serverOrpc } from "@/orpc/server";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Orders",
  description:
    "Browse purchase orders and track them through the inbound flow.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    query?: string | null;
  }>;
}) {
  await requireSession();

  const { query } = await searchParams;
  prefetch(
    serverOrpc.order.getPaginatedOrders.queryOptions({
      input: {
        limit: 20,
        pageIndex: 0,
        search: query,
      },
    }),
  );

  return (
    <>
      <SiteHeader title="Orders" />
      <PageMain className="p-4">
        <HydrateClient>
          <Suspense fallback={<DataTableSkeleton columns={8} />}>
            <OrderTable query={query} />
          </Suspense>
        </HydrateClient>
      </PageMain>
    </>
  );
}
