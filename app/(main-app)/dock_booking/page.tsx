import { DockBookingList } from "@/components/dock-booking-list";
import { SiteHeader } from "@/components/site-header";
import { api, HydrateClient } from "@/trpc/server";

export default async function Page() {
  void api.order.getTodayDockSchedule.prefetch();

  return (
    <>
      <SiteHeader title="Dock Booking List" />
      <main className="p-4">
        <HydrateClient>
          <DockBookingList />
        </HydrateClient>
      </main>
    </>
  );
}
