import { DashboardStats } from "@/components/dashboard-stats";
import { SiteHeader } from "@/components/site-header";
import { api, HydrateClient } from "@/trpc/server";
import { startOfDay } from "date-fns";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const { date } = await searchParams;
  const selectedDate = startOfDay(date ? new Date(date) : new Date());

  void api.order.getOrderStats.prefetch({
    date: selectedDate,
  });

  return (
    <>
      <SiteHeader title="Dashboard" />
      <main className="p-4">
        <HydrateClient>
          <DashboardStats initialDate={selectedDate} />
        </HydrateClient>
      </main>
    </>
  );
}
