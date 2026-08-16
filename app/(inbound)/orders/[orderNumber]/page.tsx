import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderDetailSkeleton } from "@/components/skeletons";
import { OrderDetail } from "@/components/order-detail";
import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { HydrateClient, prefetch, serverOrpc } from "@/orpc/server";
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

  // Not awaited: pending queries are dehydrated too, so all four stream into
  // the boundary below rather than holding up the RSC render.
  prefetch(
    serverOrpc.order.getOrderDetailsByOrderNumber.queryOptions({
      input: { orderNumber },
    }),
  );
  prefetch(serverOrpc.order.getAvailableDocks.queryOptions());
  prefetch(serverOrpc.order.getVehicleTypes.queryOptions());
  prefetch(
    serverOrpc.order.getDockBookingsByOrderNumber.queryOptions({
      input: { orderNumber },
    }),
  );

  return (
    <>
      <SiteHeader title={"Order Details"} />
      <PageMain className="p-4">
        <HydrateClient>
          <Suspense fallback={<OrderDetailSkeleton />}>
            <OrderDetail orderNumber={orderNumber} />
          </Suspense>
        </HydrateClient>
      </PageMain>
    </>
  );
}
