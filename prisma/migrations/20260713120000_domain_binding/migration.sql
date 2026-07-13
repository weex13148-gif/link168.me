-- D2: Domain（域名绑定与解析）

CREATE TABLE "domains" (
    "id" UUID NOT NULL PRIMARY KEY,
    "user_id" UUID NOT NULL,
    "domain" TEXT NOT NULL UNIQUE,
    "normalized_domain" TEXT NOT NULL UNIQUE,
    "domain_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "failure_reason" TEXT,
    "verification_token" TEXT NOT NULL UNIQUE,
    "cname_target" TEXT NOT NULL,
    "verified_at" TIMESTAMPTZ(6),
    "unbound_at" TIMESTAMPTZ(6),
    "last_verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "domains_user_id_status_idx" ON "domains" ("user_id", "status");
CREATE INDEX "domains_normalized_domain_idx" ON "domains" ("normalized_domain");

ALTER TABLE "domains"
    ADD CONSTRAINT "domains_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION update_domain_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_domains_updated_at
    BEFORE UPDATE ON "domains"
    FOR EACH ROW
    EXECUTE FUNCTION update_domain_updated_at();