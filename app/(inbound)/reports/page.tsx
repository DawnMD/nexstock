import type { Metadata } from "next";
import { PageMain } from "@/components/page-main";
import { ReportsView } from "@/components/reports-view";
import { SiteHeader } from "@/components/site-header";
import { api, HydrateClient } from "@/trpc/server";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Reports",
  description:
    "Throughput, stock aging, quality and dock turnaround, with CSV export.",
};

export default async function Page() {
  await requireSession();

  void api.reports.getSummary.prefetch({});
  void api.reports.getReceivingThroughput.prefetch({});
  void api.reports.getShippingThroughput.prefetch({});

  return (
    <>
      <SiteHeader title="Reports" />
      <PageMain className="p-4">
        <HydrateClient>
          <ReportsView />
        </HydrateClient>
      </PageMain>
    </>
  );
}
