import type { Metadata } from "next";
import { Suspense } from "react";
import { FormSkeleton } from "@/components/skeletons";
import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { VehicleActivityContainer } from "@/components/vehicle-activity-containner";
import { VehicleActivityForm } from "@/components/vehicle-activity-form";
import { HydrateClient, serverClient } from "@/orpc/server";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orderNumber: string; vehicleNumber: string }>;
}): Promise<Metadata> {
  const { orderNumber, vehicleNumber } = await params;
  return {
    title: `Check In · Vehicle ${vehicleNumber}`,
    description: `Check vehicle ${vehicleNumber} in against order ${orderNumber}.`,
  };
}

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ orderNumber: string; vehicleNumber: string }>;
}) {
  await requireSession();

  const { orderNumber, vehicleNumber } = await params;

  const dockBookingDetails =
    await serverClient.order.getDockBookingByVehicleNumberAndOrderNumber({
      vehicleNumber,
      orderNumber,
    });

  if (!dockBookingDetails) {
    notFound();
  }

  return (
    <>
      <SiteHeader title="Vehicle Check In" />
      <PageMain className="p-4">
        <VehicleActivityContainer dockBookingDetails={dockBookingDetails}>
          <HydrateClient>
            <Suspense fallback={<FormSkeleton fields={2} />}>
              <VehicleActivityForm
                vehicleNumber={vehicleNumber}
                activityType="CHECK_IN"
                orderNumber={orderNumber}
              />
            </Suspense>
          </HydrateClient>
        </VehicleActivityContainer>
      </PageMain>
    </>
  );
}
