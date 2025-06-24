import { OrderTable } from "@/components/order-table";
import { api, HydrateClient } from "@/trpc/server";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    query?: string | null;
  }>;
}) {
  const { query } = await searchParams;
  void api.order.getPaginatedOrders.prefetch({
    limit: 20,
    pageIndex: 0,
    search: query,
  });

  return (
    <HydrateClient>
      <OrderTable query={query} />
    </HydrateClient>
  );
}
