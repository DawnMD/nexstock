import { QualityCheckProcess } from "@/components/quality-check-process";
import { SiteHeader } from "@/components/site-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getStatusVariant } from "@/lib/order-utils";
import { formatStatusDisplay } from "@/lib/order-utils";
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/server";
import { PackageIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default async function OrderItemPage({
  params,
}: {
  params: Promise<{ orderItemNumber: string; orderNumber: string }>;
}) {
  await auth.protect();

  const { orderItemNumber, orderNumber } = await params;

  const orderItem = await api.qualityCheck.getQualityCheckItems({
    id: Number(orderItemNumber),
  });

  const isAvailableForQualityCheck =
    orderItem?.Order?.dockBookings?.length &&
    orderItem?.Order?.dockBookings?.length > 0 &&
    orderItem?.Order?.dockBookings?.every(
      (dockBooking) => dockBooking.activities.length >= 2,
    ) &&
    orderItem?.Order?.dockBookings?.every((dockBooking) =>
      dockBooking.activities.some(
        (activity) => activity.activityType === "OPEN",
      ),
    );

  // Inspection is bounded by what actually arrived, so there is nothing to
  // check until something has been received against the line.
  if (
    !orderItem ||
    !isAvailableForQualityCheck ||
    !orderItem.receivedQuantity
  ) {
    notFound();
  }

  return (
    <>
      <SiteHeader title="Quality Check" />
      <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageIcon className="h-5 w-5" />
              Order Item Details
            </CardTitle>
            <CardDescription>
              Quality Check Process for Order Item
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label className="text-muted-foreground text-sm font-medium">
                  SKU Number
                </Label>
                <p className="font-mono font-medium">{orderItem.skuId}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm font-medium">
                  Description
                </Label>
                <p className="font-mono font-medium">{orderItem.description}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm font-medium">
                  Department
                </Label>
                <p className="font-mono font-medium">{orderItem.department}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm font-medium">
                  Receive Status
                </Label>
                <Badge variant={getStatusVariant(orderItem.status)}>
                  {formatStatusDisplay(orderItem.status)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        <QualityCheckProcess
          receivedQuantity={orderItem.receivedQuantity}
          orderNumber={orderNumber}
          orderItemNumber={orderItemNumber}
        />
      </main>
    </>
  );
}
