// 阿里云百炼 AI 配置种子脚本
// 目标：写入 AppConfig 表（加密敏感字段），配置百炼 OpenAI 兼容接口
// 运行：BAILIAN_API_KEY=你的key node scripts/db/seed-bailian-ai.mjs

import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";
import crypto from "crypto";
import { config } from "dotenv";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", "..", ".env.local") });

// 与 app-config.ts 相同的加密逻辑
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
function getEncryptionKey() {
  const secret = process.env.CONFIG_ENCRYPTION_KEY || process.env.ADMIN_SECRET || "link168-default-encryption-key-please-change-2025";
  return crypto.createHash("sha256").update(secret).digest();
}
function encryptSensitive(value) {
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
const { PrismaClient } = require("../../src/generated/prisma/client.js");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 百炼配置值（API Key 从环境变量 BAILLIAN_API_KEY 读取）
const CONFIGS = [
  { key: "ai.enabled",         value: "true",                            sensitive: false },
  { key: "ai.provider",        value: "openai-compatible",               sensitive: false },
  { key: "ai.baseUrl",         value: "https://dashscope.aliyuncs.com/compatible-mode/v1", sensitive: false },
  { key: "ai.model",           value: "qwen3.7-plus",                   sensitive: false },
  { key: "ai.apiKey",          value: process.env.BAILIAN_API_KEY || "", sensitive: true  },
  { key: "ai.dailyLimit",      value: "500",                             sensitive: false },
  { key: "ai.userDailyLimit",  value: "50",                              sensitive: false },
  { key: "ai.testWhitelist",   value: "[]",                              sensitive: false },
  { key: "ai.assistant.tax.enabled",    value: "false", sensitive: false },
  { key: "ai.assistant.legal.enabled",  value: "false", sensitive: false },
  { key: "ai.assistant.market.enabled", value: "false", sensitive: false },
  { key: "ai.assistant.design.enabled", value: "false", sensitive: false },
  { key: "ai.assistant.social.enabled", value: "true",  sensitive: false },
];

async function upsertConfig(key, rawValue, sensitive) {
  const configValue = sensitive ? encryptSensitive(String(rawValue)) : String(rawValue);
  await prisma.appConfig.upsert({
    where: { configKey: key },
    create: {
      id: crypto.randomUUID(),
      configKey: key,
      configValue,
      isSensitive: sensitive,
    },
    update: { configValue, isSensitive: sensitive },
  });
  const display = sensitive ? (rawValue ? rawValue.substring(0, 4) + "****" : "(空)") : rawValue;
  console.log(`  ${sensitive ? "🔒" : "✅"} ${key} = ${display}`);
}

async function main() {
  console.log("=".repeat(60));
  console.log("百炼 AI 配置种子");
  console.log("=".repeat(60));
  const hasKey = Boolean(process.env.BAILIAN_API_KEY);
  console.log(`API Key: ${hasKey ? process.env.BAILIAN_API_KEY.substring(0, 4) + "****" : "(未设置 - 使用空Key测试错误路径)"}`);
  console.log("\n写入配置：");
  for (const c of CONFIGS) {
    await upsertConfig(c.key, c.value, c.sensitive);
  }

  // 验证解密读取
  console.log("\n解密验证：");
  for (const c of CONFIGS.filter(x => !x.sensitive)) {
    const row = await prisma.appConfig.findUnique({ where: { configKey: c.key } });
    console.log(`  ${c.key} = ${row?.configValue ?? "(未找到)"}`);
  }

  await prisma.$disconnect();
  console.log("\n完成。可通过超级管理员配置中心查看（敏感字段已脱敏显示）。");
}

main().catch((e) => {
  console.error("种子脚本失败：", e.message);
  process.exit(1);
});
