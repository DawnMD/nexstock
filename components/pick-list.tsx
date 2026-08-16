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
import { api } from "@/trpc/react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export function PickList({ orderNumber }: { orderNumber?: string | null }) {
  const apiUtils = api.useUtils();
  const [tasks] = api.outbound.getPickList.useSuspenseQuery({ orderNumber });
  // What the picker actually found, keyed by task. Defaults to the allocated
  // quantity, since a full pick is the common case.
  const [picked, setPicked] = useState<Record<number, string>>({});

  const confirmPick = api.outbound.confirmPick.useMutation({
    onSuccess: async (task) => {
      await Promise.all([
        apiUtils.outbound.getPickList.invalidate(),
        apiUtils.outbound.getSalesOrder.invalidate(),
        apiUtils.outbound.getSalesOrders.invalidate(),
        apiUtils.outbound.getPackList.invalidate(),
        apiUtils.outbound.getSummary.invalidate(),
        apiUtils.inventory.invalidate(),
      ]);
      toast.success(
        task.pickedQuantity === task.quantity
          ? `Picked ${task.pickedQuantity} × ${task.sku}`
          : `Short pick recorded: ${task.pickedQuantity} of ${task.quantity} × ${task.sku}`,
      );
    },
    onError: (error) => toast.error(error.message),
  });

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
              <TableRow key={task.id}>
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
  );
}
