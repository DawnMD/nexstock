"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ActivityType } from "@prisma/client";
import { format } from "date-fns";
import { ArrowLeftIcon, TruckIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { redirect, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const checkInSchema = z.object({
  notes: z.string().optional(),
});

export function VehicleCheckIn({
  vehicleNumber,
  orderNumber,
}: {
  vehicleNumber: string;
  orderNumber: string;
}) {
  const router = useRouter();

  const [dockBookingVehicle] =
    api.order.getDockBookingByVehicleNumberAndOrderNumber.useSuspenseQuery({
      vehicleNumber,
      orderNumber,
    });

  const updateDockActivity = api.order.updateDockActivity.useMutation({
    onSuccess: () => {
      toast.success("Dock activity updated");
      router.push("/dock-booking");
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to update dock activity");
    },
  });

  const form = useForm<z.infer<typeof checkInSchema>>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      notes: "",
    },
  });

  const onSubmit = (data: z.infer<typeof checkInSchema>) => {
    updateDockActivity.mutate({
      vehicleNumber,
      activity: ActivityType.CHECK_IN,
      notes: data.notes,
    });
  };

  if (!dockBookingVehicle) {
    redirect("/dock-booking");
  }

  return (
    <div className="flex flex-1 flex-col gap-4 lg:gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeftIcon className="h-4 w-4" />
          <span className="sr-only">Go back</span>
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{orderNumber}</h1>
          </div>
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      value={dockBookingVehicle.dock.name}
                      disabled
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicleType">Vehicle Type</Label>
                    <Input
                      id="vehicleType"
                      placeholder="Enter vehicle type"
                      value={dockBookingVehicle.vehicleType.type}
                      disabled
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                  <Input
                    id="vehicleNumber"
                    placeholder="Enter vehicle number/license plate"
                    value={vehicleNumber}
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
                      value={dockBookingVehicle.weight.toString()}
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
                      value={dockBookingVehicle.queue.toString()}
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
                      value={dockBookingVehicle.cbm.toString()}
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
                    value={dockBookingVehicle.driverName}
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
                    value={dockBookingVehicle.driverPhone ?? ""}
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estimated Time of Arrival (Optional)</Label>
                  <Input
                    id="eta"
                    placeholder="Enter driver's full name"
                    value={
                      dockBookingVehicle.eta
                        ? format(dockBookingVehicle.eta, "PPP")
                        : ""
                    }
                    required
                    disabled
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
              <CardDescription>
                Any additional notes or special instructions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel htmlFor="notes">Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        id="notes"
                        placeholder="Enter any additional notes, special instructions, or observations..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4 sm:flex-row sm:justify-end">
            <Button asChild type="button" variant="outline">
              <Link href={"/dock-booking"}>Cancel</Link>
            </Button>
            <Button
              disabled={
                updateDockActivity.isPending || form.formState.isSubmitting
              }
              type="submit"
            >
              {updateDockActivity.isPending || form.formState.isSubmitting
                ? "Checking In..."
                : "Check In Vehicle"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
