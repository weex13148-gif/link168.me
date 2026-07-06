-- AlterTable
ALTER TABLE "users" ADD COLUMN     "account_status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "deactivated_at" TIMESTAMPTZ(6),
ADD COLUMN     "deactivation_reason" TEXT;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "display_name_anonymized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "avatar_moderation_status" TEXT NOT NULL DEFAULT 'legacy_approved',
ADD COLUMN     "cover_image_url" TEXT,
ADD COLUMN     "cover_image_moderation_status" TEXT NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "links" ADD COLUMN     "icon_moderation_status" TEXT NOT NULL DEFAULT 'legacy_approved';

-- AlterTable
ALTER TABLE "ai_service_configs" ADD COLUMN     "allow_report" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allow_transfer_to_human" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "privacy_notice_text" TEXT;

-- CreateTable
CREATE TABLE "content_moderation_records" (
    "id" UUID NOT NULL,
    "content_type" TEXT NOT NULL,
    "content_ref" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "risk_level" TEXT,
    "hits" JSONB,
    "reason" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'local',
    "reviewed_at" TIMESTAMPTZ(6),
    "reviewer_id" UUID,
    "appeal_status" TEXT NOT NULL DEFAULT 'none',
    "appealed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "content_moderation_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_moderation_records_content_type_content_ref_idx" ON "content_moderation_records"("content_type", "content_ref");

-- CreateUniqueIndex
CREATE UNIQUE INDEX IF NOT EXISTS "content_moderation_records_content_type_content_ref_key" ON "content_moderation_records"("content_type", "content_ref");

-- CreateIndex
CREATE INDEX "content_moderation_records_status_created_at_idx" ON "content_moderation_records"("status", "created_at");
