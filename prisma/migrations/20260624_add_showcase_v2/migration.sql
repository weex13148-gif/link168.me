-- ============================================================
-- 比赛展示页面 V2：动态内容 + 章节顺序 + AI 演示 / 调试台
-- 安全约束：
--   * 仅 CREATE TABLE / CREATE INDEX
--   * 无 DROP TABLE / DROP COLUMN / TRUNCATE
-- 说明：原 SHOWCASE_CONTENT 硬编码在 src/lib/showcase.ts；
--       本次升级将 9 大章节抽到数据库，超级管理员可后台修改。
-- ============================================================

-- 1. 章节动态内容
CREATE TABLE IF NOT EXISTS "showcase_contents" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "section_key" TEXT NOT NULL UNIQUE,
  "eyebrow" TEXT NOT NULL DEFAULT '',
  "title" TEXT NOT NULL DEFAULT '',
  "body" TEXT NOT NULL DEFAULT '',
  "bullets" JSONB,
  "stats" JSONB,
  "cta_text" TEXT,
  "cta_url" TEXT,
  "metadata" JSONB,
  "updated_by" UUID,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- 2. 章节顺序与可见性
CREATE TABLE IF NOT EXISTS "showcase_sequences" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "section_key" TEXT NOT NULL UNIQUE,
  "order_index" INTEGER NOT NULL,
  "visible" BOOLEAN NOT NULL DEFAULT true,
  "animation" BOOLEAN NOT NULL DEFAULT true,
  "theme" TEXT NOT NULL DEFAULT 'dark',
  "dwell_sec" INTEGER NOT NULL DEFAULT 0,
  "allow_swipe" BOOLEAN NOT NULL DEFAULT true,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "showcase_sequences_order_index_idx"
  ON "showcase_sequences" ("order_index");

-- 3. 比赛 AI 演示调用记录
-- 与正式用户 AiConversation / AiMessage 完全隔离
CREATE TABLE IF NOT EXISTS "showcase_ai_demo_calls" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "visitor_hash" TEXT NOT NULL,
  "assistant" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "response" TEXT NOT NULL,
  "latency_ms" INTEGER NOT NULL,
  "success" BOOLEAN NOT NULL,
  "error_code" TEXT,
  "error_message" TEXT,
  "model_name" TEXT,
  "input_tokens" INTEGER,
  "output_tokens" INTEGER,
  "source_page" TEXT,
  "saved" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "showcase_ai_demo_calls_created_at_idx"
  ON "showcase_ai_demo_calls" ("created_at");

CREATE INDEX IF NOT EXISTS "showcase_ai_demo_calls_visitor_hash_created_at_idx"
  ON "showcase_ai_demo_calls" ("visitor_hash", "created_at");

CREATE INDEX IF NOT EXISTS "showcase_ai_demo_calls_assistant_created_at_idx"
  ON "showcase_ai_demo_calls" ("assistant", "created_at");

-- 4. 比赛 AI 调试台记录
-- 与演示调用隔离，仅 super_admin 可访问
CREATE TABLE IF NOT EXISTS "showcase_ai_debug_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "debugger_id" UUID NOT NULL,
  "debugger_email" TEXT NOT NULL,
  "assistant" TEXT NOT NULL,
  "system_prompt" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "raw_response" TEXT NOT NULL,
  "latency_ms" INTEGER NOT NULL,
  "success" BOOLEAN NOT NULL,
  "error_code" TEXT,
  "error_message" TEXT,
  "model_name" TEXT,
  "config_version" TEXT,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "showcase_ai_debug_logs_debugger_id_created_at_idx"
  ON "showcase_ai_debug_logs" ("debugger_id", "created_at");

CREATE INDEX IF NOT EXISTS "showcase_ai_debug_logs_assistant_created_at_idx"
  ON "showcase_ai_debug_logs" ("assistant", "created_at");

-- 5. 比赛 AI 调试台：提示词草稿
CREATE TABLE IF NOT EXISTS "showcase_prompt_drafts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "assistant" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "system_prompt" TEXT NOT NULL,
  "welcome_text" TEXT NOT NULL DEFAULT '',
  "suggested_questions" JSONB,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "version" TEXT NOT NULL DEFAULT '0.1.0',
  "author_id" UUID NOT NULL,
  "author_email" TEXT NOT NULL,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "showcase_prompt_drafts_assistant_published_idx"
  ON "showcase_prompt_drafts" ("assistant", "published");

CREATE INDEX IF NOT EXISTS "showcase_prompt_drafts_author_id_created_at_idx"
  ON "showcase_prompt_drafts" ("author_id", "created_at");
