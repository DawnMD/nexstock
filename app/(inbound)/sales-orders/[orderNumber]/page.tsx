import type { Metadata } from "next";
import { PageMain } from "@/components/page-main";
import { SalesOrderDetail } from "@/components/sales-order-detail";
import { SiteHeader } from "@/components/site-header";
import { api, HydrateClient } from "@/trpc/server";
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

  const order = await api.outbound.getSalesOrder({ orderNumber });
  if (!order) notFound();

  return (
    <>
      <SiteHeader title="Sales Order" />
      <PageMain className="p-4">
        <HydrateClient>
          <SalesOrderDetail orderNumber={orderNumber} />
        </HydrateClient>
      </PageMain>
    </>
  );
}
