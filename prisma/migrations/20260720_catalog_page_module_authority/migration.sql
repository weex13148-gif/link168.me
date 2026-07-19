-- Phase 2: establish authoritative CatalogItem and PageModule persistence.

-- Expand Product into the CatalogItem persistence model.
ALTER TABLE "products"
  ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'product',
  ADD COLUMN "status" TEXT,
  ADD COLUMN "cover_asset_id" UUID,
  ADD COLUMN "archived_at" TIMESTAMPTZ(6);

-- Preserve the legacy publication meaning before removing is_active.
UPDATE "products"
SET "status" = CASE
  WHEN "is_active" = TRUE THEN 'published'
  ELSE 'archived'
END;

ALTER TABLE "products"
  ALTER COLUMN "status" SET NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'draft';

DROP INDEX IF EXISTS "products_user_id_is_active_sort_order_idx";
ALTER TABLE "products" DROP COLUMN "is_active";

-- Expand Link into the ordered PageModule persistence model.
ALTER TABLE "links"
  ADD COLUMN "catalog_item_id" UUID,
  ADD COLUMN "schema_version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "products"
  ADD CONSTRAINT "products_kind_check"
    CHECK ("kind" IN ('product', 'service')),
  ADD CONSTRAINT "products_status_check"
    CHECK ("status" IN ('draft', 'published', 'archived')),
  ADD CONSTRAINT "products_cover_asset_id_fkey"
    FOREIGN KEY ("cover_asset_id") REFERENCES "media_assets"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "links"
  ADD CONSTRAINT "links_catalog_item_id_fkey"
    FOREIGN KEY ("catalog_item_id") REFERENCES "products"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "links_schema_version_positive_check"
    CHECK ("schema_version" > 0);

CREATE UNIQUE INDEX "products_cover_asset_id_key"
  ON "products"("cover_asset_id");
CREATE INDEX "products_user_id_status_sort_order_idx"
  ON "products"("user_id", "status", "sort_order");
CREATE INDEX "links_catalog_item_id_idx"
  ON "links"("catalog_item_id");
