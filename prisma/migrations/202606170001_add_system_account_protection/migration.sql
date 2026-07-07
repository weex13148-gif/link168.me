ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_system" BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION prevent_system_account_delete()
RETURNS trigger AS $$
BEGIN
  IF OLD.is_system THEN
    RAISE EXCEPTION 'system account cannot be deleted';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_prevent_system_account_delete ON "users";

CREATE TRIGGER users_prevent_system_account_delete
BEFORE DELETE ON "users"
FOR EACH ROW
EXECUTE FUNCTION prevent_system_account_delete();
