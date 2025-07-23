import { SiteHeader } from "@/components/site-header";
import { api, HydrateClient } from "@/trpc/server";

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
        <HydrateClient>
          <div>hello</div>
        </HydrateClient>
      </main>
    </>
  );
}
