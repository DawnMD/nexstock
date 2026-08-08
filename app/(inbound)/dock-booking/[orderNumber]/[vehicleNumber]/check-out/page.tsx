import type { Metadata } from "next";
import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { VehicleActivityContainer } from "@/components/vehicle-activity-containner";
import { VehicleActivityForm } from "@/components/vehicle-activity-form";
import { api, HydrateClient } from "@/trpc/server";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orderNumber: string; vehicleNumber: string }>;
}): Promise<Metadata> {
  const { orderNumber, vehicleNumber } = await params;
  return {
    title: `Check Out · Vehicle ${vehicleNumber}`,
    description: `Check vehicle ${vehicleNumber} out against order ${orderNumber}.`,
  };
}

export default async function CheckOutPage({
  params,
}: {
  params: Promise<{ orderNumber: string; vehicleNumber: string }>;
}) {
  await requireSession();

  const { orderNumber, vehicleNumber } = await params;

  const dockBookingDetails =
    await api.order.getDockBookingByVehicleNumberAndOrderNumber({
      vehicleNumber,
      orderNumber,
    });

  if (!dockBookingDetails) {
    notFound();
  }

  return (
    <>
      <SiteHeader title="Vehicle Check Out" />
      <PageMain className="p-4">
        <VehicleActivityContainer dockBookingDetails={dockBookingDetails}>
          <HydrateClient>
            <VehicleActivityForm
              vehicleNumber={vehicleNumber}
              activityType="CHECK_OUT"
              orderNumber={orderNumber}
            />
          </HydrateClient>
        </VehicleActivityContainer>
      </PageMain>
    </>
  );
}
