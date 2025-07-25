import { SiteHeader } from "@/components/site-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/server";
import { PackageIcon, SlidersVertical } from "lucide-react";
import { notFound } from "next/navigation";

export default async function ViewAdjustmentPage({
  params,
}: {
  params: Promise<{ adjustmentNumber: string }>;
}) {
  const { adjustmentNumber } = await params;

  const adjustment = await api.adjustments.getAdjustmentInfo({
    adjustmentId: adjustmentNumber,
  });

  if (!adjustment) {
    notFound();
  }

  return (
    <>
      <SiteHeader title="Adjustment Details" />
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
                <p className="font-mono font-medium">
                  {adjustment.order.orderNumber}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm font-medium">
                  Vendor
                </Label>
                <p className="font-medium">{adjustment.order.vendor.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm font-medium">
                  Vendor Reference
                </Label>
                <p className="text-sm font-medium">
                  {adjustment.order.vendor.reference}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm font-medium">
                  Business Unit
                </Label>
                <p className="text-sm font-medium">
                  {adjustment.order.businessUnit}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlidersVertical className="h-5 w-5" />
              Adjustment Details
            </CardTitle>
            <CardDescription>
              Summary of the selected adjustment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 rounded-md border p-4">
              <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <Label>SKU</Label>
                  <Input value={adjustment.orderItem.skuId} disabled />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Quantity</Label>
                  <Input value={adjustment.adjustedQuantity} disabled />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Reason</Label>
                  <Input
                    value={
                      adjustment.adjustmentType === "ADDITION"
                        ? "Overage"
                        : "Shortage"
                    }
                    disabled
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Notes</Label>
                <Textarea value={adjustment.reason ?? ""} disabled />
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
