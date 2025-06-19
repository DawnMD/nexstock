import { OrderDetail } from "@/components/order-detail";
import { api, HydrateClient } from "@/trpc/server";

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
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
    <HydrateClient>
      <div className="flex flex-1 flex-col">
        <OrderDetail orderNumber={orderNumber} />
      </div>
    </HydrateClient>
  );
}
