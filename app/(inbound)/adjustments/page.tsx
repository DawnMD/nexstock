import { SearchForm } from "@/components/order-search-form";
import { SiteHeader } from "@/components/site-header";
import { api, HydrateClient } from "@/trpc/server";
import { AddNewAdjustment } from "@/components/add-new-adjustment";
import { AdjustmentListTable } from "@/components/adjustment-list-table";
import { auth } from "@clerk/nextjs/server";

export default async function AdjustmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    query?: string | null;
    page?: string | null;
    limit?: string | null;
  }>;
}) {
  await auth.protect();

  const { query, page, limit } = await searchParams;

  const searchLimit = limit ? parseInt(limit) : 20;
  const searchPage = page ? parseInt(page) : 0;

  void api.adjustments.getAdjustments.prefetch({
    limit: searchLimit,
    pageIndex: searchPage,
    search: query,
  });

  return (
    <>
      <SiteHeader title="Adjustments" />
      <main className="p-4">
        <div className="flex w-full flex-col justify-start gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <SearchForm query={query} action="/adjustments" />
            <AddNewAdjustment />
          </div>

          <HydrateClient>
            <AdjustmentListTable
              query={query}
              limit={searchLimit}
              page={searchPage}
            />
          </HydrateClient>
        </div>
      </main>
    </>
  );
}
