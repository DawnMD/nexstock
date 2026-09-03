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
import { orpc } from "@/orpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PackageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useScanner } from "@/hooks/use-scanner";

export function SkuSearch({ orderNumber }: { orderNumber: string }) {
  const [open, setOpen] = useState(false);
  const { data: orderItems } = useSuspenseQuery(
    orpc.qualityCheck.getOrderItems.queryOptions({
      input: {
        orderNumber,
      },
    }),
  );
  const router = useRouter();

  // Unlike the order palettes, this list is the order's own lines — a handful
  // of rows, already on the client — so a scan resolves without a round trip.
  const scanner = useScanner({
    onScan: (value) => {
      const match = orderItems?.items.find(
        (item) => item.Sku.sku.toLowerCase() === value.trim().toLowerCase(),
      );
      if (!match) {
        toast.error(`${value} is not a line on this order`);
        return;
      }
      if (match.qualityCheck?.qualityCheckStatus) {
        toast.info(`${match.Sku.sku} has already been inspected`);
        return;
      }
      setOpen(false);
      router.push(`/quality-check/${orderNumber}/${match.id}`);
    },
  });

  if (!orderItems?.items.length) {
    return <Input placeholder="Search for SKUs..." disabled />;
  }

  return (
    <>
      {/* Opens on click, not focus: the dialog restores focus here on close,
          which would immediately reopen it. */}
      <Input
        placeholder="Search for SKUs..."
        readOnly
        onClick={() => {
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      />
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Scan or search for a SKU..."
          onKeyDown={scanner.onKeyDown}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="h-11 md:h-10"
        />
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
                  setOpen(false);
                  router.push(`/quality-check/${orderNumber}/${order.id}`);
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
