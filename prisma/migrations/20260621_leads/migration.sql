-- V2-006: 客户线索表
-- 说明：公开主页的 shop / booking / contact 组件通过 API 生成客户线索
-- 注意：Lead 不直接写 Cookie 或登录 Session，仅为独立记录
--

CREATE TABLE IF NOT EXISTS "leads" (
  "id" UUID NOT NULL,
  "profile_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "message" TEXT,
  "source_component" TEXT,
  "source_page" TEXT,
  "status" TEXT NOT NULL DEFAULT 'new',
  "handler_note" TEXT,
  "handled_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "leads_profile_id_created_at_idx"
  ON "leads"("profile_id", "created_at");

CREATE INDEX IF NOT EXISTS "leads_status_idx"
  ON "leads"("status");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_profile_id_fkey') THEN
    ALTER TABLE "leads"
      ADD CONSTRAINT "leads_profile_id_fkey"
      FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
