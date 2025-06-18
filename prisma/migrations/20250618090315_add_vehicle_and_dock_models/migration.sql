-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "orderedQuantity" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Dock" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" SERIAL NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "queue" INTEGER NOT NULL,
    "cbm" INTEGER NOT NULL,
    "weight" INTEGER,
    "driverName" TEXT NOT NULL,
    "driverPhone" TEXT NOT NULL,
    "eta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dockId" INTEGER,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vehicle_vehicleNumber_dockId_idx" ON "Vehicle"("vehicleNumber", "dockId");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_dockId_fkey" FOREIGN KEY ("dockId") REFERENCES "Dock"("id") ON DELETE SET NULL ON UPDATE CASCADE;
