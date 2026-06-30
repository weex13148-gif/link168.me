CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
  "id" UUID NOT NULL,
  "actor_user_id" UUID,
  "actor_email" TEXT,
  "actor_role" TEXT,
  "action" TEXT NOT NULL,
  "target_type" TEXT,
  "target_id" TEXT,
  "metadata_raw" TEXT,
  "ip_hash" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "success" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "admin_audit_logs_actor_user_id_created_at_idx"
  ON "admin_audit_logs"("actor_user_id","created_at");
CREATE INDEX IF NOT EXISTS "admin_audit_logs_action_created_at_idx"
  ON "admin_audit_logs"("action","created_at");
CREATE INDEX IF NOT EXISTS "admin_audit_logs_target_type_target_id_created_at_idx"
  ON "admin_audit_logs"("target_type","target_id","created_at");
