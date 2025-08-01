"use client";

import {
  Command,
  CommandItem,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandSeparator,
} from "@/components/ui/command";
import { api } from "@/trpc/react";
import { PackageIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export function ReceivedItemsOrderSearch() {
  const router = useRouter();
  const [orders] = api.receive.getAllOrderNumbers.useSuspenseQuery();

  return (
    <Command>
      <CommandInput placeholder="Search for orders..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandSeparator />
        <CommandGroup heading="Order Numbers">
          {orders.map((order) => (
            <CommandItem
              key={order.orderNumber}
              value={order.orderNumber}
              onSelect={() => {
                router.push(`/lpn-list/${order.orderNumber}`);
              }}
            >
              <PackageIcon className="mr-2 h-4 w-4" />
              <div className="flex flex-col">
                <span className="font-mono">{order.orderNumber}</span>
                <span className="text-muted-foreground text-xs">
                  {order.vendor.name} • {order._count.items} items
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
