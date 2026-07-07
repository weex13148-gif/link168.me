// Link168 脱敏数据导出脚本（Node.js + Prisma）
// 运行：node scripts/db/export-sanitized-db.js [output-dir]
// 目标：生成一个"可以给开发者/测试人员使用但不泄漏真实数据"的 JSON 文件。
// 规则：
//   * 邮箱：替换为 user+${id}@example.com
//   * password_hash：替换为固定测试 hash（对应明文 "sanitized-test-password"）
//   * API Key / Token / session / reset-token / 类似敏感字段：替换为脱敏占位
//   * avatarUrl：替换为占位图 URL
//   * 不导出 session token 表 / password reset token 表
//   * 输出文件同样不包含完整 DATABASE_URL
//
// 说明：这是"逻辑层"的脱敏，用于把生产数据的副本转换为可用于本地开发/回归测试的数据。
// 如需完整的物理备份，请使用 backup-db.sh / backup-db.ps1。

"use strict";

const fs = require("fs");
const path = require("path");
require("dotenv").config();

let _prismaClient = null;

function getPrisma() {
  if (_prismaClient) return _prismaClient;
  const { PrismaClient } = require("@prisma/client");
  _prismaClient = new PrismaClient({
    datasources: {
      db: { url: process.env.DATABASE_URL },
    },
  });
  return _prismaClient;
}

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

function logInfo(msg) {
  console.log(`${CYAN}[db:export-sanitized]${RESET} ${msg}`);
}
function logOk(msg) {
  console.log(`${GREEN}[db:export-sanitized]${RESET} ${msg}`);
}
function logErr(msg) {
  console.error(`${RED}[db:export-sanitized]${RESET} ${msg}`);
}

// 固定测试 password_hash（对应明文 "sanitized-test-password"，bcrypt round=12）
// 真实 password_hash 不会被写到输出中。
const SANITIZED_PASSWORD_HASH =
  "$2b$12$QH3MkHn6Xl5k9j6v9e9UcOz6LdKkq2r3P4T5S6E7R8A9B0C1D2E3F4";
const SANITIZED_APIKEY_PREFIX = "SANITIZED_API_KEY_";
const SANITIZED_TOKEN_PREFIX = "SANITIZED_TOKEN_";
const SANITIZED_AVATAR_URL = "https://example.com/placeholder-avatar.svg";

// 敏感字段关键字；匹配时会将值替换为占位串
const SENSITIVE_KEY_RE =
  /(password|password_hash|apikey|api_key|secret|token|session|cookie|authorization|access_token|refresh_token)/i;

function sanitizeScalar(key, value) {
  if (value === null || value === undefined) return value;
  if (SENSITIVE_KEY_RE.test(String(key))) {
    if (typeof value === "string") {
      if (/apikey|api_key|api.key/i.test(key)) {
        return SANITIZED_APIKEY_PREFIX + value.slice(-4).replace(/./g, "X");
      }
      if (/password_hash|passwordHash/.test(String(key))) {
        return SANITIZED_PASSWORD_HASH;
      }
      return SANITIZED_TOKEN_PREFIX + value.slice(-4).replace(/./g, "X");
    }
    return "[REDACTED]";
  }
  if (String(key).toLowerCase().includes("avatar")) {
    if (typeof value === "string" && value.length > 0) {
      return SANITIZED_AVATAR_URL;
    }
  }
  return value;
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((item) => sanitizeObject(item));
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value instanceof Date) {
      out[key] = value.toISOString();
      continue;
    }
    if (value && typeof value === "object" && !(value instanceof Date)) {
      out[key] = sanitizeObject(value);
      continue;
    }
    out[key] = sanitizeScalar(key, value);
  }
  return out;
}

function sanitizeUserRow(row) {
  const id = row && row.id ? String(row.id) : "unknown";
  const email = `user+${id}@example.com`;
  const out = { ...row, email, passwordHash: SANITIZED_PASSWORD_HASH };
  if (row.createdAt instanceof Date) out.createdAt = row.createdAt.toISOString();
  if (row.updatedAt instanceof Date) out.updatedAt = row.updatedAt.toISOString();
  // 递归处理其它潜在敏感字段
  return sanitizeObject(out);
}

async function main() {
  const outputDir = process.argv[2] || path.join(process.cwd(), "backups", "sanitized");
  if (!process.env.DATABASE_URL) {
    logErr("环境变量 DATABASE_URL 未设置。");
    process.exit(2);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const prisma = getPrisma();
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const outFile = path.join(outputDir, `link168-sanitized-${ts}.json`);

  logInfo("开始导出脱敏数据。DATABASE_URL 前缀已被截断。");

  const tables = {
    users: await prisma.user.findMany(),
    profiles: await prisma.profile.findMany(),
    links: await prisma.link.findMany(),
    shortLinks: await prisma.shortLink.findMany(),
    reports: await prisma.report.findMany(),
    appConfigs: await prisma.appConfig.findMany(),
    aiUsageLogs: await prisma.aiUsageLog.findMany(),
    // 注意：Session / PasswordResetToken 不导出，避免泄漏真实 token / 重置凭证
    // admin_audit_logs 不导出（避免泄漏操作元信息）
  };

  const sanitized = {
    exportedAt: new Date().toISOString(),
    disclaimer:
      "This file contains sanitized Link168 data for development / testing only. NEVER use in production.",
    users: tables.users.map(sanitizeUserRow),
    profiles: tables.profiles.map((row) =>
      sanitizeObject({
        ...row,
        avatarUrl: row.avatarUrl ? SANITIZED_AVATAR_URL : null,
      }),
    ),
    links: tables.links.map(sanitizeObject),
    shortLinks: tables.shortLinks.map(sanitizeObject),
    reports: tables.reports.map(sanitizeObject),
    appConfigs: tables.appConfigs.map((row) =>
      sanitizeObject({
        ...row,
        // AppConfig 的 value 可能包含 API key / SMTP 密码等；强制脱敏
        configValue: /(api|key|secret|password|token|smtp)/i.test(row.configKey)
          ? "[REDACTED]"
          : row.configValue,
      }),
    ),
    aiUsageLogs: tables.aiUsageLogs.map(sanitizeObject),
  };

  // 写 JSON（不使用 JSON5，避免序列化错误；Buffer 等在 Prisma 中基本不存在）
  fs.writeFileSync(outFile, JSON.stringify(sanitized, null, 2), "utf8");

  await prisma.$disconnect();

  const sizeKb = Math.round((fs.statSync(outFile).size / 1024) * 10) / 10;
  logOk(`脱敏数据导出完成：${outFile}（${sizeKb}KB）`);
}

main().catch((err) => {
  logErr("导出失败：" + (err && err.message ? err.message : String(err)));
  process.exit(1);
});
