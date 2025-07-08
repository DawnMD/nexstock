-- CreateTable
CREATE TABLE "ReceiveItem" (
    "id" SERIAL NOT NULL,
    "orderItemId" INTEGER NOT NULL,
    "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
    "receivedBy" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "sku" TEXT NOT NULL,
    "receivedNotes" TEXT,
    "location" TEXT NOT NULL,
    "lpn" TEXT NOT NULL,
    "lot" TEXT,
    "manufacturedDate" TIMESTAMP(3),
    "uom" TEXT NOT NULL,
    "lotExpiryDate" TIMESTAMP(3),
    "vehicleNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceiveItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReceiveItem_orderItemId_key" ON "ReceiveItem"("orderItemId");

-- CreateIndex
CREATE INDEX "ReceiveItem_orderItemId_idx" ON "ReceiveItem"("orderItemId");

-- AddForeignKey
ALTER TABLE "ReceiveItem" ADD CONSTRAINT "ReceiveItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
