import { DockBookingList } from "@/components/dock-booking-list";
import { SiteHeader } from "@/components/site-header";
import { api, HydrateClient } from "@/trpc/server";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    query?: string | null;
  }>;
}) {
  const { query } = await searchParams;
  void api.order.getTodayDockSchedule.prefetch({ search: query });

  return (
    <>
      <SiteHeader title="Dock Booking List" />
      <main className="p-4">
        <HydrateClient>
          <DockBookingList query={query} />
        </HydrateClient>
      </main>
    </>
  );
}
