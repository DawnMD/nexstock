import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DockBookingListLoading() {
  const loadingItems = Array.from({ length: 2 }, (_, i) => i);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-4 lg:gap-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loadingItems.map((i) => (
            <Card key={i}>
              <CardHeader className="pb-0">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-32" />
                </div>

                <div className="space-y-3 rounded-lg border p-3">
                  <div>
                    <Skeleton className="mb-1 h-4 w-24" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  </div>
                  <div>
                    <Skeleton className="mb-1 h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
