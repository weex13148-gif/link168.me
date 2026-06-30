-- ============================================================
-- workbench_core：客户工作台核心表
-- 包含：产品与服务、企业知识库、AI 客服配置、
--       AI 对话与消息、额度账户与流水、会员订阅
--       Lead 扩展字段（wechat/intent/conversationId/notes）
--
-- 安全约束：
--   * 仅 CREATE TABLE / ADD COLUMN / CREATE INDEX / ADD CONSTRAINT / CHECK
--   * 无 DROP TABLE / DROP COLUMN / TRUNCATE
--   * 不修改 username_registry / sessions / 其他与本轮无关的表
-- ============================================================

-- ------------------------------------------------------------
-- 1. 产品与服务表 (products)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "products" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT,
  "description" TEXT,
  "price_text" TEXT,
  "cover_image_url" TEXT,
  "cta_label" TEXT,
  "cta_url" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "allow_ai_recommendation" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "products_user_id_is_active_sort_order_idx"
  ON "products"("user_id", "is_active", "sort_order");

CREATE INDEX "products_user_id_category_idx"
  ON "products"("user_id", "category");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_user_id_fkey') THEN
    ALTER TABLE "products"
      ADD CONSTRAINT "products_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 2. 企业知识库 (knowledge_docs)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "knowledge_docs" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT,
  "content" TEXT NOT NULL,
  "source_type" TEXT NOT NULL DEFAULT 'manual',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "allow_ai_citation" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "knowledge_docs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "knowledge_docs_user_id_is_active_category_idx"
  ON "knowledge_docs"("user_id", "is_active", "category");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'knowledge_docs_user_id_fkey') THEN
    ALTER TABLE "knowledge_docs"
      ADD CONSTRAINT "knowledge_docs_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3. AI 客服配置 (ai_service_configs)
-- 注意：本表不存储 API Key 或密钥，仅保存配置项
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ai_service_configs" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "assistant_name" TEXT NOT NULL DEFAULT 'AI 助理',
  "welcome_message" TEXT NOT NULL DEFAULT '你好！我是 AI 助理，有什么可以帮你？',
  "tone" TEXT NOT NULL DEFAULT 'friendly',
  "allow_product_recommendation" BOOLEAN NOT NULL DEFAULT true,
  "collect_lead" BOOLEAN NOT NULL DEFAULT true,
  "provider_mode" TEXT NOT NULL DEFAULT 'mock',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ai_service_configs_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_service_configs_user_id_key') THEN
    ALTER TABLE "ai_service_configs"
      ADD CONSTRAINT "ai_service_configs_user_id_key"
      UNIQUE ("user_id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_service_configs_user_id_fkey') THEN
    ALTER TABLE "ai_service_configs"
      ADD CONSTRAINT "ai_service_configs_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 4. AI 对话 (ai_conversations)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ai_conversations" (
  "id" UUID NOT NULL,
  "profile_id" UUID NOT NULL,
  "visitor_session_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "transferred_to_human" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_conversations_profile_id_created_at_idx"
  ON "ai_conversations"("profile_id", "created_at");

CREATE INDEX "ai_conversations_visitor_session_id_idx"
  ON "ai_conversations"("visitor_session_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_conversations_profile_id_fkey') THEN
    ALTER TABLE "ai_conversations"
      ADD CONSTRAINT "ai_conversations_profile_id_fkey"
      FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 5. AI 对话消息 (ai_messages)
-- source_refs 存储 JSON：引用的产品ID、文档ID、命中片段等
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ai_messages" (
  "id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "source_refs" JSONB,
  "credit_cost" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_messages_conversation_id_created_at_idx"
  ON "ai_messages"("conversation_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_messages_conversation_id_fkey') THEN
    ALTER TABLE "ai_messages"
      ADD CONSTRAINT "ai_messages_conversation_id_fkey"
      FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 6. AI 额度账户 (ai_credit_accounts)
-- 说明：
--   * 每用户唯一账户
--   * balance 永远 >= 0（由 CHECK 约束保证）
--   * version 用于乐观锁，防止并发扣减超支
--   * onDelete: RESTRICT：用户删除时保留经营记录，防止静默清零
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ai_credit_accounts" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "balance" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ai_credit_accounts_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_credit_accounts_user_id_key') THEN
    ALTER TABLE "ai_credit_accounts"
      ADD CONSTRAINT "ai_credit_accounts_user_id_key"
      UNIQUE ("user_id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_credit_accounts_balance_check') THEN
    ALTER TABLE "ai_credit_accounts"
      ADD CONSTRAINT "ai_credit_accounts_balance_check"
      CHECK (balance >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_credit_accounts_user_id_fkey') THEN
    ALTER TABLE "ai_credit_accounts"
      ADD CONSTRAINT "ai_credit_accounts_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 7. AI 额度流水 (ai_credit_ledgers)
-- 说明：
--   * entry_type: grant / consume / refund / adjustment / expire
--   * amount 正负口径由 CHECK 约束保证
--   * balance_after 记录操作后余额快照（>= 0）
--   * idempotency_key 唯一约束：同一业务操作不会产生重复流水
--   * onDelete: RESTRICT：流水记录不可级联删除
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ai_credit_ledgers" (
  "id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "entry_type" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "balance_after" INTEGER NOT NULL,
  "idempotency_key" TEXT,
  "reference_type" TEXT,
  "reference_id" TEXT,
  "metadata" JSONB,
  "reason" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_credit_ledgers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_credit_ledgers_account_id_created_at_idx"
  ON "ai_credit_ledgers"("account_id", "created_at");

CREATE INDEX "ai_credit_ledgers_reference_type_reference_id_idx"
  ON "ai_credit_ledgers"("reference_type", "reference_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_credit_ledgers_idempotency_key_key') THEN
    ALTER TABLE "ai_credit_ledgers"
      ADD CONSTRAINT "ai_credit_ledgers_idempotency_key_key"
      UNIQUE ("idempotency_key");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_credit_ledgers_balance_after_check') THEN
    ALTER TABLE "ai_credit_ledgers"
      ADD CONSTRAINT "ai_credit_ledgers_balance_after_check"
      CHECK (balance_after >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_credit_ledgers_amount_entry_type_check') THEN
    ALTER TABLE "ai_credit_ledgers"
      ADD CONSTRAINT "ai_credit_ledgers_amount_entry_type_check"
      CHECK (
        (entry_type = 'grant' AND amount > 0) OR
        (entry_type = 'refund' AND amount > 0) OR
        (entry_type = 'consume' AND amount < 0) OR
        (entry_type = 'expire' AND amount < 0) OR
        (entry_type = 'adjustment' AND amount <> 0)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_credit_ledgers_account_id_fkey') THEN
    ALTER TABLE "ai_credit_ledgers"
      ADD CONSTRAINT "ai_credit_ledgers_account_id_fkey"
      FOREIGN KEY ("account_id") REFERENCES "ai_credit_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 8. 会员订阅 (membership_subscriptions)
-- 说明：
--   * 最小模型：仅标记套餐与状态
--   * 不接入支付、不建立订单
--   * onDelete: RESTRICT：保留会员计费历史
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "membership_subscriptions" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "plan_code" TEXT NOT NULL DEFAULT 'free',
  "status" TEXT NOT NULL DEFAULT 'active',
  "current_period_start" TIMESTAMPTZ(6),
  "current_period_end" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "membership_subscriptions_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'membership_subscriptions_user_id_key') THEN
    ALTER TABLE "membership_subscriptions"
      ADD CONSTRAINT "membership_subscriptions_user_id_key"
      UNIQUE ("user_id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'membership_subscriptions_user_id_fkey') THEN
    ALTER TABLE "membership_subscriptions"
      ADD CONSTRAINT "membership_subscriptions_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 9. Lead 扩展：新增 4 列与外键
-- ------------------------------------------------------------

-- 9a. 新增列 wechat
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'wechat'
  ) THEN
    ALTER TABLE "leads" ADD COLUMN "wechat" TEXT;
  END IF;
END $$;

-- 9b. 新增列 interested_product_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'interested_product_id'
  ) THEN
    ALTER TABLE "leads" ADD COLUMN "interested_product_id" UUID;
  END IF;
END $$;

-- 9c. 新增列 conversation_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'conversation_id'
  ) THEN
    ALTER TABLE "leads" ADD COLUMN "conversation_id" UUID;
  END IF;
END $$;

-- 9d. 新增列 notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'notes'
  ) THEN
    ALTER TABLE "leads" ADD COLUMN "notes" TEXT;
  END IF;
END $$;

-- 9e. Lead.conversation_id 唯一约束（一次对话最多产生一条线索）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_conversation_id_key') THEN
    ALTER TABLE "leads"
      ADD CONSTRAINT "leads_conversation_id_key"
      UNIQUE ("conversation_id");
  END IF;
END $$;

-- 9f. Lead.interested_product_id 外键 → products (SET NULL)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_interested_product_id_fkey') THEN
    ALTER TABLE "leads"
      ADD CONSTRAINT "leads_interested_product_id_fkey"
      FOREIGN KEY ("interested_product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 9g. Lead.conversation_id 外键 → ai_conversations (SET NULL)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_conversation_id_fkey') THEN
    ALTER TABLE "leads"
      ADD CONSTRAINT "leads_conversation_id_fkey"
      FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 9h. Lead interested_product_id 索引
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'leads' AND indexname = 'leads_interested_product_id_idx'
  ) THEN
    CREATE INDEX "leads_interested_product_id_idx"
      ON "leads"("interested_product_id");
  END IF;
END $$;
