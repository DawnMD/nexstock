import type { Metadata } from "next";
import { OrderDetail } from "@/components/order-detail";
import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { api, HydrateClient } from "@/trpc/server";
import { requireSession } from "@/lib/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `Order ${orderNumber}`,
    description: `Order lines, dock bookings, and inbound progress for order ${orderNumber}.`,
  };
}

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  await requireSession();

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
      <PageMain className="p-4">
        <HydrateClient>
          <OrderDetail orderNumber={orderNumber} />
        </HydrateClient>
      </PageMain>
    </>
  );
}
