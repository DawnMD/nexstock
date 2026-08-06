import { OrderTable } from "@/components/order-table";
import { SiteHeader } from "@/components/site-header";
import { api, HydrateClient } from "@/trpc/server";
import { auth } from "@clerk/nextjs/server";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    query?: string | null;
  }>;
}) {
  await auth.protect();

  const { query } = await searchParams;
  void api.order.getPaginatedOrders.prefetch({
    limit: 20,
    pageIndex: 0,
    search: query,
  });

  return (
    <>
      <SiteHeader title="Orders" />
      <main className="p-4">
        <HydrateClient>
          <OrderTable query={query} />
        </HydrateClient>
      </main>
    </>
  );
}
