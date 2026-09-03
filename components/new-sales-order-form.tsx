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
  FormDescription,
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
  ScanCombobox,
  type ScanComboboxProps,
  type ScanComboboxOption,
} from "@/components/ui/scan-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import { orpc } from "@/orpc/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, ShoppingCartIcon, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const SalesOrderLineSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  orderedQuantity: z.number().int().positive("Quantity must be at least 1"),
});

const SalesOrderFormSchema = z
  .object({
    orderNumber: z.string().min(1, "Order number is required"),
    customerReference: z.string().min(1, "Customer is required"),
    requestedShipDate: z.date().nullable(),
    notes: z.string().optional(),
    lines: z
      .array(SalesOrderLineSchema)
      .min(1, "At least one line is required")
      .max(100),
  })
  .superRefine((values, ctx) => {
    // `createSalesOrder` would happily take two lines for the same SKU, and
    // allocation would then reserve stock for each independently. Whether that
    // is a split delivery or a mistake is not something the warehouse can tell,
    // so it is refused here where the operator can still fix it.
    const seen = new Map<string, number>();
    values.lines.forEach((line, index) => {
      const key = line.sku.trim().toLowerCase();
      if (!key) return;
      const first = seen.get(key);
      if (first === undefined) {
        seen.set(key, index);
        return;
      }
      ctx.addIssue({
        code: "custom",
        path: ["lines", index, "sku"],
        message: "This SKU is already on line " + (first + 1),
      });
    });
  });

type SalesOrderFormValues = z.infer<typeof SalesOrderFormSchema>;

/**
 * The SKU picker for one line.
 *
 * Its own component, and its own query, because each line filters
 * independently — `sku.getSkus` is capped, so one shared list could not serve
 * two lines searching for different things. `useQuery` rather than the
 * suspense variant: a line that is still resolving should grey its own
 * suggestions, not throw the whole form back to a skeleton.
 */
function SkuLineField({
  value,
  onValueChange,
  ...props
}: Omit<
  ScanComboboxProps,
  "options" | "isPending" | "emptyMessage" | "placeholder"
>) {
  const [term, isDebouncing] = useDebouncedValue(value);
  const { data: skus, isFetching } = useQuery(
    orpc.sku.getSkus.queryOptions({
      input: { search: term || null },
      placeholderData: (previous) => previous,
    }),
  );

  const options: ScanComboboxOption[] = (skus ?? [])
    .filter((sku) => sku.isActive)
    .map((sku) => ({
      value: sku.sku,
      hint: `${sku.description} · ${sku.onHand} on hand`,
    }));

  return (
    <ScanCombobox
      // Spread first, and deliberately: `<FormControl>` injects the `id` that
      // the `<FormLabel>`'s `htmlFor` points at, plus the `aria-describedby`
      // and `aria-invalid` wiring. Naming only the three props this component
      // cares about dropped all of that on the floor, leaving the field with no
      // accessible name at all.
      {...props}
      value={value}
      onValueChange={onValueChange}
      options={options}
      isPending={isDebouncing || isFetching}
      placeholder="Scan or search a SKU"
      emptyMessage="No active SKU matches that."
      autoFocus={false}
    />
  );
}

export function NewSalesOrderForm({
  customers,
}: {
  customers: { reference: string; name: string; city: string | null }[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<SalesOrderFormValues>({
    resolver: zodResolver(SalesOrderFormSchema),
    defaultValues: {
      orderNumber: "",
      customerReference: "",
      requestedShipDate: null,
      notes: "",
      lines: [{ sku: "", orderedQuantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  // `useWatch` rather than `form.watch()`: the latter is opaque to React
  // Compiler, which then skips memoizing this whole component.
  const requestedShipDate = useWatch({
    control: form.control,
    name: "requestedShipDate",
  });

  const createSalesOrder = useMutation(
    orpc.outbound.createSalesOrder.mutationOptions({
      onSuccess: async (order) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: orpc.outbound.getSalesOrders.key(),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.outbound.getSummary.key(),
          }),
        ]);
        toast.success(`Sales order ${order.orderNumber} created`, {
          description: `${order.items.length} line(s) for ${order.customer.name}`,
        });
        router.push(`/sales-orders/${order.orderNumber}`);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const onSubmit = (values: SalesOrderFormValues) => {
    // An untouched textarea submits "", which would be stored as a note that
    // exists and says nothing. `??` would not do here — it only catches the
    // undefined case and would let the empty string through.
    const notes = values.notes?.trim() ?? "";

    createSalesOrder.mutate({
      orderNumber: values.orderNumber.trim(),
      customerReference: values.customerReference,
      requestedShipDate: values.requestedShipDate,
      notes: notes.length > 0 ? notes : null,
      lines: values.lines.map((line) => ({
        sku: line.sku.trim(),
        orderedQuantity: line.orderedQuantity,
      })),
    });
  };

  const customerItems = customers.map((customer) => ({
    value: customer.reference,
    label: customer.city
      ? `${customer.name} (${customer.city})`
      : customer.name,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCartIcon className="h-5 w-5" />
          New Sales Order
        </CardTitle>
        <CardDescription>
          Nothing is reserved yet — allocation is a separate, explicit step on
          the order itself.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            className="flex flex-col gap-6"
            onSubmit={form.handleSubmit(onSubmit)}
            // The SKU fields are scannable and a wedge ends its burst with
            // Enter, which would otherwise submit a half-filled order.
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
          >
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="orderNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Number</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="SO-0001"
                        autoComplete="off"
                        className="h-11 font-mono md:h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerReference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    {/* A closed set that changes rarely, unlike SKUs and racks —
                        so a dropdown is still the right control here. */}
                    <Select
                      items={customerItems}
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={customers.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 w-full md:h-9">
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customerItems.map((customer) => (
                          <SelectItem
                            key={customer.value}
                            value={customer.value}
                          >
                            {customer.label}
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
                name="requestedShipDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Requested Ship Date (Optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger
                        render={
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "h-11 w-full pl-3 text-left font-normal md:h-9",
                                !field.value && "text-muted-foreground",
                              )}
                            />
                          </FormControl>
                        }
                      >
                        {requestedShipDate ? (
                          format(requestedShipDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ?? undefined}
                          onSelect={(date) => field.onChange(date ?? null)}
                          disabled={(date) =>
                            date < new Date(new Date().toDateString())
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-col gap-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex flex-col gap-4 rounded-md border p-4"
                >
                  <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[2fr_1fr_auto]">
                    <FormField
                      control={form.control}
                      name={`lines.${index}.sku`}
                      render={({ field: skuField }) => (
                        <FormItem>
                          <FormLabel>SKU</FormLabel>
                          <FormControl>
                            <SkuLineField
                              value={skuField.value}
                              onValueChange={skuField.onChange}
                              onBlur={skuField.onBlur}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`lines.${index}.orderedQuantity`}
                      render={({ field: quantityField }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              inputMode="numeric"
                              className="h-11 md:h-9"
                              name={quantityField.name}
                              ref={quantityField.ref}
                              onBlur={quantityField.onBlur}
                              value={quantityField.value}
                              onChange={(event) =>
                                quantityField.onChange(
                                  Number(event.target.value),
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        className="w-full md:mt-8 md:size-9 md:w-auto"
                        onClick={() => remove(index)}
                        aria-label={`Remove line ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="md:hidden">Remove line</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Anything the dispatch team should know"
                    />
                  </FormControl>
                  <FormDescription>
                    Carried on the order, not on any individual line.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex w-full flex-col items-center justify-between gap-4 lg:flex-row">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full md:h-9 lg:w-fit"
                onClick={() => append({ sku: "", orderedQuantity: 1 })}
              >
                + Add another line
              </Button>

              <div className="flex w-full gap-2 lg:w-fit">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 flex-1 md:h-9 lg:flex-none"
                  onClick={() => router.push("/sales-orders")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-11 flex-1 md:h-9 lg:flex-none"
                  disabled={
                    createSalesOrder.isPending || customers.length === 0
                  }
                >
                  {createSalesOrder.isPending
                    ? "Creating..."
                    : "Create Sales Order"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
