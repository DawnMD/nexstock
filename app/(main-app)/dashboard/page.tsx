import { DashboardStats } from "@/components/dashboard-stats";
import { api, HydrateClient } from "@/trpc/server";
import { Suspense } from "react";
import Loading from "./loading";

export default async function Page() {
  const orderStats = await api.order.getOrderStats();

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <Suspense fallback={<Loading />}>
            <HydrateClient>
              <div className="flex flex-1 flex-col">
                <DashboardStats stats={orderStats} />
              </div>
            </HydrateClient>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
