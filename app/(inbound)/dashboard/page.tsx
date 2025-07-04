import { DashboardStats } from "@/components/dashboard-stats";
import { SiteHeader } from "@/components/site-header";
import { api, HydrateClient } from "@/trpc/server";

export default function Page() {
  void api.order.getOrderStats.prefetch();

  return (
    <>
      <SiteHeader title="Dashboard" />
      <main className="p-4">
        <HydrateClient>
          <DashboardStats />
        </HydrateClient>
      </main>
    </>
  );
}
