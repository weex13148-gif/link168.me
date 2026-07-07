-- V2-002 / V2-003 / V2-010: 安全限制 + 用户名保留 + 邮箱发送日志
-- 生成背景：当前 Prisma Schema 声明了以下模型但无对应迁移 SQL：
--   - FreezeRecord（邮箱验证/管理员冻结/安全限制）
--   - UsernameRegistry（当前占用/90 天保留/永久保留）
--   - UsernameHistory（历史记录，用于 90 天保护与旧地址重定向）
--   - EmailSendLog（发送节流，按邮箱 / IP 双维度计数）
--
-- 目标数据库：PostgreSQL
-- 执行方式：npx prisma migrate dev 或 prisma migrate deploy
-- 注意：本 migration 仅创建新表与索引，不修改现有 users/profiles 表结构
-- 破坏性操作：无
--

-- ============================================================
-- 1. freeze_records：统一冻结/限制表
-- 说明：EMAIL_UNVERIFIED / ADMIN_FREEZE / SECURITY_RISK / BANNED
-- ============================================================
CREATE TABLE IF NOT EXISTS "freeze_records" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "reason" TEXT,
  "source" TEXT NOT NULL DEFAULT 'system',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "starts_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(6),
  "cleared_at" TIMESTAMPTZ(6),
  "cleared_by_user_id" UUID,
  "cleared_by_source" TEXT,
  "metadata_raw" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "freeze_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "freeze_records_user_id_type_is_active_idx"
  ON "freeze_records"("user_id", "type", "is_active");

CREATE INDEX IF NOT EXISTS "freeze_records_is_active_expires_at_idx"
  ON "freeze_records"("is_active", "expires_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'freeze_records_user_id_fkey') THEN
    ALTER TABLE "freeze_records"
      ADD CONSTRAINT "freeze_records_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 2. username_registry：Username 全局注册表
-- 规则：CURRENT / RESERVED_90_DAYS / PERMANENTLY_RESERVED
-- 依赖 normalized_username UNIQUE 索引防并发冲突
-- ============================================================
CREATE TABLE IF NOT EXISTS "username_registry" (
  "id" UUID NOT NULL,
  "normalized_username" TEXT NOT NULL,
  "display_username" TEXT,
  "user_id" UUID,
  "status" TEXT NOT NULL DEFAULT 'CURRENT',
  "reserved_until" TIMESTAMPTZ(6),
  "reason" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "username_registry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "username_registry_normalized_username_key"
  ON "username_registry"("normalized_username");

CREATE INDEX IF NOT EXISTS "username_registry_user_id_status_idx"
  ON "username_registry"("user_id", "status");

-- ============================================================
-- 3. username_histories：Username 历史表
-- 用途：90 天保留期记录 + 旧地址重定向目标
-- ============================================================
CREATE TABLE IF NOT EXISTS "username_histories" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "username" TEXT NOT NULL,
  "normalized_username" TEXT NOT NULL,
  "replaced_by" TEXT,
  "reserved_until" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "username_histories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "username_histories_normalized_username_idx"
  ON "username_histories"("normalized_username");

CREATE INDEX IF NOT EXISTS "username_histories_user_id_created_at_idx"
  ON "username_histories"("user_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'username_histories_user_id_fkey') THEN
    ALTER TABLE "username_histories"
      ADD CONSTRAINT "username_histories_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 4. email_send_logs：邮箱发送日志 + 节流
-- 说明：发送记录（成功/失败）；供 canSendVerification() 检查 60s / 日限制
-- errorCode: SMTP_NOT_CONFIGURED / SMTP_UNAVAILABLE / RATE_LIMITED / PROVIDER_REJECTED / UNKNOWN_SEND_FAILURE
-- provider: smtp / mock / none
-- ============================================================
CREATE TABLE IF NOT EXISTS "email_send_logs" (
  "id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "success" BOOLEAN NOT NULL DEFAULT true,
  "error_code" TEXT,
  "provider" TEXT,
  "ip_hash" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_send_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "email_send_logs_email_created_at_idx"
  ON "email_send_logs"("email", "created_at");

CREATE INDEX IF NOT EXISTS "email_send_logs_ip_hash_created_at_idx"
  ON "email_send_logs"("ip_hash", "created_at");
