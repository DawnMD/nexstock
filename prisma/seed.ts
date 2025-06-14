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

  console.log({ vendors, orders });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
