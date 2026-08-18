"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { orpc } from "@/orpc/client";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { ScanField } from "@/components/ui/scan-field";
import { cn } from "@/lib/utils";

export function PickList({ orderNumber }: { orderNumber?: string | null }) {
  const queryClient = useQueryClient();
  const { data: tasks } = useSuspenseQuery(
    orpc.outbound.getPickList.queryOptions({ input: { orderNumber } }),
  );
  // What the picker actually found, keyed by task. Defaults to the allocated
  // quantity, since a full pick is the common case.
  const [picked, setPicked] = useState<Record<number, string>>({});
  const [scan, setScan] = useState("");
  const [highlight, setHighlight] = useState<string | null>(null);

  const confirmPick = useMutation(
    orpc.outbound.confirmPick.mutationOptions({
      onSuccess: async (task) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: orpc.outbound.getPickList.key(),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.outbound.getSalesOrder.key(),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.outbound.getSalesOrders.key(),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.outbound.getPackList.key(),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.outbound.getSummary.key(),
          }),
          queryClient.invalidateQueries({ queryKey: orpc.inventory.key() }),
        ]);
        toast.success(
          task.pickedQuantity === task.quantity
            ? `Picked ${task.pickedQuantity} × ${task.sku}`
            : `Short pick recorded: ${task.pickedQuantity} of ${task.quantity} × ${task.sku}`,
        );
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  /**
   * Scanning the pallet *is* the confirmation.
   *
   * Allocation already decided which pallet this line comes off, so the picker
   * standing in front of it has exactly one thing to tell the system: that they
   * found it. Reading the label is that statement, and it is a better one than
   * tapping a button — a button can be tapped against the wrong row, a barcode
   * cannot be read off a pallet that is not in your hands.
   *
   * The quantity still comes from the row, so a short pick is typed first and
   * then scanned, and only the LPN is taken from the read.
   */
  const handleScan = (value: string) => {
    const scanned = value.trim().toLowerCase();
    setScan("");
    if (!scanned) return;

    const matches = tasks.filter((task) => task.lpn.toLowerCase() === scanned);
    const [first] = matches;

    if (!first) {
      setHighlight(null);
      toast.error(`${value} is not on this pick list`);
      return;
    }

    setHighlight(first.lpn);

    // One pallet can carry stock for several lines. Which of them the picker
    // means is not something the scan says, so it narrows the list and stops
    // rather than guessing.
    if (matches.length > 1) {
      toast.info(
        `${matches.length} lines on ${first.lpn} — confirm the one you are picking`,
      );
      return;
    }

    const typed = picked[first.id];
    const quantity = typed === undefined ? first.quantity : Number(typed);
    if (
      !Number.isInteger(quantity) ||
      quantity < 0 ||
      quantity > first.quantity
    ) {
      toast.error(`Enter a picked quantity between 0 and ${first.quantity}`);
      return;
    }

    confirmPick.mutate({ pickTaskId: first.id, pickedQuantity: quantity });
  };

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-12 text-center text-sm">
          Nothing to pick.{" "}
          <Link href="/sales-orders" className="underline">
            Allocate a sales order
          </Link>{" "}
          to create pick tasks.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="pick-scan">Scan a pallet to confirm its pick</Label>
        <ScanField
          id="pick-scan"
          value={scan}
          onValueChange={setScan}
          onScan={handleScan}
          // Typed rather than scanned: same behaviour, so the screen still works
          // when the wedge is flat.
          onEnter={handleScan}
          // Deliberately not disabled while a confirm is in flight. Picking is
          // a rhythm — scan, walk, scan — and a field that greys out and comes
          // back has lost the focus by the time the next pallet is in hand, so
          // the read goes nowhere. Confirming a task twice is refused by
          // `confirmPick` anyway, since it is no longer PENDING.
          placeholder="Scan the pallet label"
        />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Location</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="hidden md:table-cell">LPN</TableHead>
              <TableHead className="hidden lg:table-cell">Order</TableHead>
              <TableHead className="text-right">Allocated</TableHead>
              <TableHead className="w-32">Picked</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => {
              const value = picked[task.id] ?? String(task.quantity);
              const parsed = Number(value);
              const valid =
                Number.isInteger(parsed) &&
                parsed >= 0 &&
                parsed <= task.quantity;

              return (
                <TableRow
                  key={task.id}
                  // What the last scan matched. With several lines on one pallet
                  // the scan cannot pick between them, so it says which rows it
                  // meant and leaves the choice.
                  className={cn(
                    highlight !== null &&
                      task.lpn === highlight &&
                      "bg-accent/60 hover:bg-accent/60",
                  )}
                >
                  {/* The list is ordered by location, because that is the order a
                    picker walks the aisles in. */}
                  <TableCell className="font-mono font-medium">
                    {task.fromLocation}
                  </TableCell>
                  <TableCell className="font-mono">
                    {task.sku}
                    {task.lot ? (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {task.lot}
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs md:table-cell">
                    {task.lpn}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Link
                      href={`/sales-orders/${task.orderId}`}
                      className="font-mono hover:underline"
                    >
                      {task.orderId}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {task.quantity}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      max={task.quantity}
                      inputMode="numeric"
                      className="h-11 md:h-9"
                      value={value}
                      aria-label={`Picked quantity for ${task.sku} in ${task.fromLocation}`}
                      onChange={(e) =>
                        setPicked((current) => ({
                          ...current,
                          [task.id]: e.target.value,
                        }))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      className="h-11 md:h-8"
                      disabled={confirmPick.isPending || !valid}
                      onClick={() =>
                        confirmPick.mutate({
                          pickTaskId: task.id,
                          pickedQuantity: parsed,
                        })
                      }
                    >
                      Confirm
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
