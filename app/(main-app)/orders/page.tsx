import { OrderTable } from "@/components/order-table";
import { api, HydrateClient } from "@/trpc/server";

export default function Page() {
  void api.order.getPaginatedOrders.prefetch({ limit: 20, pageIndex: 0 });

  return (
    <HydrateClient>
      <OrderTable />
    </HydrateClient>
  );
}
