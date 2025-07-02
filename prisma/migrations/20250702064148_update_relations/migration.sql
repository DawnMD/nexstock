/*
  Warnings:

  - The `paymentStatus` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Made the column `containerCondition` on table `DockActivity` required. This step will fail if there are existing NULL values in that column.
  - Made the column `orderId` on table `DockBooking` required. This step will fail if there are existing NULL values in that column.
  - Made the column `orderId` on table `OrderItem` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'NOT_PAID');

-- DropForeignKey
ALTER TABLE "DockBooking" DROP CONSTRAINT "DockBooking_orderId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_orderId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_skuId_fkey";

-- AlterTable
ALTER TABLE "DockActivity" ALTER COLUMN "containerCondition" SET NOT NULL,
ALTER COLUMN "containerCondition" SET DEFAULT false;

-- AlterTable
ALTER TABLE "DockBooking" ALTER COLUMN "orderId" SET NOT NULL,
ALTER COLUMN "orderId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "paymentStatus",
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NOT_PAID';

-- AlterTable
ALTER TABLE "OrderItem" ALTER COLUMN "orderId" SET NOT NULL,
ALTER COLUMN "orderId" SET DATA TYPE TEXT,
ALTER COLUMN "skuId" SET DATA TYPE TEXT;

-- CreateIndex
CREATE INDEX "Dock_name_idx" ON "Dock"("name");

-- CreateIndex
CREATE INDEX "VehicleType_type_idx" ON "VehicleType"("type");

-- CreateIndex
CREATE INDEX "Vendor_reference_idx" ON "Vendor"("reference");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("orderNumber") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("sku") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DockBooking" ADD CONSTRAINT "DockBooking_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("orderNumber") ON DELETE RESTRICT ON UPDATE CASCADE;
