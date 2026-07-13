-- D2: Domain（企业域名绑定与解析）
-- 说明：该 migration 尚未合并、尚未在生产执行。
-- Domain 归属从 userId 调整为 workspaceId，企业域名归属于 Workspace 而非个人。
-- 同时新增 workspace_public_profiles 表，用于企业员工公开名片路径。

CREATE TABLE "domains" (
    "id" UUID NOT NULL PRIMARY KEY,
    "workspace_id" UUID NOT NULL,
    "domain" TEXT NOT NULL UNIQUE,
    "normalized_domain" TEXT NOT NULL UNIQUE,
    "domain_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "failure_reason" TEXT,
    "verification_token" TEXT NOT NULL UNIQUE,
    "cname_target" TEXT NOT NULL,
    "verified_at" TIMESTAMPTZ(6),
    "unbound_at" TIMESTAMPTZ(6),
    "last_verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "domains_workspace_id_status_idx" ON "domains" ("workspace_id", "status");
CREATE INDEX "domains_normalized_domain_idx" ON "domains" ("normalized_domain");

ALTER TABLE "domains"
    ADD CONSTRAINT "domains_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION update_domain_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_domains_updated_at
    BEFORE UPDATE ON "domains"
    FOR EACH ROW
    EXECUTE FUNCTION update_domain_updated_at();

-- D2: 企业员工公开名片路径（slug 在 Workspace 内唯一）
CREATE TABLE "workspace_public_profiles" (
    "id" UUID NOT NULL PRIMARY KEY,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 同一 Workspace 内 slug 唯一
CREATE UNIQUE INDEX "workspace_public_profiles_workspace_id_slug_key"
    ON "workspace_public_profiles" ("workspace_id", "slug");

-- 同一 Workspace 内一个用户只能有一个公开名片
CREATE UNIQUE INDEX "workspace_public_profiles_workspace_id_user_id_key"
    ON "workspace_public_profiles" ("workspace_id", "user_id");

CREATE INDEX "workspace_public_profiles_workspace_id_status_idx"
    ON "workspace_public_profiles" ("workspace_id", "status");

ALTER TABLE "workspace_public_profiles"
    ADD CONSTRAINT "workspace_public_profiles_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workspace_public_profiles"
    ADD CONSTRAINT "workspace_public_profiles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION update_workspace_public_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_workspace_public_profiles_updated_at
    BEFORE UPDATE ON "workspace_public_profiles"
    FOR EACH ROW
    EXECUTE FUNCTION update_workspace_public_profile_updated_at();
