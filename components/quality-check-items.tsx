"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/trpc/react";
import {
  CheckIcon,
  ClipboardCheckIcon,
  PackageIcon,
  RotateCcwIcon,
} from "lucide-react";
import Link from "next/link";

export function QualityCheckItems({ orderNumber }: { orderNumber: string }) {
  const [orderItems] = api.qualityCheck.getOrderItems.useSuspenseQuery({
    orderNumber,
  });

  if (!orderItems?.items.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <PackageIcon className="text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="mb-2 text-lg font-semibold">No SKUs Found</h3>
          <p className="text-muted-foreground mb-4 text-center">
            No SKUs found for this order.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {orderItems.items.map((item) => (
        <Card key={item.Sku.sku} className="relative">
          <CardHeader className="flex items-center gap-2 pb-3">
            <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
              <PackageIcon className="text-primary h-4 w-4" />
            </div>

            <div>
              <CardTitle className="font-mono text-sm">
                {item.Sku.sku}
              </CardTitle>
              <CardDescription className="text-xs">
                {item.Sku.description}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* SKU Details */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">QC status:</span>
                <Badge
                  variant={
                    item.qualityCheck?.qualityCheckStatus ? "green" : "blue"
                  }
                  className="text-xs"
                >
                  {item.qualityCheck?.qualityCheckStatus ? "Done" : "Not Done"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category:</span>
                <Badge variant="outline" className="text-xs">
                  {item.Sku.department}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ordered:</span>
                <span className="font-medium">{item.orderedQuantity}</span>
              </div>
            </div>
            {/* Action Button */}
            <div className="pt-2">
              {!item.qualityCheck?.qualityCheckStatus && (
                <Button size="sm" className="w-full cursor-pointer" asChild>
                  <Link href={`/quality-check/${orderNumber}/${item.id}`}>
                    <ClipboardCheckIcon className="mr-2 h-3 w-3" />
                    Start QC
                  </Link>
                </Button>
              )}
              {item.qualityCheck?.qualityCheckStatus && (
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                  <Button
                    size="sm"
                    className="cursor-pointer lg:basis-1/2"
                    variant="outline"
                    disabled
                  >
                    <CheckIcon className="mr-2 h-3 w-3" />
                    Completed
                  </Button>
                  <Button
                    size="sm"
                    className="cursor-pointer lg:basis-1/2"
                    variant={"destructive"}
                  >
                    <RotateCcwIcon className="mr-2 h-3 w-3" />
                    Reset QC
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
