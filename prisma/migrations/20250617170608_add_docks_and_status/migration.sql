-- CreateEnum
CREATE TYPE "DockStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "Dock" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" "DockStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dock_pkey" PRIMARY KEY ("id")
);
