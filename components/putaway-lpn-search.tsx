"use client";

import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";

import { EntitySearch } from "@/components/entity-search";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { orpc } from "@/orpc/client";

export function PutawayLPNSearch() {
  const [search, setSearch] = useState("");
  const [term, isPending] = useDebouncedValue(search);
  const { data: lpns } = useSuspenseQuery(
    orpc.putaway.getAllLPNs.queryOptions({ input: { search: term || null } }),
  );

  return (
    <EntitySearch
      search={search}
      onSearchChange={setSearch}
      isPending={isPending}
      placeholder="Scan or search for an LPN..."
      heading="LPNs"
      emptyMessage="No LPNs found."
      items={lpns.map((lpn) => ({
        key: lpn.lpn,
        label: lpn.lpn,
        href: `/putaway/${lpn.lpn}`,
        // Remaining, not received: a partially put-away or partially rejected
        // pallet has less left to move than it arrived with.
        subtitle: `${lpn.sku} • To put away: ${lpn.remainingQuantity} of ${lpn.receivedQuantity} • Location: ${lpn.location}`,
      }))}
    />
  );
}
