import { SiteHeader } from "@/components/site-header";
import { VehicleActivityForm } from "@/components/vehicle-activity-form";
import { api, HydrateClient } from "@/trpc/server";

export default async function ClosePage({
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
      <SiteHeader title="Vehicle Close" />
      <main className="p-4">
        <HydrateClient>
          <VehicleActivityForm
            vehicleNumber={vehicleNumber}
            orderNumber={orderNumber}
            activityType="CLOSE"
            buttonText="Close Vehicle"
            loadingText="Closing Vehicle..."
          />
        </HydrateClient>
      </main>
    </>
  );
}
