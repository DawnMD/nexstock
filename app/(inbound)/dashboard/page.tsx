import type { Metadata } from "next";
import { Suspense } from "react";
import { StatCardsSkeleton } from "@/components/skeletons";
import { DashboardStats } from "@/components/dashboard-stats";
import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { HydrateClient, prefetch, serverOrpc } from "@/orpc/server";
import { requireSession } from "@/lib/session";

interface PageProps {
  searchParams: Promise<{ date?: string | null }>;
}

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Inbound activity at a glance: open orders, dock bookings, and recent stock movement.",
};

export default async function Page({ searchParams }: PageProps) {
  await requireSession();

  const { date } = await searchParams;

  prefetch(
    serverOrpc.order.getOrderStats.queryOptions({
      input: {
        date,
      },
    }),
  );

  return (
    <>
      <SiteHeader title="Dashboard" />
      <PageMain className="p-4">
        <HydrateClient>
          <Suspense fallback={<StatCardsSkeleton />}>
            <DashboardStats initialDate={date} />
          </Suspense>
        </HydrateClient>
      </PageMain>
    </>
  );
}
