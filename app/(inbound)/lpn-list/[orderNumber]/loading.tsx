import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";

export default function Loading() {
  return (
    <>
      <SiteHeader title="LPN List" />
      <main className="flex flex-col gap-4 p-4 lg:gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="mb-1 h-4 w-20" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-24" />
        </div>

        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-lg border p-4">
              {/* Desktop Loading */}
              <div className="hidden items-center gap-6 md:flex">
                <div className="flex-1">
                  <Skeleton className="mb-1 h-3 w-8" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <div className="flex-1">
                  <Skeleton className="mb-1 h-3 w-8" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <div className="flex-1">
                  <Skeleton className="mb-1 h-3 w-16" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <div className="flex-1">
                  <Skeleton className="mb-1 h-3 w-16" />
                  <Skeleton className="h-5 w-12" />
                </div>
              </div>

              {/* Mobile Loading */}
              <div className="space-y-3 md:hidden">
                <div className="flex items-center justify-between">
                  <div>
                    <Skeleton className="mb-1 h-3 w-8" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div>
                    <Skeleton className="mb-1 h-3 w-8" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Skeleton className="mb-1 h-3 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div>
                    <Skeleton className="mb-1 h-3 w-16" />
                    <Skeleton className="h-4 w-14" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
