import { DashboardStats } from "@/components/dashboard-stats";
import { api, HydrateClient } from "@/trpc/server";

export default function Page() {
  void api.order.getOrderStats.prefetch();

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <HydrateClient>
            <DashboardStats />
          </HydrateClient>
        </div>
      </div>
    </div>
  );
}
