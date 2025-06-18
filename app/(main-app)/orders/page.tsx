import { OrderTable } from "@/components/order-table";
import { api, HydrateClient } from "@/trpc/server";

export default function Page() {
  void api.order.getAllOrders.prefetch();

  return (
    <HydrateClient>
      <OrderTable />
    </HydrateClient>
  );
}
