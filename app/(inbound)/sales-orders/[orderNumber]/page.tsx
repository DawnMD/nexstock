import type { Metadata } from "next";
import { Suspense } from "react";
import { SalesOrderDetailSkeleton } from "@/components/skeletons";
import { PageMain } from "@/components/page-main";
import { SalesOrderDetail } from "@/components/sales-order-detail";
import { SiteHeader } from "@/components/site-header";
import { fetchQuery, HydrateClient, serverOrpc } from "@/orpc/server";
import { requireSession } from "@/lib/session";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `Sales order ${orderNumber}`,
    description: `Allocation, picking and dispatch for sales order ${orderNumber}.`,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  await requireSession();

  const { orderNumber } = await params;

  // `fetchQuery` rather than a direct client call: the guard needs the value
  // *and* `<SalesOrderDetail>` below asks for the same query, so this fills the
  // cache that `HydrateClient` dehydrates. A direct call would leave the
  // boundary empty and have the browser fetch it again over HTTP.
  const order = await fetchQuery(
    serverOrpc.outbound.getSalesOrder.queryOptions({ input: { orderNumber } }),
  );
  if (!order) notFound();

  return (
    <>
      <SiteHeader title="Sales Order" />
      <PageMain className="p-4">
        <HydrateClient>
          <Suspense fallback={<SalesOrderDetailSkeleton />}>
            <SalesOrderDetail orderNumber={orderNumber} />
          </Suspense>
        </HydrateClient>
      </PageMain>
    </>
  );
}
