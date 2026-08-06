import { OrderDetail } from "@/components/order-detail";
import { SiteHeader } from "@/components/site-header";
import { api, HydrateClient } from "@/trpc/server";
import { auth } from "@clerk/nextjs/server";

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  await auth.protect();

  const { orderNumber } = await params;

  if (!orderNumber) {
    return <div>Order not found</div>;
  }

  await Promise.all([
    api.order.getOrderDetailsByOrderNumber.prefetch({
      orderNumber,
    }),
    api.order.getAvailableDocks.prefetch(),
    api.order.getVehicleTypes.prefetch(),
    api.order.getDockBookingsByOrderNumber.prefetch({
      orderNumber,
    }),
  ]);

  return (
    <>
      <SiteHeader title={"Order Details"} />
      <main className="p-4">
        <HydrateClient>
          <OrderDetail orderNumber={orderNumber} />
        </HydrateClient>
      </main>
    </>
  );
}
