import type { QueryClient, QueryKey } from "@tanstack/react-query";

/**
 * The cache-editing half of an optimistic mutation.
 *
 * Deliberately narrow. Most of this app's mutations return quantities the
 * server works out under a transaction — what an allocation actually reserves,
 * what a pick actually took — and guessing those would show an operator a
 * number that silently corrects itself a moment later. That is worse in a
 * warehouse than a spinner. These helpers are for the handful of writes where
 * the input fully determines the new row and no stock ledger is involved:
 * the SKU and location catalogues, and undoing a quality check.
 *
 * The key passed in is a **partial** one (`orpc.sku.getSkus.key()`), so every
 * cached search variant is updated rather than only the one on screen.
 */

type Snapshot = [QueryKey, unknown][];

export async function applyOptimisticList<TRow>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  update: (rows: TRow[]) => TRow[],
): Promise<Snapshot> {
  // In-flight refetches would land after the edit and undo it.
  await queryClient.cancelQueries({ queryKey });

  const snapshot = queryClient.getQueriesData({ queryKey });

  queryClient.setQueriesData<TRow[]>({ queryKey }, (rows) =>
    rows === undefined ? rows : update(rows),
  );

  return snapshot;
}

/** Put back exactly what was there, for `onError`. */
export function rollbackOptimistic(
  queryClient: QueryClient,
  snapshot: Snapshot | undefined,
) {
  if (!snapshot) return;

  for (const [queryKey, data] of snapshot) {
    queryClient.setQueryData(queryKey, data);
  }
}
