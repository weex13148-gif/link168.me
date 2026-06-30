-- ============================================================
-- Schema 漂移纠正：补齐 users/profiles/links/reports/email_verification_tokens 的缺失列
-- 说明：
--   1. 以下字段存在于 prisma/schema.prisma，但在历史迁移中未被创建
--   2. 所有列的默认值与 schema 严格一致
--   3. 索引与 @@index 保持一致
--   4. 不使用 IF NOT EXISTS —— 若同名列已存在应显式暴露漂移
-- ============================================================

ALTER TABLE "users"
  ADD COLUMN "frozen_reason" TEXT,
  ADD COLUMN "frozen_at" TIMESTAMPTZ(6),
  ADD COLUMN "username_changes" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "profiles"
  ADD COLUMN "template" TEXT NOT NULL DEFAULT 'business';

ALTER TABLE "links"
  ADD COLUMN "type" TEXT NOT NULL DEFAULT 'link',
  ADD COLUMN "payload_json" TEXT;

ALTER TABLE "reports"
  ADD COLUMN "handler_note" TEXT,
  ADD COLUMN "processed_at" TIMESTAMPTZ(6);

ALTER TABLE "email_verification_tokens"
  ADD COLUMN "used_at" TIMESTAMPTZ(6),
  ADD COLUMN "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "links_profile_id_type_idx" ON "links"("profile_id", "type");

CREATE INDEX "email_verification_tokens_user_id_created_at_idx"
  ON "email_verification_tokens"("user_id", "created_at");
