-- AlterTable
ALTER TABLE "categories" ADD COLUMN "featured_on_home" BOOLEAN NOT NULL DEFAULT false;

-- Catégories racines actives visibles sur l’accueil par défaut
UPDATE "categories"
SET "featured_on_home" = true
WHERE "parent_id" IS NULL AND "is_active" = true;
