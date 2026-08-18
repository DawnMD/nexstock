"use client";

import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";

import { EntitySearch } from "@/components/entity-search";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { orpc } from "@/orpc/client";

export function ReceiveSkuOrderSearch() {
  const [search, setSearch] = useState("");
  const [term, isPending] = useDebouncedValue(search);
  const { data: orders } = useSuspenseQuery(
    orpc.receive.getAllOrderNumbers.queryOptions({
      // `|| null` rather than the empty string, so the first render asks for the
      // same query key the page prefetched — `{ search: null }` — and the
      // palette hydrates instead of going straight back to the server.
      input: { search: term || null },
    }),
  );

  return (
    <EntitySearch
      search={search}
      onSearchChange={setSearch}
      isPending={isPending}
      placeholder="Scan or search for an order..."
      heading="Order Numbers"
      emptyMessage="No orders found."
      items={orders.map((order) => ({
        key: order.orderNumber,
        label: order.orderNumber,
        href: `/receive/${order.orderNumber}`,
        subtitle: `${order.vendor.name} • ${order._count.items} items`,
      }))}
    />
  );
}
