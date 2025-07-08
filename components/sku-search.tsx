"use client";

import { Badge } from "@/components/ui/badge";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import { PackageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SkuSearch({ orderNumber }: { orderNumber: string }) {
  const [open, setOpen] = useState(false);
  const [orderItems] = api.qualityCheck.getOrderItems.useSuspenseQuery({
    orderNumber,
  });
  const router = useRouter();

  if (!orderItems?.items.length) {
    return <Input placeholder="Search for SKUs..." disabled />;
  }

  return (
    <>
      <Input
        placeholder="Search for SKUs..."
        onFocus={() => {
          setOpen(true);
        }}
      />
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search for SKUs..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandSeparator />
          <CommandGroup heading="SKUs">
            {orderItems.items.map((order) => (
              <CommandItem
                disabled={!!order.qualityCheck?.qualityCheckStatus}
                key={order.Sku.sku}
                value={order.Sku.sku}
                onSelect={() => {
                  router.push(`/quality-check/${orderNumber}/${order.Sku.sku}`);
                }}
              >
                <PackageIcon className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{order.Sku.sku}</span>
                    <span className="text-muted-foreground text-xs">
                      x {order.orderedQuantity}
                    </span>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {order.Sku.description}
                  </span>
                  <Badge
                    variant={
                      order.qualityCheck?.qualityCheckStatus ? "green" : "blue"
                    }
                    className="text-xs"
                  >
                    {order.qualityCheck?.qualityCheckStatus
                      ? "Done"
                      : "Not Done"}
                  </Badge>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
