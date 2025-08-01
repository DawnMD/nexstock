"use client";

import { api } from "@/trpc/react";

export function LpnList({ orderNumber }: { orderNumber: string }) {
  const [receivedItems] = api.receive.getReceivedItemsByOrder.useSuspenseQuery({
    orderNumber,
  });

  if (!receivedItems || receivedItems.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <p className="text-muted-foreground text-center">
          No received items found for this order. Items may not have been
          received yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {receivedItems.map((item) => (
        <div
          key={item.id}
          className="bg-card hover:bg-accent/50 rounded-lg border p-4 transition-colors"
        >
          {/* Desktop Layout */}
          <div className="hidden items-center gap-6 md:flex">
            <div className="flex-1">
              <p className="text-muted-foreground mb-1 text-xs tracking-wide uppercase">
                LPN
              </p>
              <p className="font-mono text-base font-medium">{item.lpn}</p>
            </div>

            <div className="flex-1">
              <p className="text-muted-foreground mb-1 text-xs tracking-wide uppercase">
                SKU
              </p>
              <p className="text-base font-medium">{item.sku}</p>
            </div>

            <div className="flex-1">
              <p className="text-muted-foreground mb-1 text-xs tracking-wide uppercase">
                Location
              </p>
              <p className="text-base font-medium">{item.location}</p>
            </div>

            <div className="flex-1">
              <p className="text-muted-foreground mb-1 text-xs tracking-wide uppercase">
                Quantity
              </p>
              <p className="text-base font-medium">
                {item.receivedQuantity} {item.uom}
              </p>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="space-y-3 md:hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs tracking-wide uppercase">
                  LPN
                </p>
                <p className="font-mono text-sm font-medium">{item.lpn}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs tracking-wide uppercase">
                  SKU
                </p>
                <p className="text-sm font-medium">{item.sku}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs tracking-wide uppercase">
                  Location
                </p>
                <p className="text-sm font-medium">{item.location}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs tracking-wide uppercase">
                  Quantity
                </p>
                <p className="text-sm font-medium">
                  {item.receivedQuantity} {item.uom}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
