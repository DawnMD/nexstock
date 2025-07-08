/*
  Warnings:

  - You are about to drop the column `isAccepted` on the `QualityCheck` table. All the data in the column will be lost.
  - The `qualityCheckStatus` column on the `QualityCheck` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "QualityCheck" DROP COLUMN "isAccepted",
DROP COLUMN "qualityCheckStatus",
ADD COLUMN     "qualityCheckStatus" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "QualityCheck_qualityCheckStatus_orderItemId_idx" ON "QualityCheck"("qualityCheckStatus", "orderItemId");
