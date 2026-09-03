import type { Metadata } from "next";
import { Suspense } from "react";
import { StatCardsSkeleton } from "@/components/skeletons";
import { DashboardStats } from "@/components/dashboard-stats";
import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { HydrateClient, prefetch, serverOrpc } from "@/orpc/server";
import { requireSession } from "@/lib/session";
import { DemoGuide } from "@/components/demo-guide";
import { db } from "@/server/db";

interface PageProps {
  searchParams: Promise<{ date?: string | null }>;
}

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Inbound activity at a glance: open orders, dock bookings, and recent stock movement.",
};

export default async function Page({ searchParams }: PageProps) {
  const session = await requireSession();
  const account = await db.user.findUnique({
    where: { id: session.user.id },
    select: { isDemo: true },
  });

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
        {account?.isDemo && <DemoGuide />}
        <HydrateClient>
          <Suspense fallback={<StatCardsSkeleton />}>
            <DashboardStats initialDate={date} />
          </Suspense>
        </HydrateClient>
      </PageMain>
    </>
  );
}
