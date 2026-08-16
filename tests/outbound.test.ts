/**
 * The outbound flow: allocate → pick → pack → ship.
 *
 * Every one of these ends by asserting the same drift check the inbound suites
 * do. Outbound was the real test of whether the ledger design held up — stock
 * now leaves the building, not just moves around inside it — and the invariant
 * has to survive that.
 */
import { describe, expect, it } from "vitest";

import {
  MovementReason,
  PickTaskStatus,
  SalesOrderItemStatus,
  SalesOrderStatus,
} from "@/generated/prisma/client";
import {
  allocateSalesOrder,
  cancelAllocation,
} from "@/server/services/allocation";
import {
  confirmPick,
  confirmShipment,
  DISPATCH_LOCATION,
  packCarton,
  reversePick,
} from "@/server/services/picking";
import { createSalesOrder } from "@/server/services/sales-orders";

import { db, findDrift } from "./helpers/db";
import {
  createCustomer,
  createLocation,
  createSalesOrderWithLine,
  createSku,
  stockInStorage,
  TEST_USER_ID,
} from "./helpers/fixtures";

/** Storage racks plus the two bays every flow needs. */
async function warehouse() {
  await createLocation("STAGE");
  await createLocation(DISPATCH_LOCATION);
  await createLocation("A-01");
  await createLocation("A-02");
}

const allocate = (orderNumber: string) =>
  db.$transaction((tx) => allocateSalesOrder(tx, { orderNumber }));

const pick = (pickTaskId: number, pickedQuantity: number) =>
  db.$transaction((tx) =>
    confirmPick(tx, { pickTaskId, pickedQuantity, pickedBy: TEST_USER_ID }),
  );

describe("allocateSalesOrder", () => {
  it("reserves stock without moving any of it", async () => {
    await createSku("SKU-1");
    await warehouse();
    await stockInStorage({
      sku: "SKU-1",
      lpn: "LPN-A",
      quantity: 20,
      location: "A-01",
    });
    const { item } = await createSalesOrderWithLine({
      orderNumber: "SO-1",
      sku: "SKU-1",
      orderedQuantity: 12,
    });

    await allocate("SO-1");

    const tasks = await db.pickTask.findMany({ where: { orderId: "SO-1" } });
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.quantity).toBe(12);
    expect(tasks[0]?.fromLocation).toBe("A-01");

    const line = await db.salesOrderItem.findUniqueOrThrow({
      where: { id: item.id },
    });
    expect(line.allocatedQuantity).toBe(12);
    expect(line.status).toBe(SalesOrderItemStatus.ALLOCATED);

    // Allocation is a promise, not a movement: the stock is still in its rack.
    const balance = await db.inventoryBalance.findFirstOrThrow({
      where: { location: "A-01" },
    });
    expect(balance.quantity).toBe(20);
    expect(
      await db.inventoryMovement.count({
        where: { reason: MovementReason.PICK_OUT },
      }),
    ).toBe(0);

    const order = await db.salesOrder.findUniqueOrThrow({
      where: { orderNumber: "SO-1" },
    });
    expect(order.status).toBe(SalesOrderStatus.ALLOCATED);
  });

  it("spans pallets when one cannot fill the line", async () => {
    await createSku("SKU-1");
    await warehouse();
    await stockInStorage({
      sku: "SKU-1",
      lpn: "LPN-A",
      quantity: 5,
      location: "A-01",
    });
    await stockInStorage({
      sku: "SKU-1",
      lpn: "LPN-B",
      quantity: 10,
      location: "A-02",
    });

    await createSalesOrderWithLine({
      orderNumber: "SO-1",
      sku: "SKU-1",
      orderedQuantity: 12,
    });
    await allocate("SO-1");

    const tasks = await db.pickTask.findMany({
      where: { orderId: "SO-1" },
      orderBy: { id: "asc" },
    });
    expect(tasks).toHaveLength(2);
    expect(tasks.reduce((sum, task) => sum + task.quantity, 0)).toBe(12);
  });

  /**
   * FEFO. Dated stock is the reason `ReceiveItem.lotExpiryDate` is recorded, and
   * until now nothing read it.
   */
  it("takes the pallet that expires soonest first", async () => {
    await createSku("SKU-1");
    await warehouse();

    // Received in the opposite order to their expiry, so FIFO alone would pick
    // the wrong one.
    await stockInStorage({
      sku: "SKU-1",
      lpn: "LPN-LATE",
      quantity: 10,
      location: "A-01",
      lot: "LOT-LATE",
      lotExpiryDate: new Date("2027-01-01"),
    });
    await stockInStorage({
      sku: "SKU-1",
      lpn: "LPN-SOON",
      quantity: 10,
      location: "A-02",
      lot: "LOT-SOON",
      lotExpiryDate: new Date("2026-01-01"),
    });

    await createSalesOrderWithLine({
      orderNumber: "SO-1",
      sku: "SKU-1",
      orderedQuantity: 10,
    });
    await allocate("SO-1");

    const tasks = await db.pickTask.findMany({ where: { orderId: "SO-1" } });
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.lpn).toBe("LPN-SOON");
  });

  it("does not promise the same stock to two orders", async () => {
    await createSku("SKU-1");
    await warehouse();
    await stockInStorage({
      sku: "SKU-1",
      lpn: "LPN-A",
      quantity: 10,
      location: "A-01",
    });

    await createSalesOrderWithLine({
      orderNumber: "SO-1",
      sku: "SKU-1",
      orderedQuantity: 8,
    });
    await createSalesOrderWithLine({
      orderNumber: "SO-2",
      sku: "SKU-1",
      orderedQuantity: 8,
    });

    await allocate("SO-1");
    await allocate("SO-2");

    // The balance never moved, so without counting open reservations the second
    // order would be promised the same eight units.
    const first = await db.pickTask.findMany({ where: { orderId: "SO-1" } });
    const second = await db.pickTask.findMany({ where: { orderId: "SO-2" } });

    expect(first.reduce((n, t) => n + t.quantity, 0)).toBe(8);
    expect(second.reduce((n, t) => n + t.quantity, 0)).toBe(2);
  });

  it("marks a line SHORT when there is not enough to go round", async () => {
    await createSku("SKU-1");
    await warehouse();
    await stockInStorage({
      sku: "SKU-1",
      lpn: "LPN-A",
      quantity: 3,
      location: "A-01",
    });
    const { item } = await createSalesOrderWithLine({
      orderNumber: "SO-1",
      sku: "SKU-1",
      orderedQuantity: 10,
    });

    await allocate("SO-1");

    const line = await db.salesOrderItem.findUniqueOrThrow({
      where: { id: item.id },
    });
    expect(line.allocatedQuantity).toBe(3);
    expect(line.status).toBe(SalesOrderItemStatus.SHORT);
  });

  it("ignores stock in an inactive location", async () => {
    await createSku("SKU-1");
    await warehouse();
    await stockInStorage({
      sku: "SKU-1",
      lpn: "LPN-A",
      quantity: 10,
      location: "A-01",
    });
    await db.location.update({
      where: { location: "A-01" },
      data: { status: false },
    });

    await createSalesOrderWithLine({
      orderNumber: "SO-1",
      sku: "SKU-1",
      orderedQuantity: 5,
    });
    await allocate("SO-1");

    expect(await db.pickTask.count({ where: { orderId: "SO-1" } })).toBe(0);
  });

  it("frees the reservation when an allocation is cancelled", async () => {
    await createSku("SKU-1");
    await warehouse();
    await stockInStorage({
      sku: "SKU-1",
      lpn: "LPN-A",
      quantity: 10,
      location: "A-01",
    });
    const { item } = await createSalesOrderWithLine({
      orderNumber: "SO-1",
      sku: "SKU-1",
      orderedQuantity: 6,
    });

    await allocate("SO-1");
    await db.$transaction((tx) => cancelAllocation(tx, "SO-1"));

    const line = await db.salesOrderItem.findUniqueOrThrow({
      where: { id: item.id },
    });
    expect(line.allocatedQuantity).toBe(0);
    expect(line.status).toBe(SalesOrderItemStatus.PENDING);

    // And the stock is available again.
    await createSalesOrderWithLine({
      orderNumber: "SO-2",
      sku: "SKU-1",
      orderedQuantity: 10,
    });
    await allocate("SO-2");
    expect(
      (await db.pickTask.findMany({ where: { orderId: "SO-2" } })).reduce(
        (n, t) => n + t.quantity,
        0,
      ),
    ).toBe(10);
  });
});

describe("confirmPick", () => {
  it("moves stock to the dispatch bay as a net-zero pair", async () => {
    await createSku("SKU-1");
    await warehouse();
    await stockInStorage({
      sku: "SKU-1",
      lpn: "LPN-A",
      quantity: 20,
      location: "A-01",
    });
    const { item } = await createSalesOrderWithLine({
      orderNumber: "SO-1",
      sku: "SKU-1",
      orderedQuantity: 12,
    });

    await allocate("SO-1");
    const task = await db.pickTask.findFirstOrThrow({
      where: { orderId: "SO-1" },
    });
    await pick(task.id, 12);

    const balances = await db.inventoryBalance.findMany({
      where: { quantity: { gt: 0 } },
      select: { location: true, quantity: true },
      orderBy: { location: "asc" },
    });
    expect(balances).toEqual([
      { location: "A-01", quantity: 8 },
      { location: DISPATCH_LOCATION, quantity: 12 },
    ]);

    const line = await db.salesOrderItem.findUniqueOrThrow({
      where: { id: item.id },
    });
    expect(line.pickedQuantity).toBe(12);
    expect(line.allocatedQuantity).toBe(0);
    expect(line.status).toBe(SalesOrderItemStatus.PICKED);

    // A pick relocates stock; it does not consume it.
    const picks = await db.inventoryMovement.findMany({
      where: {
        reason: { in: [MovementReason.PICK_OUT, MovementReason.PICK_IN] },
      },
    });
    expect(picks.reduce((sum, m) => sum + m.quantity, 0)).toBe(0);
    expect(await findDrift()).toEqual([]);
  });

  it("records a short pick and leaves the line short", async () => {
    await createSku("SKU-1");
    await warehouse();
    await stockInStorage({
      sku: "SKU-1",
      lpn: "LPN-A",
      quantity: 10,
      location: "A-01",
    });
    const { item } = await createSalesOrderWithLine({
      orderNumber: "SO-1",
      sku: "SKU-1",
      orderedQuantity: 10,
    });

    await allocate("SO-1");
    const task = await db.pickTask.findFirstOrThrow({
      where: { orderId: "SO-1" },
    });
    await pick(task.id, 4);

    const line = await db.salesOrderItem.findUniqueOrThrow({
      where: { id: item.id },
    });
    expect(line.pickedQuantity).toBe(4);
    // The reservation is discharged either way — the missing six are no longer
    // promised to this order.
    expect(line.allocatedQuantity).toBe(0);
    expect(line.status).toBe(SalesOrderItemStatus.SHORT);
    expect(await findDrift()).toEqual([]);
  });

  it("refuses to pick more than was allocated, or to pick twice", async () => {
    await createSku("SKU-1");
    await warehouse();
    await stockInStorage({
      sku: "SKU-1",
      lpn: "LPN-A",
      quantity: 20,
      location: "A-01",
    });
    await createSalesOrderWithLine({
      orderNumber: "SO-1",
      sku: "SKU-1",
      orderedQuantity: 5,
    });

    await allocate("SO-1");
    const task = await db.pickTask.findFirstOrThrow({
      where: { orderId: "SO-1" },
    });

    await expect(pick(task.id, 6)).rejects.toThrow(
      /Cannot pick more than was allocated/,
    );

    await pick(task.id, 5);
    await expect(pick(task.id, 5)).rejects.toThrow(/already picked/);
  });

  /**
   * Allocation reads a balance and reserves against it; the rack can be drawn
   * down by a QC rejection or an adjustment before the picker gets there.
   */
  it("refuses to pick stock that has left the rack since allocation", async () => {
    await createSku("SKU-1");
    await warehouse();
    await stockInStorage({
      sku: "SKU-1",
      lpn: "LPN-A",
      quantity: 10,
      location: "A-01",
    });
    await createSalesOrderWithLine({
      orderNumber: "SO-1",
      sku: "SKU-1",
      orderedQuantity: 10,
    });
    await allocate("SO-1");

    // Someone moves the pallet elsewhere in the meantime.
    const { createPutaway } = await import("@/server/services/putaway");
    await db.$transaction((tx) =>
      createPutaway(tx, {
        lpn: "LPN-A",
        sku: "SKU-1",
        quantity: 10,
        fromLocation: "A-01",
        toLocation: "A-02",
        putawayBy: TEST_USER_ID,
      }),
    );

    const task = await db.pickTask.findFirstOrThrow({
      where: { orderId: "SO-1" },
    });
    await expect(pick(task.id, 10)).rejects.toThrow(
      /Only 0 units of SKU-1 are in A-01/,
    );
  });

  it("sends the units back when a pick is reversed", async () => {
    await createSku("SKU-1");
    await warehouse();
    await stockInStorage({
      sku: "SKU-1",
      lpn: "LPN-A",
      quantity: 10,
      location: "A-01",
    });
    const { item } = await createSalesOrderWithLine({
      orderNumber: "SO-1",
      sku: "SKU-1",
      orderedQuantity: 6,
    });

    await allocate("SO-1");
    const task = await db.pickTask.findFirstOrThrow({
      where: { orderId: "SO-1" },
    });
    await pick(task.id, 6);
    await db.$transaction((tx) =>
      reversePick(tx, { pickTaskId: task.id, reversedBy: TEST_USER_ID }),
    );

    const balances = await db.inventoryBalance.findMany({
      where: { quantity: { gt: 0 } },
      select: { location: true, quantity: true },
    });
    expect(balances).toEqual([{ location: "A-01", quantity: 10 }]);

    const restored = await db.pickTask.findUniqueOrThrow({
      where: { id: task.id },
    });
    // Back on the worklist with its reservation intact — the work still needs
    // doing.
    expect(restored.status).toBe(PickTaskStatus.PENDING);
    expect(restored.pickedQuantity).toBe(0);

    const line = await db.salesOrderItem.findUniqueOrThrow({
      where: { id: item.id },
    });
    expect(line.pickedQuantity).toBe(0);
    expect(line.allocatedQuantity).toBe(6);

    // The ledger keeps both sides of the story.
    expect(
      await db.inventoryMovement.count({
        where: { reason: MovementReason.PICK_REVERSAL },
      }),
    ).toBe(2);
    expect(await findDrift()).toEqual([]);
  });
});

describe("packCarton and confirmShipment", () => {
  async function pickedOrder(quantity = 10) {
    await createSku("SKU-1");
    await warehouse();
    await stockInStorage({
      sku: "SKU-1",
      lpn: "LPN-A",
      quantity,
      location: "A-01",
    });
    const { item } = await createSalesOrderWithLine({
      orderNumber: "SO-1",
      sku: "SKU-1",
      orderedQuantity: quantity,
    });

    await allocate("SO-1");
    const task = await db.pickTask.findFirstOrThrow({
      where: { orderId: "SO-1" },
    });
    await pick(task.id, quantity);

    return { item, task };
  }

  it("packs picked lines without moving any stock", async () => {
    const { task } = await pickedOrder();

    const before = await db.inventoryMovement.count();
    const carton = await db.$transaction((tx) =>
      packCarton(tx, {
        cartonNumber: "CTN-1",
        pickTaskIds: [task.id],
        weight: 12.5,
        packedBy: TEST_USER_ID,
      }),
    );

    // A carton says how stock is boxed, not where it is — the units are already
    // in the dispatch bay, so a movement here would double-count them.
    expect(await db.inventoryMovement.count()).toBe(before);
    expect(
      (await db.pickTask.findUniqueOrThrow({ where: { id: task.id } }))
        .cartonId,
    ).toBe(carton.id);
  });

  it("refuses to pack an unpicked line or to reuse a carton number", async () => {
    const { task } = await pickedOrder();

    await db.$transaction((tx) =>
      packCarton(tx, {
        cartonNumber: "CTN-1",
        pickTaskIds: [task.id],
        packedBy: TEST_USER_ID,
      }),
    );

    await expect(
      db.$transaction((tx) =>
        packCarton(tx, {
          cartonNumber: "CTN-1",
          pickTaskIds: [task.id],
          packedBy: TEST_USER_ID,
        }),
      ),
    ).rejects.toThrow(/already exists/);

    await expect(
      db.$transaction((tx) =>
        packCarton(tx, {
          cartonNumber: "CTN-2",
          pickTaskIds: [task.id],
          packedBy: TEST_USER_ID,
        }),
      ),
    ).rejects.toThrow(/already in a carton/);
  });

  it("takes stock out of the warehouse on shipment", async () => {
    const { item, task } = await pickedOrder(10);

    const carton = await db.$transaction((tx) =>
      packCarton(tx, {
        cartonNumber: "CTN-1",
        pickTaskIds: [task.id],
        packedBy: TEST_USER_ID,
      }),
    );

    await db.$transaction((tx) =>
      confirmShipment(tx, {
        shipmentNumber: "SHP-1",
        orderNumber: "SO-1",
        carrier: "Test Carrier",
        trackingNumber: "TRACK-1",
        cartonIds: [carton.id],
        shippedBy: TEST_USER_ID,
      }),
    );

    // The only operation in the system that reduces stock without a write-off.
    expect(
      await db.inventoryBalance.count({ where: { quantity: { gt: 0 } } }),
    ).toBe(0);

    const line = await db.salesOrderItem.findUniqueOrThrow({
      where: { id: item.id },
    });
    expect(line.shippedQuantity).toBe(10);
    expect(line.status).toBe(SalesOrderItemStatus.SHIPPED);

    const order = await db.salesOrder.findUniqueOrThrow({
      where: { orderNumber: "SO-1" },
    });
    expect(order.status).toBe(SalesOrderStatus.SHIPPED);

    expect(await findDrift()).toEqual([]);
  });

  it("refuses to ship a carton twice or one belonging to another order", async () => {
    const { task } = await pickedOrder(10);
    const carton = await db.$transaction((tx) =>
      packCarton(tx, {
        cartonNumber: "CTN-1",
        pickTaskIds: [task.id],
        packedBy: TEST_USER_ID,
      }),
    );

    await db.$transaction((tx) =>
      confirmShipment(tx, {
        shipmentNumber: "SHP-1",
        orderNumber: "SO-1",
        carrier: "Test Carrier",
        cartonIds: [carton.id],
        shippedBy: TEST_USER_ID,
      }),
    );

    await expect(
      db.$transaction((tx) =>
        confirmShipment(tx, {
          shipmentNumber: "SHP-2",
          orderNumber: "SO-1",
          carrier: "Test Carrier",
          cartonIds: [carton.id],
          shippedBy: TEST_USER_ID,
        }),
      ),
    ).rejects.toThrow(/already shipped/);

    await createCustomer("CUST-OTHER");
    await db.salesOrder.create({
      data: {
        orderNumber: "SO-OTHER",
        customerReference: "CUST-OTHER",
        createdBy: TEST_USER_ID,
        updatedBy: TEST_USER_ID,
      },
    });

    await expect(
      db.$transaction((tx) =>
        confirmShipment(tx, {
          shipmentNumber: "SHP-3",
          orderNumber: "SO-OTHER",
          carrier: "Test Carrier",
          cartonIds: [carton.id],
          shippedBy: TEST_USER_ID,
        }),
      ),
    ).rejects.toThrow(/already shipped|holds stock for order/);
  });

  it("refuses to reverse a pick that has been packed", async () => {
    const { task } = await pickedOrder();
    await db.$transaction((tx) =>
      packCarton(tx, {
        cartonNumber: "CTN-1",
        pickTaskIds: [task.id],
        packedBy: TEST_USER_ID,
      }),
    );

    await expect(
      db.$transaction((tx) =>
        reversePick(tx, { pickTaskId: task.id, reversedBy: TEST_USER_ID }),
      ),
    ).rejects.toThrow(/packed into a carton/);
  });
});

describe("createSalesOrder", () => {
  it("validates the customer, the SKUs and the quantities", async () => {
    await createSku("SKU-1");
    await createCustomer("CUST-1");

    await expect(
      db.$transaction((tx) =>
        createSalesOrder(tx, {
          orderNumber: "SO-1",
          customerReference: "NOPE",
          lines: [{ sku: "SKU-1", orderedQuantity: 1 }],
          createdBy: TEST_USER_ID,
        }),
      ),
    ).rejects.toThrow(/Customer NOPE not found/);

    await expect(
      db.$transaction((tx) =>
        createSalesOrder(tx, {
          orderNumber: "SO-1",
          customerReference: "CUST-1",
          lines: [{ sku: "SKU-NOPE", orderedQuantity: 1 }],
          createdBy: TEST_USER_ID,
        }),
      ),
    ).rejects.toThrow(/SKU SKU-NOPE not found/);

    const order = await db.$transaction((tx) =>
      createSalesOrder(tx, {
        orderNumber: "SO-1",
        customerReference: "CUST-1",
        lines: [{ sku: "SKU-1", orderedQuantity: 4 }],
        createdBy: TEST_USER_ID,
      }),
    );
    expect(order.items).toHaveLength(1);

    await expect(
      db.$transaction((tx) =>
        createSalesOrder(tx, {
          orderNumber: "SO-1",
          customerReference: "CUST-1",
          lines: [{ sku: "SKU-1", orderedQuantity: 1 }],
          createdBy: TEST_USER_ID,
        }),
      ),
    ).rejects.toThrow(/already exists/);
  });

  it("refuses a retired SKU", async () => {
    await createSku("SKU-1");
    await createCustomer("CUST-1");
    await db.sku.update({
      where: { sku: "SKU-1" },
      data: { isActive: false },
    });

    await expect(
      db.$transaction((tx) =>
        createSalesOrder(tx, {
          orderNumber: "SO-1",
          customerReference: "CUST-1",
          lines: [{ sku: "SKU-1", orderedQuantity: 1 }],
          createdBy: TEST_USER_ID,
        }),
      ),
    ).rejects.toThrow(/is not active/);
  });
});
