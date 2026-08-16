import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 30 * 1000,
      },
      mutations: {
        // A failed mutation should never be silent. Individual mutations can
        // still pass their own onError to say something more specific — this is
        // the floor, so nothing disappears without the operator noticing.
        // sonner is a client module and this file is also pulled into the RSC
        // query client, so the import stays inside the browser-only branch.
        onError: async (error) => {
          if (typeof window === "undefined") return;
          const { toast } = await import("sonner");
          toast.error(
            error instanceof Error ? error.message : "Something went wrong",
          );
        },
      },
      dehydrate: {
        // No `serializeData`/`deserializeData` pair: oRPC's RPC protocol carries
        // `Date`, `BigInt`, `Map` and `Set` natively, which is what superjson
        // used to be here for.
        //
        // Dehydrating queries that are still pending is what lets a prefetch
        // stream in rather than blocking the RSC render — pure TanStack Query
        // config, unaffected by the transport.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
    },
  });
