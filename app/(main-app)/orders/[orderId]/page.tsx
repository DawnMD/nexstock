"use client";

import { api } from "@/trpc/react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import {
  IconUser,
  IconTag,
  IconBox,
  IconTruckDelivery,
  IconClipboardCheck,
  IconCurrencyDollar,
} from "@tabler/icons-react";

export default function OrderDetailsPage() {
  const params = useParams();
  const orderId = params.orderId;

  const { data: orderDetails, isLoading } = api.order.getOrderDetails.useQuery(
    { id: orderId as string },
    { enabled: !!orderId },
  );

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
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">
          {orderDetails.orderNumber}
        </h1>
        <div className="flex items-center space-x-2">
          <span
            className={`rounded-md px-3 py-1 text-sm font-semibold ${
              orderDetails.status === "NEW"
                ? "bg-blue-100 text-blue-800"
                : orderDetails.status === "IN_PROGRESS"
                  ? "bg-yellow-100 text-yellow-800"
                  : orderDetails.status === "COMPLETED"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
            }`}
          >
            {orderDetails.status.replace("_", " ")}
          </span>
        </div>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <div className="p-4">
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-lg border border-gray-200 p-4">
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

            <div className="rounded-lg border border-gray-200 p-4">
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

            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <IconUser className="mr-3 h-6 w-6 text-purple-600" />
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Vendor</h3>
                  <p className="text-xl font-semibold">
                    {orderDetails.vendor.name}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="mb-4 flex items-center text-lg font-semibold text-gray-800">
              <IconClipboardCheck className="mr-2 h-5 w-5" />
              Order Timeline
            </h2>
            <div className="flex flex-col space-y-4">
              <div className="flex items-start">
                <div className="mt-1 mr-4 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  1
                </div>
                <div>
                  <p className="font-medium">Order Date</p>
                  <p className="text-sm text-gray-500">
                    {orderDetails.purchaseOrderDate
                      ? new Date(
                          orderDetails.purchaseOrderDate,
                        ).toLocaleString()
                      : "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="mt-1 mr-4 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                  2
                </div>
                <div>
                  <p className="font-medium">Expected Receipt Date</p>
                  <p className="text-sm text-gray-500">
                    {orderDetails.expectedReceiptDate
                      ? new Date(
                          orderDetails.expectedReceiptDate,
                        ).toLocaleString()
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-4">
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
          </div>
        </div>
      </Card>
    </div>
  );
}
