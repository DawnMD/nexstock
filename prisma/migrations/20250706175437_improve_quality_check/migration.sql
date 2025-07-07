/*
  Warnings:

  - You are about to drop the column `qualityCheck` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the `Qc` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "QualityCheckStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PASSED', 'FAILED');

-- DropForeignKey
ALTER TABLE "Qc" DROP CONSTRAINT "Qc_orderItemId_fkey";

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "qualityCheck",
ADD COLUMN     "qualityCheckRequired" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "Qc";

-- DropEnum
DROP TYPE "QcStatus";

-- CreateTable
CREATE TABLE "QualityCheck" (
    "id" SERIAL NOT NULL,
    "orderItemId" INTEGER NOT NULL,
    "qualityCheckStatus" "QualityCheckStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "inspectedBy" TEXT NOT NULL,
    "inspectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isAccepted" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,
    "inspectedQuantity" INTEGER NOT NULL DEFAULT 0,
    "descrepencyQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualityCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QualityCheck_orderItemId_key" ON "QualityCheck"("orderItemId");

-- CreateIndex
CREATE INDEX "QualityCheck_qualityCheckStatus_orderItemId_idx" ON "QualityCheck"("qualityCheckStatus", "orderItemId");

-- AddForeignKey
ALTER TABLE "QualityCheck" ADD CONSTRAINT "QualityCheck_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
