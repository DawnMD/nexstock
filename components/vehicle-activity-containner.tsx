import DockBookingHeaderButton from "@/components/dock-booking-header-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { appRouter } from "@/server/api/root";
import type { inferRouterOutputs } from "@trpc/server";
import { format } from "date-fns";
import { ArrowLeftIcon, TruckIcon, UserIcon } from "lucide-react";

export function VehicleActivityContainer({
  children,
  dockBookingDetails,
}: {
  children: React.ReactNode;
  dockBookingDetails: NonNullable<
    inferRouterOutputs<
      typeof appRouter
    >["order"]["getDockBookingByVehicleNumberAndOrderNumber"]
  >;
}) {
  return (
    <div className="flex flex-1 flex-col gap-4 lg:gap-6">
      <div className="flex items-center gap-4">
        <DockBookingHeaderButton>
          <ArrowLeftIcon className="h-4 w-4" />
          <span className="sr-only">Go back</span>
        </DockBookingHeaderButton>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">
              {dockBookingDetails.orderId}
            </h1>
          </div>
        </div>
      </div>
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TruckIcon className="h-5 w-5" />
                Vehicle Information
              </CardTitle>
              <CardDescription>
                Basic vehicle and dock assignment details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dock">Dock Assignment</Label>
                  <Input
                    id="dock"
                    placeholder="Enter dock"
                    value={dockBookingDetails.dock.name}
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicleType">Vehicle Type</Label>
                  <Input
                    id="vehicleType"
                    placeholder="Enter vehicle type"
                    value={dockBookingDetails.vehicleType.type}
                    disabled
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                <Input
                  id="vehicleNumber"
                  placeholder="Enter vehicle number/license plate"
                  value={dockBookingDetails.vehicleNumber}
                  required
                  disabled
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    placeholder="0"
                    value={dockBookingDetails.weight.toString()}
                    min="0"
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="queue">Queue Position</Label>
                  <Input
                    id="queue"
                    type="number"
                    placeholder="0"
                    value={dockBookingDetails.queue.toString()}
                    min="1"
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cbm">CBM</Label>
                  <Input
                    id="cbm"
                    type="number"
                    placeholder="0"
                    value={dockBookingDetails.cbm.toString()}
                    min="0"
                    disabled
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Driver Information
              </CardTitle>
              <CardDescription>
                Driver contact and scheduling details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="driverName">Driver Name</Label>
                <Input
                  id="driverName"
                  placeholder="Enter driver's full name"
                  value={dockBookingDetails.driverName}
                  required
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="driverPhone">Driver Phone (Optional)</Label>
                <Input
                  id="driverPhone"
                  type="tel"
                  placeholder="Enter phone number"
                  value={dockBookingDetails.driverPhone ?? ""}
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label>Estimated Time of Arrival (Optional)</Label>
                <Input
                  id="eta"
                  placeholder="Enter driver's full name"
                  value={
                    dockBookingDetails.eta
                      ? format(dockBookingDetails.eta, "PPP")
                      : ""
                  }
                  required
                  disabled
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {children}
      </div>
    </div>
  );
}
