import "server-only";

import { applyAdjustmentBatch } from "./adjustments";
import { MovementReason, MovementRefType, recordMovement } from "./inventory";
import type {
  Prisma,
  PrismaClient,
  Vendor,
} from "../../generated/prisma/client";
import {
  ActivityType,
  AdjustmentType,
  OrderItemStatus,
  OrderStatus,
  OrderType,
  PaymentStatus,
} from "../../generated/prisma/client";
import { allocateSalesOrder } from "./allocation";
import { confirmPick, confirmShipment, packCarton } from "./picking";
import { createPutaway } from "./putaway";
import { createSalesOrder } from "./sales-orders";

const DEMO_RESET_LOCK_ID = 1_318_418_427;

export class DemoResetInProgressError extends Error {
  constructor() {
    super("Another demo reset is already running.");
    this.name = "DemoResetInProgressError";
  }
}

export interface DemoResetCounts {
  vendors: number;
  skus: number;
  docks: number;
  vehicleTypes: number;
  locations: number;
  orders: number;
  dockBookings: number;
  dockActivities: number;
  receiveItems: number;
  putaways: number;
  adjustments: number;
  salesOrders: number;
  pickTasks: number;
  shipments: number;
  inventoryMovements: number;
  inventoryBalances: number;
}

export interface DemoResetResult {
  resetAt: string;
  counts: DemoResetCounts;
}

interface ResetOptions {
  actorId: string;
  /** Test seam used to prove a failed seed rolls the destructive clear back. */
  afterClear?: (tx: Prisma.TransactionClient) => Promise<void>;
}

// Inbound staging bay. Receiving drops stock here and putaway moves it out, so
// this location has to exist for the ReceiveItem.location foreign key to hold.
const STAGING_LOCATION = "STAGE";
// Outbound counterpart of STAGE: picked stock waits here for its truck, and
// shipping is what finally takes it out. PickTask and the SHIP movements both
// point at it, so it has to exist before anything can be picked.
const DISPATCH_LOCATION = "DISPATCH";

// Helper functions for generating realistic data
const businessUnits = [
  "Electronics Division",
  "Apparel Division",
  "Furniture Division",
  "Kitchenware Division",
  "Sports Division",
  "Automotive Division",
  "Home & Garden",
  "Beauty & Health",
  "Toys & Games",
  "Books & Media",
];

const paymentStatuses = [
  PaymentStatus.PAID,
  PaymentStatus.PENDING,
  PaymentStatus.NOT_PAID,
];
const cities = [
  "New York",
  "Los Angeles",
  "Chicago",
  "Houston",
  "Phoenix",
  "Philadelphia",
  "San Antonio",
  "San Diego",
  "Dallas",
  "San Jose",
  "Austin",
  "Jacksonville",
  "Fort Worth",
  "Columbus",
  "Charlotte",
  "San Francisco",
  "Indianapolis",
  "Seattle",
  "Denver",
  "Washington",
  "Boston",
  "El Paso",
  "Nashville",
  "Detroit",
  "Oklahoma City",
  "Portland",
  "Las Vegas",
  "Memphis",
  "Louisville",
];

const buyerNames = [
  "Alice Johnson",
  "Bob Smith",
  "Carol Davis",
  "David Wilson",
  "Eva Brown",
  "Frank Miller",
  "Grace Lee",
  "Henry Taylor",
  "Ivy Chen",
  "Jack Anderson",
  "Kate Williams",
  "Liam Martinez",
  "Mia Garcia",
  "Noah Rodriguez",
  "Olivia Lopez",
  "Paul Gonzalez",
  "Quinn Perez",
  "Rachel Torres",
  "Sam Flores",
  "Tina Rivera",
  "Uma Patel",
  "Victor Singh",
  "Wendy Kumar",
  "Xavier Sharma",
  "Yara Gupta",
  "Zoe Kim",
  "Adam Park",
  "Bella Choi",
  "Carlos Silva",
  "Diana Santos",
];

const notes = [
  "Priority order for summer collection",
  "Electronics inventory restock",
  "Office furniture for new branch",
  "Additional furniture items",
  "Smart devices for tech department",
  "Athletic footwear collection",
  "Kitchen equipment for restaurant",
  "Additional kitchen appliances",
  "Fitness equipment for gym",
  "Sports accessories and equipment",
  "Seasonal inventory update",
  "Bulk order for retail stores",
  "Replacement parts order",
  "New product line launch",
  "Warehouse restocking",
  "Customer return processing",
  "Quality control replacement",
  "Emergency order for damaged goods",
  "Holiday season preparation",
  "Year-end inventory clearance",
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]!;
}

function getRandomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
}

function generateVendorName(_index: number): string {
  const prefixes = [
    "Global",
    "Premium",
    "Elite",
    "Standard",
    "Quality",
    "Best",
    "Top",
    "Prime",
    "Select",
    "Choice",
  ];
  const suffixes = [
    "Suppliers",
    "Trading",
    "Import",
    "Export",
    "Manufacturing",
    "Distributors",
    "Corporation",
    "Enterprises",
    "Industries",
    "Solutions",
  ];
  const prefix = getRandomElement(prefixes);
  const suffix = getRandomElement(suffixes);
  return `${prefix} ${suffix}`;
}

function generateVendorReference(): string {
  return (Math.floor(Math.random() * 9000000000) + 1000000000).toString();
}

// Add SKU-specific helper data
const finishedGoods = [
  {
    sku: "FG-CHAIR-001",
    description: "Executive Office Chair",
    weight: 15.5,
    length: 60,
    width: 60,
    height: 120,
    cbm: 0.432,
    uom: "EA",
    qualityCheck: true,
    hasShelfLife: false,
    department: "Furniture",
    storageType: "AMBIENT",
    storageZone: "FG-A1",
  },
  {
    sku: "FG-DESK-001",
    description: "Standing Desk",
    weight: 45.0,
    length: 140,
    width: 70,
    height: 75,
    cbm: 0.735,
    uom: "EA",
    qualityCheck: true,
    hasShelfLife: false,
    department: "Furniture",
    storageType: "AMBIENT",
    storageZone: "FG-A2",
  },
  {
    sku: "FG-LAMP-001",
    description: "LED Desk Lamp",
    weight: 2.5,
    length: 20,
    width: 15,
    height: 45,
    cbm: 0.0135,
    uom: "EA",
    qualityCheck: true,
    hasShelfLife: false,
    department: "Electronics",
    storageType: "AMBIENT",
    storageZone: "FG-B1",
  },
  {
    sku: "FG-SHELF-001",
    description: "Bookshelf",
    weight: 35.0,
    length: 80,
    width: 30,
    height: 180,
    cbm: 0.432,
    uom: "EA",
    qualityCheck: true,
    hasShelfLife: false,
    department: "Furniture",
    storageType: "AMBIENT",
    storageZone: "FG-A3",
  },
  {
    sku: "FG-TABLE-001",
    description: "Coffee Table",
    weight: 25.0,
    length: 100,
    width: 60,
    height: 45,
    cbm: 0.27,
    uom: "EA",
    qualityCheck: true,
    hasShelfLife: false,
    department: "Furniture",
    storageType: "AMBIENT",
    storageZone: "FG-A4",
  },
];

const consumables = [
  {
    sku: "CS-PAINT-001",
    description: "Wall Paint",
    weight: 5.0,
    length: 20,
    width: 20,
    height: 30,
    cbm: 0.012,
    uom: "EA",
    qualityCheck: true,
    hasShelfLife: true,
    shelfLifeDays: 730,
    department: "Home & Garden",
    storageType: "AMBIENT",
    storageZone: "CS-C1",
  },
  {
    sku: "CS-GLUE-001",
    description: "Wood Glue",
    weight: 1.0,
    length: 10,
    width: 10,
    height: 20,
    cbm: 0.002,
    uom: "EA",
    qualityCheck: true,
    hasShelfLife: true,
    shelfLifeDays: 365,
    department: "Tools & Hardware",
    storageType: "AMBIENT",
    storageZone: "CS-C2",
  },
  {
    sku: "CS-CLEAN-001",
    description: "Surface Cleaner",
    weight: 2.0,
    length: 15,
    width: 15,
    height: 25,
    cbm: 0.005625,
    uom: "EA",
    qualityCheck: true,
    hasShelfLife: true,
    shelfLifeDays: 548, // 1.5 years
    department: "Home & Garden",
    storageType: "AMBIENT",
    storageZone: "CS-C3",
  },
  {
    sku: "CS-OIL-001",
    description: "Lubricating Oil",
    weight: 0.5,
    length: 8,
    width: 8,
    height: 15,
    cbm: 0.00096,
    uom: "EA",
    qualityCheck: true,
    hasShelfLife: true,
    shelfLifeDays: 730, // 2 years
    department: "Automotive",
    storageType: "AMBIENT",
    storageZone: "CS-D1",
  },
  {
    sku: "CS-SOAP-001",
    description: "Hand Soap",
    weight: 1.0,
    length: 10,
    width: 10,
    height: 20,
    cbm: 0.002,
    uom: "EA",
    qualityCheck: true,
    hasShelfLife: true,
    shelfLifeDays: 548, // 1.5 years
    department: "Beauty & Health",
    storageType: "AMBIENT",
    storageZone: "CS-E1",
  },
];

/**
 * Whose id gets stamped into every `createdBy` / `receivedBy` / … column.
 *
 * Pass `--user-id=<id>` (or set `SEED_USER_ID`) to attribute the seed data to a
 * real account, so the demo rows look like you created them. With neither, the
 * seed falls back to a synthetic `SYSTEM` user that has no Account row and
 * therefore can never sign in — that keeps `prisma migrate reset` and CI working
 * with no arguments.
 */
async function seedWarehouse(
  prisma: Prisma.TransactionClient,
  { actorId, afterClear }: ResetOptions,
): Promise<DemoResetResult> {
  console.log("Starting database seeding...");

  const actor = await prisma.user.findUnique({ where: { id: actorId } });
  if (!actor) {
    throw new Error(`No user with id "${actorId}" exists.`);
  }
  console.log(`Seeding as ${actor.name} (${actor.id}).`);

  // Delete existing data.
  // Note the absence of User/Session/Account: this block truncates only the 21
  // warehouse tables, so re-seeding never destroys accounts or logs you out.
  // That is load-bearing now that the audit columns are foreign keys onto User.
  // Every relation in the schema uses Prisma's default `Restrict`, so these have
  // to run children-first or re-seeding dies on a foreign-key violation.
  // The inventory tables reference Sku and Location, so they go first of all.
  await prisma.pickTask.deleteMany();
  await prisma.carton.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.salesOrderItem.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.inventoryBalance.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.adjustment.deleteMany();
  await prisma.putaway.deleteMany();
  await prisma.receiveItem.deleteMany();
  await prisma.qualityCheck.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.dockActivity.deleteMany();
  await prisma.dockBooking.deleteMany();
  await prisma.order.deleteMany();
  await prisma.sku.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.vehicleType.deleteMany();
  await prisma.dock.deleteMany();
  await prisma.location.deleteMany();

  await afterClear?.(prisma);

  // Create docks
  console.log("Creating docks...");
  const docks = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      prisma.dock.create({
        data: {
          name: `Dock ${i + 1}`,
          status: true,
        },
      }),
    ),
  );
  console.log(`Created ${docks.length} docks`);

  // Create vehicle types
  console.log("Creating vehicle types...");
  const vehicleTypes = await Promise.all([
    prisma.vehicleType.create({
      data: { type: "Truck", description: "Truck", unloadTime: "60" },
    }),
    prisma.vehicleType.create({
      data: { type: "Container", description: "Container", unloadTime: "90" },
    }),
    prisma.vehicleType.create({
      data: { type: "Trailer", description: "Trailer", unloadTime: "120" },
    }),
    prisma.vehicleType.create({
      data: { type: "Van", description: "Van", unloadTime: "45" },
    }),
    prisma.vehicleType.create({
      data: { type: "Flatbed", description: "Flatbed", unloadTime: "75" },
    }),
  ]);
  console.log(`Created ${vehicleTypes.length} vehicle types`);

  // Create the staging bay. Goods are received into STAGE and putaway moves
  // them out of it, so ReceiveItem.location and Putaway.fromLocation both
  // point here — it has to exist before any receipt is written.
  console.log("Creating staging location...");
  const stagingLocation = await prisma.location.create({
    data: {
      location: STAGING_LOCATION,
      status: true,
      length: 2000,
      width: 1000,
      height: 400,
      cbm: 800,
      weightCapacity: 50000,
      zone: "STAGE",
      aisle: "0",
      description: "Inbound staging bay - goods sit here until putaway",
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  // Create 20 storage locations
  console.log("Creating 20 locations...");
  const locations = await Promise.all(
    Array.from({ length: 20 }, (_, i) => {
      const zone = String.fromCharCode(65 + Math.floor(i / 4)); // A, B, C, D, E
      const aisle = String(Math.floor((i % 4) + 1));

      return prisma.location.create({
        data: {
          location: `LOC-${String(i + 1).padStart(3, "0")}`,
          status: true,
          length: Math.floor(Math.random() * 200) + 100, // 100-300 cm
          width: Math.floor(Math.random() * 150) + 80, // 80-230 cm
          height: Math.floor(Math.random() * 100) + 50, // 50-150 cm
          cbm: Math.floor(Math.random() * 10) + 5, // 5-15 cubic meters
          weightCapacity: Math.floor(Math.random() * 1000) + 500, // 500-1500 kg
          zone: zone,
          aisle: aisle,
          description: `Storage location in Zone ${zone}, Aisle ${aisle}`,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
    }),
  );
  const dispatchLocation = await prisma.location.create({
    data: {
      location: DISPATCH_LOCATION,
      status: true,
      length: 2000,
      width: 1000,
      height: 400,
      cbm: 800,
      weightCapacity: 50000,
      zone: "DISPATCH",
      aisle: "0",
      description:
        "Outbound dispatch bay - picked stock waits here for its truck",
      createdBy: actorId,
      updatedBy: actorId,
    },
  });

  console.log(
    `Created ${locations.length} storage locations plus ${stagingLocation.location} and ${dispatchLocation.location}`,
  );

  // Create 50 vendors in batches
  console.log("Creating 50 vendors...");
  const vendors: Vendor[] = [];
  const batchSize = 50;

  for (let i = 0; i < 50; i += batchSize) {
    const batch = Array.from(
      { length: Math.min(batchSize, 50 - i) },
      (_, index) => ({
        name: generateVendorName(i + index + 1),
        reference: generateVendorReference(),
      }),
    );

    await prisma.vendor.createMany({
      data: batch,
    });

    // Fetch the created vendors to get their IDs
    const createdVendorRecords = await prisma.vendor.findMany({
      where: {
        name: { in: batch.map((v) => v.name) },
      },
    });

    vendors.push(...createdVendorRecords);

    if ((i + batchSize) % 10 === 0) {
      console.log(`Created ${Math.min(i + batchSize, 50)} vendors`);
    }
  }
  console.log(`Created ${vendors.length} vendors`);

  // Create SKUs
  console.log("Creating SKUs...");
  const skus = await Promise.all([
    ...finishedGoods.map((sku) =>
      prisma.sku.create({
        data: {
          ...sku,
          createdBy: actorId,
          updatedBy: actorId,
        },
      }),
    ),
    ...consumables.map((sku) =>
      prisma.sku.create({
        data: {
          ...sku,
          createdBy: actorId,
          updatedBy: actorId,
        },
      }),
    ),
  ]);
  console.log(`Created ${skus.length} SKUs`);

  // Create 50 orders
  console.log("Creating 50 orders...");
  const orders = await Promise.all(
    Array.from({ length: 50 }, async (_, i) => {
      const vendor = getRandomElement(vendors);
      const orderDate = getRandomDate(
        new Date(2024, 0, 1),
        new Date(2024, 11, 31),
      );

      // Split SKUs into finished goods and consumables
      const finishedGoodSkus = skus.slice(0, 5);
      const consumableSkus = skus.slice(5, 10);

      return prisma.order.create({
        data: {
          orderNumber: `2024${String(i + 1).padStart(4, "0")}`,
          businessUnit: getRandomElement(businessUnits),
          orderType: OrderType.STANDARD,
          purchaseOrderDate: orderDate,
          expectedReceiptDate: new Date(
            orderDate.getTime() + 7 * 24 * 60 * 60 * 1000,
          ),
          status: OrderStatus.NEW,
          vendorReference: vendor.reference,
          paymentStatus: getRandomElement(paymentStatuses),
          createdBy: actorId,
          updatedBy: actorId,
          notes: getRandomElement(notes),
          buyerName: getRandomElement(buyerNames),
          buyerCity: getRandomElement(cities),
          items: {
            create: Array.from({ length: 10 }, (_, index) => {
              const sku =
                index < 5 ? finishedGoodSkus[index] : consumableSkus[index - 5];

              if (!sku) {
                throw new Error(`SKU not found for index ${index}`);
              }

              // More realistic quantities
              const orderedQty =
                sku.uom === "EA"
                  ? Math.floor(Math.random() * 20) + 5 // 5-25 pieces for finished goods
                  : Math.floor(Math.random() * 50) + 10; // 10-60 units for consumables

              return {
                description: sku.description,
                department: sku.department,
                orderedQuantity: orderedQty,
                receivedQuantity: 0,
                rejectedQuantity: 0,
                status: OrderItemStatus.NOT_RECEIVED,
                qualityCheckRequired: sku.qualityCheck,
                skuId: sku.sku,
              };
            }),
          },
        },
      });
    }),
  );

  console.log(`Created ${orders.length} orders`);

  // Book docks for the first 20 orders so the dock board, receive, quality
  // check, LPN list and putaway screens all have something to work with.
  // Each booking gets CHECK_IN + OPEN activities, which is what the quality
  // check screens require before an item can be inspected.
  console.log("Creating dock bookings and activities...");
  const bookedOrders = orders.slice(0, 20);
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  let dockActivityCount = 0;
  const dockBookings = [];

  for (const [index, order] of bookedOrders.entries()) {
    const dock = docks[index % docks.length]!;
    const vehicleType = vehicleTypes[index % vehicleTypes.length]!;

    // First 10 bookings land today, the rest over the next few days.
    const eta = new Date(startOfToday);
    eta.setDate(eta.getDate() + Math.floor(index / 10));
    eta.setHours(8 + (index % 10), 0, 0, 0);

    const booking = await prisma.dockBooking.create({
      data: {
        dockId: dock.id,
        vehicleTypeId: vehicleType.id,
        vehicleNumber: `TRK-${String(index + 1).padStart(4, "0")}`,
        weight: Math.floor(Math.random() * 8000) + 2000, // 2000-10000 kg
        queue: (index % 5) + 1,
        cbm: Math.floor(Math.random() * 40) + 10, // 10-50 cbm
        driverName: getRandomElement(buyerNames),
        driverPhone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        eta,
        orderId: order.orderNumber,
        activities: {
          create: [
            {
              activityType: ActivityType.CHECK_IN,
              createdBy: actorId,
              containerCondition: true,
              notes: "Vehicle arrived on schedule",
            },
            {
              activityType: ActivityType.OPEN,
              createdBy: actorId,
              containerCondition: true,
              notes: "Container opened for unloading",
            },
          ],
        },
      },
    });

    dockBookings.push(booking);
    dockActivityCount += 2;
  }
  console.log(
    `Created ${dockBookings.length} dock bookings and ${dockActivityCount} activities`,
  );

  // Receive stock against the first 12 booked orders. Half the lines are
  // received in full, half partially, so both RECEIVED and RECEIVING states
  // (and the putaway worklist) have realistic data.
  console.log("Creating receive items...");
  const skusBySkuCode = new Map(skus.map((sku) => [sku.sku, sku]));
  let receiveItemCount = 0;

  for (const [orderIndex, booking] of dockBookings.slice(0, 12).entries()) {
    const orderItems = await prisma.orderItem.findMany({
      where: { orderId: booking.orderId },
      orderBy: { id: "asc" },
      take: 4,
    });

    for (const [itemIndex, orderItem] of orderItems.entries()) {
      const sku = skusBySkuCode.get(orderItem.skuId);

      if (!sku) {
        throw new Error(`SKU not found for order item ${orderItem.id}`);
      }

      // Alternate between a full and a partial receipt.
      const isFullReceipt = itemIndex % 2 === 0;
      const receivedQuantity = isFullReceipt
        ? orderItem.orderedQuantity
        : Math.max(1, Math.floor(orderItem.orderedQuantity / 2));

      const lotExpiryDate =
        sku.hasShelfLife && sku.shelfLifeDays
          ? new Date(
              startOfToday.getTime() + sku.shelfLifeDays * 24 * 60 * 60 * 1000,
            )
          : null;

      const lpn = `LPN${String(orderIndex * 100 + itemIndex + 1).padStart(6, "0")}`;
      const lot = sku.hasShelfLife ? `LOT-${orderItem.skuId}-001` : null;
      const receivedAt = booking.eta ?? startOfToday;

      const receiveItem = await prisma.receiveItem.create({
        data: {
          orderItemId: orderItem.id,
          receivedQuantity,
          receivedBy: actorId,
          receivedAt,
          sku: orderItem.skuId,
          receivedNotes: "Seeded receipt",
          location: STAGING_LOCATION,
          lpn,
          lot,
          lotExpiryDate,
          uom: sku.uom ?? "EA",
          vehicleNumber: booking.vehicleNumber,
        },
      });

      // Seeded receipts go through the ledger too, otherwise a fresh database
      // has pallets with no stock behind them and the putaway worklist — which
      // reads balances now — comes up empty.
      await recordMovement(prisma, {
        sku: orderItem.skuId,
        lpn,
        lot,
        location: STAGING_LOCATION,
        quantity: receivedQuantity,
        reason: MovementReason.RECEIPT,
        ref: { type: MovementRefType.RECEIVE_ITEM, id: receiveItem.id },
        createdBy: actorId,
        notes: "Seeded receipt",
      });

      await prisma.orderItem.update({
        where: { id: orderItem.id },
        data: {
          receivedQuantity,
          status: isFullReceipt
            ? OrderItemStatus.RECEIVED
            : OrderItemStatus.RECEIVING,
        },
      });

      receiveItemCount += 1;
    }

    await prisma.order.update({
      where: { orderNumber: booking.orderId },
      data: { status: OrderStatus.IN_PROGRESS },
    });
  }
  console.log(`Created ${receiveItemCount} receive items`);

  // Put roughly half of what was received away into storage racks. Without this
  // every balance sits in the staging bay, which leaves the inventory-by-zone
  // screen empty and gives outbound allocation nothing to reserve — allocation
  // deliberately only considers stock somewhere a picker can reach.
  console.log("Putting stock away...");
  const stagedReceipts = await prisma.receiveItem.findMany({
    select: { lpn: true, sku: true, receivedQuantity: true },
    orderBy: { id: "asc" },
  });

  let putawayCount = 0;

  for (const [index, receipt] of stagedReceipts.entries()) {
    if (index % 2 === 1) continue; // leave the rest on the putaway worklist

    const destination = locations[index % locations.length];
    if (!destination) continue;

    const onHand = await prisma.inventoryBalance.findFirst({
      where: {
        lpn: receipt.lpn,
        sku: receipt.sku,
        location: STAGING_LOCATION,
        quantity: { gt: 0 },
      },
      select: { quantity: true },
    });
    if (!onHand) continue;

    try {
      await createPutaway(prisma, {
        lpn: receipt.lpn,
        sku: receipt.sku,
        quantity: onHand.quantity,
        fromLocation: STAGING_LOCATION,
        toLocation: destination.location,
        putawayBy: actorId,
      });
      putawayCount += 1;
    } catch {
      // Racks are rated, and a heavy pallet may not fit the one it was offered.
      // The seed is illustrative rather than exhaustive, so skip and move on.
    }
  }
  console.log(`Put ${putawayCount} pallets away`);

  // Correct a slice of the received lines so the adjustments screen has data.
  // These go through `applyAdjustmentBatch` rather than a raw create for the
  // same reason seeded receipts record a movement above: an adjustment that
  // only writes its own row leaves the ledger, the line's receivedQuantity and
  // the order status disagreeing with each other.
  console.log("Creating adjustments...");
  const adjustableLines = await prisma.orderItem.findMany({
    where: { receivedQuantity: { gt: 0 } },
    orderBy: { id: "asc" },
    take: 25,
    select: { id: true, orderId: true, receivedQuantity: true },
  });

  const adjustmentReasons = [
    "Damaged in transit",
    "Miscount at receiving",
    "Vendor overshipped",
    "Carton short-shipped",
    "Pallet re-counted after putaway",
    "Label mismatch corrected",
  ];

  let adjustmentCount = 0;

  for (const [index, line] of adjustableLines.entries()) {
    // Alternate overages and shortages so both badge variants show up. A
    // shortage can only write off stock the line actually has on hand, so it
    // is clamped to the received quantity.
    const isAddition = index % 2 === 0;
    const quantity = isAddition
      ? (index % 3) + 1
      : Math.min((index % 3) + 1, line.receivedQuantity);

    if (quantity < 1) continue;

    await applyAdjustmentBatch(prisma, {
      adjustedBy: actorId,
      adjustments: [
        {
          orderItemId: line.id,
          orderNumber: line.orderId,
          quantity,
          adjustmentType: isAddition
            ? AdjustmentType.ADDITION
            : AdjustmentType.SUBTRACTION,
          notes: getRandomElement(adjustmentReasons),
        },
      ],
    });

    adjustmentCount += 1;
  }
  console.log(`Created ${adjustmentCount} adjustments`);

  // ---- Outbound -------------------------------------------------------------
  //
  // Sales orders are seeded against stock that has actually been put away, so
  // allocation has something real to reserve. They are left at three different
  // stages — new, allocated, and picked-and-shipped — so every outbound screen
  // has something on it when the app first loads.
  console.log("Creating customers and sales orders...");

  const customers = await Promise.all(
    [
      { name: "Northwind Retail", reference: "CUST-NORTH", city: "Leeds" },
      { name: "Harbour Wholesale", reference: "CUST-HARBOUR", city: "Bristol" },
      {
        name: "Summit Distribution",
        reference: "CUST-SUMMIT",
        city: "Glasgow",
      },
    ].map((data) => prisma.customer.create({ data })),
  );

  // Only SKUs with stock in a storage location can be picked, so the sales
  // orders are built from what putaway actually left behind.
  const stored = await prisma.inventoryBalance.findMany({
    where: { quantity: { gt: 0 }, location: { not: STAGING_LOCATION } },
    select: { sku: true, quantity: true },
    orderBy: { quantity: "desc" },
    take: 12,
  });

  let salesOrderCount = 0;
  let pickTaskCount = 0;
  let shipmentCount = 0;

  if (stored.length >= 3) {
    for (const [index, customer] of customers.entries()) {
      const line = stored[index];
      if (!line) continue;

      const orderNumber = `SO-${String(index + 1).padStart(5, "0")}`;
      // Well under what is on hand, so allocation fills every line.
      const orderedQuantity = Math.max(1, Math.floor(line.quantity / 2));

      await createSalesOrder(prisma, {
        orderNumber,
        customerReference: customer.reference,
        requestedShipDate: new Date(
          startOfToday.getTime() + (index + 1) * 86_400_000,
        ),
        lines: [{ sku: line.sku, orderedQuantity }],
        createdBy: actorId,
      });
      salesOrderCount += 1;

      // The first order stays NEW so the allocate button has something to do.
      if (index === 0) continue;

      await allocateSalesOrder(prisma, { orderNumber });
      const tasks = await prisma.pickTask.findMany({
        where: { orderId: orderNumber },
      });
      pickTaskCount += tasks.length;

      // The second order stops at ALLOCATED, leaving work on the pick list.
      if (index === 1) continue;

      // The third goes all the way out of the door.
      for (const task of tasks) {
        await confirmPick(prisma, {
          pickTaskId: task.id,
          pickedQuantity: task.quantity,
          pickedBy: actorId,
        });
      }

      const picked = await prisma.pickTask.findMany({
        where: { orderId: orderNumber, pickedQuantity: { gt: 0 } },
        select: { id: true },
      });

      if (picked.length > 0) {
        const carton = await packCarton(prisma, {
          cartonNumber: `CTN-${String(index).padStart(5, "0")}`,
          pickTaskIds: picked.map((task) => task.id),
          weight: 18.5,
          packedBy: actorId,
        });

        await confirmShipment(prisma, {
          shipmentNumber: `SHP-${String(index).padStart(5, "0")}`,
          orderNumber,
          carrier: "Fastline Logistics",
          trackingNumber: `FL${Date.now()}${index}`,
          cartonIds: [carton.id],
          shippedBy: actorId,
        });
        shipmentCount += 1;
      }
    }
  }

  console.log(
    `Created ${salesOrderCount} sales orders, ${pickTaskCount} pick tasks, ${shipmentCount} shipments`,
  );

  console.log("\n=== SEEDING COMPLETE ===");
  console.log(`Vendors: ${vendors.length}`);
  console.log(`SKUs: ${skus.length}`);
  console.log(`Docks: ${docks.length}`);
  console.log(`Vehicle Types: ${vehicleTypes.length}`);
  console.log(`Locations: ${locations.length + 2}`);
  console.log(`Orders: ${orders.length}`);
  console.log(`Dock Bookings: ${dockBookings.length}`);
  console.log(`Dock Activities: ${dockActivityCount}`);
  console.log(`Receive Items: ${receiveItemCount}`);
  console.log(`Putaways: ${putawayCount}`);
  console.log(`Adjustments: ${adjustmentCount}`);
  console.log(`Sales Orders: ${salesOrderCount} (${shipmentCount} shipped)`);
  const inventoryMovements = await prisma.inventoryMovement.count();
  const inventoryBalances = await prisma.inventoryBalance.count();
  console.log(
    `Inventory: ${inventoryMovements} movements across ${inventoryBalances} balances`,
  );
  console.log("Database has been successfully seeded!");

  return {
    resetAt: new Date().toISOString(),
    counts: {
      vendors: vendors.length,
      skus: skus.length,
      docks: docks.length,
      vehicleTypes: vehicleTypes.length,
      locations: locations.length + 2,
      orders: orders.length,
      dockBookings: dockBookings.length,
      dockActivities: dockActivityCount,
      receiveItems: receiveItemCount,
      putaways: putawayCount,
      adjustments: adjustmentCount,
      salesOrders: salesOrderCount,
      pickTasks: pickTaskCount,
      shipments: shipmentCount,
      inventoryMovements,
      inventoryBalances,
    },
  };
}

/**
 * Atomically restores the synthetic warehouse baseline. Auth tables live
 * outside this transaction's delete list, so accounts and active sessions
 * survive. The transaction-scoped advisory lock is released by PostgreSQL on
 * commit or rollback, including when the process crashes.
 */
export async function resetDemoWarehouse(
  client: PrismaClient,
  options: ResetOptions,
): Promise<DemoResetResult> {
  return client.$transaction(
    async (tx) => {
      const [lock] = await tx.$queryRaw<Array<{ acquired: boolean }>>`
        SELECT pg_try_advisory_xact_lock(${DEMO_RESET_LOCK_ID}) AS acquired
      `;

      if (!lock?.acquired) throw new DemoResetInProgressError();
      return seedWarehouse(tx, options);
    },
    { maxWait: 10_000, timeout: 300_000 },
  );
}
