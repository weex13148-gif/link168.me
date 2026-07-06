-- CreateUniqueIndex
-- Keep this migration compatible with databases where the moderation table is
-- created by the following 20260703 content safety migration.

DO $$
BEGIN
  IF to_regclass('public.content_moderation_records') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "content_moderation_records_content_type_content_ref_key"
      ON "content_moderation_records" ("content_type", "content_ref");
  END IF;
END $$;
