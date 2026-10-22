-- CreateEnum
CREATE TYPE "PostApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "Post"
  ADD COLUMN "approvalStatus" "PostApprovalStatus" NOT NULL DEFAULT 'pending';

-- Existing live posts stay public.
UPDATE "Post" SET "approvalStatus" = 'approved' WHERE "deletedAt" IS NULL;

-- CreateIndex
CREATE INDEX "Post_approvalStatus_idx" ON "Post"("approvalStatus");
