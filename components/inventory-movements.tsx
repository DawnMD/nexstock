"use client";

import { api } from "@/trpc/react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MovementReason } from "@prisma/client";

/**
 * Reasons read better as prose than as enum members, and the receipt/issue
 * distinction is worth showing at a glance rather than making people read the
 * sign of the quantity.
 */
const REASON_LABELS: Record<MovementReason, string> = {
  RECEIPT: "Receipt",
  QC_REJECT: "QC rejection",
  ADJUSTMENT_ADD: "Adjustment (overage)",
  ADJUSTMENT_SUB: "Adjustment (shortage)",
  PUTAWAY_OUT: "Putaway out",
  PUTAWAY_IN: "Putaway in",
  TRANSFER: "Transfer",
};

export function InventoryMovements({
  sku,
  lpn,
  location,
}: {
  sku?: string;
  lpn?: string;
  location?: string;
}) {
  const [movements] = api.inventory.getMovements.useSuspenseQuery({
    sku,
    lpn,
    location,
  });

  if (movements.length === 0) {
    return (
      <div className="text-muted-foreground p-8 text-center text-sm">
        No movements recorded.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead className="hidden md:table-cell">Location</TableHead>
          <TableHead className="hidden lg:table-cell">LPN</TableHead>
          <TableHead className="hidden lg:table-cell">Reference</TableHead>
          <TableHead className="text-right">Qty</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {movements.map((movement) => (
          <TableRow key={movement.id}>
            <TableCell className="whitespace-nowrap">
              {movement.createdAt.toLocaleString()}
            </TableCell>
            <TableCell>
              <Badge variant="secondary">
                {REASON_LABELS[movement.reason]}
              </Badge>
            </TableCell>
            <TableCell className="hidden font-mono md:table-cell">
              {movement.location}
            </TableCell>
            <TableCell className="hidden font-mono lg:table-cell">
              {movement.lpn}
            </TableCell>
            <TableCell className="text-muted-foreground hidden font-mono text-xs lg:table-cell">
              {movement.refType} #{movement.refId}
            </TableCell>
            <TableCell
              className={`text-right font-medium tabular-nums ${
                movement.quantity < 0
                  ? "text-destructive"
                  : "text-emerald-600 dark:text-emerald-500"
              }`}
            >
              {movement.quantity > 0 ? "+" : ""}
              {movement.quantity.toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
