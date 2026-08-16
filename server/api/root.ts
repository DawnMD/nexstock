import { adjustmentsRouter } from "@/server/api/routers/adjustments";
import { inventoryRouter } from "@/server/api/routers/inventory";
import { locationRouter } from "@/server/api/routers/location";
import { orderRouter } from "@/server/api/routers/order";
import { outboundRouter } from "@/server/api/routers/outbound";
import { putawayRouter } from "@/server/api/routers/putaway";
import { reportsRouter } from "@/server/api/routers/reports";
import { receiveRouter } from "@/server/api/routers/receive";
import { skuRouter } from "@/server/api/routers/sku";
import { qualityCheckRouter } from "@/server/api/routers/quality-check";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here. In oRPC a
 * router is a plain object, so there is no builder call wrapping this.
 */
export const router = {
  order: orderRouter,
  qualityCheck: qualityCheckRouter,
  receive: receiveRouter,
  adjustments: adjustmentsRouter,
  putaway: putawayRouter,
  inventory: inventoryRouter,
  location: locationRouter,
  sku: skuRouter,
  outbound: outboundRouter,
  reports: reportsRouter,
};

// export type definition of API
export type Router = typeof router;
