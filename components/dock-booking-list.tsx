"use client";

import { Badge } from "@/components/ui/badge";
import { TruckIcon, PackageIcon, HashIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sampleBookings = [
  {
    id: 1,
    orderNumber: "PO-2024-001",
    dock: { name: "Dock A" },
    vehicleType: { type: "Container Truck" },
    vehicleNumber: "ABC 123",
    driverName: "John Smith",
    queue: 1,
    status: "Checked In",
  },
  {
    id: 2,
    orderNumber: "PO-2024-002",
    dock: { name: "Dock B" },
    vehicleType: { type: "Box Truck" },
    vehicleNumber: "XYZ 789",
    driverName: "Mike Johnson",
    queue: 2,
    status: "Pending",
  },
  {
    id: 3,
    orderNumber: "PO-2024-003",
    dock: { name: "Dock C" },
    vehicleType: { type: "Flatbed" },
    vehicleNumber: "DEF 456",
    driverName: "Sarah Wilson",
    queue: 3,
    status: "Pending",
  },
  {
    id: 4,
    orderNumber: "PO-2024-004",
    dock: { name: "Dock D" },
    vehicleType: { type: "Container Truck" },
    vehicleNumber: "GHI 789",
    driverName: "Sarah Wilson",
    queue: 3,
    status: "Pending",
  },
];

export function DockBookingList() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-4 lg:gap-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sampleBookings.map((booking) => (
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
                  <Badge
                    variant={
                      booking.status === "Checked In" ? "default" : "secondary"
                    }
                  >
                    {booking.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                {/* Order Number */}
                <div className="flex items-center gap-2">
                  <HashIcon className="text-muted-foreground h-4 w-4" />
                  <span className="font-mono text-sm">
                    {booking.orderNumber}
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
