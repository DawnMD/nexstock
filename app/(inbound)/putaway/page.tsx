import type { Metadata } from "next";
import { SearchIcon } from "lucide-react";
import { api, HydrateClient } from "@/trpc/server";
import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { PutawayLPNSearch } from "@/components/putaway-lpn-search";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Putaway",
  description:
    "Scan an LPN to put received stock away into a storage location.",
};

export default async function PutawayPage() {
  await requireSession();

  void api.putaway.getAllLPNs.prefetch();

  return (
    <>
      <SiteHeader title="Putaway" />
      <PageMain className="flex flex-col gap-4 p-4 lg:gap-6">
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
      </PageMain>
    </>
  );
}
