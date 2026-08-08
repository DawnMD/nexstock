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
import { Skeleton } from "@/components/ui/skeleton";
import { PackageIcon, SlidersVertical } from "lucide-react";

export default function NewAdjustmentLoading() {
  return (
    <>
      <SiteHeader title="New Adjustment" />
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
              Create a new adjustment for the selected order
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
            <div className="mb-4 flex w-full flex-col items-center justify-between gap-4 lg:mt-6 lg:flex-row">
              <Skeleton className="h-9 w-full lg:w-52" />
              <Skeleton className="h-9 w-full lg:w-40" />
            </div>
          </CardContent>
        </Card>
      </PageMain>
    </>
  );
}
