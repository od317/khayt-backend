-- Platform-owned products: detach Product/Supply/OrderLine from Business.

-- 1) Collapse Supply to one row per product (keep highest remaining).
DELETE FROM "Supply" s
USING "Supply" s2
WHERE s."productId" = s2."productId"
  AND (
    s."remaining" < s2."remaining"
    OR (s."remaining" = s2."remaining" AND s."id" > s2."id")
  );

ALTER TABLE "Supply" DROP CONSTRAINT IF EXISTS "Supply_businessId_fkey";
DROP INDEX IF EXISTS "Supply_businessId_productId_key";
DROP INDEX IF EXISTS "Supply_businessId_idx";
ALTER TABLE "Supply" DROP COLUMN "businessId";
CREATE UNIQUE INDEX "Supply_productId_key" ON "Supply"("productId");

-- 2) Product no longer belongs to a business.
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_businessId_fkey";
DROP INDEX IF EXISTS "Product_businessId_idx";
ALTER TABLE "Product" DROP COLUMN "businessId";

-- 3) OrderLine no longer snapshots a seller business.
ALTER TABLE "OrderLine" DROP CONSTRAINT IF EXISTS "OrderLine_businessId_fkey";
DROP INDEX IF EXISTS "OrderLine_businessId_idx";
ALTER TABLE "OrderLine" DROP COLUMN "businessId";
