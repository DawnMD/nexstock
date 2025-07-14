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
import { PackageIcon } from "lucide-react";

export default function Loading() {
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
              <div className="flex flex-col gap-1">
                <Label className="text-muted-foreground text-sm font-medium">
                  SKU Number
                </Label>
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-muted-foreground text-sm font-medium">
                  Description
                </Label>
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-muted-foreground text-sm font-medium">
                  Department
                </Label>
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-muted-foreground text-sm font-medium">
                  Receive Status
                </Label>
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quantity Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col items-center rounded-lg bg-blue-100 p-3 text-center dark:bg-blue-900/30">
                <Skeleton className="h-7 w-24" />
                <p className="text-muted-foreground mt-1 text-xs">Total Qty</p>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-orange-100 p-3 text-center dark:bg-orange-900/30">
                <Skeleton className="h-7 w-24" />
                <p className="text-muted-foreground mt-1 text-xs">
                  Inspection Qty
                </p>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-green-100 p-3 text-center dark:bg-green-900/30">
                <Skeleton className="h-7 w-24" />
                <p className="text-muted-foreground mt-1 text-xs">Passed Qty</p>
              </div>
              <div className="flex flex-col items-center rounded-lg bg-red-100 p-3 text-center dark:bg-red-900/30">
                <Skeleton className="h-7 w-24" />
                <p className="text-muted-foreground mt-1 text-xs">
                  Damaged Qty
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-lg">Inspection Percentage</CardTitle>
            </CardHeader>
            <CardContent className="h-full">
              <div className="flex h-full flex-col justify-between gap-3">
                <div className="flex flex-col items-center gap-4">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-4 w-52" />
              </div>
            </CardContent>
          </Card>
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-lg">Damaged Quantity</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-4 w-52" />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">QC Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
