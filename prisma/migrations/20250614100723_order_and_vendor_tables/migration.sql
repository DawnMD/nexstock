-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Vendor" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "reference" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" BIGSERIAL NOT NULL,
    "orderNumber" VARCHAR(50) NOT NULL,
    "businessUnit" VARCHAR(50) NOT NULL,
    "purchaseOrderType" INTEGER NOT NULL,
    "purchaseOrderDate" TIMESTAMP(3),
    "expectedReceiptDate" TIMESTAMP(3),
    "status" "OrderStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "vendorReference" VARCHAR(50) NOT NULL,
    "vendorName" VARCHAR(100) NOT NULL,
    "buyerName" VARCHAR(100),
    "buyerCity" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" VARCHAR(50) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" VARCHAR(50) NOT NULL,
    "paymentStatus" VARCHAR(50),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_reference_key" ON "Vendor"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_vendorReference_key" ON "Order"("vendorReference");

-- CreateIndex
CREATE INDEX "Order_vendorReference_idx" ON "Order"("vendorReference");

-- CreateIndex
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_vendorReference_fkey" FOREIGN KEY ("vendorReference") REFERENCES "Vendor"("reference") ON DELETE RESTRICT ON UPDATE CASCADE;
