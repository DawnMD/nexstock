import { DashboardStats } from "@/components/dashboard-stats";
import { SiteHeader } from "@/components/site-header";
import { api, HydrateClient } from "@/trpc/server";

interface PageProps {
  searchParams: Promise<{ date?: string | null }>;
}

export default async function Page({ searchParams }: PageProps) {
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
