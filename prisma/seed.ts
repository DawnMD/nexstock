import {
  OrderItemStatus,
  OrderStatus,
  PrismaClient,
  OrderType,
} from "@prisma/client";
import type { Vendor, Order } from "@prisma/client";

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

const orderTypes = [OrderType.STANDARD, OrderType.IMPORT, OrderType.RETURN];
const orderStatuses = [
  OrderStatus.NEW,
  OrderStatus.IN_PROGRESS,
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
];
const paymentStatuses = ["Paid", "Pending", "Partial", "Overdue"];
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

const departments = [
  "Electronics",
  "Apparel",
  "Furniture",
  "Kitchenware",
  "Sports",
  "Automotive",
  "Home & Garden",
  "Beauty & Health",
  "Toys & Games",
  "Books & Media",
  "Tools & Hardware",
  "Pet Supplies",
  "Baby Products",
];

const productDescriptions = [
  "Premium Cotton T-Shirt",
  "Denim Jeans",
  "Wireless Headphones",
  "Bluetooth Speaker",
  "Office Chair",
  "Desk Lamp",
  "Storage Cabinet",
  "Smart Watch",
  "Running Shoes",
  "Sports Socks",
  "Kitchen Knife Set",
  "Coffee Maker",
  "Toaster",
  "Yoga Mat",
  "Dumbbell Set",
  "Resistance Bands",
  "Laptop Stand",
  "Wireless Mouse",
  "USB Cable",
  "Power Bank",
  "Phone Case",
  "Tablet Cover",
  "Gaming Headset",
  "Mechanical Keyboard",
  "Monitor Stand",
  "Desk Organizer",
  "File Cabinet",
  "Bookshelf",
  "Dining Table",
  "Bed Frame",
  "Sofa Set",
  "Coffee Table",
  "TV Stand",
  "Wardrobe",
  "Dresser",
  "Nightstand",
  "Lamp Shade",
  "Throw Pillow",
  "Bedding Set",
  "Curtains",
  "Rug",
  "Wall Clock",
  "Picture Frame",
  "Vase",
  "Plant Pot",
  "Garden Tools",
  "BBQ Grill",
  "Patio Furniture",
  "Swimming Pool",
  "Tennis Racket",
  "Basketball",
  "Soccer Ball",
  "Baseball Glove",
  "Hockey Stick",
  "Golf Clubs",
  "Bicycle",
  "Skateboard",
  "Roller Skates",
  "Helmet",
  "Protective Gear",
];

function generateSKU(department: string, index: number): string {
  const deptCode = department.substring(0, 2).toUpperCase();
  const randomCode = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${deptCode}-${randomCode}-${String(index).padStart(3, "0")}`;
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]!;
}

function getRandomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
}

function generateVendorName(index: number): string {
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
  return `${prefix} ${suffix} ${index}`;
}

function generateVendorReference(): string {
  return (Math.floor(Math.random() * 9000000000) + 1000000000).toString();
}

async function main() {
  console.log("Starting database seeding...");

  // Delete all existing data to start fresh
  console.log("Deleting existing data...");
  await prisma.orderItem.deleteMany();
  await prisma.dockBooking.deleteMany();
  await prisma.order.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.vehicleType.deleteMany();
  await prisma.dock.deleteMany();
  console.log("Existing data deleted successfully");

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

  // Create 500 vendors in batches
  console.log("Creating 500 vendors...");
  const vendors: Vendor[] = [];
  const batchSize = 50;

  for (let i = 0; i < 500; i += batchSize) {
    const batch = Array.from(
      { length: Math.min(batchSize, 500 - i) },
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

    if ((i + batchSize) % 100 === 0) {
      console.log(`Created ${Math.min(i + batchSize, 500)} vendors`);
    }
  }
  console.log(`Created ${vendors.length} vendors`);

  // Create 6000 orders in batches
  console.log("Creating 6000 orders...");
  const orders: Order[] = [];
  const orderBatchSize = 100;

  for (let i = 0; i < 6000; i += orderBatchSize) {
    const batch = Array.from(
      { length: Math.min(orderBatchSize, 6000 - i) },
      (_, index) => {
        const orderIndex = i + index + 1;
        const vendor = getRandomElement(vendors);
        const orderDate = getRandomDate(
          new Date(2023, 0, 1),
          new Date(2024, 11, 31),
        );
        const receiptDate = new Date(
          orderDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000,
        );

        return {
          orderNumber: `1000000${String(orderIndex).padStart(3, "0")}`,
          businessUnit: getRandomElement(businessUnits),
          orderType: getRandomElement(orderTypes),
          purchaseOrderDate: orderDate,
          expectedReceiptDate: receiptDate,
          status: getRandomElement(orderStatuses),
          vendorReference: vendor.reference,
          paymentStatus: getRandomElement(paymentStatuses),
          createdBy: getRandomElement(userNames),
          updatedBy: getRandomElement(userNames),
          notes: getRandomElement(notes),
          buyerName: getRandomElement(buyerNames),
          buyerCity: getRandomElement(cities),
        };
      },
    );

    await prisma.order.createMany({
      data: batch,
    });

    // Fetch the created orders to get their IDs
    const createdOrderRecords = await prisma.order.findMany({
      where: {
        orderNumber: { in: batch.map((o) => o.orderNumber) },
      },
    });

    orders.push(...createdOrderRecords);

    if ((i + orderBatchSize) % 1000 === 0) {
      console.log(`Created ${Math.min(i + orderBatchSize, 6000)} orders`);
    }
  }
  console.log(`Created ${orders.length} orders`);

  // Create order items for each order
  console.log("Creating order items...");
  const orderItems = [];
  const itemBatchSize = 200;

  for (let i = 0; i < orders.length; i += itemBatchSize) {
    const batch = [];

    for (let j = 0; j < Math.min(itemBatchSize, orders.length - i); j++) {
      const order = orders[i + j];
      if (!order) continue;

      const numItems = Math.floor(Math.random() * 5) + 1; // 1-5 items per order

      for (let k = 0; k < numItems; k++) {
        const department = getRandomElement(departments);
        const orderedQty = Math.floor(Math.random() * 100) + 10;
        const receivedQty = Math.floor(Math.random() * (orderedQty + 1));
        const rejectedQty = Math.floor(
          Math.random() * (orderedQty - receivedQty + 1),
        );
        const status = getRandomElement([
          OrderItemStatus.RECEIVED,
          OrderItemStatus.RECEIVING,
          OrderItemStatus.NOT_RECEIVED,
          OrderItemStatus.REJECTED,
        ]);

        batch.push({
          description: getRandomElement(productDescriptions),
          sku: generateSKU(department, Math.floor(Math.random() * 1000)),
          department: department,
          orderId: order.id,
          orderedQuantity: orderedQty,
          status: status,
          receivedQuantity:
            status === OrderItemStatus.RECEIVED
              ? orderedQty
              : status === OrderItemStatus.RECEIVING
                ? receivedQty
                : 0,
          rejectedQuantity:
            status === OrderItemStatus.REJECTED ? orderedQty : rejectedQty,
          qualityCheck: Math.random() > 0.3, // 70% pass quality check
        });
      }
    }

    await prisma.orderItem.createMany({
      data: batch,
    });

    orderItems.push(...batch);

    if ((i + itemBatchSize) % 1000 === 0) {
      console.log(
        `Created ${Math.min(i + itemBatchSize, orders.length)} order items`,
      );
    }
  }

  console.log(`Created ${orderItems.length} order items`);

  // Summary
  console.log("\n=== SEEDING COMPLETE ===");
  console.log(`Vendors: ${vendors.length}`);
  console.log(`Orders: ${orders.length}`);
  console.log(`Order Items: ${orderItems.length}`);
  console.log(`Docks: ${docks.length}`);
  console.log(`Vehicle Types: ${vehicleTypes.length}`);
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
