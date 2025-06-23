import { OrderTable } from "@/components/order-table";
import { SiteHeader } from "@/components/site-header";
import { api, HydrateClient } from "@/trpc/server";

export default function Page() {
  void api.order.getAllOrders.prefetch();

  return (
    <>
      <SiteHeader title="Orders" />
      <main className="p-4">
        <HydrateClient>
          <OrderTable />
        </HydrateClient>
      </main>
    </>
  );
}
