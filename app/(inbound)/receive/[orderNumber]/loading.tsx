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

export default function ReceiveSkuOrderLoading() {
  return (
    <>
      <SiteHeader title="Receive SKU" />
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
              <div className="flex flex-col gap-1">
                <Label className="text-muted-foreground text-sm font-medium">
                  Order Number
                </Label>
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-muted-foreground text-sm font-medium">
                  Vendor
                </Label>
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-muted-foreground text-sm font-medium">
                  Order Date
                </Label>
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-muted-foreground text-sm font-medium">
                  Total Items
                </Label>
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Order Items</h2>
          </div>
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="relative">
              <CardHeader className="flex items-center gap-2 pb-3">
                <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                  <PackageIcon className="text-primary h-4 w-4" />
                </div>

                <div className="flex flex-col gap-1">
                  <CardTitle className="font-mono text-sm">
                    <Skeleton className="h-4 w-24" />
                  </CardTitle>
                  <CardDescription className="text-xs">
                    <Skeleton className="h-4 w-24" />
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* SKU Details */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category:</span>
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Supplier:</span>
                    <span className="font-medium">
                      <Skeleton className="h-4 w-24" />
                    </span>
                  </div>
                </div>
                {/* Action Button */}
                <div className="pt-2">
                  <Skeleton className="h-8 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
