import { OrderStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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
        orderNumber: "ORDER1",
        businessUnit: "Unit A",
        purchaseOrderType: 1,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567890",
        createdBy: "User A",
        updatedBy: "User A",
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "ORDER2",
        businessUnit: "Unit B",
        purchaseOrderType: 1,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567890",
        createdBy: "User A",
        updatedBy: "User A",
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "ORDER3",
        businessUnit: "Unit C",
        purchaseOrderType: 2,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567891",
        createdBy: "User B",
        updatedBy: "User B",
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "ORDER4",
        businessUnit: "Unit D",
        purchaseOrderType: 2,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567891",
        createdBy: "User B",
        updatedBy: "User B",
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "ORDER5",
        businessUnit: "Unit E",
        purchaseOrderType: 1,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567892",
        createdBy: "User C",
        updatedBy: "User C",
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "ORDER6",
        businessUnit: "Unit F",
        purchaseOrderType: 1,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567892",
        createdBy: "User C",
        updatedBy: "User C",
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "ORDER7",
        businessUnit: "Unit G",
        purchaseOrderType: 2,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567893",
        createdBy: "User D",
        updatedBy: "User D",
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "ORDER8",
        businessUnit: "Unit H",
        purchaseOrderType: 2,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567893",
        createdBy: "User D",
        updatedBy: "User D",
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "ORDER9",
        businessUnit: "Unit I",
        purchaseOrderType: 1,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567894",
        createdBy: "User E",
        updatedBy: "User E",
      },
    }),
    prisma.order.create({
      data: {
        orderNumber: "ORDER10",
        businessUnit: "Unit J",
        purchaseOrderType: 1,
        purchaseOrderDate: new Date(),
        expectedReceiptDate: new Date(),
        status: OrderStatus.NEW,
        vendorReference: "1234567894",
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
      },
    }),
    prisma.orderItem.create({
      data: {
        description: "Denim Jeans",
        sku: "JN-DNM-001",
        department: "Apparel",
        orderId: orders[0].id,
      },
    }),
    // Items for ORDER2
    prisma.orderItem.create({
      data: {
        description: "Wireless Headphones",
        sku: "EL-HP-WL-001",
        department: "Electronics",
        orderId: orders[1].id,
      },
    }),
    prisma.orderItem.create({
      data: {
        description: "Bluetooth Speaker",
        sku: "EL-SP-BT-001",
        department: "Electronics",
        orderId: orders[1].id,
      },
    }),
    // Items for ORDER3
    prisma.orderItem.create({
      data: {
        description: "Office Chair",
        sku: "FN-CHR-OFF-001",
        department: "Furniture",
        orderId: orders[2].id,
      },
    }),
    // Items for ORDER4
    prisma.orderItem.create({
      data: {
        description: "Desk Lamp",
        sku: "FN-LMP-DSK-001",
        department: "Furniture",
        orderId: orders[3].id,
      },
    }),
    prisma.orderItem.create({
      data: {
        description: "Storage Cabinet",
        sku: "FN-CAB-STR-001",
        department: "Furniture",
        orderId: orders[3].id,
      },
    }),
    // Items for ORDER5
    prisma.orderItem.create({
      data: {
        description: "Smart Watch",
        sku: "EL-WT-SM-001",
        department: "Electronics",
        orderId: orders[4].id,
      },
    }),
    // Items for ORDER6
    prisma.orderItem.create({
      data: {
        description: "Running Shoes",
        sku: "SH-RUN-001",
        department: "Footwear",
        orderId: orders[5].id,
      },
    }),
    prisma.orderItem.create({
      data: {
        description: "Sports Socks",
        sku: "SH-SOC-SPT-001",
        department: "Footwear",
        orderId: orders[5].id,
      },
    }),
    // Items for ORDER7
    prisma.orderItem.create({
      data: {
        description: "Kitchen Knife Set",
        sku: "KT-KNV-SET-001",
        department: "Kitchenware",
        orderId: orders[6].id,
      },
    }),
    // Items for ORDER8
    prisma.orderItem.create({
      data: {
        description: "Coffee Maker",
        sku: "KT-CFM-001",
        department: "Kitchenware",
        orderId: orders[7].id,
      },
    }),
    prisma.orderItem.create({
      data: {
        description: "Toaster",
        sku: "KT-TST-001",
        department: "Kitchenware",
        orderId: orders[7].id,
      },
    }),
    // Items for ORDER9
    prisma.orderItem.create({
      data: {
        description: "Yoga Mat",
        sku: "SP-YOG-MAT-001",
        department: "Sports",
        orderId: orders[8].id,
      },
    }),
    // Items for ORDER10
    prisma.orderItem.create({
      data: {
        description: "Dumbbell Set",
        sku: "SP-DMB-SET-001",
        department: "Sports",
        orderId: orders[9].id,
      },
    }),
    prisma.orderItem.create({
      data: {
        description: "Resistance Bands",
        sku: "SP-RES-BND-001",
        department: "Sports",
        orderId: orders[9].id,
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
  .finally(async () => {
    await prisma.$disconnect();
  });
