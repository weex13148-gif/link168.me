-- 团队图形联系入口和共享线索池。
-- 仅新增可空字段，不改变既有个人名片、链接和 Lead 的归属。

ALTER TABLE "links"
  ADD COLUMN "workspace_id" UUID;

ALTER TABLE "leads"
  ADD COLUMN "workspace_id" UUID,
  ADD COLUMN "contact_entry_id" UUID,
  ADD COLUMN "claimed_by_user_id" UUID;

ALTER TABLE "links"
  ADD CONSTRAINT "links_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
  -- Team entries must never silently become personal entries. Workspaces use
  -- is_active for lifecycle changes; an explicit hard delete is blocked while
  -- contact entries still belong to the workspace.
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "leads"
  ADD CONSTRAINT "leads_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "leads_contact_entry_id_fkey"
  FOREIGN KEY ("contact_entry_id") REFERENCES "links"("id")
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "leads_claimed_by_user_id_fkey"
  FOREIGN KEY ("claimed_by_user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- PostgreSQL NULL uniqueness does not protect the personal scope by itself.
-- This partial index makes the one-personal-entry rule race-safe while still
-- allowing multiple team entries for the same owner profile.
CREATE UNIQUE INDEX "links_one_personal_contact_entry_per_profile_idx"
  ON "links"("profile_id")
  WHERE "workspace_id" IS NULL AND "type" = 'contact-entry';

CREATE INDEX "links_workspace_id_type_position_idx"
  ON "links"("workspace_id", "type", "position");

CREATE INDEX "leads_workspace_id_status_created_at_idx"
  ON "leads"("workspace_id", "status", "created_at");

CREATE INDEX "leads_workspace_id_claimed_by_user_id_created_at_idx"
  ON "leads"("workspace_id", "claimed_by_user_id", "created_at");

CREATE INDEX "leads_contact_entry_id_created_at_idx"
  ON "leads"("contact_entry_id", "created_at");

-- New profiles start private. Existing publication state is preserved, and
-- first_published_at records the first explicit publication going forward.
ALTER TABLE "profiles"
  ALTER COLUMN "is_public" SET DEFAULT false,
  ADD COLUMN "first_published_at" TIMESTAMPTZ(6);
