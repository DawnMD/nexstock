"use client";

import { api } from "@/trpc/react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import {
  IconTag,
  IconBox,
  IconTruckDelivery,
  IconCurrencyDollar,
  IconCalendar,
} from "@tabler/icons-react";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function OrderDetailsPage() {
  const params = useParams();
  const orderId = params.orderId;

  const { data: orderDetails, isLoading } = api.order.getOrderDetails.useQuery({
    id: orderId as string,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xl font-medium text-gray-600">
              Loading order details...
            </span>
          </div>
        </Card>
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-xl font-medium text-red-600">Order not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="border border-gray-300 shadow-sm">
        <div className="px-4">
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-lg border border-gray-300 p-4">
              <div className="flex items-center">
                <IconTag className="mr-3 h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Order Number
                  </h3>
                  <p className="text-xl font-semibold">
                    {orderDetails.orderNumber}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-300 p-4">
              <div className="flex items-center">
                <IconBox className="mr-3 h-6 w-6 text-green-600" />
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Business Unit
                  </h3>
                  <p className="text-xl font-semibold">
                    {orderDetails.businessUnit}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-300 p-4">
              <div className="flex items-center">
                <IconCurrencyDollar className="mr-3 h-6 w-6 text-purple-600" />
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Payment Status
                  </h3>
                  <p className="text-xl font-semibold">
                    {orderDetails.paymentStatus}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-gray-300 p-4">
              <h3 className="mb-3 flex items-center text-sm font-medium tracking-wider text-gray-500 uppercase">
                <IconTruckDelivery className="mr-2 h-5 w-5" />
                Shipping Information
              </h3>
              <div className="space-y-2">
                <p>
                  <span className="font-medium">Vendor Reference:</span>{" "}
                  {orderDetails.vendorReference || "N/A"}
                </p>
                <p>
                  <span className="font-medium">Vendor Name:</span>{" "}
                  {orderDetails.vendor.name || "N/A"}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-300 p-4">
              <h3 className="mb-3 flex items-center text-sm font-medium tracking-wider text-gray-500 uppercase">
                <IconCalendar className="mr-2 h-5 w-5" />
                Order Timeline
              </h3>
              <div className="space-y-2">
                <p>
                  <span className="font-medium">Order Date:</span>{" "}
                  {orderDetails.purchaseOrderDate
                    ? new Date(
                        orderDetails.purchaseOrderDate,
                      ).toLocaleDateString()
                    : "N/A"}
                </p>
                <p>
                  <span className="font-medium">Expected Receipt Date:</span>{" "}
                  {orderDetails.expectedReceiptDate
                    ? new Date(
                        orderDetails.expectedReceiptDate,
                      ).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-300 p-4">
            <h3 className="mb-3 flex items-center text-sm font-medium tracking-wider text-gray-500 uppercase">
              <IconBox className="mr-2 h-5 w-5" />
              Line Items
            </h3>
            <div className="overflow-x-auto">
              <Table className="min-w-full divide-y divide-gray-200">
                <TableHeader className="h-16 bg-gray-100">
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Received Quantity</TableHead>
                    <TableHead>Rejected Quantity</TableHead>
                    <TableHead>Department</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderDetails.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.sku}</TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            item.status === "NOT_RECEIVED"
                              ? "bg-red-100 text-red-800"
                              : item.status === "RECEIVING"
                                ? "bg-yellow-100 text-yellow-800"
                                : item.status === "RECEIVED"
                                  ? "bg-green-100 text-green-800"
                                  : item.status === "REJECTED"
                                    ? "bg-gray-100 text-gray-800"
                                    : ""
                          }`}
                        >
                          {item.status === "NOT_RECEIVED"
                            ? "Not Received"
                            : item.status}
                        </span>
                      </TableCell>
                      <TableCell>{item.receivedQuantity}</TableCell>
                      <TableCell>{item.rejectedQuantity}</TableCell>
                      <TableCell>{item.department}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
