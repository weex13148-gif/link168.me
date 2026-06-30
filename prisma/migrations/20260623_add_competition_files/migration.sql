-- ============================================================
-- 比赛文件管理中心：competition_files 表
-- 安全约束：
--   * 仅 CREATE TABLE / CREATE INDEX
--   * 无 DROP TABLE / DROP COLUMN / TRUNCATE
-- ============================================================

CREATE TABLE IF NOT EXISTS "competition_files" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "original_name" TEXT NOT NULL,
  "stored_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "purpose" TEXT NOT NULL DEFAULT 'backup',
  "description" TEXT,
  "uploaded_by" UUID NOT NULL,
  "uploaded_by_email" TEXT NOT NULL,
  "is_current_main" BOOLEAN NOT NULL DEFAULT false,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "competition_files_is_deleted_created_at_idx"
  ON "competition_files" ("is_deleted", "created_at");

CREATE INDEX IF NOT EXISTS "competition_files_uploaded_by_idx"
  ON "competition_files" ("uploaded_by");
