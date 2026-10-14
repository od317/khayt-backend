-- AlterTable
ALTER TABLE "Product" ADD COLUMN "supplierBusinessId" TEXT;

-- CreateIndex
CREATE INDEX "Product_supplierBusinessId_idx" ON "Product"("supplierBusinessId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_supplierBusinessId_fkey" FOREIGN KEY ("supplierBusinessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
