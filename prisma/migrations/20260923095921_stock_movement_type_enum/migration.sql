/*
  Warnings:

  - Changed the type of `type` on the `StockMovement` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('in', 'out');

-- AlterTable
ALTER TABLE "StockMovement" DROP COLUMN "type",
ADD COLUMN     "type" "StockMovementType" NOT NULL;
