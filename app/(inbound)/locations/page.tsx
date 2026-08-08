import type { Metadata } from "next";
import { LocationMaster } from "@/components/location-master";
import { SearchForm } from "@/components/order-search-form";
import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { api, HydrateClient } from "@/trpc/server";
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

  void api.location.getLocations.prefetch({ search: query });

  return (
    <>
      <SiteHeader title="Locations" />
      <PageMain className="flex flex-col gap-6 p-4">
        <SearchForm query={query} action="/locations" />
        <HydrateClient>
          <LocationMaster search={query} />
        </HydrateClient>
      </PageMain>
    </>
  );
}
