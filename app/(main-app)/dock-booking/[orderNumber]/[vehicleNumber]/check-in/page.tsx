import { SiteHeader } from "@/components/site-header";
import { VehicleCheckIn } from "@/components/vehicle-check-in";
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
          <VehicleCheckIn
            vehicleNumber={vehicleNumber}
            orderNumber={orderNumber}
          />
        </HydrateClient>
      </main>
    </>
  );
}
