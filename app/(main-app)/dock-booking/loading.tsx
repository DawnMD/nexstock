import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteHeader } from "@/components/site-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export default function DockBookingListLoading() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader title="Dock Booking List" />
      <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-0">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <Skeleton className="h-5 w-20" />
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
