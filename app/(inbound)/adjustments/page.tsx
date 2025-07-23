import { SearchForm } from "@/components/order-search-form";
import { SiteHeader } from "@/components/site-header";
import { api, HydrateClient } from "@/trpc/server";
import { AddNewAdjustment } from "@/components/add-new-adjustment";

export default async function AdjustmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    query?: string | null;
  }>;
}) {
  const { query } = await searchParams;

  void api.adjustments.getAdjustments.prefetch({
    limit: 20,
    pageIndex: 0,
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
            <div>hello</div>
          </HydrateClient>
        </div>
      </main>
    </>
  );
}
