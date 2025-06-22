"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, subDays } from "date-fns";
import {
  CalendarIcon,
  EditIcon,
  MoreVerticalIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const formSchema = z.object({
  dockId: z.string().min(1, { message: "Dock is required" }),
  vehicleTypeId: z.string().min(1, { message: "Vehicle type is required" }),
  vehicleNumber: z.string().min(1, { message: "Vehicle number is required" }),
  weight: z
    .string()
    .min(1, { message: "Weight is required" })
    .refine((val) => !isNaN(Number(val)), {
      message: "Weight must be a number",
    })
    .refine((val) => Number(val) > 0, {
      message: "Weight must be greater than 0",
    }),
  queue: z
    .string()
    .min(1, { message: "Queue is required" })
    .refine((val) => !isNaN(Number(val)), {
      message: "Queue must be a number",
    })
    .refine((val) => Number(val) > 0, {
      message: "Queue must be greater than 0",
    }),
  cbm: z
    .string()
    .min(1, { message: "CBM is required" })
    .refine((val) => !isNaN(Number(val)), { message: "CBM must be a number" })
    .refine((val) => Number(val) > 0, {
      message: "CBM must be greater than 0",
    }),
  driverName: z.string().min(1, { message: "Driver name is required" }),
  driverPhone: z.string().optional(),
  eta: z.date().optional(),
});
export function DockBooking({ orderNumber }: { orderNumber: string }) {
  const utils = api.useUtils();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dockId: "",
      vehicleTypeId: "",
      vehicleNumber: "",
      weight: "",
      queue: "",
      cbm: "",
      driverName: "",
      driverPhone: "",
      eta: undefined,
    },
  });

  const [dockBookings] =
    api.order.getDockBookingsByOrderNumber.useSuspenseQuery({
      orderNumber,
    });

  const [availableDocks] = api.order.getAvailableDocks.useSuspenseQuery();
  const [vehicleTypes] = api.order.getVehicleTypes.useSuspenseQuery();

  const createDockBookingMutation = api.order.createDockBooking.useMutation({
    onSuccess: async () => {
      toast.success("Dock booking created successfully");
      // Invalidate the dock bookings query to refresh the list
      await utils.order.getDockBookingsByOrderNumber.invalidate({
        orderNumber,
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteDockBookingMutation = api.order.deleteDockBooking.useMutation({
    onSuccess: async () => {
      toast.success("Dock booking deleted successfully");
      await utils.order.getDockBookingsByOrderNumber.invalidate({
        orderNumber,
      });
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createDockBookingMutation.mutate({
      orderNumber,
      dockId: parseInt(values.dockId),
      vehicleTypeId: parseInt(values.vehicleTypeId),
      vehicleNumber: values.vehicleNumber,
      weight: parseInt(values.weight),
      queue: parseInt(values.queue),
      cbm: parseInt(values.cbm),
      driverName: values.driverName,
      driverPhone: values.driverPhone,
      eta: values.eta,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col items-start justify-between gap-2 lg:flex-row lg:items-center">
        <div>
          <CardTitle className="flex items-center gap-2">
            Dock Bookings
            <Badge variant="secondary" className="text-xs">
              {dockBookings.length} total
            </Badge>
          </CardTitle>
          <CardDescription>Manage dock bookings for this order</CardDescription>
        </div>
        <Sheet open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <SheetTrigger asChild>
            <Button className="cursor-pointer bg-black text-white hover:bg-black/90">
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Booking
            </Button>
          </SheetTrigger>
          <SheetContent className="overflow-y-auto px-5 sm:max-w-[500px]">
            <SheetHeader>
              <SheetTitle>Create Dock Booking</SheetTitle>
            </SheetHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="dockId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dock *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a dock" />
                          </SelectTrigger>
                        </FormControl>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vehicleTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Type *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a vehicle type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vehicleTypes.map((vehicleType) => (
                            <SelectItem
                              key={vehicleType.id}
                              value={vehicleType.id.toString()}
                            >
                              {vehicleType.type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vehicleNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter vehicle number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="driverName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Driver Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter driver name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (kg) *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter weight"
                          type="number"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="queue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Queue *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter queue" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cbm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CBM *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter CBM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="driverPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Driver Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter driver phone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="eta"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>ETA</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a ETA</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="center">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < subDays(new Date(), 1)}
                            captionLayout="dropdown"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      form.reset();
                    }}
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
              </form>
            </Form>
          </SheetContent>
        </Sheet>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Dock</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Weight (kg)</TableHead>
                <TableHead>Queue</TableHead>
                <TableHead>CBM</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dockBookings.map((booking) => (
                <TableRow key={booking.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <Badge variant="outline" className="font-mono">
                      {booking.dock.name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-mono text-sm font-medium">
                        {booking.vehicleType.type}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        No. {booking.vehicleNumber}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">
                        {booking.driverName}
                      </div>
                      {booking.driverPhone && (
                        <div className="text-muted-foreground font-mono text-xs">
                          Phone:{booking.driverPhone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{booking.weight}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={booking.queue <= 2 ? "default" : "secondary"}
                      className="flex h-8 w-8 items-center justify-center rounded-full p-0"
                    >
                      {booking.queue}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{booking.cbm}</span>
                  </TableCell>
                  <TableCell>
                    {booking.eta ? (
                      <div className="flex items-baseline gap-1">
                        <div className="text-sm font-medium">
                          {format(booking.eta, "dd")}
                        </div>
                        <div className="text-muted-foreground font-mono text-xs">
                          {format(booking.eta, "MMM yyyy")}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground text-sm">
                      {format(booking.createdAt, "dd MMM yyyy")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 cursor-pointer"
                        >
                          <MoreVerticalIcon className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem className="cursor-pointer">
                          <EditIcon className="mr-2 h-4 w-4 text-blue-500" />
                          Edit
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          className="cursor-pointer text-red-600"
                          onClick={() => {
                            deleteDockBookingMutation.mutate({
                              id: booking.id,
                            });
                          }}
                        >
                          <TrashIcon className="mr-2 h-4 w-4 text-red-500" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
