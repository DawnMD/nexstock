"use client";

import { orpc } from "@/orpc/client";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import {
  isKnownOption,
  ScanCombobox,
  type ScanComboboxOption,
} from "@/components/ui/scan-combobox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { PackageIcon, MapPinIcon, TruckIcon, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface PutawayProcessProps {
  lpn: string;
}

const PutawayFormSchema = z.object({
  fromLocation: z.string().min(1, "Scan or pick where the stock is now"),
  toLocation: z.string().min(1, "Scan or pick a destination"),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  notes: z.string().optional(),
});

type PutawayFormValues = z.infer<typeof PutawayFormSchema>;

export function PutawayProcess({ lpn }: PutawayProcessProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: lpnDetails } = useSuspenseQuery(
    orpc.putaway.getLPNDetails.queryOptions({ input: { lpn } }),
  );

  // Where this pallet's stock actually is, which is not the same as where it was
  // received. This screen used to send `lpnDetails.location` — the receiving bay,
  // a column that never changes — as the source of every move, so once a pallet
  // had been put away its balance in the bay was 0 and it could never be moved
  // again. `createPutaway` has always supported relocating from storage; nothing
  // in the UI could reach it.
  const sources = lpnDetails.currentLocations;
  const onHand = sources.reduce((sum, balance) => sum + balance.quantity, 0);

  const form = useForm<PutawayFormValues>({
    // The cross-field rules live here rather than in `handleSubmit`, so they
    // report through `<FormMessage>` on the field at fault like every other
    // form in the app. This screen used to be five `useState`s validated by
    // toast, which meant the error appeared in the corner of the screen and the
    // field that caused it looked fine.
    resolver: zodResolver(
      PutawayFormSchema.superRefine((values, ctx) => {
        const source = sources.find(
          (balance) => balance.location === values.fromLocation,
        );
        if (values.fromLocation && !source) {
          ctx.addIssue({
            code: "custom",
            path: ["fromLocation"],
            message: "This pallet has no stock in that location",
          });
        } else if (source && values.quantity > source.quantity) {
          ctx.addIssue({
            code: "custom",
            path: ["quantity"],
            message: `Only ${source.quantity} available in ${source.location}`,
          });
        }
        if (values.toLocation && values.toLocation === values.fromLocation) {
          ctx.addIssue({
            code: "custom",
            path: ["toLocation"],
            message: "Stock cannot be put away where it already is",
          });
        }
      }),
    ),
    defaultValues: {
      fromLocation: sources[0]?.location ?? lpnDetails.location,
      toLocation: "",
      // Default to moving the whole pallet, which is the common case; the
      // operator can still type a smaller number for a split.
      quantity: sources[0]?.quantity ?? 0,
      notes: "",
    },
  });

  // `useWatch` rather than `form.watch()`: the latter is opaque to React
  // Compiler, which then skips memoizing this whole component.
  const fromLocation = useWatch({
    control: form.control,
    name: "fromLocation",
  });
  const toLocation = useWatch({ control: form.control, name: "toLocation" });

  const selectedSource = sources.find(
    (balance) => balance.location === fromLocation,
  );
  const available = selectedSource?.quantity ?? 0;

  // The pallet is in at most a handful of places, so its sources are filtered
  // here; the rack list is the whole warehouse and is filtered in Postgres.
  const sourceOptions: ScanComboboxOption[] = sources
    .filter((balance) =>
      balance.location
        .toLowerCase()
        .includes(fromLocation.trim().toLowerCase()),
    )
    .map((balance) => ({
      value: balance.location,
      hint: `${balance.quantity} on hand`,
    }));

  const [destinationTerm, destinationsPending] = useDebouncedValue(toLocation);
  const { data: locations } = useSuspenseQuery(
    orpc.putaway.getLocations.queryOptions({
      input: { search: destinationTerm || null },
    }),
  );
  const destinationOptions: ScanComboboxOption[] = locations
    // Stock cannot be put away where it already is.
    .filter((location) => location.location !== fromLocation)
    .map((location) => ({
      value: location.location,
      hint: (
        <>
          {location.zone} - {location.aisle}
          {/* Putaway is refused if the pallet doesn't fit, so show what's left
              before it's chosen. */}
          {location.freeCbm != null &&
            ` · ${location.freeCbm.toFixed(2)} cbm free`}
        </>
      ),
    }));

  const handleSourceChange = (location: string) => {
    form.setValue("fromLocation", location, { shouldValidate: true });
    const balance = sources.find((entry) => entry.location === location);
    if (balance) form.setValue("quantity", balance.quantity);
    if (toLocation === location) form.setValue("toLocation", "");
  };

  const createPutaway = useMutation(
    orpc.putaway.createPutaway.mutationOptions({
      onSuccess: async (putaway) => {
        toast.success(
          `Putaway created successfully! ${putaway.quantity} units moved from ${putaway.fromLocation} to ${putaway.toLocation}`,
          {
            description: `LPN: ${lpnDetails.lpn} | SKU: ${lpnDetails.sku}`,
            duration: 5000,
          },
        );
        // The worklist is cached for 30s, so without this the LPN that was just
        // moved is still sitting on /putaway when the redirect lands.
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: orpc.putaway.getAllLPNs.key(),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.putaway.getLPNDetails.key({ input: { lpn } }),
          }),
          // The destination's free capacity just changed, and it is shown in this
          // picker.
          queryClient.invalidateQueries({
            queryKey: orpc.putaway.getLocations.key(),
          }),
        ]);
        router.push("/putaway");
      },
      onError: (error) => {
        toast.error("Failed to create putaway", {
          description: error.message,
          duration: 5000,
        });
      },
    }),
  );

  const onSubmit = (values: PutawayFormValues) => {
    createPutaway.mutate({
      lpn: lpnDetails.lpn,
      sku: lpnDetails.sku,
      quantity: values.quantity,
      fromLocation: values.fromLocation,
      toLocation: values.toLocation,
      notes: values.notes,
    });
  };

  // A destination that is not a real rack is refused by `createPutaway` anyway;
  // gating the button on it turns a server error the operator cannot act on
  // into a field that simply is not satisfied yet.
  const destinationIsKnown = isKnownOption(toLocation, destinationOptions);

  return (
    <div className="space-y-6">
      {/* LPN Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageIcon className="h-5 w-5" />
            LPN Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm font-medium">
                LPN
              </Label>
              <div className="font-mono text-lg">{lpnDetails.lpn}</div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm font-medium">
                SKU
              </Label>
              <div className="font-mono text-lg">{lpnDetails.sku}</div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm font-medium">
                Description
              </Label>
              <div className="text-sm">
                {lpnDetails.orderItem.Sku.description}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm font-medium">
                On Hand
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{onHand}</span>
                <Badge variant="secondary">{lpnDetails.uom}</Badge>
                {lpnDetails.putawayQuantity > 0 && (
                  <span className="text-muted-foreground text-xs">
                    {lpnDetails.putawayQuantity} of{" "}
                    {lpnDetails.receivedQuantity} already put away
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm font-medium">
                Current Location
              </Label>
              {/* The stock, not the bay it arrived in. `lpnDetails.location` is
                  the receiving location and never changes, so it answered "where
                  is this pallet?" with the wrong place the moment it moved. */}
              <div className="flex flex-col gap-1">
                {sources.length === 0 ? (
                  <div className="flex items-center gap-2">
                    <MapPinIcon className="h-4 w-4" />
                    <span className="text-muted-foreground">
                      No stock on hand
                    </span>
                  </div>
                ) : (
                  sources.map((balance) => (
                    <div
                      key={balance.location}
                      className="flex items-center gap-2"
                    >
                      <MapPinIcon className="h-4 w-4" />
                      <span className="font-mono">{balance.location}</span>
                      <span className="text-muted-foreground text-xs">
                        {balance.quantity}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm font-medium">
                Vehicle
              </Label>
              <div className="flex items-center gap-2">
                <TruckIcon className="h-4 w-4" />
                <span>{lpnDetails.vehicleNumber}</span>
              </div>
            </div>
          </div>

          {lpnDetails.lot && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm font-medium">
                  Lot Number
                </Label>
                <div className="font-mono">{lpnDetails.lot}</div>
              </div>
              {lpnDetails.lotExpiryDate && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm font-medium">
                    Expiry Date
                  </Label>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    <span>
                      {
                        new Date(lpnDetails.lotExpiryDate)
                          .toISOString()
                          .split("T")[0]
                      }
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Putaway Form */}
      <Card>
        <CardHeader>
          <CardTitle>Putaway Operation</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
              // Every field here is scannable, and a wedge ends its burst with
              // Enter. `useScanner` swallows the ones it recognises, but an
              // Enter in a plain field would still submit a half-filled form.
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault();
              }}
            >
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="fromLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Move From</FormLabel>
                      <FormControl>
                        <ScanCombobox
                          value={field.value}
                          onValueChange={handleSourceChange}
                          onBlur={field.onBlur}
                          options={sourceOptions}
                          placeholder="Scan the rack label"
                          emptyMessage="This pallet has no stock in a matching location."
                          // The destination is the field an operator reaches
                          // for; the source is usually already right.
                          autoFocus={false}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity to Putaway</FormLabel>
                      {/* Editable: `createPutaway` accepts any quantity up to the
                          balance at the source, so a pallet can be split across
                          racks. This was pinned read-only to the full remaining
                          balance. */}
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={available}
                          inputMode="numeric"
                          className="h-11 md:h-9"
                          value={field.value}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          onChange={(event) =>
                            field.onChange(Number(event.target.value))
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        {available} available in {fromLocation}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="toLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination Location</FormLabel>
                      <FormControl>
                        <ScanCombobox
                          value={field.value}
                          onValueChange={field.onChange}
                          onBlur={field.onBlur}
                          options={destinationOptions}
                          isPending={destinationsPending}
                          placeholder="Scan the rack label"
                          emptyMessage="No active location matches that."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                        placeholder="Add any notes about this putaway operation"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={
                    createPutaway.isPending ||
                    sources.length === 0 ||
                    !destinationIsKnown
                  }
                  className="h-11 flex-1 md:h-9"
                >
                  {createPutaway.isPending
                    ? "Creating..."
                    : sources.length === 0
                      ? "No stock left on this pallet"
                      : "Create Putaway"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 md:h-9"
                  onClick={() => router.push("/putaway")}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
