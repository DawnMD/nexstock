import { SiteHeader } from "@/components/site-header";
import { VehicleActivityForm } from "@/components/vehicle-activity-form";
import { api, HydrateClient } from "@/trpc/server";

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ orderNumber: string; vehicleNumber: string }>;
}) {
  const { orderNumber, vehicleNumber } = await params;

  await api.order.getDockBookingByVehicleNumberAndOrderNumber.prefetch({
    vehicleNumber,
    orderNumber,
  });

  return (
    <>
      <SiteHeader title="Vehicle Check In" />
      <main className="p-4">
        <HydrateClient>
          <VehicleActivityForm
            vehicleNumber={vehicleNumber}
            orderNumber={orderNumber}
            activityType="CHECK_IN"
            buttonText="Check In Vehicle"
            loadingText="Checking In..."
          />
        </HydrateClient>
      </main>
    </>
  );
}
