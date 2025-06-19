"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/trpc/react";
import { format } from "date-fns";
import { PlusIcon, TruckIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface DockBookingProps {
  orderNumber: string;
}

export function DockBooking({ orderNumber }: DockBookingProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    dockId: "",
    vehicleTypeId: "",
    vehicleNumber: "",
    weight: "",
    queue: "",
    cbm: "",
    driverName: "",
    driverPhone: "",
    eta: "",
  });

  const { data: dockBookings = [], isLoading: isLoadingDockBookings } =
    api.order.getDockBookingsByOrderNumber.useQuery({
      orderNumber,
    });

  const { data: availableDocks = [], isLoading: isLoadingDocks } =
    api.order.getAvailableDocks.useQuery();
  const { data: vehicleTypes = [], isLoading: isLoadingVehicleTypes } =
    api.order.getVehicleTypes.useQuery();

  const createDockBookingMutation = api.order.createDockBooking.useMutation({
    onSuccess: () => {
      toast.success("Dock booking created successfully");
      setIsCreateDialogOpen(false);
      setFormData({
        dockId: "",
        vehicleTypeId: "",
        vehicleNumber: "",
        weight: "",
        queue: "",
        cbm: "",
        driverName: "",
        driverPhone: "",
        eta: "",
      });
      // Invalidate the dock bookings query to refresh the list
      void utils.order.getDockBookingsByOrderNumber.invalidate({ orderNumber });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const utils = api.useUtils();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.dockId ||
      !formData.vehicleTypeId ||
      !formData.vehicleNumber ||
      !formData.weight ||
      !formData.queue ||
      !formData.cbm ||
      !formData.driverName
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    createDockBookingMutation.mutate({
      orderNumber,
      dockId: parseInt(formData.dockId),
      vehicleTypeId: parseInt(formData.vehicleTypeId),
      vehicleNumber: formData.vehicleNumber,
      weight: parseInt(formData.weight),
      queue: parseInt(formData.queue),
      cbm: parseInt(formData.cbm),
      driverName: formData.driverName,
      driverPhone: formData.driverPhone || undefined,
      eta: formData.eta ? new Date(formData.eta) : undefined,
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Pre-fill CBM when vehicle type is selected
    if (field === "vehicleTypeId") {
      const selectedVehicleType = vehicleTypes.find(
        (type) => type.id.toString() === value,
      );
      if (selectedVehicleType) {
        setFormData((prev) => ({
          ...prev,
          cbm: selectedVehicleType.unloadTime,
        }));
      }
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium tracking-wide uppercase">
            <TruckIcon className="h-4 w-4" />
            Dock Bookings
          </CardTitle>
          <Sheet open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <SheetTrigger asChild>
              <Button
                size="sm"
                disabled={isLoadingDocks || isLoadingVehicleTypes}
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                Create Booking
              </Button>
            </SheetTrigger>
            <SheetContent className="px-5 sm:max-w-[500px]">
              <SheetHeader>
                <SheetTitle>Create Dock Booking</SheetTitle>
              </SheetHeader>
              <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="dock">Dock *</Label>
                      <Select
                        value={formData.dockId}
                        onValueChange={(value) =>
                          handleInputChange("dockId", value)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select dock" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableDocks.map((dock) => (
                            <SelectItem
                              key={dock.id}
                              value={dock.id.toString()}
                            >
                              {dock.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicleType">Vehicle Type *</Label>
                      <Select
                        value={formData.vehicleTypeId}
                        onValueChange={(value) =>
                          handleInputChange("vehicleTypeId", value)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select vehicle type" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicleTypes.map((type) => (
                            <SelectItem
                              key={type.id}
                              value={type.id.toString()}
                            >
                              {type.type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="vehicleNumber">Vehicle Number *</Label>
                      <Input
                        id="vehicleNumber"
                        value={formData.vehicleNumber}
                        onChange={(e) =>
                          handleInputChange("vehicleNumber", e.target.value)
                        }
                        placeholder="Enter vehicle number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="driverName">Driver Name *</Label>
                      <Input
                        id="driverName"
                        value={formData.driverName}
                        onChange={(e) =>
                          handleInputChange("driverName", e.target.value)
                        }
                        placeholder="Enter driver name"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="weight">Weight (kg) *</Label>
                      <Input
                        id="weight"
                        type="number"
                        value={formData.weight}
                        onChange={(e) =>
                          handleInputChange("weight", e.target.value)
                        }
                        placeholder="Weight"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="queue">Queue *</Label>
                      <Input
                        id="queue"
                        type="number"
                        value={formData.queue}
                        onChange={(e) =>
                          handleInputChange("queue", e.target.value)
                        }
                        placeholder="Queue"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cbm">CBM *</Label>
                      <Input
                        id="cbm"
                        type="number"
                        value={formData.cbm}
                        onChange={(e) =>
                          handleInputChange("cbm", e.target.value)
                        }
                        placeholder="CBM"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="driverPhone">Driver Phone</Label>
                      <Input
                        id="driverPhone"
                        value={formData.driverPhone}
                        onChange={(e) =>
                          handleInputChange("driverPhone", e.target.value)
                        }
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="eta">ETA</Label>
                      <Input
                        id="eta"
                        type="date"
                        value={formData.eta}
                        onChange={(e) =>
                          handleInputChange("eta", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createDockBookingMutation.isPending}
                    >
                      {createDockBookingMutation.isPending
                        ? "Creating..."
                        : "Create Booking"}
                    </Button>
                  </div>
                </div>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </CardHeader>
      <CardContent>
        {isLoadingDockBookings ? (
          <div className="text-muted-foreground py-8 text-center">
            <TruckIcon className="mx-auto mb-4 h-12 w-12 animate-pulse opacity-50" />
            <p>Loading dock bookings...</p>
          </div>
        ) : dockBookings.length === 0 ? (
          <div className="text-muted-foreground text-center">
            <TruckIcon className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>No dock bookings found for this order.</p>
            <p className="text-sm">Create a new booking to get started.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dock</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead className="text-right">Weight</TableHead>
                  <TableHead className="text-right">Queue</TableHead>
                  <TableHead className="text-right">CBM</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dockBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">
                      {booking.dock.name}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {booking.vehicleNumber}
                        </div>
                        <div className="text-muted-foreground text-sm">
                          {booking.vehicleType.type}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{booking.driverName}</div>
                        {booking.driverPhone && (
                          <div className="text-muted-foreground text-sm">
                            {booking.driverPhone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {booking.weight} kg
                    </TableCell>
                    <TableCell className="text-right">
                      {booking.queue}
                    </TableCell>
                    <TableCell className="text-right">{booking.cbm}</TableCell>
                    <TableCell>
                      {booking.eta
                        ? format(new Date(booking.eta), "dd MMM yyyy HH:mm")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {format(new Date(booking.createdAt), "dd MMM yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
