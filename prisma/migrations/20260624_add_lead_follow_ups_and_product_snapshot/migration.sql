-- Migration: add_lead_follow_ups_and_product_snapshot
-- Created: 2026-06-24
-- Purpose: 添加独立跟进记录表 + 产品快照字段，解决历史数据丢失和伪结构问题

-- 1. 添加产品快照字段到 leads 表
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "interested_product_name" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "interested_product_price" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "interested_product_category" TEXT;

-- 2. 迁移旧状态数据（qualified → following, lost → closed）
-- 未知状态保持不变，在前端显示为"未知状态"
UPDATE "leads" SET "status" = 'following' WHERE "status" = 'qualified';
UPDATE "leads" SET "status" = 'closed' WHERE "status" = 'lost';

-- 3. 创建 lead_follow_ups 表
CREATE TABLE IF NOT EXISTS "lead_follow_ups" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "lead_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "created_by_type" TEXT NOT NULL DEFAULT 'owner',
    "created_by_user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "previous_status" TEXT,
    "new_status" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- 4. 创建索引
CREATE INDEX IF NOT EXISTS "lead_follow_ups_lead_id_created_at_idx" ON "lead_follow_ups" ("lead_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "lead_follow_ups_profile_id_created_at_idx" ON "lead_follow_ups" ("profile_id", "created_at" DESC);

-- 5. 添加外键约束
ALTER TABLE "lead_follow_ups" ADD CONSTRAINT "lead_follow_ups_lead_id_fkey"
    FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE;

-- 6. 为现有 leads 创建初始化跟进记录（从 notes 迁移关键信息）
-- 迁移规则：仅迁移包含"["时间戳"]"格式的记录为独立的 follow_up
-- 注意：此迁移仅创建 follow_up 记录，保留原始 notes 内容不变

INSERT INTO "lead_follow_ups" ("id", "lead_id", "profile_id", "created_by_user_id", "content", "created_at")
SELECT
    gen_random_uuid(),
    l.id,
    l.profile_id,
    l.profile_id, -- 使用 profileId 作为占位，后续需要关联到真实用户
    '系统导入：' || SPLIT_PART(SPLIT_PART(SUBSTRING(l.notes FROM POSITION('[' IN l.notes) FOR 100), '[', 2), ']', 1) || ' 的跟进记录（原始记录保留在备注中）',
    COALESCE(
        NULLIF(SPLIT_PART(SPLIT_PART(SUBSTRING(l.notes FROM POSITION('[' IN l.notes)), '[', 2), ']', 1), '')::TIMESTAMPTZ,
        l.created_at
    )
FROM "leads" l
WHERE l.notes IS NOT NULL
  AND l.notes ~ '^\['
  AND l.profile_id IS NOT NULL;

-- 注释说明：第6步的迁移是保守策略，仅导入有时间戳格式的记录
-- 原始 notes 字段完全保留，前端会显示为"旧版历史备注"
