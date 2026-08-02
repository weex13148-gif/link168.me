-- Repair production drift where the prior contact-entry migration was marked
-- applied before the profile publication fields were fully installed.
ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "first_published_at" TIMESTAMPTZ(6);

ALTER TABLE "profiles"
  ALTER COLUMN "is_public" SET DEFAULT false;
