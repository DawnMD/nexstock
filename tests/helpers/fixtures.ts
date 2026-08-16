/**
 * Fixture builders.
 *
 * Every warehouse table hangs off master data and an actor — `createdBy` and
 * friends are real foreign keys onto `User` — so even the smallest test needs a
 * vendor, a SKU, a location and an order line before it can move a single unit.
 * These keep that setup to one line per test.
 */
import { db } from "./db";

/** The user every fixture attributes its writes to. Created once per run. */
export const TEST_USER_ID = "test-actor";

export async function ensureTestUser() {
  await db.user.upsert({
    where: { id: TEST_USER_ID },
    create: {
      id: TEST_USER_ID,
      name: "Test Actor",
      email: "test-actor@nexstock.test",
      emailVerified: true,
    },
    update: {},
  });
  return TEST_USER_ID;
}

export async function createLocation(
  location: string,
  overrides: {
    weightCapacity?: number | null;
    cbm?: number | null;
    status?: boolean;
    zone?: string;
  } = {},
) {
  return await db.location.create({
    data: {
      location,
      zone: overrides.zone ?? "A",
      aisle: "01",
      length: 100,
      width: 100,
      height: 100,
      cbm: overrides.cbm ?? null,
      weightCapacity: overrides.weightCapacity ?? null,
      status: overrides.status ?? true,
      createdBy: TEST_USER_ID,
      updatedBy: TEST_USER_ID,
    },
  });
}

export async function createSku(
  sku: string,
  overrides: { weight?: number | null; cbm?: number | null } = {},
) {
  return await db.sku.create({
    data: {
      sku,
      description: `Description for ${sku}`,
      department: "TEST",
      uom: "EACH",
      weight: overrides.weight ?? null,
      cbm: overrides.cbm ?? null,
      createdBy: TEST_USER_ID,
      updatedBy: TEST_USER_ID,
    },
  });
}

/**
 * A vendor, an order and one line on it — the smallest unit of work anything
 * downstream of receiving needs.
 */
export async function createOrderWithLine(options: {
  orderNumber: string;
  sku: string;
  orderedQuantity: number;
}) {
  const reference = `VEN-${options.orderNumber}`;

  await db.vendor.create({
    data: { name: `Vendor ${reference}`, reference },
  });

  const order = await db.order.create({
    data: {
      orderNumber: options.orderNumber,
      businessUnit: "TEST",
      vendorReference: reference,
      createdBy: TEST_USER_ID,
      updatedBy: TEST_USER_ID,
      items: {
        create: {
          description: `Line for ${options.sku}`,
          department: "TEST",
          orderedQuantity: options.orderedQuantity,
          skuId: options.sku,
        },
      },
    },
    include: { items: true },
  });

  const orderItem = order.items[0];
  if (!orderItem) throw new Error("Fixture order was created without a line");

  return { order, orderItem };
}

export async function createCustomer(reference = "CUST-1") {
  return await db.customer.create({
    data: { name: `Customer ${reference}`, reference, city: "Testville" },
  });
}

/** A customer and a sales order with one line on it. */
export async function createSalesOrderWithLine(options: {
  orderNumber: string;
  sku: string;
  orderedQuantity: number;
  customerReference?: string;
}) {
  const reference = options.customerReference ?? `CUST-${options.orderNumber}`;
  await createCustomer(reference);

  const order = await db.salesOrder.create({
    data: {
      orderNumber: options.orderNumber,
      customerReference: reference,
      createdBy: TEST_USER_ID,
      updatedBy: TEST_USER_ID,
      items: {
        create: {
          sku: options.sku,
          orderedQuantity: options.orderedQuantity,
        },
      },
    },
    include: { items: true },
  });

  const item = order.items[0];
  if (!item) throw new Error("Fixture sales order was created without a line");

  return { order, item };
}

/**
 * Receive a pallet and put it away into storage, which is the state outbound
 * actually starts from — allocation only considers stock that is somewhere it
 * can be picked from.
 */
export async function stockInStorage(options: {
  sku: string;
  lpn: string;
  quantity: number;
  location: string;
  lot?: string;
  lotExpiryDate?: Date | null;
  orderNumber?: string;
}) {
  const { receiveStock } = await import("@/server/services/receiving");
  const { createPutaway } = await import("@/server/services/putaway");

  const orderNumber = options.orderNumber ?? `PO-${options.lpn}`;
  const { orderItem } = await createOrderWithLine({
    orderNumber,
    sku: options.sku,
    orderedQuantity: options.quantity,
  });

  await db.$transaction((tx) =>
    receiveStock(tx, {
      orderItemId: orderItem.id,
      receivedQuantity: options.quantity,
      sku: options.sku,
      location: "STAGE",
      lpn: options.lpn,
      lot: options.lot,
      lotExpiryDate: options.lotExpiryDate ?? null,
      uom: "EACH",
      vehicleNumber: "TRK-1",
      receivedBy: TEST_USER_ID,
    }),
  );

  await db.$transaction((tx) =>
    createPutaway(tx, {
      lpn: options.lpn,
      sku: options.sku,
      quantity: options.quantity,
      fromLocation: "STAGE",
      toLocation: options.location,
      putawayBy: TEST_USER_ID,
    }),
  );

  return orderItem;
}

export async function createDockAndVehicleType() {
  const dock = await db.dock.create({ data: { name: "DOCK-1" } });
  const vehicleType = await db.vehicleType.create({
    data: { type: "Truck", description: "Test truck", unloadTime: "60" },
  });
  return { dock, vehicleType };
}
