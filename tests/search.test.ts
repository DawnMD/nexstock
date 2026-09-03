/**
 * Scanner/search worklists stay bounded without hiding an exact old barcode.
 */
import { createRouterClient } from "@orpc/server";
import { describe, expect, it } from "vitest";

import type { Context } from "@/server/api/context";
import { router } from "@/server/api/root";

import { db } from "./helpers/db";
import {
  createLocation,
  createOrderWithLine,
  createSku,
  TEST_USER_ID,
} from "./helpers/fixtures";

const caller = createRouterClient(router, {
  context: (): Context => ({
    db: db as unknown as Context["db"],
    session: null,
    userId: TEST_USER_ID,
    headers: new Headers(),
  }),
});

describe("scanner search worklists", () => {
  it("caps purchase orders while retaining an exact old barcode", async () => {
    await createSku("SKU-SEARCH");
    await createOrderWithLine({
      orderNumber: "ORD-SCAN",
      sku: "SKU-SEARCH",
      orderedQuantity: 1,
    });
    await db.order.update({
      where: { orderNumber: "ORD-SCAN" },
      data: { createdAt: new Date("2000-01-01T00:00:00.000Z") },
    });

    // All 50 newer rows contain the exact order's number. A plain
    // `orderBy createdAt desc, take: 50` therefore drops ORD-SCAN.
    for (let index = 0; index < 50; index += 1) {
      await createOrderWithLine({
        orderNumber: `ORD-SCAN-${String(index).padStart(2, "0")}`,
        sku: "SKU-SEARCH",
        orderedQuantity: 1,
      });
    }

    const [receiving, quality] = await Promise.all([
      caller.receive.getAllOrderNumbers({ search: "ord-scan" }),
      caller.qualityCheck.getAllOrderNumbers({ search: "ord-scan" }),
    ]);

    expect(receiving).toHaveLength(50);
    expect(quality).toHaveLength(50);
    expect(receiving[0]?.orderNumber).toBe("ORD-SCAN");
    expect(quality[0]?.orderNumber).toBe("ORD-SCAN");
  });

  it("caps active location suggestions and searches beyond the first page", async () => {
    for (let index = 0; index < 55; index += 1) {
      await createLocation(`RACK-${String(index).padStart(2, "0")}`);
    }
    await createLocation("CLOSED-RACK", { status: false });

    const firstPage = await caller.putaway.getLocations({ search: null });
    const lateRack = await caller.putaway.getLocations({ search: "rack-54" });
    const inactiveRack = await caller.putaway.getLocations({
      search: "closed-rack",
    });

    expect(firstPage).toHaveLength(50);
    expect(lateRack.map((location) => location.location)).toEqual(["RACK-54"]);
    expect(inactiveRack).toEqual([]);
  });
});
