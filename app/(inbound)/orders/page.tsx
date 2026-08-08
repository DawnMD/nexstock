import type { Metadata } from "next";
import { OrderTable } from "@/components/order-table";
import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { api, HydrateClient } from "@/trpc/server";
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
  void api.order.getPaginatedOrders.prefetch({
    limit: 20,
    pageIndex: 0,
    search: query,
  });

  return (
    <>
      <SiteHeader title="Orders" />
      <PageMain className="p-4">
        <HydrateClient>
          <OrderTable query={query} />
        </HydrateClient>
      </PageMain>
    </>
  );
}
