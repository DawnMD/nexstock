import { QualityCheckOrderSearch } from "@/components/quality-check-order-search";
import { SiteHeader } from "@/components/site-header";
import { api, HydrateClient } from "@/trpc/server";
import { SearchIcon } from "lucide-react";
import { auth } from "@clerk/nextjs/server";

export default async function QualityCheckPage() {
  await auth.protect();

  void api.qualityCheck.getAllOrderNumbers.prefetch();

  return (
    <>
      <SiteHeader title="Quality Check" />
      <main className="flex flex-col gap-4 p-4 lg:gap-6">
        <div className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <SearchIcon className="h-5 w-5" />
            Order Search
          </h3>
          <p className="text-muted-foreground text-sm">
            Enter an order number to retrieve associated SKUs for quality check
          </p>
        </div>
        <HydrateClient>
          <QualityCheckOrderSearch />
        </HydrateClient>
      </main>
    </>
  );
}
