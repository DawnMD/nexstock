-- CreateEnum
CREATE TYPE "QcStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PASSED', 'FAILED', 'DONE');

-- CreateTable
CREATE TABLE "Qc" (
    "id" SERIAL NOT NULL,
    "orderItemId" INTEGER NOT NULL,
    "qcStatus" "QcStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "inspectedBy" TEXT NOT NULL,
    "inspectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isAccepted" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,
    "inspectedQuantity" INTEGER NOT NULL DEFAULT 0,
    "descrepencyQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Qc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Qc_orderItemId_key" ON "Qc"("orderItemId");

-- CreateIndex
CREATE INDEX "Qc_qcStatus_orderItemId_idx" ON "Qc"("qcStatus", "orderItemId");

-- AddForeignKey
ALTER TABLE "Qc" ADD CONSTRAINT "Qc_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
