// 直接 SQL 写入百炼配置（绕过 Prisma upsert 问题）
// 运行：node scripts/db/write-bailian-config.mjs

import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";
import { config } from "dotenv";
import { assertLocalTestOnly } from "../ai-test/production-guard.mjs";

assertLocalTestOnly("scripts/db/write-bailian-config.mjs");

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", "..", ".env.local") });

const pg = require("pg");
const { Pool } = pg.default || pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function query(sql, params) {
  return pool.query(sql, params);
}

async function upsert(key, value, sensitive) {
  // Encrypt sensitive values with same algorithm as app-config.ts
  let storedValue = value;
  if (sensitive) {
    const crypto = require("crypto");
    const secret = process.env.CONFIG_ENCRYPTION_KEY || process.env.ADMIN_SECRET || "link168-config-encryption-key-20260622";
    const key = crypto.createHash("sha256").update(secret).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    storedValue = `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
  }

  await query(
    `INSERT INTO app_configs (id, config_key, config_value, is_sensitive, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, NOW())
     ON CONFLICT (config_key) DO UPDATE SET config_value = $2, is_sensitive = $3, updated_at = NOW()`,
    [key, storedValue, sensitive],
  );

  const display = sensitive ? (value ? value.substring(0, 4) + "****" : "(空)") : value;
  console.log(`  ${sensitive ? "🔒" : "✅"} ${key} = ${display}`);
}

async function main() {
  console.log("=".repeat(60));
  console.log("直接 SQL 写入百炼配置");
  console.log("=".repeat(60));
  console.log(`\n数据库: ${process.env.DATABASE_URL}`);

  const CONFIGS = [
    // AI 总开关
    { key: "ai.enabled",          value: "true",                                           sensitive: false },
    // 百炼 OpenAI 兼容协议
    { key: "ai.provider",        value: "openai-compatible",                               sensitive: false },
    // 百炼 API 端点
    { key: "ai.baseUrl",         value: "https://dashscope.aliyuncs.com/compatible-mode/v1", sensitive: false },
    // 模型
    { key: "ai.model",           value: "qwen3.7-plus",                                   sensitive: false },
    // API Key（从环境变量读取，空则写空）
    { key: "ai.apiKey",          value: process.env.BAILIAN_API_KEY || "",                 sensitive: true  },
    // 每日总调用上限
    { key: "ai.dailyLimit",      value: "500",                                             sensitive: false },
    // 每人每日调用上限
    { key: "ai.userDailyLimit",  value: "50",                                              sensitive: false },
    // 白名单（空=仅会员；可加测试邮箱）
    { key: "ai.testWhitelist",   value: "[]",                                              sensitive: false },
    // 五大 Agent 独立开关
    { key: "ai.assistant.tax.enabled",    value: "false", sensitive: false },
    { key: "ai.assistant.legal.enabled",  value: "false", sensitive: false },
    { key: "ai.assistant.market.enabled", value: "false", sensitive: false },
    { key: "ai.assistant.design.enabled", value: "false", sensitive: false },
    { key: "ai.assistant.social.enabled", value: "true",  sensitive: false },
  ];

  for (const c of CONFIGS) {
    await upsert(c.key, c.value, c.sensitive);
  }

  // 验证读取
  console.log("\n验证读取：");
  const { rows } = await query(`SELECT config_key, LEFT(config_value, 40) as v, is_sensitive FROM app_configs WHERE config_key LIKE 'ai.%' ORDER BY config_key`);
  for (const r of rows) {
    const masked = r.is_sensitive ? "🔒(加密)" : r.v;
    console.log(`  ${r.config_key} = ${masked}`);
  }

  await pool.end();
  console.log("\n完成。");
}

main().catch((e) => {
  console.error("失败：", e.message);
  process.exit(1);
});
