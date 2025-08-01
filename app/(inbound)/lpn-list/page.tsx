import { SearchIcon } from "lucide-react";
import { api, HydrateClient } from "@/trpc/server";
import { SiteHeader } from "@/components/site-header";
import { LpnListOrderSearch } from "@/components/lpn-list-order-search";

export default function ReceivedItemsPage() {
  void api.receive.getAllOrderNumbers.prefetch();

  return (
    <>
      <SiteHeader title="LPN List" />
      <main className="flex flex-col gap-4 p-4 lg:gap-6">
        <div className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <SearchIcon className="h-5 w-5" />
            Order Search
          </h3>
          <p className="text-muted-foreground text-sm">
            Enter an order number to view LPNs for that order
          </p>
        </div>
        <HydrateClient>
          <LpnListOrderSearch />
        </HydrateClient>
      </main>
    </>
  );
}
