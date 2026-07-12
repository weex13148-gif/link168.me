-- CreateTable
CREATE TABLE "workspace_resources" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "assigned_to_user_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_audit_logs" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_audit_logs_pkey" PRIMARY KEY ("id")
);

-- Resource type is intentionally constrained so unsupported assets cannot silently enter enterprise scope.
ALTER TABLE "workspace_resources"
ADD CONSTRAINT "workspace_resources_type_check"
CHECK ("resource_type" IN ('product', 'knowledge_doc'));

ALTER TABLE "workspace_resources"
ADD CONSTRAINT "workspace_resources_status_check"
CHECK ("status" IN ('active', 'archived'));

-- CreateIndex
CREATE UNIQUE INDEX "workspace_resources_resource_type_resource_id_key"
ON "workspace_resources"("resource_type", "resource_id");

CREATE INDEX "workspace_resources_workspace_id_resource_type_status_idx"
ON "workspace_resources"("workspace_id", "resource_type", "status");

CREATE INDEX "workspace_resources_workspace_id_assigned_to_user_id_status_idx"
ON "workspace_resources"("workspace_id", "assigned_to_user_id", "status");

CREATE INDEX "workspace_resources_created_by_user_id_created_at_idx"
ON "workspace_resources"("created_by_user_id", "created_at");

CREATE INDEX "workspace_audit_logs_workspace_id_created_at_idx"
ON "workspace_audit_logs"("workspace_id", "created_at");

CREATE INDEX "workspace_audit_logs_workspace_id_action_created_at_idx"
ON "workspace_audit_logs"("workspace_id", "action", "created_at");

CREATE INDEX "workspace_audit_logs_target_type_target_id_created_at_idx"
ON "workspace_audit_logs"("target_type", "target_id", "created_at");

-- AddForeignKey
ALTER TABLE "workspace_resources"
ADD CONSTRAINT "workspace_resources_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workspace_resources"
ADD CONSTRAINT "workspace_resources_created_by_user_id_fkey"
FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "workspace_resources"
ADD CONSTRAINT "workspace_resources_assigned_to_user_id_fkey"
FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "workspace_audit_logs"
ADD CONSTRAINT "workspace_audit_logs_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workspace_audit_logs"
ADD CONSTRAINT "workspace_audit_logs_actor_user_id_fkey"
FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
