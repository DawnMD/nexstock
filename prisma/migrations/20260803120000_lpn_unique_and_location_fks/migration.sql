-- Make the staging bay a real Location before the foreign keys below land.
-- Receiving writes ReceiveItem.location = 'STAGE' and putaway reads it back as
-- Putaway.fromLocation, so both new FKs need this row to exist.
INSERT INTO "Location" ("location", "status", "length", "width", "height", "cbm", "weightCapacity", "zone", "aisle", "description", "createdBy", "updatedBy", "createdAt", "updatedAt")
SELECT 'STAGE', true, 2000, 1000, 400, 800, 50000, 'STAGE', '0', 'Inbound staging bay - goods sit here until putaway', 'SYSTEM', 'SYSTEM', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Location" WHERE "location" = 'STAGE');

-- DropForeignKey
ALTER TABLE "DockActivity" DROP CONSTRAINT "DockActivity_dockBookingId_fkey";

-- DropForeignKey
ALTER TABLE "QualityCheck" DROP CONSTRAINT "QualityCheck_orderItemId_fkey";

-- CreateIndex
-- An LPN is a physical pallet label, so it identifies exactly one receipt across
-- the warehouse. This is what lets putaway look receipts up with findUnique.
-- If this fails with a duplicate key error, the database already holds reused
-- LPNs and they have to be renumbered (or the data reseeded) before it applies.
CREATE UNIQUE INDEX "ReceiveItem_lpn_key" ON "ReceiveItem"("lpn");

-- AddForeignKey
ALTER TABLE "DockActivity" ADD CONSTRAINT "DockActivity_dockBookingId_fkey" FOREIGN KEY ("dockBookingId") REFERENCES "DockBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityCheck" ADD CONSTRAINT "QualityCheck_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiveItem" ADD CONSTRAINT "ReceiveItem_location_fkey" FOREIGN KEY ("location") REFERENCES "Location"("location") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Putaway" ADD CONSTRAINT "Putaway_fromLocation_fkey" FOREIGN KEY ("fromLocation") REFERENCES "Location"("location") ON DELETE RESTRICT ON UPDATE CASCADE;
