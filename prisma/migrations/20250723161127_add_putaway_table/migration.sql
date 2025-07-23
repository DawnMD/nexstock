-- CreateTable
CREATE TABLE "Putaway" (
    "id" SERIAL NOT NULL,
    "lpn" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "fromLocation" TEXT NOT NULL,
    "toLocation" TEXT NOT NULL,
    "putawayBy" TEXT NOT NULL,
    "putawayAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Putaway_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Putaway_lpn_sku_fromLocation_toLocation_idx" ON "Putaway"("lpn", "sku", "fromLocation", "toLocation");

-- AddForeignKey
ALTER TABLE "Putaway" ADD CONSTRAINT "Putaway_toLocation_fkey" FOREIGN KEY ("toLocation") REFERENCES "Location"("location") ON DELETE RESTRICT ON UPDATE CASCADE;
