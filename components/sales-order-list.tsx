"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/trpc/react";
import type { SalesOrderStatus } from "@/generated/prisma/enums";
import { format } from "date-fns";
import Link from "next/link";

const STATUS_VARIANT: Record<
  SalesOrderStatus,
  "blue" | "yellow" | "green" | "red" | "secondary"
> = {
  NEW: "blue",
  ALLOCATED: "yellow",
  PICKING: "yellow",
  PICKED: "green",
  SHIPPED: "green",
  CANCELLED: "red",
};

const STATUS_LABEL: Record<SalesOrderStatus, string> = {
  NEW: "New",
  ALLOCATED: "Allocated",
  PICKING: "Picking",
  PICKED: "Picked",
  SHIPPED: "Shipped",
  CANCELLED: "Cancelled",
};

export function SalesOrderList({ search }: { search?: string | null }) {
  const [orders] = api.outbound.getSalesOrders.useSuspenseQuery({ search });

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-12 text-center text-sm">
          No sales orders yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Lines</TableHead>
            <TableHead className="text-right">Ordered</TableHead>
            <TableHead className="text-right">Allocated</TableHead>
            <TableHead className="text-right">Picked</TableHead>
            <TableHead className="text-right">Shipped</TableHead>
            <TableHead className="hidden lg:table-cell">Ship by</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.orderNumber}>
              <TableCell className="font-mono">
                <Link
                  href={`/sales-orders/${order.orderNumber}`}
                  className="hover:underline"
                >
                  {order.orderNumber}
                </Link>
              </TableCell>
              <TableCell>{order.customer.name}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[order.status]}>
                  {STATUS_LABEL[order.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {order.lineCount}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {order.orderedQuantity}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {order.allocatedQuantity}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {order.pickedQuantity}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {order.shippedQuantity}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {order.requestedShipDate
                  ? format(order.requestedShipDate, "dd MMM yyyy")
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
