import { OrderItemStatus, OrderStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Delete all existing data to start fresh
  console.log("Deleting existing data...");
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.vendor.deleteMany();
  console.log("Existing data deleted successfully");

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

  // Create 10 orders
  const orders = await Promise.all([
    prisma.order.create({
      data: {
        orderNumber: "1000000001",
        businessUnit: "Unit1",
        purchaseOrderType: 1,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567890",
        paymentStatus: "Paid",
        createdBy: "User A",
        updatedBy: "User A",
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "1000000002",
        businessUnit: "Unit2",
        purchaseOrderType: 1,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567890",
        paymentStatus: "Pending",
        createdBy: "User A",
        updatedBy: "User A",
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "1000000003",
        businessUnit: "Unit3",
        purchaseOrderType: 2,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567891",
        paymentStatus: "Pending",
        createdBy: "User B",
        updatedBy: "User B",
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "1000000004",
        businessUnit: "Unit4",
        purchaseOrderType: 2,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567891",
        paymentStatus: "Pending",
        createdBy: "User B",
        updatedBy: "User B",
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "1000000005",
        businessUnit: "Unit5",
        purchaseOrderType: 1,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567892",
        paymentStatus: "Paid",
        createdBy: "User C",
        updatedBy: "User C",
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "1000000006",
        businessUnit: "Unit6",
        purchaseOrderType: 1,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567892",
        paymentStatus: "Paid",
        createdBy: "User C",
        updatedBy: "User C",
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "1000000007",
        businessUnit: "Unit7",
        purchaseOrderType: 2,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567893",
        paymentStatus: "Paid",
        createdBy: "User D",
        updatedBy: "User D",
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "1000000008",
        businessUnit: "Unit8",
        purchaseOrderType: 2,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567893",
        paymentStatus: "Pending",
        createdBy: "User D",
        updatedBy: "User D",
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "1000000009",
        businessUnit: "Unit9",
        purchaseOrderType: 1,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567894",
        paymentStatus: "Paid",
        createdBy: "User E",
        updatedBy: "User E",
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "1000000010",
        businessUnit: "Unit10",
        purchaseOrderType: 1,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567894",
        paymentStatus: "Paid",
        createdBy: "User E",
        updatedBy: "User E",
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
        status: OrderItemStatus.RECEIVED,
        totalQuantity: 50,
        receivedQuantity: 50,
        rejectedQuantity: 0,
      },
    }),
    prisma.orderItem.create({
      data: {
        description: "Denim Jeans",
        sku: "JN-DNM-001",
        department: "Apparel",
        orderId: orders[0].id,
        status: OrderItemStatus.RECEIVING,
        totalQuantity: 30,
        receivedQuantity: 20,
        rejectedQuantity: 0,
      },
    }),
    // Items for ORDER2
    prisma.orderItem.create({
      data: {
        description: "Wireless Headphones",
        sku: "EL-HP-WL-001",
        department: "Electronics",
        orderId: orders[1].id,
        status: OrderItemStatus.RECEIVING,
        totalQuantity: 25,
        receivedQuantity: 15,
        rejectedQuantity: 0,
      },
    }),
    prisma.orderItem.create({
      data: {
        description: "Bluetooth Speaker",
        sku: "EL-SP-BT-001",
        department: "Electronics",
        orderId: orders[1].id,
        status: OrderItemStatus.RECEIVING,
        totalQuantity: 20,
        receivedQuantity: 12,
        rejectedQuantity: 0,
      },
    }),
    // Items for ORDER3
    prisma.orderItem.create({
      data: {
        description: "Office Chair",
        sku: "FN-CHR-OFF-001",
        department: "Furniture",
        orderId: orders[2].id,
        status: OrderItemStatus.REJECTED,
        totalQuantity: 10,
        receivedQuantity: 0,
        rejectedQuantity: 10,
      },
    }),
    // Items for ORDER4
    prisma.orderItem.create({
      data: {
        description: "Desk Lamp",
        sku: "FN-LMP-DSK-001",
        department: "Furniture",
        orderId: orders[3].id,
        status: OrderItemStatus.RECEIVED,
        totalQuantity: 15,
        receivedQuantity: 15,
        rejectedQuantity: 0,
      },
    }),
    prisma.orderItem.create({
      data: {
        description: "Storage Cabinet",
        sku: "FN-CAB-STR-001",
        department: "Furniture",
        orderId: orders[3].id,
        status: OrderItemStatus.RECEIVED,
        totalQuantity: 8,
        receivedQuantity: 8,
        rejectedQuantity: 0,
      },
    }),
    // Items for ORDER5
    prisma.orderItem.create({
      data: {
        description: "Smart Watch",
        sku: "EL-WT-SM-001",
        department: "Electronics",
        orderId: orders[4].id,
        status: OrderItemStatus.NOT_RECEIVED,
        totalQuantity: 40,
        receivedQuantity: 0,
        rejectedQuantity: 0,
      },
    }),
    // Items for ORDER6
    prisma.orderItem.create({
      data: {
        description: "Running Shoes",
        sku: "SH-RUN-001",
        department: "Footwear",
        orderId: orders[5].id,
        status: OrderItemStatus.RECEIVING,
        totalQuantity: 60,
        receivedQuantity: 35,
        rejectedQuantity: 0,
      },
    }),
    prisma.orderItem.create({
      data: {
        description: "Sports Socks",
        sku: "SH-SOC-SPT-001",
        department: "Footwear",
        orderId: orders[5].id,
        status: OrderItemStatus.RECEIVED,
        totalQuantity: 100,
        receivedQuantity: 100,
        rejectedQuantity: 0,
      },
    }),
    // Items for ORDER7
    prisma.orderItem.create({
      data: {
        description: "Kitchen Knife Set",
        sku: "KT-KNV-SET-001",
        department: "Kitchenware",
        orderId: orders[6].id,
        status: OrderItemStatus.RECEIVED,
        totalQuantity: 20,
        receivedQuantity: 20,
        rejectedQuantity: 0,
      },
    }),
    // Items for ORDER8
    prisma.orderItem.create({
      data: {
        description: "Coffee Maker",
        sku: "KT-CFM-001",
        department: "Kitchenware",
        orderId: orders[7].id,
        status: OrderItemStatus.RECEIVED,
        totalQuantity: 12,
        receivedQuantity: 12,
        rejectedQuantity: 0,
      },
    }),
    prisma.orderItem.create({
      data: {
        description: "Toaster",
        sku: "KT-TST-001",
        department: "Kitchenware",
        orderId: orders[7].id,
        status: OrderItemStatus.RECEIVED,
        totalQuantity: 18,
        receivedQuantity: 18,
        rejectedQuantity: 0,
      },
    }),
    // Items for ORDER9
    prisma.orderItem.create({
      data: {
        description: "Yoga Mat",
        sku: "SP-YOG-MAT-001",
        department: "Sports",
        orderId: orders[8].id,
        status: OrderItemStatus.REJECTED,
        totalQuantity: 30,
        receivedQuantity: 0,
        rejectedQuantity: 30,
      },
    }),
    // Items for ORDER10
    prisma.orderItem.create({
      data: {
        description: "Dumbbell Set",
        sku: "SP-DMB-SET-001",
        department: "Sports",
        orderId: orders[9].id,
        status: OrderItemStatus.RECEIVED,
        totalQuantity: 25,
        receivedQuantity: 25,
        rejectedQuantity: 0,
      },
    }),
    prisma.orderItem.create({
      data: {
        description: "Resistance Bands",
        sku: "SP-RES-BND-001",
        department: "Sports",
        orderId: orders[9].id,
        status: OrderItemStatus.RECEIVED,
        totalQuantity: 50,
        receivedQuantity: 50,
        rejectedQuantity: 0,
      },
    }),
  ]);

  console.log({ vendors, orders, orderItems });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
