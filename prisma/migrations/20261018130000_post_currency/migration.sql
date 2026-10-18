-- AlterEnum
ALTER TYPE "PostOptionKind" ADD VALUE 'currency';

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "currency" TEXT;
