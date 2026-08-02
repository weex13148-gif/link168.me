-- AI 点数包明细、到期与订单产品类型
ALTER TABLE "orders"
  ADD COLUMN "product_type" TEXT NOT NULL DEFAULT 'membership';

CREATE INDEX "orders_product_type_status_idx"
  ON "orders"("product_type", "status");

CREATE TABLE "ai_credit_buckets" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "account_id" UUID NOT NULL REFERENCES "ai_credit_accounts"("id") ON DELETE RESTRICT,
  "source_order_id" UUID UNIQUE REFERENCES "orders"("id") ON DELETE RESTRICT,
  "source_type" TEXT NOT NULL DEFAULT 'addon',
  "granted_amount" INTEGER NOT NULL,
  "remaining_amount" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "ai_credit_buckets_granted_positive" CHECK ("granted_amount" > 0),
  CONSTRAINT "ai_credit_buckets_remaining_valid" CHECK ("remaining_amount" >= 0 AND "remaining_amount" <= "granted_amount")
);

CREATE INDEX "ai_credit_buckets_account_status_expiry_idx"
  ON "ai_credit_buckets"("account_id", "status", "expires_at");
