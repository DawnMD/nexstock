import { SiteHeader } from "@/components/site-header";
import { HydrateClient } from "@/trpc/server";
import { SearchIcon } from "lucide-react";

export default function ReceivePage() {
  return (
    <>
      <SiteHeader title="Receive SKU" />
      <main className="flex flex-col gap-4 p-4 lg:gap-6">
        <div className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <SearchIcon className="h-5 w-5" />
            Order Search
          </h3>
          <p className="text-muted-foreground text-sm">
            Enter an order number to retrieve associated SKUs for receiving
          </p>
        </div>
        <HydrateClient>Hello</HydrateClient>
      </main>
    </>
  );
}
