-- CreateEnum
CREATE TYPE "PostOptionKind" AS ENUM (
  'specialty',
  'skill',
  'work_type',
  'salary_type',
  'service_place',
  'pricing',
  'sell_method',
  'price_method',
  'condition'
);

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "salaryType" TEXT;
ALTER TABLE "Post" ADD COLUMN "servicePlace" TEXT;
ALTER TABLE "Post" ADD COLUMN "sellMethod" TEXT;
ALTER TABLE "Post" ADD COLUMN "priceMethod" TEXT;

-- CreateTable
CREATE TABLE "PostOption" (
  "id" TEXT NOT NULL,
  "kind" "PostOptionKind" NOT NULL,
  "postTypes" "PostType"[],
  "label" TEXT NOT NULL,
  "parentId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PostOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostOption_kind_active_idx" ON "PostOption"("kind", "active");

-- CreateIndex
CREATE INDEX "PostOption_parentId_idx" ON "PostOption"("parentId");

-- AddForeignKey
ALTER TABLE "PostOption" ADD CONSTRAINT "PostOption_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "PostOption"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
