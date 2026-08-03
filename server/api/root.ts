import { adjustmentsRouter } from "@/server/api/routers/adjustments";
import { inventoryRouter } from "@/server/api/routers/inventory";
import { orderRouter } from "@/server/api/routers/order";
import { putawayRouter } from "@/server/api/routers/putaway";
import { receiveRouter } from "@/server/api/routers/receive";
import { qualityCheckRouter } from "@/server/api/routers/quality-check";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  order: orderRouter,
  qualityCheck: qualityCheckRouter,
  receive: receiveRouter,
  adjustments: adjustmentsRouter,
  putaway: putawayRouter,
  inventory: inventoryRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
