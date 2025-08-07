"use client";

import { api } from "@/trpc/react";
import { Badge } from "@/components/ui/badge";

function LpnListHeader({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold">LPNs</h2>
      </div>
      <Badge variant="secondary" className="text-xs">
        {count} LPNs
      </Badge>
    </div>
  );
}

function LpnListEmpty() {
  return (
    <div className="bg-card rounded-lg border p-6">
      <p className="text-muted-foreground text-center">
        No received items found for this order. Items may not have been received
        yet.
      </p>
    </div>
  );
}

function LpnItem({
  item,
}: {
  item: {
    id: number;
    lpn: string;
    sku: string;
    location: string;
    receivedQuantity: number;
    uom: string;
  };
}) {
  return (
    <div className="bg-card hover:bg-accent/50 rounded-lg border p-4 transition-colors">
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
        <div className="grid grid-cols-2 gap-4">
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

        <div className="grid grid-cols-2 gap-4">
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
  );
}

export function LpnList({ orderNumber }: { orderNumber: string }) {
  const [receivedItems] = api.receive.getReceivedItemsByOrder.useSuspenseQuery({
    orderNumber,
  });

  return (
    <>
      <LpnListHeader count={receivedItems?.length ?? 0} />

      {!receivedItems || (receivedItems.length === 0 && <LpnListEmpty />)}

      {receivedItems && receivedItems.length > 0 && (
        <div className="space-y-2">
          {receivedItems.map((item) => (
            <LpnItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </>
  );
}
