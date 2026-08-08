import type { Metadata } from "next";
import { SearchIcon } from "lucide-react";
import { api, HydrateClient } from "@/trpc/server";
import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { ReceiveSkuOrderSearch } from "@/components/receive-sku-order-search";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Receive SKU",
  description: "Scan an order to receive its lines against the purchase order.",
};

export default async function ReceivePage() {
  await requireSession();

  void api.receive.getAllOrderNumbers.prefetch();

  return (
    <>
      <SiteHeader title="Receive SKU" />
      <PageMain className="flex flex-col gap-4 p-4 lg:gap-6">
        <div className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <SearchIcon className="h-5 w-5" />
            Order Search
          </h3>
          <p className="text-muted-foreground text-sm">
            Enter an order number to retrieve associated SKUs for receiving
          </p>
        </div>
        <HydrateClient>
          <ReceiveSkuOrderSearch />
        </HydrateClient>
      </PageMain>
    </>
  );
}
