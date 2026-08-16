"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { orpc, type RouterInputs, type RouterOutputs } from "@/orpc/client";
import { applyOptimisticList, rollbackOptimistic } from "@/orpc/optimistic";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

/**
 * Every one of these comes out of a text input as a string, so the schema takes
 * strings and converts. Avoid `z.preprocess`/`z.coerce` here: both widen the
 * schema's *input* type to `unknown`, which leaves react-hook-form's
 * `field.value` typed as `{}` and unusable.
 */
const requiredInt = z
  .string()
  .refine((value) => /^[1-9]\d*$/.test(value.trim()), {
    message: "Must be a whole number greater than zero",
  })
  .transform((value) => Number(value));

/** Blank means unrated, which is not the same as a capacity of zero. */
const optionalInt = z
  .string()
  .refine((value) => value.trim() === "" || /^\d+$/.test(value.trim()), {
    message: "Must be a whole number",
  })
  .transform((value) => (value.trim() === "" ? null : Number(value)));

const formSchema = z.object({
  location: z.string().min(1, "Location code is required"),
  zone: z.string().min(1, "Zone is required"),
  aisle: z.string().min(1, "Aisle is required"),
  length: requiredInt,
  width: requiredInt,
  height: requiredInt,
  cbm: optionalInt,
  weightCapacity: optionalInt,
  description: z.string().transform((value) => value.trim() || null),
  status: z.boolean(),
});

/**
 * The form holds strings; the mutation takes numbers. `zodResolver` runs the
 * transform, so `handleSubmit` hands `onSubmit` the output type — declaring both
 * on `useForm` is what keeps that honest instead of re-parsing by hand.
 */
type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;
type LocationRow = RouterOutputs["location"]["getLocations"][number];
type LocationInput = RouterInputs["location"]["updateLocation"];

/** The stored row carries audit columns the form doesn't; drop them. */
function toFormValues(location: LocationRow): FormInput {
  return {
    location: location.location,
    zone: location.zone,
    aisle: location.aisle,
    length: String(location.length),
    width: String(location.width),
    height: String(location.height),
    cbm: location.cbm == null ? "" : String(location.cbm),
    weightCapacity:
      location.weightCapacity == null ? "" : String(location.weightCapacity),
    description: location.description ?? "",
    status: location.status,
  };
}

/**
 * The row the table should show while the write is in flight.
 *
 * The form carries everything the table renders; `id` and the audit columns are
 * placeholders, since the table keys on the location code and shows neither, and
 * the `onSettled` invalidate replaces the row a moment later.
 */
function toOptimisticRow(
  values: LocationInput,
  previous: LocationRow | null,
): LocationRow {
  const now = new Date();

  return {
    location: values.location,
    zone: values.zone,
    aisle: values.aisle,
    length: values.length,
    width: values.width,
    height: values.height,
    // The `?? …` fallbacks mirror the schema's own defaults, so an omitted
    // field lands on the same value the server will store.
    cbm: values.cbm ?? null,
    weightCapacity: values.weightCapacity ?? null,
    description: values.description ?? null,
    status: values.status ?? true,
    // Not on the form.
    id: previous?.id ?? -1,
    onHand: previous?.onHand ?? 0,
    createdAt: previous?.createdAt ?? now,
    createdBy: previous?.createdBy ?? "",
    updatedBy: previous?.updatedBy ?? null,
    updatedAt: now,
  };
}

const emptyLocation: FormInput = {
  location: "",
  zone: "",
  aisle: "",
  length: "100",
  width: "100",
  height: "100",
  cbm: "",
  weightCapacity: "",
  description: "",
  status: true,
};

function LocationDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: LocationRow | null;
}) {
  const queryClient = useQueryClient();
  const isEdit = editing !== null;

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    values: isEdit ? toFormValues(editing) : emptyLocation,
  });

  const settle = async () => {
    await queryClient.invalidateQueries({
      queryKey: orpc.location.getLocations.key(),
    });
    // The putaway destination picker reads the same table.
    await queryClient.invalidateQueries({
      queryKey: orpc.putaway.getLocations.key(),
    });
    onOpenChange(false);
  };

  const createLocation = useMutation(
    orpc.location.createLocation.mutationOptions({
      // Reference data with no stock ledger behind it, so the new row is fully
      // known from the form and can go in before the server confirms it.
      onMutate: async (values) => ({
        snapshot: await applyOptimisticList<LocationRow>(
          queryClient,
          orpc.location.getLocations.key(),
          (rows) =>
            [...rows, toOptimisticRow(values, null)].sort((a, b) =>
              a.location.localeCompare(b.location),
            ),
        ),
      }),
      onError: (_error, _values, context) =>
        rollbackOptimistic(queryClient, context?.snapshot),
      onSuccess: () => toast.success("Location created"),
      onSettled: settle,
    }),
  );

  const updateLocation = useMutation(
    orpc.location.updateLocation.mutationOptions({
      onMutate: async (values) => ({
        snapshot: await applyOptimisticList<LocationRow>(
          queryClient,
          orpc.location.getLocations.key(),
          (rows) =>
            rows.map((row) =>
              row.location === values.location
                ? toOptimisticRow(values, row)
                : row,
            ),
        ),
      }),
      onError: (_error, _values, context) =>
        rollbackOptimistic(queryClient, context?.snapshot),
      onSuccess: () => toast.success("Location updated"),
      onSettled: settle,
    }),
  );

  const isPending = createLocation.isPending || updateLocation.isPending;

  const onSubmit = (values: FormOutput) => {
    if (isEdit) {
      updateLocation.mutate(values);
    } else {
      createLocation.mutate(values);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit location" : "New location"}</DialogTitle>
          <DialogDescription>
            Dimensions are in centimetres. Capacity and volume are optional — an
            unrated location is not capacity-checked on putaway.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="A-01-01"
                        // The code is the primary key every receipt and movement
                        // references, so it is fixed once the row exists.
                        disabled={isEdit || isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="zone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="A" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="aisle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aisle</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="01" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {(["length", "width", "height"] as const).map((dimension) => (
                <FormField
                  key={dimension}
                  control={form.control}
                  name={dimension}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="capitalize">{dimension}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          inputMode="numeric"
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="cbm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Volume capacity (cbm)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        inputMode="numeric"
                        placeholder="Unrated"
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weightCapacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight capacity</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        inputMode="numeric"
                        placeholder="Unrated"
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Optional"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isPending}
                    />
                  </FormControl>
                  <div>
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Inactive locations cannot be chosen as a putaway
                      destination.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : isEdit ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function LocationMaster({ search }: { search?: string | null }) {
  const { data: locations } = useSuspenseQuery(
    orpc.location.getLocations.queryOptions({ input: { search } }),
  );
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LocationRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LocationRow | null>(null);

  const deleteLocation = useMutation(
    orpc.location.deleteLocation.mutationOptions({
      // Drop the row on the way out. A location with history is deactivated
      // rather than deleted, and the `onSettled` invalidate brings it back
      // greyed out — the same correction, just arriving later.
      onMutate: async ({ location }) => ({
        snapshot: await applyOptimisticList<LocationRow>(
          queryClient,
          orpc.location.getLocations.key(),
          (rows) => rows.filter((row) => row.location !== location),
        ),
      }),
      onError: (error, _values, context) => {
        rollbackOptimistic(queryClient, context?.snapshot);
        toast.error("Could not delete location", {
          description: error.message,
        });
      },
      onSuccess: (result) => {
        toast.success(
          result.deactivated
            ? "Location has history, so it was deactivated rather than deleted"
            : "Location deleted",
        );
      },
      onSettled: async () => {
        setPendingDelete(null);
        await queryClient.invalidateQueries({
          queryKey: orpc.location.getLocations.key(),
        });
        await queryClient.invalidateQueries({
          queryKey: orpc.putaway.getLocations.key(),
        });
      },
    }),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {locations.length} location{locations.length === 1 ? "" : "s"}
        </p>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <PlusIcon className="mr-2 size-4" />
          New location
        </Button>
      </div>

      <div className="bg-card rounded-lg border">
        {locations.length === 0 ? (
          <div className="text-muted-foreground p-8 text-center text-sm">
            No locations match this search.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead className="hidden md:table-cell">Zone</TableHead>
                <TableHead className="hidden md:table-cell">Aisle</TableHead>
                <TableHead className="hidden lg:table-cell">Capacity</TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((location) => (
                <TableRow key={location.location}>
                  <TableCell className="font-mono">
                    <span className="flex items-center gap-2">
                      {location.location}
                      {!location.status && (
                        <Badge variant="outline" className="text-xs">
                          inactive
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {location.zone}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {location.aisle}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-xs lg:table-cell">
                    {location.weightCapacity ?? "—"} wt · {location.cbm ?? "—"}{" "}
                    cbm
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {location.onHand.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${location.location}`}
                        onClick={() => {
                          setEditing(location);
                          setDialogOpen(true);
                        }}
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${location.location}`}
                        disabled={deleteLocation.isPending}
                        onClick={() => setPendingDelete(location)}
                      >
                        <TrashIcon className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <LocationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
      />

      {/* Deleting master data is destructive and irreversible, so it asks. */}
      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {pendingDelete?.location}?</DialogTitle>
            <DialogDescription>
              {(pendingDelete?.onHand ?? 0) > 0
                ? `This location still holds ${pendingDelete?.onHand} units, so it cannot be removed until they are moved out.`
                : "If this location has ever been used it will be deactivated instead, so its history stays intact."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={
                deleteLocation.isPending || (pendingDelete?.onHand ?? 0) > 0
              }
              onClick={() =>
                pendingDelete &&
                deleteLocation.mutate({ location: pendingDelete.location })
              }
            >
              {deleteLocation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
