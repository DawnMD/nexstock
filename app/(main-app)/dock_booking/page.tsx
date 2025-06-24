import { DockBookingList } from "@/components/dock-booking-list";
import { api, HydrateClient } from "@/trpc/server";

export default async function Page() {
  void api.order.getTodayDockSchedule.prefetch();

  return (
    <HydrateClient>
      <DockBookingList />
    </HydrateClient>
  );
}
