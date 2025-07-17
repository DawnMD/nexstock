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
              <div>
                <Label className="text-muted-foreground text-sm font-medium">
                  SKU Number
                </Label>
                <Skeleton className="h-6 w-32" />
              </div>
              <div>
                <Label className="text-muted-foreground text-sm font-medium">
                  Description
                </Label>
                <Skeleton className="h-6 w-48" />
              </div>
              <div>
                <Label className="text-muted-foreground text-sm font-medium">
                  Department
                </Label>
                <Skeleton className="h-6 w-32" />
              </div>
              <div>
                <Label className="text-muted-foreground text-sm font-medium">
                  Quality Check Status
                </Label>
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-24 w-full" />
            </div>
            <div className="mt-6">
              <Skeleton className="h-10 w-24" />
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
