-- CreateTable
CREATE TABLE "workspace_invitations" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "token_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "invited_by_user_id" UUID NOT NULL,
    "accepted_by_user_id" UUID,
    "accepted_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "delivery_error_code" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invitations_token_hash_key" ON "workspace_invitations"("token_hash");

-- Only one currently pending invitation may exist for the same workspace and normalized email.
CREATE UNIQUE INDEX "workspace_invitations_pending_email_key"
ON "workspace_invitations"("workspace_id", lower("email"))
WHERE "status" = 'pending';

-- CreateIndex
CREATE INDEX "workspace_invitations_workspace_id_status_created_at_idx"
ON "workspace_invitations"("workspace_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "workspace_invitations_email_status_expires_at_idx"
ON "workspace_invitations"("email", "status", "expires_at");

-- CreateIndex
CREATE INDEX "workspace_invitations_invited_by_user_id_created_at_idx"
ON "workspace_invitations"("invited_by_user_id", "created_at");

-- AddForeignKey
ALTER TABLE "workspace_invitations"
ADD CONSTRAINT "workspace_invitations_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invitations"
ADD CONSTRAINT "workspace_invitations_invited_by_user_id_fkey"
FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invitations"
ADD CONSTRAINT "workspace_invitations_accepted_by_user_id_fkey"
FOREIGN KEY ("accepted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
