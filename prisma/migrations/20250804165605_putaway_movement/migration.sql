-- AlterTable
ALTER TABLE "Putaway" ADD COLUMN     "receiveItemId" INTEGER;

-- AddForeignKey
ALTER TABLE "Putaway" ADD CONSTRAINT "Putaway_receiveItemId_fkey" FOREIGN KEY ("receiveItemId") REFERENCES "ReceiveItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
