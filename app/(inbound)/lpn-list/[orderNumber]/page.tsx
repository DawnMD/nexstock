import type { Metadata } from "next";
import { LpnList } from "@/components/lpn-list";
import { PageMain } from "@/components/page-main";
import { SiteHeader } from "@/components/site-header";
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
import { requireSession } from "@/lib/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `LPNs · Order ${orderNumber}`,
    description: `Licence plate numbers created while receiving order ${orderNumber}.`,
  };
}

export default async function LpnListOrderPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  await requireSession();

  const { orderNumber } = await params;

  const [order] = await Promise.all([
    api.receive.getOrderItems({
      orderNumber,
    }),
    api.receive.getReceivedItemsByOrder.prefetch({
      orderNumber,
    }),
  ]);

  if (!order) {
    notFound();
  }

  return (
    <>
      <SiteHeader title="LPN List" />
      <PageMain className="flex flex-col gap-4 p-4 lg:gap-6">
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
          <LpnList orderNumber={orderNumber} />
        </HydrateClient>
      </PageMain>
    </>
  );
}
