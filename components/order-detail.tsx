"use client";

import { OrderDetailHeader } from "@/components/order-detail-header";
import { OrderDetailInfo } from "@/components/order-detail-info";
import { OrderLineItems } from "@/components/order-line-items";
import { DockBooking } from "@/components/dock-booking";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/trpc/react";
import { ArrowLeftIcon, PackageIcon, TruckIcon } from "lucide-react";
import { notFound, useRouter } from "next/navigation";
import { getStatusVariant } from "@/lib/utils";

export function OrderDetail({ orderNumber }: { orderNumber: string }) {
  const [orderDetails] =
    api.order.getOrderDetailsByOrderNumber.useSuspenseQuery({
      orderNumber,
    });

  const router = useRouter();

  if (!orderDetails) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col gap-4 lg:gap-6">
      {/* Header with back button and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeftIcon className="h-4 w-4" />
            <span className="sr-only">Go back</span>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">
                {orderDetails.orderNumber}
              </h1>
              <Badge variant={getStatusVariant(orderDetails.status)}>
                {orderDetails.status}
              </Badge>
            </div>
          </div>
        </div>
        {/* <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <PrinterIcon className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button variant="outline" size="sm">
                <DownloadIcon className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div> */}
      </div>

      {/* Order header cards */}
      <OrderDetailHeader
        orderNumber={orderDetails.orderNumber}
        businessUnit={orderDetails.businessUnit}
        paymentStatus={orderDetails.paymentStatus ?? "N/A"}
      />

      {/* Tabs for order details and dock bookings */}
      <Tabs defaultValue="order-details" className="flex-1">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger
            value="order-details"
            className="flex items-center gap-2"
          >
            <PackageIcon className="h-4 w-4" />
            Order Details
          </TabsTrigger>
          <TabsTrigger
            value="dock-bookings"
            className="flex items-center gap-2"
          >
            <TruckIcon className="h-4 w-4" />
            Dock Bookings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="order-details" className="space-y-6">
          {/* Shipping info and timeline */}
          <OrderDetailInfo
            shippingInfo={{
              vendorName: orderDetails.vendor.name,
              vendorReference: orderDetails.vendor.reference,
            }}
            timeline={{
              expectedReceiptDate: orderDetails.expectedReceiptDate,
              orderDate: orderDetails.purchaseOrderDate,
            }}
          />
          {/* Line items */}
          <OrderLineItems
            lineItems={orderDetails.items.map((item) => ({
              id: item.id,
              sku: item.sku,
              description: item.description,
              status: item.status,
              orderedQuantity: item.orderedQuantity,
              receivedQuantity: item.receivedQuantity,
              rejectedQuantity: item.rejectedQuantity,
              department: item.department,
            }))}
          />
        </TabsContent>

        <TabsContent value="dock-bookings" className="space-y-6">
          <DockBooking orderNumber={orderNumber} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
