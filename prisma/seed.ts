import { OrderItemStatus, OrderStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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

  // Create 5 vehicles
  const vehicles = await Promise.all([
    prisma.vehicle.create({
      data: {
        vehicleType: "Truck",
        vehicleNumber: "1234567890",
        queue: 1,
        cbm: 1000,
        weight: 1000,
        driverName: "John Doe",
        driverPhone: "1234567890",
        eta: new Date(),
        dockId: docks[0].id,
      },
    }),
    prisma.vehicle.create({
      data: {
        vehicleType: "Truck",
        vehicleNumber: "1234567891",
        queue: 2,
        cbm: 1000,
        weight: 1000,
        driverName: "John Smith",
        driverPhone: "1234567891",
        eta: new Date(),
        dockId: docks[1].id,
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
        orderedQuantity: 10,
        status: OrderItemStatus.RECEIVED,
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
      },
    }),
  ]);

  console.log({ vendors, orders, orderItems, docks, vehicles });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
