import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { DataTableSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

export default function OrdersLoading() {
  return (
    <>
      <SiteHeader title="Orders" />
      <PageMain className="flex w-full flex-col justify-start gap-6 p-4">
        {/* The search form and the column picker are static chrome, so they
            render as the real controls rather than as skeleton blocks. */}
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex items-center gap-2">
            <Input
              id="search"
              placeholder="Type to search..."
              className="h-8 pl-7"
              disabled
            />
            <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 opacity-50 select-none" />
            <Button variant="outline" className="h-8" disabled>
              Search
            </Button>
          </div>
          <Skeleton className="h-9 w-full lg:w-32" />
        </div>

        <DataTableSkeleton columns={8} />
      </PageMain>
    </>
  );
}
