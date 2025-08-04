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

export function PutawayLPNSearch() {
  const router = useRouter();
  const [lpns] = api.putaway.getAllLPNs.useSuspenseQuery();

  return (
    <Command>
      <CommandInput placeholder="Search for LPNs..." />
      <CommandList>
        <CommandEmpty>No LPNs found.</CommandEmpty>
        <CommandSeparator />
        <CommandGroup heading="LPNs">
          {lpns.map((lpn) => (
            <CommandItem
              key={lpn.lpn}
              value={lpn.lpn}
              onSelect={() => {
                router.push(`/putaway/${lpn.lpn}`);
              }}
            >
              <PackageIcon className="mr-2 h-4 w-4" />
              <div className="flex flex-col">
                <span className="font-mono">{lpn.lpn}</span>
                <span className="text-muted-foreground text-xs">
                  {lpn.sku} • Qty: {lpn.receivedQuantity} • Location:{" "}
                  {lpn.location}
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
