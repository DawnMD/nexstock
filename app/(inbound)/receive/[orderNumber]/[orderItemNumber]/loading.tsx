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
            <CardTitle>Receive Process</CardTitle>
            <CardDescription>
              Process for receiving this order item
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
