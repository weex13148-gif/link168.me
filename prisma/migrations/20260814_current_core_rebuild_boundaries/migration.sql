-- CURRENT rebuild-only core/data/domain slice
-- Explicitly isolated from legacy tables and DB-1 business mutation.
-- This migration introduces only current_* tables.

CREATE TABLE "current_identities" (
  "id" UUID PRIMARY KEY,
  "user_id" UUID NOT NULL UNIQUE,
  "username" TEXT NOT NULL UNIQUE,
  "normalized_username" TEXT NOT NULL UNIQUE,
  "display_name" TEXT,
  "account_status" TEXT NOT NULL DEFAULT 'active',
  "personal_workspace_id" UUID UNIQUE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "current_workspaces" (
  "id" UUID PRIMARY KEY,
  "kind" TEXT NOT NULL,
  "slug" TEXT,
  "name" TEXT NOT NULL,
  "owner_identity_id" UUID NOT NULL,
  "default_lead_identity_id" UUID,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "current_workspaces_kind_slug_key" ON "current_workspaces" ("kind", "slug");
CREATE INDEX "current_workspaces_owner_identity_id_kind_idx" ON "current_workspaces" ("owner_identity_id", "kind");
CREATE INDEX "current_workspaces_default_lead_identity_id_idx" ON "current_workspaces" ("default_lead_identity_id");

ALTER TABLE "current_identities"
  ADD CONSTRAINT "current_identities_personal_workspace_id_fkey"
  FOREIGN KEY ("personal_workspace_id") REFERENCES "current_workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "current_workspaces"
  ADD CONSTRAINT "current_workspaces_owner_identity_id_fkey"
  FOREIGN KEY ("owner_identity_id") REFERENCES "current_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "current_workspaces_default_lead_identity_id_fkey"
  FOREIGN KEY ("default_lead_identity_id") REFERENCES "current_identities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "current_workspace_members" (
  "id" UUID PRIMARY KEY,
  "workspace_id" UUID NOT NULL,
  "identity_id" UUID NOT NULL,
  "role" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "invited_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "joined_at" TIMESTAMPTZ(6),
  "disabled_at" TIMESTAMPTZ(6),
  "removed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "current_workspace_members_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "current_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "current_workspace_members_identity_id_fkey"
    FOREIGN KEY ("identity_id") REFERENCES "current_identities"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "current_workspace_members_workspace_identity_key"
    UNIQUE ("workspace_id", "identity_id")
);

CREATE INDEX "current_workspace_members_workspace_role_status_idx"
  ON "current_workspace_members" ("workspace_id", "role", "status");
CREATE INDEX "current_workspace_members_identity_status_idx"
  ON "current_workspace_members" ("identity_id", "status");

CREATE TABLE "current_pages" (
  "id" UUID PRIMARY KEY,
  "workspace_id" UUID NOT NULL,
  "owner_identity_id" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "public_identity" TEXT NOT NULL,
  "public_identity_normalized" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'draft_only',
  "last_published_version_number" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "current_pages_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "current_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "current_pages_owner_identity_id_fkey"
    FOREIGN KEY ("owner_identity_id") REFERENCES "current_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "current_pages_workspace_kind_owner_key"
    UNIQUE ("workspace_id", "kind", "owner_identity_id")
);

CREATE INDEX "current_pages_workspace_kind_status_idx"
  ON "current_pages" ("workspace_id", "kind", "status");
CREATE INDEX "current_pages_owner_identity_kind_idx"
  ON "current_pages" ("owner_identity_id", "kind");

CREATE TABLE "current_page_drafts" (
  "id" UUID PRIMARY KEY,
  "page_id" UUID NOT NULL UNIQUE,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "document" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "current_page_drafts_page_id_fkey"
    FOREIGN KEY ("page_id") REFERENCES "current_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "current_published_versions" (
  "id" UUID PRIMARY KEY,
  "page_id" UUID NOT NULL,
  "draft_id" UUID NOT NULL,
  "version_number" INTEGER NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "snapshot_document" JSONB NOT NULL,
  "created_by_identity_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "current_published_versions_page_id_fkey"
    FOREIGN KEY ("page_id") REFERENCES "current_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "current_published_versions_draft_id_fkey"
    FOREIGN KEY ("draft_id") REFERENCES "current_page_drafts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "current_published_versions_created_by_identity_id_fkey"
    FOREIGN KEY ("created_by_identity_id") REFERENCES "current_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "current_published_versions_page_version_key"
    UNIQUE ("page_id", "version_number"),
  CONSTRAINT "current_published_versions_page_idempotency_key"
    UNIQUE ("page_id", "idempotency_key")
);

CREATE INDEX "current_published_versions_created_by_identity_created_at_idx"
  ON "current_published_versions" ("created_by_identity_id", "created_at");

CREATE TABLE "current_published_facts" (
  "id" UUID PRIMARY KEY,
  "page_id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "version_id" UUID NOT NULL UNIQUE,
  "published_at" TIMESTAMPTZ(6) NOT NULL,
  "profile" JSONB NOT NULL,
  "sections" JSONB NOT NULL,
  "offerings" JSONB NOT NULL,
  "public_contact" JSONB,
  "responsible_members" JSONB NOT NULL,
  CONSTRAINT "current_published_facts_page_id_fkey"
    FOREIGN KEY ("page_id") REFERENCES "current_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "current_published_facts_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "current_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "current_published_facts_version_id_fkey"
    FOREIGN KEY ("version_id") REFERENCES "current_published_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "current_published_facts_page_published_at_idx"
  ON "current_published_facts" ("page_id", "published_at");
CREATE INDEX "current_published_facts_workspace_published_at_idx"
  ON "current_published_facts" ("workspace_id", "published_at");

CREATE TABLE "current_published_pointers" (
  "id" UUID PRIMARY KEY,
  "page_id" UUID NOT NULL UNIQUE,
  "current_version_id" UUID NOT NULL UNIQUE,
  "current_facts_id" UUID NOT NULL UNIQUE,
  "previous_version_id" UUID,
  "switched_by_identity_id" UUID NOT NULL,
  "switched_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "current_published_pointers_page_id_fkey"
    FOREIGN KEY ("page_id") REFERENCES "current_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "current_published_pointers_current_version_id_fkey"
    FOREIGN KEY ("current_version_id") REFERENCES "current_published_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "current_published_pointers_current_facts_id_fkey"
    FOREIGN KEY ("current_facts_id") REFERENCES "current_published_facts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "current_published_pointers_previous_version_id_fkey"
    FOREIGN KEY ("previous_version_id") REFERENCES "current_published_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "current_published_pointers_switched_by_identity_id_fkey"
    FOREIGN KEY ("switched_by_identity_id") REFERENCES "current_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "current_published_pointers_switched_at_idx"
  ON "current_published_pointers" ("switched_at");

CREATE TABLE "current_leads" (
  "id" UUID PRIMARY KEY,
  "workspace_id" UUID NOT NULL,
  "origin_page_id" UUID NOT NULL,
  "source" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'new',
  "contact" JSONB NOT NULL,
  "commercial_intent" TEXT NOT NULL,
  "conversation_id" TEXT,
  "idempotency_key" TEXT,
  "offering_id" TEXT,
  "source_member_identity_id" UUID,
  "assignee_identity_id" UUID NOT NULL,
  "routing_reason" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "current_leads_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "current_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "current_leads_origin_page_id_fkey"
    FOREIGN KEY ("origin_page_id") REFERENCES "current_pages"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "current_leads_source_member_identity_id_fkey"
    FOREIGN KEY ("source_member_identity_id") REFERENCES "current_identities"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "current_leads_assignee_identity_id_fkey"
    FOREIGN KEY ("assignee_identity_id") REFERENCES "current_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "current_leads_workspace_idempotency_key"
    UNIQUE ("workspace_id", "idempotency_key")
);

CREATE INDEX "current_leads_workspace_status_created_at_idx"
  ON "current_leads" ("workspace_id", "status", "created_at");
CREATE INDEX "current_leads_assignee_status_created_at_idx"
  ON "current_leads" ("assignee_identity_id", "status", "created_at");
CREATE INDEX "current_leads_origin_page_created_at_idx"
  ON "current_leads" ("origin_page_id", "created_at");

CREATE TABLE "current_billing_accounts" (
  "id" UUID PRIMARY KEY,
  "workspace_id" UUID NOT NULL UNIQUE,
  "scope" TEXT NOT NULL,
  "owner_identity_id" UUID NOT NULL,
  "billing_contact_identity_id" UUID NOT NULL,
  "plan_code" TEXT NOT NULL DEFAULT 'free',
  "status" TEXT NOT NULL DEFAULT 'active',
  "grace_ends_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "current_billing_accounts_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "current_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "current_billing_accounts_owner_identity_id_fkey"
    FOREIGN KEY ("owner_identity_id") REFERENCES "current_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "current_billing_accounts_billing_contact_identity_id_fkey"
    FOREIGN KEY ("billing_contact_identity_id") REFERENCES "current_identities"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "current_billing_accounts_owner_scope_idx"
  ON "current_billing_accounts" ("owner_identity_id", "scope");
CREATE INDEX "current_billing_accounts_billing_contact_identity_id_idx"
  ON "current_billing_accounts" ("billing_contact_identity_id");

CREATE TABLE "current_billing_ledger_entries" (
  "id" UUID PRIMARY KEY,
  "billing_account_id" UUID NOT NULL,
  "entry_type" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "balance_after" INTEGER NOT NULL,
  "idempotency_key" TEXT,
  "reference_type" TEXT,
  "reference_id" TEXT,
  "metadata" JSONB,
  "reason" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "current_billing_ledger_entries_billing_account_id_fkey"
    FOREIGN KEY ("billing_account_id") REFERENCES "current_billing_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "current_billing_ledger_entries_account_idempotency_key"
    UNIQUE ("billing_account_id", "idempotency_key")
);

CREATE INDEX "current_billing_ledger_entries_account_created_at_idx"
  ON "current_billing_ledger_entries" ("billing_account_id", "created_at");
CREATE INDEX "current_billing_ledger_entries_reference_idx"
  ON "current_billing_ledger_entries" ("reference_type", "reference_id");

CREATE TABLE "current_lifecycle_records" (
  "id" UUID PRIMARY KEY,
  "subject_type" TEXT NOT NULL,
  "subject_id" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "scheduled_at" TIMESTAMPTZ(6) NOT NULL,
  "restore_deadline_at" TIMESTAMPTZ(6),
  "purge_deadline_at" TIMESTAMPTZ(6),
  "legal_hold_until" TIMESTAMPTZ(6),
  "reason" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "current_lifecycle_records_subject_scheduled_at_idx"
  ON "current_lifecycle_records" ("subject_type", "subject_id", "scheduled_at");

CREATE TABLE "current_policy_versions" (
  "id" UUID PRIMARY KEY,
  "policy_type" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "effective_at" TIMESTAMPTZ(6) NOT NULL,
  "published_at" TIMESTAMPTZ(6),
  "content_reference" TEXT NOT NULL,
  "content_hash" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "current_policy_versions_type_version_key" UNIQUE ("policy_type", "version")
);

CREATE TABLE "current_consent_records" (
  "id" UUID PRIMARY KEY,
  "identity_id" UUID,
  "workspace_id" UUID,
  "policy_version_id" UUID NOT NULL,
  "purpose" TEXT NOT NULL,
  "data_category" TEXT NOT NULL,
  "source_scene" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "granted_at" TIMESTAMPTZ(6) NOT NULL,
  "withdrawn_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "current_consent_records_identity_id_fkey"
    FOREIGN KEY ("identity_id") REFERENCES "current_identities"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "current_consent_records_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "current_workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "current_consent_records_policy_version_id_fkey"
    FOREIGN KEY ("policy_version_id") REFERENCES "current_policy_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "current_consent_records_identity_granted_at_idx"
  ON "current_consent_records" ("identity_id", "granted_at");
CREATE INDEX "current_consent_records_workspace_granted_at_idx"
  ON "current_consent_records" ("workspace_id", "granted_at");
CREATE INDEX "current_consent_records_policy_granted_at_idx"
  ON "current_consent_records" ("policy_version_id", "granted_at");

CREATE TABLE "current_audit_logs" (
  "id" UUID PRIMARY KEY,
  "actor_identity_id" UUID,
  "workspace_id" UUID,
  "action" TEXT NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id" TEXT NOT NULL,
  "idempotency_key" TEXT,
  "metadata" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "current_audit_logs_actor_identity_id_fkey"
    FOREIGN KEY ("actor_identity_id") REFERENCES "current_identities"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "current_audit_logs_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "current_workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "current_audit_logs_actor_created_at_idx"
  ON "current_audit_logs" ("actor_identity_id", "created_at");
CREATE INDEX "current_audit_logs_workspace_created_at_idx"
  ON "current_audit_logs" ("workspace_id", "created_at");
CREATE INDEX "current_audit_logs_target_created_at_idx"
  ON "current_audit_logs" ("target_type", "target_id", "created_at");
CREATE INDEX "current_audit_logs_idempotency_key_idx"
  ON "current_audit_logs" ("idempotency_key");
