import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <SiteHeader title="Dashboard" />
      <main className="p-4">
        <div className="space-y-4">
          <div className="flex justify-end">
            <Skeleton className="h-10 w-[240px]" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card className="p-6" key={i}>
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-sm font-medium">
                    <Skeleton className="h-4 w-24" />
                  </span>
                  <span className="text-2xl font-bold">
                    <Skeleton className="h-8 w-16" />
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
