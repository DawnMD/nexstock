import type { Vendor } from "@prisma/client";
import {
  OrderItemStatus,
  OrderStatus,
  OrderType,
  PaymentStatus,
  PrismaClient,
} from "@prisma/client";

const prisma = new PrismaClient();

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

const userNames = [
  "John Admin",
  "Sarah Manager",
  "Mike Supervisor",
  "Lisa Coordinator",
  "Tom Assistant",
  "Emma Clerk",
  "Alex Handler",
  "Nina Processor",
  "Chris Operator",
  "Maria Controller",
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

async function main() {
  console.log("Starting database seeding...");

  // Delete existing data
  await prisma.receiveItem.deleteMany();
  await prisma.qualityCheck.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.dockBooking.deleteMany();
  await prisma.order.deleteMany();
  await prisma.sku.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.vehicleType.deleteMany();
  await prisma.dock.deleteMany();
  await prisma.location.deleteMany();

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

  // Create 20 locations
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
          createdBy: "SYSTEM",
          updatedBy: "SYSTEM",
        },
      });
    }),
  );
  console.log(`Created ${locations.length} locations`);

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
          createdBy: "SYSTEM",
          updatedBy: "SYSTEM",
        },
      }),
    ),
    ...consumables.map((sku) =>
      prisma.sku.create({
        data: {
          ...sku,
          createdBy: "SYSTEM",
          updatedBy: "SYSTEM",
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
          createdBy: getRandomElement(userNames),
          updatedBy: getRandomElement(userNames),
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

  console.log("\n=== SEEDING COMPLETE ===");
  console.log(`Vendors: ${vendors.length}`);
  console.log(`SKUs: ${skus.length}`);
  console.log(`Docks: ${docks.length}`);
  console.log(`Vehicle Types: ${vehicleTypes.length}`);
  console.log(`Locations: ${locations.length}`);
  console.log(`Orders: ${orders.length}`);
  console.log("Database has been successfully seeded!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
