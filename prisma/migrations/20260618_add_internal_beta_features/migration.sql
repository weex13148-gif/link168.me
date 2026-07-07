-- ============================================================
-- 人工审查结论（P0-5）：本迁移脚本仅新增列 / 新建表，无破坏性操作
--   - 所有 ALTER TABLE ADD COLUMN 带 IF NOT EXISTS
--   - 所有 NOT NULL 列均有 DEFAULT 值，不会导致已存在数据行写入失败
--   - 所有 CREATE TABLE 带 IF NOT EXISTS，可幂等执行
--   - 无 DROP TABLE / TRUNCATE / DELETE / ALTER COLUMN TYPE 等破坏性操作
-- 操作流程：
--   1) 在 staging 数据库执行：prisma migrate deploy --schema=prisma/schema.prisma
--   2) 验证各表结构与初始数据（SELECT * FROM "short_links" LIMIT 1; 等）
--   3) 无异常后，在生产数据库执行同样命令；执行前建议全量备份
-- ============================================================

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "custom_theme" TEXT,
  ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'zh';

ALTER TABLE "links"
  ADD COLUMN IF NOT EXISTS "icon_type" TEXT NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS "icon_value" TEXT,
  ADD COLUMN IF NOT EXISTS "total_clicks" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "sessions"
  ADD COLUMN IF NOT EXISTS "user_agent" TEXT,
  ADD COLUMN IF NOT EXISTS "ip_address" TEXT,
  ADD COLUMN IF NOT EXISTS "last_active" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "used" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_hash_key"
  ON "password_reset_tokens"("token_hash");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'password_reset_tokens_user_id_fkey') THEN
    ALTER TABLE "password_reset_tokens"
      ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "used" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_verification_tokens_token_hash_key"
  ON "email_verification_tokens"("token_hash");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_verification_tokens_user_id_fkey') THEN
    ALTER TABLE "email_verification_tokens"
      ADD CONSTRAINT "email_verification_tokens_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "login_attempts" (
  "id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "ip_address" TEXT NOT NULL,
  "success" BOOLEAN NOT NULL,
  "locked" BOOLEAN NOT NULL DEFAULT false,
  "lock_until" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "login_attempts_email_created_at_idx"
  ON "login_attempts"("email", "created_at");

CREATE INDEX IF NOT EXISTS "login_attempts_ip_address_created_at_idx"
  ON "login_attempts"("ip_address", "created_at");

CREATE TABLE IF NOT EXISTS "app_configs" (
  "id" UUID NOT NULL,
  "config_key" TEXT NOT NULL,
  "config_value" TEXT NOT NULL,
  "is_sensitive" BOOLEAN NOT NULL DEFAULT false,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "app_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "app_configs_config_key_key"
  ON "app_configs"("config_key");

CREATE TABLE IF NOT EXISTS "ai_usage_logs" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "assistant" TEXT NOT NULL,
  "usage_date" DATE NOT NULL,
  "call_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_usage_logs_user_id_assistant_usage_date_key"
  ON "ai_usage_logs"("user_id", "assistant", "usage_date");

CREATE INDEX IF NOT EXISTS "ai_usage_logs_user_id_usage_date_idx"
  ON "ai_usage_logs"("user_id", "usage_date");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_usage_logs_user_id_fkey') THEN
    ALTER TABLE "ai_usage_logs"
      ADD CONSTRAINT "ai_usage_logs_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "short_links" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "slug" TEXT NOT NULL,
  "target_url" TEXT NOT NULL,
  "total_clicks" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "short_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "short_links_slug_key"
  ON "short_links"("slug");

CREATE INDEX IF NOT EXISTS "short_links_slug_idx"
  ON "short_links"("slug");

CREATE INDEX IF NOT EXISTS "short_links_user_id_created_at_idx"
  ON "short_links"("user_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'short_links_user_id_fkey') THEN
    ALTER TABLE "short_links"
      ADD CONSTRAINT "short_links_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "link_clicks" (
  "id" UUID NOT NULL,
  "link_id" UUID NOT NULL,
  "profile_id" UUID NOT NULL,
  "country" TEXT,
  "city" TEXT,
  "device" TEXT,
  "os" TEXT,
  "browser" TEXT,
  "referer" TEXT,
  "ip_hash" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "link_clicks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "link_clicks_link_id_created_at_idx"
  ON "link_clicks"("link_id", "created_at");

CREATE INDEX IF NOT EXISTS "link_clicks_profile_id_created_at_idx"
  ON "link_clicks"("profile_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'link_clicks_link_id_fkey') THEN
    ALTER TABLE "link_clicks"
      ADD CONSTRAINT "link_clicks_link_id_fkey"
      FOREIGN KEY ("link_id") REFERENCES "links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
