-- D2 enterprise home and member cards. Personal profiles and links are untouched.
CREATE TABLE "workspace_cards" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "card_type" TEXT NOT NULL,
    "member_user_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "display_name" TEXT,
    "bio" TEXT,
    "avatar_url" TEXT,
    "cover_image_url" TEXT,
    "company" TEXT,
    "job_title" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "wechat" TEXT,
    "city" TEXT,
    "address" TEXT,
    "website" TEXT,
    "social_links" JSONB,
    "contact_visibility" TEXT NOT NULL DEFAULT 'public',
    "theme" TEXT NOT NULL DEFAULT 'default',
    "custom_theme" TEXT,
    "template" TEXT NOT NULL DEFAULT 'business',
    "created_by_user_id" UUID NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_cards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workspace_card_components" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "card_id" UUID NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'link',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "payload_json" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_card_components_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "workspace_cards"
ADD CONSTRAINT "workspace_cards_type_check"
CHECK ("card_type" IN ('enterprise_home', 'member_card'));

ALTER TABLE "workspace_cards"
ADD CONSTRAINT "workspace_cards_member_shape_check"
CHECK (
  ("card_type" = 'enterprise_home' AND "member_user_id" IS NULL)
  OR
  ("card_type" = 'member_card' AND "member_user_id" IS NOT NULL)
);

ALTER TABLE "workspace_cards"
ADD CONSTRAINT "workspace_cards_status_check"
CHECK ("status" IN ('draft', 'published', 'archived'));

ALTER TABLE "workspace_cards"
ADD CONSTRAINT "workspace_cards_contact_visibility_check"
CHECK ("contact_visibility" IN ('public', 'members_only', 'private'));

ALTER TABLE "workspace_cards"
ADD CONSTRAINT "workspace_cards_template_check"
CHECK ("template" IN ('business', 'creator', 'conversion'));

CREATE UNIQUE INDEX "workspace_cards_one_enterprise_home_per_workspace"
ON "workspace_cards"("workspace_id")
WHERE "card_type" = 'enterprise_home';

CREATE UNIQUE INDEX "workspace_cards_one_member_card_per_workspace_member"
ON "workspace_cards"("workspace_id", "member_user_id")
WHERE "card_type" = 'member_card' AND "member_user_id" IS NOT NULL;

CREATE INDEX "workspace_cards_workspace_id_card_type_status_idx"
ON "workspace_cards"("workspace_id", "card_type", "status");
CREATE INDEX "workspace_cards_workspace_id_member_user_id_status_idx"
ON "workspace_cards"("workspace_id", "member_user_id", "status");
CREATE INDEX "workspace_cards_created_by_user_id_created_at_idx"
ON "workspace_cards"("created_by_user_id", "created_at");
CREATE INDEX "workspace_card_components_workspace_id_card_id_position_idx"
ON "workspace_card_components"("workspace_id", "card_id", "position");
CREATE INDEX "workspace_card_components_workspace_id_type_is_active_idx"
ON "workspace_card_components"("workspace_id", "type", "is_active");

ALTER TABLE "workspace_cards"
ADD CONSTRAINT "workspace_cards_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_cards"
ADD CONSTRAINT "workspace_cards_member_user_id_fkey"
FOREIGN KEY ("member_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "workspace_cards"
ADD CONSTRAINT "workspace_cards_created_by_user_id_fkey"
FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "workspace_card_components"
ADD CONSTRAINT "workspace_card_components_workspace_id_fkey"
FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_card_components"
ADD CONSTRAINT "workspace_card_components_card_id_fkey"
FOREIGN KEY ("card_id") REFERENCES "workspace_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_card_components"
ADD CONSTRAINT "workspace_card_components_created_by_user_id_fkey"
FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
