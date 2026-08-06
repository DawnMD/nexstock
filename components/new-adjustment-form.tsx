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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AdjustmentType } from "@/generated/prisma/enums";
import { SlidersVertical, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const adjustmentReasons = Object.values(AdjustmentType).map((reason) => {
  return {
    label: reason === "ADDITION" ? "Overage" : "Shortage",
    value: reason,
  };
});

const AdjustmentSectionSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  quantity: z.number().min(1, "Quantity is required"),
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
});

const AdjustmentFormSchema = z.object({
  adjustments: z
    .array(AdjustmentSectionSchema)
    .min(1, "At least one adjustment is required")
    .max(100), // will enforce max in UI
});

type AdjustmentFormValues = z.infer<typeof AdjustmentFormSchema>;

export function NewAdjustmentForm({
  skus,
  orderNumber,
}: {
  skus: { skuId: string; id: number }[];
  orderNumber: string;
}) {
  const router = useRouter();
  const apiUtils = api.useUtils();

  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(AdjustmentFormSchema),
    defaultValues: {
      adjustments: [{ sku: "", quantity: 1, reason: "", notes: "" }],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "adjustments",
  });

  // Compute which SKUs are already selected
  const selectedSkus = useMemo(
    () => form.watch("adjustments").map((a) => a.sku),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.watch("adjustments")],
  );

  const canAddMore = fields.length < skus.length;

  const createAdjustment = api.adjustments.createAdjustmentBatch.useMutation({
    onSuccess: async () => {
      toast.success(`Adjustment created successfully`);
      await Promise.all([
        apiUtils.order.getOrderDetailsByOrderNumber.invalidate(),
        apiUtils.adjustments.getAdjustments.invalidate(),
      ]);
      form.reset();
      router.push(`/adjustments`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (data: AdjustmentFormValues) => {
    createAdjustment.mutate({
      adjustments: data.adjustments.map((adj) => ({
        orderItemId: Number(adj.sku),
        quantity: adj.quantity,
        orderNumber,
        notes: adj.notes,
        adjustmentType: adj.reason === "ADDITION" ? "ADDITION" : "SUBTRACTION",
      })),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlidersVertical className="h-5 w-5" />
          Adjustment Details
        </CardTitle>
        <CardDescription>
          Create a new adjustment for the selected order
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            className="flex flex-col gap-6"
            onSubmit={form.handleSubmit(handleSubmit)}
          >
            {fields.map((field, idx) => (
              <div
                key={field.id}
                className="flex flex-col gap-4 rounded-md border p-4"
              >
                <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name={`adjustments.${idx}.sku`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU</FormLabel>
                        <Select
                          // Base UI's SelectValue renders the raw value unless
                          // Root knows the value -> label mapping.
                          items={skus.map((sku) => ({
                            value: sku.id.toString(),
                            label: sku.skuId,
                          }))}
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={skus.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select SKU" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {skus.map((sku) => (
                              <SelectItem
                                key={sku.id}
                                value={sku.id.toString()}
                                disabled={
                                  selectedSkus.includes(sku.id.toString()) &&
                                  field.value !== sku.id.toString()
                                }
                              >
                                {sku.skuId}
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
                    name={`adjustments.${idx}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex flex-col">
                    <div className="flex items-end gap-2 md:gap-4">
                      <div className="flex-1">
                        <FormField
                          control={form.control}
                          name={`adjustments.${idx}.reason`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Reason</FormLabel>
                              <Select
                                items={adjustmentReasons.map((reason) => ({
                                  value: reason.value,
                                  label: reason.label,
                                }))}
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select reason" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {adjustmentReasons.map((reason) => (
                                    <SelectItem
                                      key={reason.value}
                                      value={reason.value}
                                    >
                                      {reason.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      {/* Desktop remove button */}
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="hidden md:inline-flex"
                          onClick={() => remove(idx)}
                          aria-label="Remove section"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-1">
                  <FormField
                    control={form.control}
                    name={`adjustments.${idx}.notes`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Optional notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Mobile remove button */}
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      className="mt-4 w-full md:hidden"
                      onClick={() => remove(idx)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <div className="mb-4 flex w-full flex-col items-center justify-between gap-4 lg:flex-row">
              {canAddMore && (
                <Button
                  type="button"
                  onClick={() =>
                    append({ sku: "", quantity: 1, reason: "", notes: "" })
                  }
                  variant="outline"
                  className="w-full lg:w-fit"
                >
                  + Add another adjustment
                </Button>
              )}

              <Button type="submit" className="w-full lg:w-fit">
                Submit Adjustments
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
