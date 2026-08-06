"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";
import { ClipboardCheckIcon, PackageIcon } from "lucide-react";
import Link from "next/link";
import { formatStatusDisplay } from "@/lib/order-utils";

export function ReceiveSkuItems({ orderNumber }: { orderNumber: string }) {
  const [orderItems] = api.receive.getOrderItems.useSuspenseQuery({
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
      {orderItems.items.map((sku) => (
        <Card key={sku.Sku.sku} className="relative">
          <CardHeader className="flex items-center gap-2 pb-3">
            <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
              <PackageIcon className="text-primary h-4 w-4" />
            </div>
            <div>
              <CardTitle className="font-mono text-sm">{sku.Sku.sku}</CardTitle>
              <CardDescription className="text-xs">
                {sku.Sku.description}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ordered Qty:</span>
                <Badge variant="outline" className="text-xs">
                  {sku.orderedQuantity}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Received Qty:</span>
                <Badge variant="outline" className="text-xs">
                  {sku.receivedQuantity}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge
                  variant={
                    sku.receivedQuantity === 0
                      ? "outline"
                      : sku.receivedQuantity === sku.orderedQuantity
                        ? "default"
                        : "secondary"
                  }
                  className="text-xs"
                >
                  {formatStatusDisplay(sku.status)}
                </Badge>
              </div>
            </div>
            <div className="pt-2">
              {sku.receivedQuantity === sku.orderedQuantity ? (
                <Button size="sm" className="w-full" variant="outline" disabled>
                  <PackageIcon className="mr-2 h-3 w-3" />
                  Received
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="w-full cursor-pointer"
                  render={<Link href={`/receive/${orderNumber}/${sku.id}`} />}
                  nativeButton={false}
                >
                  <ClipboardCheckIcon className="mr-2 h-3 w-3" />
                  Receive SKU
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
