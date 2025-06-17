"use client";

import { api } from "@/trpc/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function Page() {
  const { data: orders, isLoading } = api.order.getAllOrders.useQuery();

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading orders...</span>
          </div>
        </Card>
      </div>
    );
  }

  if (!orders?.length) {
    return (
      <div className="container mx-auto py-10">
        <Card className="p-6">
          <div>No orders found</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <div className="overflow-x-auto p-4">
          <Table className="min-w-full">
            <TableHeader className="h-16 bg-gray-100">
              <TableRow>
                <TableHead>Order Number</TableHead>
                <TableHead>Business Unit</TableHead>
                <TableHead>Order Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Receipt Date</TableHead>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Vendor Ref</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    <Link
                      href={`/orders/${order.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{order.businessUnit}</TableCell>
                  <TableCell>{order.purchaseOrderType}</TableCell>
                  <TableCell>
                    <Badge
                      className={cn({
                        "bg-blue-100 text-blue-800": order.status === "NEW",
                        "bg-yellow-100 text-yellow-800":
                          order.status === "IN_PROGRESS",
                        "bg-green-100 text-green-800":
                          order.status === "COMPLETED",
                        "bg-gray-100 text-gray-800": ![
                          "NEW",
                          "IN_PROGRESS",
                          "COMPLETED",
                        ].includes(order.status),
                      })}
                    >
                      {order.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {order.purchaseOrderDate
                      ? new Date(order.purchaseOrderDate).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {order.expectedReceiptDate
                      ? new Date(order.expectedReceiptDate).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {order.vendor.name}
                  </TableCell>
                  <TableCell>{order.vendorReference || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
