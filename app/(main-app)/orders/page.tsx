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

export default function Page() {
  const { data: orders, isLoading } = api.order.getAllOrders.useQuery();

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <div className="p-6">Loading orders...</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <div className="px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Number</TableHead>
                <TableHead>Business Unit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Expected Receipt</TableHead>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Vendor Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders?.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{order.orderNumber}</TableCell>
                  <TableCell>{order.businessUnit}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2 py-2 text-xs font-semibold ${
                        order.status === "NEW"
                          ? "bg-blue-100 text-blue-800"
                          : order.status === "IN_PROGRESS"
                            ? "bg-yellow-100 text-yellow-800"
                            : order.status === "COMPLETED"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                      }`}
                    >
                      {order.status}
                    </span>
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
                  <TableCell>{order.vendor.name}</TableCell>
                  <TableCell>{order.vendorReference}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
