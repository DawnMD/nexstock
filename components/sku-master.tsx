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
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

/**
 * Text inputs produce strings, so the schema takes strings and converts. Neither
 * `z.preprocess` nor `z.coerce` is used: both widen the schema's input type to
 * `unknown`, which leaves react-hook-form's `field.value` typed as `{}`.
 *
 * Blank means "not measured", which is different from zero — an unmeasured SKU
 * is skipped by the putaway capacity check rather than treated as weightless.
 */
const optionalNumber = z
  .string()
  .refine((value) => value.trim() === "" || Number(value) >= 0, {
    message: "Must be zero or more",
  })
  .transform((value) => (value.trim() === "" ? null : Number(value)));

const optionalInt = z
  .string()
  .refine((value) => value.trim() === "" || /^[1-9]\d*$/.test(value.trim()), {
    message: "Must be a whole number greater than zero",
  })
  .transform((value) => (value.trim() === "" ? null : Number(value)));

const optionalText = z.string().transform((value) => value.trim() || null);

const formSchema = z.object({
  sku: z.string().min(1, "SKU code is required"),
  description: z.string().min(1, "Description is required"),
  department: z.string().min(1, "Department is required"),
  uom: optionalText,
  weight: optionalNumber,
  cbm: optionalNumber,
  qualityCheck: z.boolean(),
  hasShelfLife: z.boolean(),
  shelfLifeDays: optionalInt,
  storageType: optionalText,
  storageZone: optionalText,
  isActive: z.boolean(),
});

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;
type SkuRow = RouterOutputs["sku"]["getSkus"][number];
type SkuInput = RouterInputs["sku"]["updateSku"];

function toFormValues(sku: SkuRow): FormInput {
  return {
    sku: sku.sku,
    description: sku.description,
    department: sku.department,
    uom: sku.uom ?? "",
    weight: sku.weight == null ? "" : String(sku.weight),
    cbm: sku.cbm == null ? "" : String(sku.cbm),
    qualityCheck: sku.qualityCheck,
    hasShelfLife: sku.hasShelfLife,
    shelfLifeDays: sku.shelfLifeDays == null ? "" : String(sku.shelfLifeDays),
    storageType: sku.storageType ?? "",
    storageZone: sku.storageZone ?? "",
    isActive: sku.isActive,
  };
}

/**
 * The row the table should show while the write is in flight.
 *
 * Everything the form carries comes from the form; everything it does not comes
 * from the row being edited, or — for a new SKU — from what the server is going
 * to pick anyway. `id` and the audit columns are placeholders: the table keys on
 * the SKU code and shows neither, and the `onSettled` invalidate replaces the
 * whole row a moment later.
 */
function toOptimisticRow(values: SkuInput, previous: SkuRow | null): SkuRow {
  const now = new Date();

  return {
    sku: values.sku,
    description: values.description,
    department: values.department,
    // The `?? …` fallbacks mirror the schema's own defaults, so an omitted
    // field lands on the same value the server will store.
    uom: values.uom ?? null,
    weight: values.weight ?? null,
    cbm: values.cbm ?? null,
    qualityCheck: values.qualityCheck ?? false,
    hasShelfLife: values.hasShelfLife ?? false,
    shelfLifeDays: values.shelfLifeDays ?? null,
    storageType: values.storageType ?? null,
    storageZone: values.storageZone ?? null,
    isActive: values.isActive ?? true,
    length: values.length ?? previous?.length ?? null,
    width: values.width ?? previous?.width ?? null,
    height: values.height ?? previous?.height ?? null,
    // Not on the form.
    id: previous?.id ?? -1,
    lot: previous?.lot ?? null,
    lotExpiryDate: previous?.lotExpiryDate ?? null,
    onHand: previous?.onHand ?? 0,
    createdAt: previous?.createdAt ?? now,
    createdBy: previous?.createdBy ?? "",
    updatedBy: previous?.updatedBy ?? "",
    updatedAt: now,
  };
}

const emptySku: FormInput = {
  sku: "",
  description: "",
  department: "",
  uom: "EA",
  weight: "",
  cbm: "",
  qualityCheck: false,
  hasShelfLife: false,
  shelfLifeDays: "",
  storageType: "",
  storageZone: "",
  isActive: true,
};

function SkuDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: SkuRow | null;
}) {
  const queryClient = useQueryClient();
  const isEdit = editing !== null;

  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    values: isEdit ? toFormValues(editing) : emptySku,
  });

  // `useWatch` rather than `form.watch()`: the latter is opaque to React
  // Compiler, which then skips memoizing this whole component.
  const hasShelfLife = useWatch({
    control: form.control,
    name: "hasShelfLife",
  });

  const settle = async () => {
    await queryClient.invalidateQueries({ queryKey: orpc.sku.getSkus.key() });
    onOpenChange(false);
  };

  const createSku = useMutation(
    orpc.sku.createSku.mutationOptions({
      // The catalogue is plain reference data — no stock ledger behind it — so
      // the new row is fully known from the form and can go in immediately.
      onMutate: async (values) => ({
        snapshot: await applyOptimisticList<SkuRow>(
          queryClient,
          orpc.sku.getSkus.key(),
          (rows) =>
            [...rows, toOptimisticRow(values, null)].sort((a, b) =>
              a.sku.localeCompare(b.sku),
            ),
        ),
      }),
      onError: (_error, _values, context) =>
        rollbackOptimistic(queryClient, context?.snapshot),
      onSuccess: () => toast.success("SKU created"),
      onSettled: settle,
    }),
  );

  const updateSku = useMutation(
    orpc.sku.updateSku.mutationOptions({
      onMutate: async (values) => ({
        snapshot: await applyOptimisticList<SkuRow>(
          queryClient,
          orpc.sku.getSkus.key(),
          (rows) =>
            rows.map((row) =>
              row.sku === values.sku ? toOptimisticRow(values, row) : row,
            ),
        ),
      }),
      onError: (_error, _values, context) =>
        rollbackOptimistic(queryClient, context?.snapshot),
      onSuccess: () => toast.success("SKU updated"),
      onSettled: settle,
    }),
  );

  const isPending = createSku.isPending || updateSku.isPending;

  const onSubmit = (values: FormOutput) => {
    if (isEdit) {
      updateSku.mutate(values);
    } else {
      createSku.mutate(values);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit SKU" : "New SKU"}</DialogTitle>
          <DialogDescription>
            Weight and volume feed the putaway capacity check — an unmeasured
            SKU is not checked against the rating on a location.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="SKU-0001"
                        // Order lines and every movement reference this code.
                        disabled={isEdit || isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Electronics"
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
                    <Input {...field} disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="uom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit of measure</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="EA" disabled={isPending} />
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
                    <FormLabel>Unit weight</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="any"
                        inputMode="decimal"
                        placeholder="Unmeasured"
                        disabled={isPending}
                      />
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
                    <FormLabel>Unit cbm</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="any"
                        inputMode="decimal"
                        placeholder="Unmeasured"
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="storageType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Storage type</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ambient"
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="storageZone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Storage zone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="A" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shelfLifeDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shelf life (days)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        inputMode="numeric"
                        disabled={isPending || !hasShelfLife}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3">
              <FormField
                control={form.control}
                name="hasShelfLife"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormLabel>Has a shelf life</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="qualityCheck"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormLabel>Requires a quality check</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
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
                        Inactive SKUs stay on their history but should not be
                        ordered again.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

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

export function SkuMaster({ search }: { search?: string | null }) {
  const { data: skus } = useSuspenseQuery(
    orpc.sku.getSkus.queryOptions({ input: { search } }),
  );
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SkuRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SkuRow | null>(null);

  const deleteSku = useMutation(
    orpc.sku.deleteSku.mutationOptions({
      // Drop the row on the way out. A SKU with history is deactivated rather
      // than deleted, and the `onSettled` invalidate brings it back greyed out
      // — which is the same correction the operator would have seen after the
      // round trip, just later.
      onMutate: async ({ sku }) => ({
        snapshot: await applyOptimisticList<SkuRow>(
          queryClient,
          orpc.sku.getSkus.key(),
          (rows) => rows.filter((row) => row.sku !== sku),
        ),
      }),
      onError: (error, _values, context) => {
        rollbackOptimistic(queryClient, context?.snapshot);
        toast.error("Could not delete SKU", { description: error.message });
      },
      onSuccess: (result) => {
        toast.success(
          result.deactivated
            ? "SKU has history, so it was deactivated rather than deleted"
            : "SKU deleted",
        );
      },
      onSettled: async () => {
        setPendingDelete(null);
        await queryClient.invalidateQueries({
          queryKey: orpc.sku.getSkus.key(),
        });
      },
    }),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {skus.length} SKU{skus.length === 1 ? "" : "s"}
        </p>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <PlusIcon className="mr-2 size-4" />
          New SKU
        </Button>
      </div>

      <div className="bg-card rounded-lg border">
        {skus.length === 0 ? (
          <div className="text-muted-foreground p-8 text-center text-sm">
            No SKUs match this search.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead className="hidden md:table-cell">
                  Description
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  Department
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  Weight / cbm
                </TableHead>
                <TableHead className="text-right">On hand</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {skus.map((sku) => (
                <TableRow key={sku.sku}>
                  <TableCell className="font-mono">
                    <span className="flex items-center gap-2">
                      {sku.sku}
                      {!sku.isActive && (
                        <Badge variant="outline" className="text-xs">
                          inactive
                        </Badge>
                      )}
                      {sku.qualityCheck && (
                        <Badge variant="secondary" className="text-xs">
                          QC
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {sku.description}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {sku.department}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-xs lg:table-cell">
                    {sku.weight ?? "—"} / {sku.cbm ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {sku.onHand.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${sku.sku}`}
                        onClick={() => {
                          setEditing(sku);
                          setDialogOpen(true);
                        }}
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${sku.sku}`}
                        disabled={deleteSku.isPending}
                        onClick={() => setPendingDelete(sku)}
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

      <SkuDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
      />

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {pendingDelete?.sku}?</DialogTitle>
            <DialogDescription>
              {(pendingDelete?.onHand ?? 0) > 0
                ? `This SKU still has ${pendingDelete?.onHand} units on hand, so it can't be removed until they are written off.`
                : "If this SKU has ever been ordered it will be deactivated instead, so its history stays intact."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteSku.isPending || (pendingDelete?.onHand ?? 0) > 0}
              onClick={() =>
                pendingDelete && deleteSku.mutate({ sku: pendingDelete.sku })
              }
            >
              {deleteSku.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
