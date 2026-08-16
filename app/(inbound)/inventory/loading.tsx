import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { StatCardsSkeleton, TabbedTableSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function InventoryLoading() {
  return (
    <>
      <SiteHeader title="Inventory" />
      <PageMain className="flex flex-col gap-6 p-4">
        <StatCardsSkeleton withIcon />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-8 w-full max-w-sm" />
        <TabbedTableSkeleton columns={5} />
      </PageMain>
    </>
  );
}
