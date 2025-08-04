-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('ADDITION', 'SUBTRACTION');

-- CreateTable
CREATE TABLE "Adjustment" (
    "id" TEXT NOT NULL,
    "orderItemId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "adjustmentType" "AdjustmentType" NOT NULL,
    "orderId" TEXT NOT NULL,
    "adjustedQuantity" INTEGER NOT NULL,
    "adjustedBy" TEXT NOT NULL,
    "adjustedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Adjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Adjustment_id_key" ON "Adjustment"("id");

-- CreateIndex
CREATE INDEX "Adjustment_orderItemId_idx" ON "Adjustment"("orderItemId");

-- AddForeignKey
ALTER TABLE "Adjustment" ADD CONSTRAINT "Adjustment_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adjustment" ADD CONSTRAINT "Adjustment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("orderNumber") ON DELETE RESTRICT ON UPDATE CASCADE;
