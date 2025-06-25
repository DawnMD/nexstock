"use client";

import { Badge } from "@/components/ui/badge";
import { TruckIcon, PackageIcon, HashIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/trpc/react";
import { SearchForm } from "./order-search-form";

export function DockBookingList({ query }: { query?: string | null }) {
  const [bookings] = api.order.getTodayDockSchedule.useSuspenseQuery({
    search: query,
  });

  if (!bookings?.length) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SearchForm query={query} action="/dock_booking" />
        </div>
        <Card>
          <CardContent>
            <div className="text-center font-medium">
              No dock bookings found
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-4 lg:gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SearchForm query={query} action="/dock_booking" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardHeader className="pb-0">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
                      <TruckIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <Badge variant="outline" className="font-mono">
                      {booking.dock.name}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center gap-2">
                  <HashIcon className="text-muted-foreground h-4 w-4" />
                  <span className="font-mono text-sm">
                    {booking.order?.orderNumber}
                  </span>
                </div>

                <div className="space-y-3 rounded-lg border p-3">
                  <div>
                    <div className="text-muted-foreground mb-1 text-sm">
                      Armada Type
                    </div>
                    <div className="flex items-center gap-2">
                      <PackageIcon className="text-muted-foreground h-4 w-4" />
                      <span className="text-sm font-medium">
                        {booking.vehicleType.type}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1 text-sm">
                      Armada Number
                    </div>
                    <div className="font-mono text-sm">
                      {booking.vehicleNumber}
                    </div>
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
