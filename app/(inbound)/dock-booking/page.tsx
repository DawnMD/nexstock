import type { Metadata } from "next";
import { Suspense } from "react";
import { CardListSkeleton } from "@/components/skeletons";
import { DockBookingList } from "@/components/dock-booking-list";
import { DockDateSearch } from "@/components/dock-date-search";
import { SearchForm } from "@/components/order-search-form";
import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { HydrateClient, prefetch, serverOrpc } from "@/orpc/server";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Dock Booking",
  description:
    "Book docks for inbound vehicles and follow them from open through check-out.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    query?: string | null;
    date?: string | null;
  }>;
}) {
  await requireSession();

  const { query, date } = await searchParams;

  prefetch(
    serverOrpc.order.getTodayDockSchedule.queryOptions({
      input: {
        search: query,
        date,
      },
    }),
  );

  return (
    <>
      <SiteHeader title="Dock Booking" />
      <PageMain className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SearchForm query={query} action="/dock-booking" />
          <DockDateSearch date={date} />
        </div>
        <HydrateClient>
          <Suspense fallback={<CardListSkeleton rows={6} />}>
            <DockBookingList query={query} date={date} />
          </Suspense>
        </HydrateClient>
      </PageMain>
    </>
  );
}
