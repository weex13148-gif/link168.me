-- V2-011: Workspace 工作空间模型 + ShortLink 扩展字段
-- 兼容已有 User 和 ShortLink 数据，不删除现有字段，不重命名表

-- ============================================
-- 1. ShortLink 扩展字段（向后兼容，全部有默认值或允许空）
-- ============================================

ALTER TABLE "short_links"
ADD COLUMN "is_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "channel_label" TEXT,
ADD COLUMN "expires_at" TIMESTAMPTZ(6);

-- 为常用查询加索引
CREATE INDEX "short_links_user_id_is_enabled_idx" ON "short_links" ("user_id", "is_enabled");
CREATE INDEX "short_links_expires_at_idx" ON "short_links" ("expires_at") WHERE "expires_at" IS NOT NULL;

-- ============================================
-- 2. Workspace 表
-- ============================================

CREATE TABLE "workspaces" (
    "id" UUID NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "workspace_type" TEXT NOT NULL DEFAULT 'team',
    "plan_code" TEXT NOT NULL DEFAULT 'free',
    "owner_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "workspaces_is_active_created_at_idx" ON "workspaces" ("is_active", "created_at");
CREATE INDEX "workspaces_slug_idx" ON "workspaces" ("slug");

-- ============================================
-- 3. WorkspaceMember 表
-- ============================================

CREATE TABLE "workspace_members" (
    "id" UUID NOT NULL PRIMARY KEY,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "status" TEXT NOT NULL DEFAULT 'invited',
    "invited_by" UUID,
    "invited_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joined_at" TIMESTAMPTZ(6),
    "disabled_at" TIMESTAMPTZ(6),
    "removed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_members_workspace_id_user_id_key" UNIQUE ("workspace_id", "user_id")
);

-- 索引
CREATE INDEX "workspace_members_workspace_id_status_idx" ON "workspace_members" ("workspace_id", "status");
CREATE INDEX "workspace_members_user_id_status_idx" ON "workspace_members" ("user_id", "status");

-- 外键约束
ALTER TABLE "workspaces"
    ADD CONSTRAINT "workspaces_owner_id_fkey"
    FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "workspace_members"
    ADD CONSTRAINT "workspace_members_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workspace_members"
    ADD CONSTRAINT "workspace_members_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- 4. updated_at 触发器（与其他表保持一致的自动更新机制）
-- ============================================

CREATE OR REPLACE FUNCTION update_workspace_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_workspaces_updated_at
    BEFORE UPDATE ON "workspaces"
    FOR EACH ROW
    EXECUTE FUNCTION update_workspace_updated_at();

CREATE TRIGGER trigger_workspace_members_updated_at
    BEFORE UPDATE ON "workspace_members"
    FOR EACH ROW
    EXECUTE FUNCTION update_workspace_updated_at();
