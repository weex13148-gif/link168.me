-- Migration: 20260625_add_orders_table
-- Description: 添加正式订单表，禁止将订单存入 AppConfig
-- Created: 2026-06-25

-- 正式订单模型：替代 AppConfig 中的订单存储
CREATE TABLE "orders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "order_no" VARCHAR(64) NOT NULL UNIQUE,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "plan_code" VARCHAR(32) NOT NULL,
  "plan_name_snapshot" VARCHAR(128) NOT NULL,
  "billing_cycle" VARCHAR(16) NOT NULL, -- monthly / yearly
  "original_amount" INTEGER NOT NULL, -- 原价（分）
  "payable_amount" INTEGER NOT NULL, -- 应付（分）
  "currency" VARCHAR(8) NOT NULL DEFAULT 'CNY',
  "payment_channel" VARCHAR(16), -- wechat / alipay
  "provider_trade_no" VARCHAR(128) UNIQUE, -- 支付通道交易号（非空时唯一）
  "idempotency_key" VARCHAR(128), -- 幂等键
  "status" VARCHAR(16) NOT NULL DEFAULT 'pending', -- pending / paid / cancelled / closed / refunded
  "paid_at" TIMESTAMPTZ(6),
  "cancelled_at" TIMESTAMPTZ(6),
  "closed_at" TIMESTAMPTZ(6),
  "refunded_at" TIMESTAMPTZ(6),
  "expires_at" TIMESTAMPTZ(6), -- 订单超时时间
  "metadata" JSONB,
  "cancel_reason" VARCHAR(512),
  "refund_reason" VARCHAR(512),
  "refund_by" VARCHAR(128), -- admin_id 或 system
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX "orders_user_id_created_at_idx" ON "orders"("user_id", "created_at");
CREATE INDEX "orders_user_id_status_idx" ON "orders"("user_id", "status");
CREATE INDEX "orders_status_expires_at_idx" ON "orders"("status", "expires_at");

-- 注释
COMMENT ON TABLE "orders" IS '正式订单表：替代 AppConfig 中的订单存储';
COMMENT ON COLUMN "orders"."order_no" IS '业务订单号：L + 时间戳 + 随机字符，全局唯一';
COMMENT ON COLUMN "orders"."plan_name_snapshot" IS '套餐名称快照（下单时锁定）';
COMMENT ON COLUMN "orders"."original_amount" IS '原价（分），下单时锁定';
COMMENT ON COLUMN "orders"."payable_amount" IS '应付金额（分），下单时锁定，不允许后续修改';
COMMENT ON COLUMN "orders"."provider_trade_no" IS '支付通道交易号，非空时唯一，确保幂等';
COMMENT ON COLUMN "orders"."idempotency_key" IS '幂等键，避免重复回调';
COMMENT ON COLUMN "orders"."status" IS 'pending=待支付/paid=已支付/cancelled=用户取消/closed=超时关闭/refunded=已退款';
