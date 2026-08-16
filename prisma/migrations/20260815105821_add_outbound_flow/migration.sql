-- CreateEnum
CREATE TYPE "SalesOrderStatus" AS ENUM ('NEW', 'ALLOCATED', 'PICKING', 'PICKED', 'SHIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SalesOrderItemStatus" AS ENUM ('PENDING', 'ALLOCATED', 'PICKED', 'SHIPPED', 'SHORT');

-- CreateEnum
CREATE TYPE "PickTaskStatus" AS ENUM ('PENDING', 'PICKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('DRAFT', 'SHIPPED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MovementReason" ADD VALUE 'PICK_OUT';
ALTER TYPE "MovementReason" ADD VALUE 'PICK_IN';
ALTER TYPE "MovementReason" ADD VALUE 'SHIP';
ALTER TYPE "MovementReason" ADD VALUE 'PICK_REVERSAL';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MovementRefType" ADD VALUE 'PICK_TASK';
ALTER TYPE "MovementRefType" ADD VALUE 'SHIPMENT';

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "contactName" TEXT,
    "address" TEXT,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrder" (
    "id" SERIAL NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerReference" TEXT NOT NULL,
    "status" "SalesOrderStatus" NOT NULL DEFAULT 'NEW',
    "requestedShipDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrderItem" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "orderedQuantity" INTEGER NOT NULL DEFAULT 0,
    "allocatedQuantity" INTEGER NOT NULL DEFAULT 0,
    "pickedQuantity" INTEGER NOT NULL DEFAULT 0,
    "shippedQuantity" INTEGER NOT NULL DEFAULT 0,
    "status" "SalesOrderItemStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickTask" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" INTEGER NOT NULL,
    "sku" TEXT NOT NULL,
    "lpn" TEXT NOT NULL,
    "lot" TEXT NOT NULL DEFAULT '',
    "fromLocation" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pickedQuantity" INTEGER NOT NULL DEFAULT 0,
    "status" "PickTaskStatus" NOT NULL DEFAULT 'PENDING',
    "pickedBy" TEXT,
    "pickedAt" TIMESTAMP(3),
    "cartonId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PickTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Carton" (
    "id" SERIAL NOT NULL,
    "cartonNumber" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,
    "packedBy" TEXT NOT NULL,
    "packedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shipmentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Carton_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" SERIAL NOT NULL,
    "shipmentNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "trackingNumber" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'DRAFT',
    "shippedBy" TEXT,
    "shippedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_reference_key" ON "Customer"("reference");

-- CreateIndex
CREATE INDEX "Customer_reference_idx" ON "Customer"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_orderNumber_key" ON "SalesOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "SalesOrder_customerReference_status_idx" ON "SalesOrder"("customerReference", "status");

-- CreateIndex
CREATE INDEX "SalesOrder_createdBy_idx" ON "SalesOrder"("createdBy");

-- CreateIndex
CREATE INDEX "SalesOrder_updatedBy_idx" ON "SalesOrder"("updatedBy");

-- CreateIndex
CREATE INDEX "SalesOrderItem_orderId_sku_idx" ON "SalesOrderItem"("orderId", "sku");

-- CreateIndex
CREATE INDEX "SalesOrderItem_sku_idx" ON "SalesOrderItem"("sku");

-- CreateIndex
CREATE INDEX "PickTask_orderId_status_idx" ON "PickTask"("orderId", "status");

-- CreateIndex
CREATE INDEX "PickTask_sku_lpn_fromLocation_idx" ON "PickTask"("sku", "lpn", "fromLocation");

-- CreateIndex
CREATE INDEX "PickTask_pickedBy_idx" ON "PickTask"("pickedBy");

-- CreateIndex
CREATE INDEX "PickTask_cartonId_idx" ON "PickTask"("cartonId");

-- CreateIndex
CREATE UNIQUE INDEX "Carton_cartonNumber_key" ON "Carton"("cartonNumber");

-- CreateIndex
CREATE INDEX "Carton_shipmentId_idx" ON "Carton"("shipmentId");

-- CreateIndex
CREATE INDEX "Carton_packedBy_idx" ON "Carton"("packedBy");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_shipmentNumber_key" ON "Shipment"("shipmentNumber");

-- CreateIndex
CREATE INDEX "Shipment_orderId_status_idx" ON "Shipment"("orderId", "status");

-- CreateIndex
CREATE INDEX "Shipment_shippedBy_idx" ON "Shipment"("shippedBy");

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_customerReference_fkey" FOREIGN KEY ("customerReference") REFERENCES "Customer"("reference") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SalesOrder"("orderNumber") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_sku_fkey" FOREIGN KEY ("sku") REFERENCES "Sku"("sku") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickTask" ADD CONSTRAINT "PickTask_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SalesOrder"("orderNumber") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickTask" ADD CONSTRAINT "PickTask_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "SalesOrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickTask" ADD CONSTRAINT "PickTask_fromLocation_fkey" FOREIGN KEY ("fromLocation") REFERENCES "Location"("location") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickTask" ADD CONSTRAINT "PickTask_pickedBy_fkey" FOREIGN KEY ("pickedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickTask" ADD CONSTRAINT "PickTask_cartonId_fkey" FOREIGN KEY ("cartonId") REFERENCES "Carton"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Carton" ADD CONSTRAINT "Carton_packedBy_fkey" FOREIGN KEY ("packedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Carton" ADD CONSTRAINT "Carton_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SalesOrder"("orderNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_shippedBy_fkey" FOREIGN KEY ("shippedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
