-- CreateIndex
CREATE INDEX "products_ratings_avg_ratings_count_idx" ON "products"("ratings_avg", "ratings_count");
