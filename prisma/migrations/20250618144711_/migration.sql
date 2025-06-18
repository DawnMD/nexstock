/*
  Warnings:

  - You are about to drop the column `purchaseOrderType` on the `Order` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('Standard', 'Import', 'Return');

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "purchaseOrderType",
ADD COLUMN     "orderType" "OrderType" NOT NULL DEFAULT 'Standard';
