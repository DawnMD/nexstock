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

export function InventorySkuBalances({ sku }: { sku: string }) {
  const [balances] = api.inventory.getBalances.useSuspenseQuery({ sku });

  const total = balances.reduce((sum, balance) => sum + balance.quantity, 0);
  const description = balances[0]?.skuRef.description;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">Where it is</h3>
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>
        <Badge variant="secondary">
          {total.toLocaleString()} {balances[0]?.skuRef.uom ?? "EA"} on hand
        </Badge>
      </div>

      <div className="bg-card rounded-lg border">
        {balances.length === 0 ? (
          <div className="text-muted-foreground p-8 text-center text-sm">
            No stock on hand for {sku}.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead className="hidden md:table-cell">Zone</TableHead>
                <TableHead>LPN</TableHead>
                <TableHead className="hidden md:table-cell">Lot</TableHead>
                <TableHead className="text-right">On hand</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances.map((balance) => (
                <TableRow key={balance.id}>
                  <TableCell className="font-mono">
                    {balance.location}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {balance.locationRef.zone} · {balance.locationRef.aisle}
                  </TableCell>
                  <TableCell className="font-mono">{balance.lpn}</TableCell>
                  <TableCell className="hidden font-mono md:table-cell">
                    {balance.lot === "" ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      balance.lot
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {balance.quantity.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
