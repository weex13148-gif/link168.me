-- CreateEnum
-- AlterTable: Add profile_visits table for PV/UV tracking

CREATE TABLE "profile_visits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "visitor_id" TEXT,
    "ip_hash" TEXT,
    "user_agent" TEXT,
    "referer" TEXT,
    "country" TEXT,
    "city" TEXT,
    "device" TEXT,
    "os" TEXT,
    "browser" TEXT,
    "is_bot" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "profile_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profile_visits_profile_id_created_at_idx" ON "profile_visits"("profile_id", "created_at");
CREATE INDEX "profile_visits_visitor_id_idx" ON "profile_visits"("visitor_id");

-- AddForeignKey
ALTER TABLE "profile_visits" ADD CONSTRAINT "profile_visits_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
