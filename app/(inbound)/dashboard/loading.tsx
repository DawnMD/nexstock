import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { StatCardsSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <SiteHeader title="Dashboard" />
      <PageMain className="p-4">
        <div className="space-y-4">
          <div className="flex justify-end">
            <Skeleton className="h-9 w-40 lg:w-32" />
          </div>
          <StatCardsSkeleton />
        </div>
      </PageMain>
    </>
  );
}
