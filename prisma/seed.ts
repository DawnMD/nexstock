import {
  OrderItemStatus,
  OrderStatus,
  PrismaClient,
  OrderType,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Delete all existing data to start fresh
  console.log("Deleting existing data...");
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.vehicleType.deleteMany();
  await prisma.dock.deleteMany();
  console.log("Existing data deleted successfully");

  // Create 5 docks
  const docks = await Promise.all([
    prisma.dock.create({
      data: {
        name: "Dock 1",
        status: true,
      },
    }),
    prisma.dock.create({
      data: {
        name: "Dock 2",
        status: true,
      },
    }),
    prisma.dock.create({
      data: {
        name: "Dock 3",
        status: true,
      },
    }),
    prisma.dock.create({
      data: {
        name: "Dock 4",
        status: true,
      },
    }),
    prisma.dock.create({
      data: {
        name: "Dock 5",
        status: true,
      },
    }),
  ]);

  // Create 3 vehicle types
  const vehicleTypes = await Promise.all([
    prisma.vehicleType.create({
      data: {
        type: "Truck",
        description: "Truck",
        unloadTime: "60",
      },
    }),
    prisma.vehicleType.create({
      data: {
        type: "Container",
        description: "Container",
        unloadTime: "09",
      },
    }),
    prisma.vehicleType.create({
      data: {
        type: "Trailer",
        description: "Trailer",
        unloadTime: "120",
      },
    }),
  ]);

  // Create 5 vendors
  const vendors = await Promise.all([
    prisma.vendor.create({
      data: {
        name: "Vendor 1",
        reference: "1234567890",
      },
    }),
    prisma.vendor.create({
      data: {
        name: "Vendor 2",
        reference: "1234567891",
      },
    }),
    prisma.vendor.create({
      data: {
        name: "Vendor 3",
        reference: "1234567892",
      },
    }),
    prisma.vendor.create({
      data: {
        name: "Vendor 4",
        reference: "1234567893",
      },
    }),
    prisma.vendor.create({
      data: {
        name: "Vendor 5",
        reference: "1234567894",
      },
    }),
  ]);

  // Create 12 orders
  const orders = await Promise.all([
    prisma.order.create({
      data: {
        orderNumber: "1000000001",
        businessUnit: "Unit1",
        orderType: OrderType.Standard,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567890",
        paymentStatus: "Paid",
        createdBy: "User A",
        updatedBy: "User A",
        notes: "Priority order for summer collection",
        buyerName: "Alice Johnson",
        buyerCity: "New York",
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "1000000002",
        businessUnit: "Unit2",
        orderType: OrderType.Standard,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567890",
        paymentStatus: "Pending",
        createdBy: "User A",
        updatedBy: "User A",
        notes: "Electronics inventory restock",
        buyerName: "Bob Smith",
        buyerCity: "Los Angeles",
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "1000000003",
        businessUnit: "Unit3",
        orderType: OrderType.Standard,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567891",
        paymentStatus: "Pending",
        createdBy: "User B",
        updatedBy: "User B",
        notes: "Office furniture for new branch",
        buyerName: "Carol Davis",
        buyerCity: "Chicago",
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "1000000004",
        businessUnit: "Unit4",
        orderType: OrderType.Standard,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567891",
        paymentStatus: "Pending",
        createdBy: "User B",
        updatedBy: "User B",
        notes: "Additional furniture items",
        buyerName: "David Wilson",
        buyerCity: "Houston",
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "1000000005",
        businessUnit: "Unit5",
        orderType: OrderType.Import,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567892",
        paymentStatus: "Paid",
        createdBy: "User C",
        updatedBy: "User C",
        notes: "Smart devices for tech department",
        buyerName: "Eva Brown",
        buyerCity: "Phoenix",
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "1000000006",
        businessUnit: "Unit6",
        orderType: OrderType.Import,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567892",
        paymentStatus: "Paid",
        createdBy: "User C",
        updatedBy: "User C",
        notes: "Athletic footwear collection",
        buyerName: "Frank Miller",
        buyerCity: "Philadelphia",
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "1000000007",
        businessUnit: "Unit7",
        orderType: OrderType.Import,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567893",
        paymentStatus: "Paid",
        createdBy: "User D",
        updatedBy: "User D",
        notes: "Kitchen equipment for restaurant",
        buyerName: "Grace Lee",
        buyerCity: "San Antonio",
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "1000000008",
        businessUnit: "Unit8",
        orderType: OrderType.Import,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567893",
        paymentStatus: "Pending",
        createdBy: "User D",
        updatedBy: "User D",
        notes: "Additional kitchen appliances",
        buyerName: "Henry Taylor",
        buyerCity: "San Diego",
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "1000000009",
        businessUnit: "Unit9",
        orderType: OrderType.Return,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567894",
        paymentStatus: "Paid",
        createdBy: "User E",
        updatedBy: "User E",
        notes: "Fitness equipment for gym",
        buyerName: "Ivy Chen",
        buyerCity: "Dallas",
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "1000000010",
        businessUnit: "Unit10",
        orderType: OrderType.Return,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567894",
        paymentStatus: "Paid",
        createdBy: "User E",
        updatedBy: "User E",
        notes: "Sports accessories and equipment",
        buyerName: "Jack Anderson",
        buyerCity: "San Jose",
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "1000000011",
        businessUnit: "Unit11",
        orderType: OrderType.Return,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567894",
        paymentStatus: "Paid",
        createdBy: "User E",
        updatedBy: "User E",
        notes: "Sports accessories and equipment",
        buyerName: "Jack Anderson",
        buyerCity: "San Jose",
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "1000000012",
        businessUnit: "Unit12",
        orderType: OrderType.Return,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567894",
        paymentStatus: "Paid",
        createdBy: "User E",
        updatedBy: "User E",
        notes: "Sports accessories and equipment",
        buyerName: "Jack Anderson",
        buyerCity: "San Jose",
      },
    }),
  ]);

  // Create order items for each order
  const orderItems = await Promise.all([
    // Items for ORDER1
    prisma.orderItem.create({
      data: {
        description: "Premium Cotton T-Shirt",
        sku: "TS-COT-PRE-001",
        department: "Apparel",
        orderId: orders[0].id,
        orderedQuantity: 10,
        status: OrderItemStatus.RECEIVED,
        receivedQuantity: 50,
        rejectedQuantity: 0,
        qualityCheck: true,
      },
    }),
    prisma.orderItem.create({
      data: {
        description: "Denim Jeans",
        sku: "JN-DNM-001",
        department: "Apparel",
        orderId: orders[0].id,
        orderedQuantity: 10,
        status: OrderItemStatus.RECEIVING,
        receivedQuantity: 20,
        rejectedQuantity: 0,
        qualityCheck: false,
      },
    }),
    // Items for ORDER2
    prisma.orderItem.create({
      data: {
        description: "Wireless Headphones",
        sku: "EL-HP-WL-001",
        department: "Electronics",
        orderId: orders[1].id,
        orderedQuantity: 20,
        status: OrderItemStatus.RECEIVING,
        receivedQuantity: 15,
        rejectedQuantity: 0,
        qualityCheck: false,
      },
    }),
    prisma.orderItem.create({
      data: {
        description: "Bluetooth Speaker",
        sku: "EL-SP-BT-001",
        department: "Electronics",
        orderId: orders[1].id,
        orderedQuantity: 20,
        status: OrderItemStatus.RECEIVING,
        receivedQuantity: 12,
        rejectedQuantity: 0,
        qualityCheck: false,
      },
    }),
    // Items for ORDER3
    prisma.orderItem.create({
      data: {
        description: "Office Chair",
        sku: "FN-CHR-OFF-001",
        department: "Furniture",
        orderId: orders[2].id,
        orderedQuantity: 30,
        status: OrderItemStatus.REJECTED,
        receivedQuantity: 0,
        rejectedQuantity: 10,
        qualityCheck: true,
      },
    }),
    // Items for ORDER4
    prisma.orderItem.create({
      data: {
        description: "Desk Lamp",
        sku: "FN-LMP-DSK-001",
        department: "Furniture",
        orderId: orders[3].id,
        orderedQuantity: 30,
        status: OrderItemStatus.RECEIVED,
        receivedQuantity: 15,
        rejectedQuantity: 0,
        qualityCheck: true,
      },
    }),
    prisma.orderItem.create({
      data: {
        description: "Storage Cabinet",
        sku: "FN-CAB-STR-001",
        department: "Furniture",
        orderId: orders[3].id,
        orderedQuantity: 10,
        status: OrderItemStatus.RECEIVED,
        receivedQuantity: 8,
        rejectedQuantity: 0,
        qualityCheck: true,
      },
    }),
    // Items for ORDER5
    prisma.orderItem.create({
      data: {
        description: "Smart Watch",
        sku: "EL-WT-SM-001",
        department: "Electronics",
        orderId: orders[4].id,
        orderedQuantity: 10,
        status: OrderItemStatus.NOT_RECEIVED,
        receivedQuantity: 0,
        rejectedQuantity: 0,
        qualityCheck: false,
      },
    }),
    // Items for ORDER6
    prisma.orderItem.create({
      data: {
        description: "Running Shoes",
        sku: "SH-RUN-001",
        department: "Footwear",
        orderId: orders[5].id,
        orderedQuantity: 10,
        status: OrderItemStatus.RECEIVING,
        receivedQuantity: 35,
        rejectedQuantity: 0,
        qualityCheck: false,
      },
    }),
    prisma.orderItem.create({
      data: {
        description: "Sports Socks",
        sku: "SH-SOC-SPT-001",
        department: "Footwear",
        orderId: orders[5].id,
        orderedQuantity: 10,
        status: OrderItemStatus.RECEIVED,
        receivedQuantity: 100,
        rejectedQuantity: 0,
        qualityCheck: true,
      },
    }),
    // Items for ORDER7
    prisma.orderItem.create({
      data: {
        description: "Kitchen Knife Set",
        sku: "KT-KNV-SET-001",
        department: "Kitchenware",
        orderId: orders[6].id,
        orderedQuantity: 10,
        status: OrderItemStatus.RECEIVED,
        receivedQuantity: 20,
        rejectedQuantity: 0,
        qualityCheck: true,
      },
    }),
    // Items for ORDER8
    prisma.orderItem.create({
      data: {
        description: "Coffee Maker",
        sku: "KT-CFM-001",
        department: "Kitchenware",
        orderId: orders[7].id,
        orderedQuantity: 20,
        status: OrderItemStatus.RECEIVED,
        receivedQuantity: 12,
        rejectedQuantity: 0,
        qualityCheck: true,
      },
    }),
    prisma.orderItem.create({
      data: {
        description: "Toaster",
        sku: "KT-TST-001",
        department: "Kitchenware",
        orderId: orders[7].id,
        orderedQuantity: 20,
        status: OrderItemStatus.RECEIVED,
        receivedQuantity: 18,
        rejectedQuantity: 0,
        qualityCheck: true,
      },
    }),
    // Items for ORDER9
    prisma.orderItem.create({
      data: {
        description: "Yoga Mat",
        sku: "SP-YOG-MAT-001",
        department: "Sports",
        orderId: orders[8].id,
        orderedQuantity: 30,
        status: OrderItemStatus.REJECTED,
        receivedQuantity: 0,
        rejectedQuantity: 30,
        qualityCheck: true,
      },
    }),
    // Items for ORDER10
    prisma.orderItem.create({
      data: {
        description: "Dumbbell Set",
        sku: "SP-DMB-SET-001",
        department: "Sports",
        orderId: orders[9].id,
        orderedQuantity: 10,
        status: OrderItemStatus.RECEIVED,
        receivedQuantity: 25,
        rejectedQuantity: 0,
        qualityCheck: true,
      },
    }),
    prisma.orderItem.create({
      data: {
        description: "Resistance Bands",
        sku: "SP-RES-BND-001",
        department: "Sports",
        orderId: orders[9].id,
        orderedQuantity: 10,
        status: OrderItemStatus.RECEIVED,
        receivedQuantity: 50,
        rejectedQuantity: 0,
        qualityCheck: true,
      },
    }),
  ]);

  console.log({ vendors, orders, orderItems, docks, vehicleTypes });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
