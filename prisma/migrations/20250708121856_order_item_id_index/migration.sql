-- DropIndex
DROP INDEX "OrderItem_status_skuId_idx";

-- CreateIndex
CREATE INDEX "OrderItem_status_skuId_id_idx" ON "OrderItem"("status", "skuId", "id");
