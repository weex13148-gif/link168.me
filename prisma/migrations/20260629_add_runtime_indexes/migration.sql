-- Add indexes used by authentication, public links, reports, and token cleanup.
-- This migration is data-safe and does not alter existing rows.

CREATE INDEX IF NOT EXISTS "users_role_created_at_idx"
ON "users" ("role", "created_at");

CREATE INDEX IF NOT EXISTS "links_profile_active_position_idx"
ON "links" ("profile_id", "is_active", "position");

CREATE INDEX IF NOT EXISTS "sessions_token_hash_idx"
ON "sessions" ("token_hash");

CREATE INDEX IF NOT EXISTS "sessions_user_expires_at_idx"
ON "sessions" ("user_id", "expires_at");

CREATE INDEX IF NOT EXISTS "reports_status_created_at_idx"
ON "reports" ("status", "created_at");

CREATE INDEX IF NOT EXISTS "password_reset_user_used_expires_idx"
ON "password_reset_tokens" ("user_id", "used", "expires_at");

CREATE INDEX IF NOT EXISTS "email_verify_user_used_expires_idx"
ON "email_verification_tokens" ("user_id", "used", "expires_at");
