import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchIcon } from "lucide-react";

export default function QualityCheckOrderLoading() {
  return (
    <>
      <SiteHeader title="Quality Check" />
      <PageMain className="flex flex-col gap-4 p-4 lg:gap-6">
        <div className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <SearchIcon className="h-5 w-5" />
            Order Search
          </h3>
          <p className="text-muted-foreground text-sm">
            Enter an order number to retrieve associated SKUs for quality check
          </p>
        </div>
        <div className="relative">
          <div className="absolute top-1/2 left-3 -translate-y-1/2 transform">
            <SearchIcon className="h-4 w-4 text-gray-500" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
      </PageMain>
    </>
  );
}
