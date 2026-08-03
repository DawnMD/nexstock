-- The inventory core: an append-only signed ledger (InventoryMovement) plus its
-- materialised running total (InventoryBalance), written in the same
-- transaction so the two can never disagree.
--
-- `lot` is NOT NULL DEFAULT '' on both tables rather than nullable. It is part
-- of InventoryBalance's unique key, and Postgres treats NULLs as distinct in a
-- unique index, so a nullable column would let un-lotted stock create a brand
-- new balance row on every single movement instead of accumulating into one.
--
-- This migration only creates the structure; 20260803140001_backfill_inventory
-- reconstructs movements from the existing receive/putaway/adjustment/QC rows.

-- CreateEnum
CREATE TYPE "MovementReason" AS ENUM ('RECEIPT', 'QC_REJECT', 'ADJUSTMENT_ADD', 'ADJUSTMENT_SUB', 'PUTAWAY_OUT', 'PUTAWAY_IN', 'TRANSFER');

-- CreateEnum
CREATE TYPE "MovementRefType" AS ENUM ('RECEIVE_ITEM', 'PUTAWAY', 'ADJUSTMENT', 'QUALITY_CHECK');

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "lpn" TEXT NOT NULL,
    "lot" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" "MovementReason" NOT NULL,
    "refType" "MovementRefType" NOT NULL,
    "refId" TEXT NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryBalance" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "lot" TEXT NOT NULL DEFAULT '',
    "lpn" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryBalance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryMovement_sku_location_lot_lpn_idx" ON "InventoryMovement"("sku", "location", "lot", "lpn");

-- CreateIndex
CREATE INDEX "InventoryMovement_refType_refId_idx" ON "InventoryMovement"("refType", "refId");

-- CreateIndex
CREATE INDEX "InventoryMovement_createdAt_idx" ON "InventoryMovement"("createdAt");

-- CreateIndex
CREATE INDEX "InventoryBalance_sku_idx" ON "InventoryBalance"("sku");

-- CreateIndex
CREATE INDEX "InventoryBalance_location_idx" ON "InventoryBalance"("location");

-- CreateIndex
CREATE INDEX "InventoryBalance_lpn_idx" ON "InventoryBalance"("lpn");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryBalance_sku_location_lot_lpn_key" ON "InventoryBalance"("sku", "location", "lot", "lpn");

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_sku_fkey" FOREIGN KEY ("sku") REFERENCES "Sku"("sku") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_location_fkey" FOREIGN KEY ("location") REFERENCES "Location"("location") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_sku_fkey" FOREIGN KEY ("sku") REFERENCES "Sku"("sku") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_location_fkey" FOREIGN KEY ("location") REFERENCES "Location"("location") ON DELETE RESTRICT ON UPDATE CASCADE;

