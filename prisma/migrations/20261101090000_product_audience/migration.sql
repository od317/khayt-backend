CREATE TYPE "ProductAudience" AS ENUM ('store', 'workshop', 'both');

ALTER TABLE "Product"
ADD COLUMN "audience" "ProductAudience" NOT NULL DEFAULT 'both';
