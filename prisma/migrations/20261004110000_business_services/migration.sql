-- AlterTable
ALTER TABLE "Business" ADD COLUMN "services" TEXT[] DEFAULT ARRAY[]::TEXT[];
