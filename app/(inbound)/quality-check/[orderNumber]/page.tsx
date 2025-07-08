import { QualityCheckItems } from "@/components/quality-check-items";
import { SiteHeader } from "@/components/site-header";
import { SkuSearch } from "@/components/sku-search";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { api, HydrateClient } from "@/trpc/server";
import { PackageIcon } from "lucide-react";
import { notFound } from "next/navigation";

export default async function QualityCheckOrderPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;

  //direct call wont add to the cache, so we need to prefetch again
  //this is a workaround to get the order items to be cached
  const [order] = await Promise.all([
    api.qualityCheck.getOrderItems({
      orderNumber,
    }),
    api.qualityCheck.getOrderItems.prefetch({
      orderNumber,
    }),
  ]);

  if (!order) {
    notFound();
  }

  return (
    <>
      <SiteHeader title="Quality Check Overview" />
      <main className="flex flex-col gap-4 p-4 lg:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageIcon className="h-5 w-5" />
              Order Details
            </CardTitle>
            <CardDescription>Summary of the selected order</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label className="text-muted-foreground text-sm font-medium">
                  Order Number
                </Label>
                <p className="font-mono font-medium">{orderNumber}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm font-medium">
                  Total Items
                </Label>
                <p className="text-sm font-medium">{order.items.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <HydrateClient>
          <SkuSearch orderNumber={orderNumber} />
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Order Items</h2>
            </div>
            <Badge variant="secondary" className="text-xs">
              {order.items.length} total SKUs
            </Badge>
          </div>
          <QualityCheckItems orderNumber={orderNumber} />
        </HydrateClient>
      </main>
    </>
  );
}
