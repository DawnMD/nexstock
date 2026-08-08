import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card className="p-6" key={i}>
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </PageMain>
    </>
  );
}
