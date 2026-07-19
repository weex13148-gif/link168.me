CREATE TABLE "media_assets" (
  "id" UUID NOT NULL,
  "owner_user_id" UUID NOT NULL,
  "profile_id" UUID,
  "purpose" TEXT NOT NULL,
  "storage_provider" TEXT NOT NULL DEFAULT 'local',
  "storage_key" TEXT NOT NULL,
  "original_name" TEXT,
  "mime_type" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "checksum_sha256" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'uploading',
  "moderation_reason" TEXT,
  "deleted_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "media_assets_status_check" CHECK (
    "status" IN ('uploading', 'pending_review', 'approved', 'rejected', 'deleted')
  ),
  CONSTRAINT "media_assets_size_bytes_check" CHECK ("size_bytes" >= 0)
);

CREATE UNIQUE INDEX "media_assets_storage_key_key" ON "media_assets"("storage_key");
CREATE INDEX "media_assets_owner_user_id_purpose_status_idx"
  ON "media_assets"("owner_user_id", "purpose", "status");
CREATE INDEX "media_assets_profile_id_purpose_status_idx"
  ON "media_assets"("profile_id", "purpose", "status");

ALTER TABLE "media_assets"
  ADD CONSTRAINT "media_assets_owner_user_id_fkey"
  FOREIGN KEY ("owner_user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "media_assets"
  ADD CONSTRAINT "media_assets_profile_id_fkey"
  FOREIGN KEY ("profile_id") REFERENCES "profiles"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "profiles" ADD COLUMN "avatar_asset_id" UUID;
CREATE UNIQUE INDEX "profiles_avatar_asset_id_key" ON "profiles"("avatar_asset_id");
ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_avatar_asset_id_fkey"
  FOREIGN KEY ("avatar_asset_id") REFERENCES "media_assets"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
