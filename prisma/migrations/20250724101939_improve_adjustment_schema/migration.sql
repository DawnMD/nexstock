-- DropIndex
DROP INDEX "Adjustment_orderItemId_idx";

-- AlterTable
ALTER TABLE "Adjustment" ALTER COLUMN "reason" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Adjustment_orderItemId_orderId_id_idx" ON "Adjustment"("orderItemId", "orderId", "id");
