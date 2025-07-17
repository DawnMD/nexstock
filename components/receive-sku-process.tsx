"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

const ReceiveSkuFormSchema = z.object({
  receivedQuantity: z.number().min(1, "Received quantity must be at least 1"),
  receivedBy: z.string().min(1, "Receiver name is required"),
  receivedAt: z.date(),
  sku: z.string(),
  receivedNotes: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  lpn: z.string().min(1, "LPN is required"),
  lot: z.string().optional(),
  manufacturedDate: z.date().optional().nullable(),
  uom: z.string(),
  lotExpiryDate: z.date().optional().nullable(),
  vehicleNumber: z.string().min(1, "Vehicle number is required"),
});

type ReceiveSkuFormValues = z.infer<typeof ReceiveSkuFormSchema>;

interface ReceiveSkuProcessProps {
  orderNumber: string;
  orderItemNumber: string;
  orderItem: {
    orderedQuantity: number;
    receivedQuantity: number;
    Sku: {
      sku: string;
      description: string;
    };
  };
}

export function ReceiveSkuProcess({
  orderNumber,
  orderItemNumber,
  orderItem,
}: ReceiveSkuProcessProps) {
  const router = useRouter();
  const apiUtils = api.useUtils();
  const { user } = useUser();

  // Get vehicle numbers for this order
  const [vehicles] = api.receive.getOrderVehicles.useSuspenseQuery({
    orderNumber,
  });

  const form = useForm<ReceiveSkuFormValues>({
    resolver: zodResolver(ReceiveSkuFormSchema),
    defaultValues: {
      receivedQuantity: 0,
      receivedBy: user?.fullName ?? "",
      receivedAt: new Date(),
      sku: orderItem.Sku.sku,
      receivedNotes: "",
      location: "STAGE",
      lpn: "",
      lot: "",
      manufacturedDate: null,
      uom: "EACH",
      lotExpiryDate: null,
      vehicleNumber: "",
    },
  });

  const { mutate: updateReceiveStatus, isPending } =
    api.receive.updateReceiveStatus.useMutation({
      onSuccess: async () => {
        await Promise.all([
          apiUtils.order.getOrderDetailsByOrderNumber.invalidate(),
          apiUtils.receive.getOrderItems.invalidate({ orderNumber }),
          apiUtils.receive.getReceiveItem.invalidate(),
        ]);
        toast.success("Item received successfully");
        router.push(`/receive/${orderNumber}`);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to receive item");
      },
    });

  function onSubmit(data: ReceiveSkuFormValues) {
    updateReceiveStatus({
      id: Number(orderItemNumber),
      ...data,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="receivedQuantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Received Quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  Ordered: {orderItem.orderedQuantity} | Already Received:{" "}
                  {orderItem.receivedQuantity} | Remaining:{" "}
                  {orderItem.orderedQuantity - orderItem.receivedQuantity}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vehicleNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle Number</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem
                        key={vehicle.vehicleNumber}
                        value={vehicle.vehicleNumber}
                      >
                        {vehicle.vehicleNumber}
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
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lpn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>LPN</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lot"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lot (Optional)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="manufacturedDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Manufactured Date (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    value={
                      field.value ? field.value.toISOString().split("T")[0] : ""
                    }
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? new Date(e.target.value) : null,
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lotExpiryDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lot Expiry Date (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    value={
                      field.value ? field.value.toISOString().split("T")[0] : ""
                    }
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? new Date(e.target.value) : null,
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="receivedNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? "Receiving..." : "Receive SKU"}
        </Button>
      </form>
    </Form>
  );
}
