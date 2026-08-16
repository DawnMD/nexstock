import type { Metadata } from "next";
import { Suspense } from "react";
import { CardTableSkeleton } from "@/components/skeletons";
import { LocationMaster } from "@/components/location-master";
import { SearchForm } from "@/components/order-search-form";
import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { HydrateClient, prefetch, serverOrpc } from "@/orpc/server";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Locations",
  description: "The storage locations stock can be put away into.",
};

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string | null }>;
}) {
  await requireSession();

  const { query } = await searchParams;

  prefetch(
    serverOrpc.location.getLocations.queryOptions({ input: { search: query } }),
  );

  return (
    <>
      <SiteHeader title="Locations" />
      <PageMain className="flex flex-col gap-6 p-4">
        <SearchForm query={query} action="/locations" />
        <HydrateClient>
          <Suspense fallback={<CardTableSkeleton columns={7} />}>
            <LocationMaster search={query} />
          </Suspense>
        </HydrateClient>
      </PageMain>
    </>
  );
}
