-- Additive only; do not apply to the protected audit database.
CREATE TABLE "current_team_invitations" (
 "id" UUID NOT NULL PRIMARY KEY,
 "workspace_id" UUID NOT NULL REFERENCES "current_workspaces"("id") ON DELETE CASCADE,
 "created_by_identity_id" UUID NOT NULL,
 "created_by_role" TEXT NOT NULL CHECK ("created_by_role" IN ('owner', 'admin')),
 "accepted_by_identity_id" UUID,
 "token_hash" TEXT NOT NULL,
 "role" TEXT NOT NULL CHECK ("role" IN ('admin', 'member')),
 "status" TEXT NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'used', 'revoked')),
 "expires_at" TIMESTAMPTZ(6) NOT NULL,
 "used_at" TIMESTAMPTZ(6),
 "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "current_team_invitations_token_hash_key" ON "current_team_invitations"("token_hash");
CREATE INDEX "current_team_invitations_workspace_id_status_idx" ON "current_team_invitations"("workspace_id", "status");

