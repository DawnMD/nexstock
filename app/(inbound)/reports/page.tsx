import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportsSkeleton } from "@/components/skeletons";
import { PageMain } from "@/components/page-main";
import { ReportsView } from "@/components/reports-view";
import { SiteHeader } from "@/components/site-header";
import { HydrateClient, prefetch, serverOrpc } from "@/orpc/server";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Reports",
  description:
    "Throughput, stock aging, quality and dock turnaround, with CSV export.",
};

export default async function Page() {
  await requireSession();

  prefetch(serverOrpc.reports.getSummary.queryOptions({ input: {} }));
  prefetch(
    serverOrpc.reports.getReceivingThroughput.queryOptions({ input: {} }),
  );
  prefetch(
    serverOrpc.reports.getShippingThroughput.queryOptions({ input: {} }),
  );

  return (
    <>
      <SiteHeader title="Reports" />
      <PageMain className="p-4">
        <HydrateClient>
          <Suspense fallback={<ReportsSkeleton />}>
            <ReportsView />
          </Suspense>
        </HydrateClient>
      </PageMain>
    </>
  );
}
