import type { Metadata } from "next";
import { NewSalesOrderForm } from "@/components/new-sales-order-form";
import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { requireSession } from "@/lib/session";
import { serverClient } from "@/orpc/server";

export const metadata: Metadata = {
  title: "New Sales Order",
  description: "Raise an outbound order against a customer.",
};

export default async function NewSalesOrderPage() {
  await requireSession();

  // Awaited rather than prefetched: the customer list is a small, closed set
  // that the form needs before it can render a usable control, and there is
  // nothing else on the page to stream in beside it.
  const customers = await serverClient.outbound.getCustomers();

  return (
    <>
      <SiteHeader title="New Sales Order" />
      <PageMain className="flex flex-col gap-4 p-4 lg:gap-6">
        <NewSalesOrderForm customers={customers} />
      </PageMain>
    </>
  );
}
