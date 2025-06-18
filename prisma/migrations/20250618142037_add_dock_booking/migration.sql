/*
  Warnings:

  - You are about to drop the `Vehicle` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Vehicle" DROP CONSTRAINT "Vehicle_dockId_fkey";

-- DropTable
DROP TABLE "Vehicle";

-- CreateTable
CREATE TABLE "VehicleType" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unloadTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DockBooking" (
    "id" SERIAL NOT NULL,
    "dockId" INTEGER NOT NULL,
    "vehicleTypeId" INTEGER NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "queue" INTEGER NOT NULL,
    "cbm" INTEGER NOT NULL,
    "driverName" TEXT NOT NULL,
    "driverPhone" TEXT,
    "eta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderId" INTEGER,

    CONSTRAINT "DockBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DockBooking_orderId_idx" ON "DockBooking"("orderId");

-- AddForeignKey
ALTER TABLE "DockBooking" ADD CONSTRAINT "DockBooking_dockId_fkey" FOREIGN KEY ("dockId") REFERENCES "Dock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DockBooking" ADD CONSTRAINT "DockBooking_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "VehicleType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DockBooking" ADD CONSTRAINT "DockBooking_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
