import { NewAdjustmentForm } from "@/components/new-adjustment-form";
import { SiteHeader } from "@/components/site-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { api } from "@/trpc/server";
import { PackageIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default async function NewAdjustmentPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  await auth.protect();

  const { orderNumber } = await params;

  const order = await api.adjustments.getOrderInfo({ orderNumber });

  if (!order) {
    notFound();
  }

  return (
    <>
      <SiteHeader title="New Adjustment" />
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
                  Vendor Reference
                </Label>
                <p className="text-sm font-medium">{order.vendor.reference}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm font-medium">
                  Business Unit
                </Label>
                <p className="text-sm font-medium">{order.businessUnit}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <NewAdjustmentForm skus={order.items} orderNumber={orderNumber} />
      </main>
    </>
  );
}
