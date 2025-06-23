-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CHECK_IN', 'OPEN', 'CLOSE', 'CHECK_OUT');

-- CreateTable
CREATE TABLE "DockActivity" (
    "id" SERIAL NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "containerCondition" BOOLEAN,
    "notes" TEXT,
    "dockBookingId" INTEGER NOT NULL,

    CONSTRAINT "DockActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DockActivity_dockBookingId_idx" ON "DockActivity"("dockBookingId");

-- AddForeignKey
ALTER TABLE "DockActivity" ADD CONSTRAINT "DockActivity_dockBookingId_fkey" FOREIGN KEY ("dockBookingId") REFERENCES "DockBooking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
