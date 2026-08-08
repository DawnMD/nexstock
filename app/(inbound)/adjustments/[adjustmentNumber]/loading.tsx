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
import { PackageIcon, SlidersVertical } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ViewAdjustmentLoading() {
  return (
    <>
      <SiteHeader title="Adjustment Details" />
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
              <div className="flex flex-col gap-1">
                <Label className="text-muted-foreground text-sm font-medium">
                  Order Number
                </Label>
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-muted-foreground text-sm font-medium">
                  Vendor
                </Label>
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-muted-foreground text-sm font-medium">
                  Vendor Reference
                </Label>
                <Skeleton className="h-5 w-24" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-muted-foreground text-sm font-medium">
                  Business Unit
                </Label>
                <Skeleton className="h-5 w-24" />
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
                  <Skeleton className="h-9 w-full" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Quantity</Label>
                  <Skeleton className="h-9 w-full" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Reason</Label>
                  <Skeleton className="h-9 w-full" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Notes</Label>
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </PageMain>
    </>
  );
}
