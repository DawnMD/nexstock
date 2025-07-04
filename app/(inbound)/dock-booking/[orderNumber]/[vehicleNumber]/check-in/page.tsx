import { SiteHeader } from "@/components/site-header";
import { VehicleActivityContainer } from "@/components/vehicle-activity-containner";
import { VehicleActivityForm } from "@/components/vehicle-activity-form";
import { api, HydrateClient } from "@/trpc/server";
import { notFound } from "next/navigation";

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ orderNumber: string; vehicleNumber: string }>;
}) {
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
      <SiteHeader title="Vehicle Check In" />
      <main className="p-4">
        <VehicleActivityContainer dockBookingDetails={dockBookingDetails}>
          <HydrateClient>
            <VehicleActivityForm
              vehicleNumber={vehicleNumber}
              activityType="CHECK_IN"
            />
          </HydrateClient>
        </VehicleActivityContainer>
      </main>
    </>
  );
}
