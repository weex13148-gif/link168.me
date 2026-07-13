-- D4: Enterprise AI Quota（企业 AI 共享额度）

CREATE TABLE "enterprise_quota_pools" (
    "id" UUID NOT NULL PRIMARY KEY,
    "workspace_id" UUID NOT NULL UNIQUE,
    "total_quota" INT NOT NULL DEFAULT 0,
    "used_quota" INT NOT NULL DEFAULT 0,
    "period_start" TIMESTAMPTZ(6) NOT NULL,
    "period_end" TIMESTAMPTZ(6) NOT NULL,
    "version" INT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "enterprise_quota_consumptions" (
    "id" UUID NOT NULL PRIMARY KEY,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "operation_id" TEXT NOT NULL UNIQUE,
    "amount" INT NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "failure_reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "enterprise_quota_pools_workspace_id_period_start_idx" ON "enterprise_quota_pools" ("workspace_id", "period_start");

CREATE INDEX "enterprise_quota_consumptions_workspace_id_idx" ON "enterprise_quota_consumptions" ("workspace_id");
CREATE INDEX "enterprise_quota_consumptions_user_id_idx" ON "enterprise_quota_consumptions" ("user_id");
CREATE INDEX "enterprise_quota_consumptions_created_at_idx" ON "enterprise_quota_consumptions" ("created_at");
CREATE INDEX "enterprise_quota_consumptions_workspace_user_created_idx" ON "enterprise_quota_consumptions" ("workspace_id", "user_id", "created_at");

ALTER TABLE "enterprise_quota_pools"
    ADD CONSTRAINT "enterprise_quota_pools_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "enterprise_quota_consumptions"
    ADD CONSTRAINT "enterprise_quota_consumptions_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "enterprise_quota_consumptions"
    ADD CONSTRAINT "enterprise_quota_consumptions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION update_quota_pool_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_enterprise_quota_pools_updated_at
    BEFORE UPDATE ON "enterprise_quota_pools"
    FOR EACH ROW
    EXECUTE FUNCTION update_quota_pool_updated_at();