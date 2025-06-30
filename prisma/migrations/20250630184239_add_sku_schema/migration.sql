/*
  Warnings:

  - You are about to drop the column `sku` on the `OrderItem` table. All the data in the column will be lost.
  - Added the required column `skuId` to the `OrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "OrderItem_status_sku_idx";

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "sku",
ADD COLUMN     "skuId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Sku" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,
    "length" DOUBLE PRECISION,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "cbm" DOUBLE PRECISION,
    "uom" TEXT,
    "qualityCheck" BOOLEAN NOT NULL DEFAULT false,
    "hasShelfLife" BOOLEAN NOT NULL DEFAULT false,
    "shelfLifeDays" INTEGER,
    "storageType" TEXT,
    "storageZone" TEXT,
    "department" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "lot" TEXT,
    "lotExpiryDate" TIMESTAMP(3),

    CONSTRAINT "Sku_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sku_sku_key" ON "Sku"("sku");

-- CreateIndex
CREATE INDEX "Sku_sku_idx" ON "Sku"("sku");

-- CreateIndex
CREATE INDEX "OrderItem_status_skuId_idx" ON "OrderItem"("status", "skuId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
