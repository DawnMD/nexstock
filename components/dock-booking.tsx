"use client";

import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

// Function to generate random CBM based on vehicle type
const generateRandomCBM = (vehicleType: string): number => {
  const cbmRanges: Record<string, { min: number; max: number }> = {
    Truck: { min: 20, max: 80 },
    Container: { min: 30, max: 120 },
    Trailer: { min: 40, max: 150 },
    Van: { min: 10, max: 40 },
    Flatbed: { min: 15, max: 60 },
  };

  const range = cbmRanges[vehicleType] ?? { min: 20, max: 80 };
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
};

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
  cbm: z.string(),
  driverName: z.string().min(1, { message: "Driver name is required" }),
  driverPhone: z.string().optional(),
  eta: z.date().optional(),
});
export function DockBooking({ orderNumber }: { orderNumber: string }) {
  const utils = api.useUtils();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<
    (typeof dockBookings)[number] | null
  >(null);
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
      // Invalidate the dock bookings and today's dock schedule queries to refresh the list
      await Promise.all([
        utils.order.getDockBookingsByOrderNumber.invalidate({
          orderNumber,
        }),
        utils.order.getTodayDockSchedule.invalidate(),
        utils.qualityCheck.getOrderItems.invalidate(),
        utils.qualityCheck.getQualityCheckItems.invalidate(),
      ]);
      setIsSheetOpen(false);
      form.reset();
      toast.success("Dock booking created successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteDockBookingMutation = api.order.deleteDockBooking.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.order.getDockBookingsByOrderNumber.invalidate({
          orderNumber,
        }),
        utils.qualityCheck.getOrderItems.invalidate(),
        utils.qualityCheck.getQualityCheckItems.invalidate(),
      ]);
      toast.success("Dock booking deleted successfully");
    },
  });

  const updateDockBookingMutation = api.order.updateDockBooking.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.order.getDockBookingsByOrderNumber.invalidate({
          orderNumber,
        }),
        utils.order.getTodayDockSchedule.invalidate(),
        utils.qualityCheck.getOrderItems.invalidate(),
        utils.qualityCheck.getQualityCheckItems.invalidate(),
      ]);
      setIsSheetOpen(false);
      setEditingBooking(null);
      form.reset();
      toast.success("Dock booking updated successfully");
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const payload = {
      dockId: parseInt(values.dockId),
      vehicleTypeId: parseInt(values.vehicleTypeId),
      vehicleNumber: values.vehicleNumber,
      weight: parseInt(values.weight),
      queue: parseInt(values.queue),
      cbm: parseInt(values.cbm),
      driverName: values.driverName,
      driverPhone: values.driverPhone,
      eta: values.eta,
    };

    if (editingBooking) {
      updateDockBookingMutation.mutate({
        id: editingBooking.id,
        ...payload,
      });
    } else {
      createDockBookingMutation.mutate({
        orderNumber,
        ...payload,
      });
    }
  };

  const handleEdit = (booking: (typeof dockBookings)[number]) => {
    setEditingBooking(booking);
    form.reset({
      dockId: booking.dock.id.toString(),
      vehicleTypeId: booking.vehicleType.id.toString(),
      vehicleNumber: booking.vehicleNumber,
      weight: booking.weight.toString(),
      queue: booking.queue.toString(),
      cbm: booking.cbm.toString(),
      driverName: booking.driverName,
      driverPhone: booking.driverPhone ?? "",
      eta: booking.eta ?? undefined,
    });
    setIsSheetOpen(true);
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
        <Sheet
          open={isSheetOpen}
          onOpenChange={(open) => {
            setIsSheetOpen(open);
            if (!open) {
              setEditingBooking(null);
              form.reset();
            }
          }}
        >
          <SheetTrigger
            render={
              <Button
                className="cursor-pointer bg-black text-white hover:bg-black/90"
                onClick={() => {
                  setEditingBooking(null);
                  form.reset({
                    dockId: "",
                    vehicleTypeId: "",
                    vehicleNumber: "",
                    weight: "",
                    queue: "",
                    cbm: "",
                    driverName: "",
                    driverPhone: "",
                    eta: undefined,
                  });
                }}
              />
            }
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Create Booking
          </SheetTrigger>
          <SheetContent className="overflow-y-auto overscroll-contain sm:max-w-[500px]">
            <SheetHeader>
              <SheetTitle>
                {editingBooking ? "Edit" : "Create"} Dock Booking
              </SheetTitle>
            </SheetHeader>
            <div className="px-4">
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
                          // Base UI's SelectValue renders the raw value unless
                          // Root knows the value -> label mapping.
                          items={availableDocks.map((dock) => ({
                            value: dock.id.toString(),
                            label: dock.name,
                          }))}
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
                          items={vehicleTypes.map((vehicleType) => ({
                            value: vehicleType.id.toString(),
                            label: vehicleType.type,
                          }))}
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Generate random CBM when vehicle type is selected
                            if (value) {
                              const selectedVehicleType = vehicleTypes.find(
                                (vt) => vt.id.toString() === value,
                              );
                              if (selectedVehicleType) {
                                const randomCBM = generateRandomCBM(
                                  selectedVehicleType.type,
                                );
                                form.setValue("cbm", randomCBM.toString());
                              }
                            }
                          }}
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
                          <Input
                            placeholder="Enter vehicle number"
                            {...field}
                          />
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
                        <FormLabel>CBM (Auto-generated) *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Auto-generated based on vehicle type"
                            {...field}
                            disabled
                          />
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
                          <PopoverTrigger
                            render={
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground",
                                  )}
                                />
                              </FormControl>
                            }
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a ETA</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
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
                        setIsSheetOpen(false);
                        setEditingBooking(null);
                        form.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        createDockBookingMutation.isPending ||
                        updateDockBookingMutation.isPending
                      }
                    >
                      {createDockBookingMutation.isPending ||
                      updateDockBookingMutation.isPending
                        ? editingBooking
                          ? "Updating..."
                          : "Creating..."
                        : editingBooking
                          ? "Update Booking"
                          : "Create Booking"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </SheetContent>
        </Sheet>
      </CardHeader>
      {dockBookings.length > 0 ? (
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
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 cursor-pointer"
                            />
                          }
                        >
                          <MoreVerticalIcon className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => handleEdit(booking)}
                          >
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
      ) : (
        <CardContent>
          <div className="text-center font-medium">No dock bookings found</div>
        </CardContent>
      )}
    </Card>
  );
}
