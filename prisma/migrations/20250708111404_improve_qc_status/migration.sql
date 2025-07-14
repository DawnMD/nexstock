/*
  Warnings:

  - The values [NOT_STARTED,IN_PROGRESS] on the enum `QualityCheckStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "QualityCheckStatus_new" AS ENUM ('PASSED', 'FAILED');
ALTER TABLE "QualityCheck" ALTER COLUMN "qualityCheckStatus" DROP DEFAULT;
ALTER TABLE "QualityCheck" ALTER COLUMN "qualityCheckStatus" TYPE "QualityCheckStatus_new" USING ("qualityCheckStatus"::text::"QualityCheckStatus_new");
ALTER TYPE "QualityCheckStatus" RENAME TO "QualityCheckStatus_old";
ALTER TYPE "QualityCheckStatus_new" RENAME TO "QualityCheckStatus";
DROP TYPE "QualityCheckStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "QualityCheck" ALTER COLUMN "qualityCheckStatus" DROP NOT NULL,
ALTER COLUMN "qualityCheckStatus" DROP DEFAULT;
