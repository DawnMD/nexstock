import { SiteHeader } from "@/components/site-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function PutawayLPNLoading() {
  return (
    <>
      <SiteHeader title="Putaway" />
      <main className="flex flex-col gap-4 p-4 lg:gap-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-40 w-full" />
        </div>
      </main>
    </>
  );
}
