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

export default function OrderDetailsPage() {
  const params = useParams();
  const orderId = params.orderId;

  const { data: orderDetails, isLoading } = api.order.getOrderDetails.useQuery({
    id: orderId as string,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-pulse text-xl font-medium text-gray-600">
          Loading order details...
        </div>
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

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
        </div>
      </Card>
    </div>
  );
}
