-- AlterTable
ALTER TABLE "products" ADD COLUMN "is_new" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "products_is_new_idx" ON "products"("is_new");
