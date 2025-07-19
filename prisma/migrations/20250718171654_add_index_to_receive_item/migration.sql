-- DropIndex
DROP INDEX "ReceiveItem_orderItemId_idx";

-- CreateIndex
CREATE INDEX "ReceiveItem_orderItemId_lpn_sku_idx" ON "ReceiveItem"("orderItemId", "lpn", "sku");
