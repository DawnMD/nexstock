"use client";

import { OrderDetailHeader } from "@/components/order-detail-header";
import { OrderDetailInfo } from "@/components/order-detail-info";
import { OrderLineItems } from "@/components/order-line-items";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import { ArrowLeftIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export function OrderDetail({ orderNumber }: { orderNumber: string }) {
  const [orderDetails] =
    api.order.getOrderDetailsByOrderNumber.useSuspenseQuery({
      orderNumber,
    });

  const router = useRouter();

  if (!orderDetails) {
    return <div>Order not found</div>;
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
            <h1 className="text-2xl font-semibold">Order Details</h1>
            <p className="text-muted-foreground">
              View and manage order information
            </p>
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
          orderedQuantity: item.totalQuantity,
          receivedQuantity: item.receivedQuantity,
          rejectedQuantity: item.rejectedQuantity,
          department: item.department,
        }))}
      />
    </div>
  );
}
