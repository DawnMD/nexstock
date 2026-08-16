import "server-only";

import { createQueryClient } from "@/orpc/query-client";
import { createContext } from "@/server/api/context";
import { router, type Router } from "@/server/api/root";
import { createRouterClient, type RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import {
  dehydrate,
  HydrationBoundary,
  type FetchQueryOptions,
} from "@tanstack/react-query";
import { headers } from "next/headers";
import { cache } from "react";

/**
 * The request's context, memoised by React `cache()` so the session lookup
 * happens once per render pass however many procedures a page calls.
 */
const getContext = cache(async () =>
  createContext(new Headers(await headers())),
);

/**
 * A direct, in-process client: no HTTP hop and no serialization round trip.
 *
 * `context` is passed as a function rather than a value, so it is resolved
 * inside the request scope on each call — which is what makes a module-level
 * client safe here despite `headers()` being request-bound.
 */
export const serverClient: RouterClient<Router> = createRouterClient(router, {
  context: () => getContext(),
});

/**
 * Key compatibility is what makes hydration work, and it is load-bearing:
 * `createTanstackQueryUtils` derives query keys from the procedure path and the
 * input only, never from the client it was handed. So the keys produced here
 * match the ones `orpc/client.tsx` produces in the browser and a prefetched
 * query is found rather than refetched. Neither side may pass a `path` option
 * that the other does not.
 */
export const serverOrpc = createTanstackQueryUtils(serverClient);

export const getQueryClient = cache(createQueryClient);

/**
 * Hands whatever has been prefetched on this request to the client below it.
 *
 * Pending queries are included (see `shouldDehydrateQuery` in
 * `orpc/query-client.ts`), so a `prefetch` that has not resolved yet streams in
 * rather than blocking the RSC render. Put the `<Suspense>` boundary *inside*
 * this one — that ordering is what lets a pending query stream.
 */
export function HydrateClient(props: { children: React.ReactNode }) {
  return (
    <HydrationBoundary state={dehydrate(getQueryClient())}>
      {props.children}
    </HydrationBoundary>
  );
}

/** Start a query on the server without awaiting it. */
export function prefetch<T extends FetchQueryOptions>(options: T) {
  void getQueryClient().prefetchQuery(options);
}

/**
 * Prefetch and read, in one query.
 *
 * For the pages that need a value on the server — a `notFound()` guard, a
 * header, a prop — *and* want the client below them to hydrate rather than
 * refetch. Calling the router client directly does not populate the cache, so
 * doing both used to mean running the same query twice per request.
 */
export function fetchQuery<TData>(
  options: FetchQueryOptions<TData>,
): Promise<TData> {
  return getQueryClient().fetchQuery(options);
}
