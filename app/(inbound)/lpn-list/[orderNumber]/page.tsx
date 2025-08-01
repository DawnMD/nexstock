import { LpnList } from "@/components/lpn-list";
import { SiteHeader } from "@/components/site-header";
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
import { format } from "date-fns";
import { PackageIcon } from "lucide-react";
import { notFound } from "next/navigation";

export default async function ReceivedItemsOrderPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;

  const [order, receivedItems] = await Promise.all([
    api.receive.getOrderItems({
      orderNumber,
    }),
    api.receive.getReceivedItemsByOrder({
      orderNumber,
    }),
  ]);

  if (!order) {
    notFound();
  }

  return (
    <>
      <SiteHeader title="LPN List" />
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
                  Vendor
                </Label>
                <p className="font-medium">{order.vendor.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm font-medium">
                  Order Date
                </Label>
                <p className="text-sm">
                  {format(order.createdAt, "MMM d, yyyy")}
                </p>
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
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">LPNs</h2>
            </div>
            <Badge variant="secondary" className="text-xs">
              {receivedItems?.length ?? 0} LPNs
            </Badge>
          </div>
          <LpnList orderNumber={orderNumber} />
        </HydrateClient>
      </main>
    </>
  );
}
