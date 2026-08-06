import { LocationMaster } from "@/components/location-master";
import { SearchForm } from "@/components/order-search-form";
import { SiteHeader } from "@/components/site-header";
import { api, HydrateClient } from "@/trpc/server";
import { auth } from "@clerk/nextjs/server";

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string | null }>;
}) {
  await auth.protect();

  const { query } = await searchParams;

  void api.location.getLocations.prefetch({ search: query });

  return (
    <>
      <SiteHeader title="Locations" />
      <main className="flex flex-col gap-6 p-4">
        <SearchForm query={query} action="/locations" />
        <HydrateClient>
          <LocationMaster search={query} />
        </HydrateClient>
      </main>
    </>
  );
}
