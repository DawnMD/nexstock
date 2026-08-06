-- The audit columns (createdBy, updatedBy, receivedBy, putawayBy, inspectedBy,
-- adjustedBy) become real foreign keys onto "User" below. Under Clerk they held
-- unconstrained text, so this migration first has to guarantee every value they
-- can legitimately hold points at a row that exists.
--
-- The one such value baked into the migration history is 'SYSTEM': the STAGE
-- location inserted by 20260803120000_lpn_unique_and_location_fks is created
-- with createdBy = updatedBy = 'SYSTEM', and that row is replayed on every
-- `prisma migrate reset`. So mint a synthetic SYSTEM user to receive it.
--
-- It deliberately has no "Account" row, so it has no password and can never
-- sign in — it exists only to own rows that no human created. `prisma/seed.ts`
-- upserts the same id when run without `--user-id`.
INSERT INTO "User" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
VALUES ('SYSTEM', 'System', 'system@nexstock.local', true, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

-- CreateIndex
CREATE INDEX "Adjustment_adjustedBy_idx" ON "Adjustment"("adjustedBy");

-- CreateIndex
CREATE INDEX "DockActivity_createdBy_idx" ON "DockActivity"("createdBy");

-- CreateIndex
CREATE INDEX "DockActivity_updatedBy_idx" ON "DockActivity"("updatedBy");

-- CreateIndex
CREATE INDEX "InventoryMovement_createdBy_idx" ON "InventoryMovement"("createdBy");

-- CreateIndex
CREATE INDEX "Location_createdBy_idx" ON "Location"("createdBy");

-- CreateIndex
CREATE INDEX "Location_updatedBy_idx" ON "Location"("updatedBy");

-- CreateIndex
CREATE INDEX "Order_createdBy_idx" ON "Order"("createdBy");

-- CreateIndex
CREATE INDEX "Order_updatedBy_idx" ON "Order"("updatedBy");

-- CreateIndex
CREATE INDEX "Putaway_putawayBy_idx" ON "Putaway"("putawayBy");

-- CreateIndex
CREATE INDEX "QualityCheck_inspectedBy_idx" ON "QualityCheck"("inspectedBy");

-- CreateIndex
CREATE INDEX "ReceiveItem_receivedBy_idx" ON "ReceiveItem"("receivedBy");

-- CreateIndex
CREATE INDEX "Sku_createdBy_idx" ON "Sku"("createdBy");

-- CreateIndex
CREATE INDEX "Sku_updatedBy_idx" ON "Sku"("updatedBy");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DockActivity" ADD CONSTRAINT "DockActivity_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DockActivity" ADD CONSTRAINT "DockActivity_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sku" ADD CONSTRAINT "Sku_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sku" ADD CONSTRAINT "Sku_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityCheck" ADD CONSTRAINT "QualityCheck_inspectedBy_fkey" FOREIGN KEY ("inspectedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiveItem" ADD CONSTRAINT "ReceiveItem_receivedBy_fkey" FOREIGN KEY ("receivedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adjustment" ADD CONSTRAINT "Adjustment_adjustedBy_fkey" FOREIGN KEY ("adjustedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Putaway" ADD CONSTRAINT "Putaway_putawayBy_fkey" FOREIGN KEY ("putawayBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
