/*
  Warnings:

  - Added the required column `adjustmentBatchId` to the `Adjustment` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Adjustment_orderItemId_idx";

-- AlterTable
ALTER TABLE "Adjustment" ADD COLUMN     "adjustmentBatchId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "AdjustmentBatch" (
    "id" TEXT NOT NULL,
    "reference" TEXT,
    "adjustedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdjustmentBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdjustmentBatch_adjustedBy_idx" ON "AdjustmentBatch"("adjustedBy");

-- CreateIndex
CREATE INDEX "Adjustment_orderItemId_orderId_adjustmentBatchId_idx" ON "Adjustment"("orderItemId", "orderId", "adjustmentBatchId");

-- AddForeignKey
ALTER TABLE "Adjustment" ADD CONSTRAINT "Adjustment_adjustmentBatchId_fkey" FOREIGN KEY ("adjustmentBatchId") REFERENCES "AdjustmentBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
