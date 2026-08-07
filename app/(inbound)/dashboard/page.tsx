import type { Metadata } from "next";
import { DashboardStats } from "@/components/dashboard-stats";
import { SiteHeader } from "@/components/site-header";
import { api, HydrateClient } from "@/trpc/server";
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

  void api.order.getOrderStats.prefetch({
    date,
  });

  return (
    <>
      <SiteHeader title="Dashboard" />
      <main className="p-4">
        <HydrateClient>
          <DashboardStats initialDate={date} />
        </HydrateClient>
      </main>
    </>
  );
}
