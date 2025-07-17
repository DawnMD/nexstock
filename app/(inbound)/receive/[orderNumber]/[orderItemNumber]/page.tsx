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
import { ReceiveSkuProcess } from "@/components/receive-sku-process";

export default async function ReceiveItemPage({
  params,
}: {
  params: Promise<{ orderItemNumber: string; orderNumber: string }>;
}) {
  const { orderItemNumber, orderNumber } = await params;

  const orderItem = await api.receive.getReceiveItem({
    id: Number(orderItemNumber),
  });

  if (!orderItem) {
    notFound();
  }

  return (
    <>
      <SiteHeader title="Receive SKU" />
      <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageIcon className="h-5 w-5" />
              Order Item Details
            </CardTitle>
            <CardDescription>Receive Process for Order Item</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label className="text-muted-foreground text-sm font-medium">
                  SKU Number
                </Label>
                <p className="font-mono font-medium">{orderItem.Sku.sku}</p>
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
        <ReceiveSkuProcess
          orderNumber={orderNumber}
          orderItemNumber={orderItemNumber}
          orderItem={orderItem}
        />
      </main>
    </>
  );
}
