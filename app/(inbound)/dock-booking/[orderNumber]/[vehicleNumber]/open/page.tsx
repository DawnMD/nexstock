import type { Metadata } from "next";
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
    title: `Open · Vehicle ${vehicleNumber}`,
    description: `Open the dock booking for vehicle ${vehicleNumber} on order ${orderNumber}.`,
  };
}

export default async function OpenPage({
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
      <SiteHeader title="Vehicle Open" />
      <main className="p-4">
        <VehicleActivityContainer dockBookingDetails={dockBookingDetails}>
          <HydrateClient>
            <VehicleActivityForm
              vehicleNumber={vehicleNumber}
              activityType="OPEN"
              orderNumber={orderNumber}
            />
          </HydrateClient>
        </VehicleActivityContainer>
      </main>
    </>
  );
}
