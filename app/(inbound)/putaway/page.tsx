import { SearchIcon } from "lucide-react";
import { api, HydrateClient } from "@/trpc/server";
import { SiteHeader } from "@/components/site-header";
import { PutawayLPNSearch } from "@/components/putaway-lpn-search";
import { auth } from "@clerk/nextjs/server";

export default async function PutawayPage() {
  await auth.protect();

  void api.putaway.getAllLPNs.prefetch();

  return (
    <>
      <SiteHeader title="Putaway" />
      <main className="flex flex-col gap-4 p-4 lg:gap-6">
        <div className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <SearchIcon className="h-5 w-5" />
            LPN Search
          </h3>
          <p className="text-muted-foreground text-sm">
            Search for LPNs to perform putaway operations
          </p>
        </div>
        <HydrateClient>
          <PutawayLPNSearch />
        </HydrateClient>
      </main>
    </>
  );
}
