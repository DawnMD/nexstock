import type { Metadata } from "next";
import { Suspense } from "react";
import { DataTableSkeleton } from "@/components/skeletons";
import { SearchForm } from "@/components/order-search-form";
import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { HydrateClient, prefetch, serverOrpc } from "@/orpc/server";
import { AddNewAdjustment } from "@/components/add-new-adjustment";
import { AdjustmentListTable } from "@/components/adjustment-list-table";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Adjustments",
  description: "Correct stock discrepancies found after receiving.",
};

export default async function AdjustmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    query?: string | null;
    page?: string | null;
    limit?: string | null;
  }>;
}) {
  await requireSession();

  const { query, page, limit } = await searchParams;

  const searchLimit = limit ? parseInt(limit) : 20;
  const searchPage = page ? parseInt(page) : 0;

  prefetch(
    serverOrpc.adjustments.getAdjustments.queryOptions({
      input: {
        limit: searchLimit,
        pageIndex: searchPage,
        search: query,
      },
    }),
  );

  return (
    <>
      <SiteHeader title="Adjustments" />
      <PageMain className="p-4">
        <div className="flex w-full flex-col justify-start gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <SearchForm query={query} action="/adjustments" />
            <AddNewAdjustment />
          </div>

          <HydrateClient>
            <Suspense fallback={<DataTableSkeleton columns={10} />}>
              <AdjustmentListTable
                query={query}
                limit={searchLimit}
                page={searchPage}
              />
            </Suspense>
          </HydrateClient>
        </div>
      </PageMain>
    </>
  );
}
