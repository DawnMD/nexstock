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
import { orpc } from "@/orpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PackageIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export function PutawayLPNSearch() {
  const router = useRouter();
  const { data: lpns } = useSuspenseQuery(
    orpc.putaway.getAllLPNs.queryOptions(),
  );

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
                  {/* Remaining, not received: a partially put-away or partially
                      rejected pallet has less left to move than it arrived with. */}
                  {lpn.sku} • To put away: {lpn.remainingQuantity} of{" "}
                  {lpn.receivedQuantity} • Location: {lpn.location}
                </span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
