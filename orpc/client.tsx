"use client";

// Must be a top-level `import type`: with `verbatimModuleSyntax`, the inline `{ type Router }`
// form still emits a side-effect import, pulling the server-only oRPC root into the client bundle.
import type { Router } from "@/server/api/root";
import { createQueryClient } from "@/orpc/query-client";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { BatchLinkPlugin } from "@orpc/client/plugins";
import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";
import type { RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

let clientQueryClientSingleton: QueryClient | undefined = undefined;
export const getQueryClient = () => {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return createQueryClient();
  }
  // Browser: use singleton pattern to keep the same query client
  clientQueryClientSingleton ??= createQueryClient();

  return clientQueryClientSingleton;
};

const link = new RPCLink({
  // A function rather than a constant: this module is also evaluated during SSR,
  // where `window` does not exist yet. It is only ever called from the browser.
  url: () => `${window.location.origin}/api/rpc`,
  headers: () => ({ "x-orpc-source": "nextjs-react" }),
  plugins: [
    // The client half of `BatchHandlerPlugin` on the route handler. One group
    // matching everything, because every call carries the same session cookie
    // and there is nothing to partition on.
    new BatchLinkPlugin({ groups: [{ condition: () => true, context: {} }] }),
  ],
});

const client: RouterClient<Router> = createORPCClient(link);

/**
 * The query utilities every client component uses.
 *
 * A plain module export rather than React context: the utils only ever produce
 * options objects and keys, so nothing about them is per-render.
 *
 * @example
 * const { data } = useSuspenseQuery(orpc.sku.getSkus.queryOptions({ input: {} }));
 */
export const orpc = createTanstackQueryUtils(client);

/**
 * Inference helper for inputs.
 *
 * @example type CreateSkuInput = RouterInputs['sku']['createSku']
 */
export type RouterInputs = InferRouterInputs<Router>;

/**
 * Inference helper for outputs.
 *
 * @example type SkuRow = RouterOutputs['sku']['getSkus'][number]
 */
export type RouterOutputs = InferRouterOutputs<Router>;

export function ORPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {props.children}
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}
