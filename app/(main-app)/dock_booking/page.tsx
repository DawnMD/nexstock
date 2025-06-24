import { HydrateClient } from "@/trpc/server";
import { DockBookingList } from "@/components/dock-booking-list";

export default function Page() {
  return (
    <HydrateClient>
      <DockBookingList />
    </HydrateClient>
  );
}
