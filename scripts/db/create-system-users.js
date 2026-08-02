// Link168 系统管理员账号生成脚本（Node.js + Prisma）
// 运行：node scripts/db/create-system-users.js
// 环境变量覆盖：
//   SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD
//
// 本脚本只创建新的系统账号，或轮换已有系统账号的凭据。
// 密码只写 bcrypt hash，从不写明文。
// 输出中不会打印明文密码或完整 API Key。

"use strict";

const crypto = require("crypto");
const bcrypt = require("bcrypt");
const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, "..", "..", ".env.local"),
  quiet: true,
});

// 方案A：直接 require 生成路径（适配 Link168 自定义输出目录）
// 方案B：标准 @prisma/client（适配其他项目）
function createPrismaClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let PrismaClient;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const generated = require(path.join(__dirname, "..", "..", "src/generated/prisma/client"));
    PrismaClient = generated.PrismaClient || generated.default?.PrismaClient;
    if (!PrismaClient) throw new Error("PrismaClient not found in generated client");
  } catch (_e) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { PrismaClient: PC } = require("@prisma/client");
      PrismaClient = PC;
    } catch (_e2) {
      throw new Error("无法加载 PrismaClient，请确认 prisma generate 已执行");
    }
  }
  // Prisma 7 需要使用 adapter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { PrismaPg } = require("@prisma/adapter-pg");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pg = require("pg");
  const Pool = pg.default?.Pool || pg.Pool;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

let _prismaClient = null;
function getPrisma() {
  if (_prismaClient) return _prismaClient;
  _prismaClient = createPrismaClient();
  return _prismaClient;
}

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

function logInfo(msg) {
  console.log(`${CYAN}[db:create-users]${RESET} ${msg}`);
}
function logOk(msg) {
  console.log(`${GREEN}[db:create-users]${RESET} ${msg}`);
}
function logErr(msg) {
  console.error(`${RED}[db:create-users]${RESET} ${msg}`);
}

const HASH_ROUNDS = 12;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BOOTSTRAP_PASSWORD_MIN_LENGTH = 16;

function assertValidBootstrapEmail(email) {
  if (!EMAIL_PATTERN.test(email)) {
    throw new Error("SUPER_ADMIN_EMAIL 必须是完整有效的邮箱地址");
  }
}

function assertStrongBootstrapPassword(password) {
  if (password.length < BOOTSTRAP_PASSWORD_MIN_LENGTH) {
    throw new Error(`SUPER_ADMIN_PASSWORD 长度不能少于 ${BOOTSTRAP_PASSWORD_MIN_LENGTH} 位`);
  }
  if (/replace-with|password|superadmin|123456/i.test(password)) {
    throw new Error("SUPER_ADMIN_PASSWORD 不能使用占位值或常见弱口令");
  }
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/]
    .filter((pattern) => pattern.test(password)).length;
  if (classes < 3) {
    throw new Error("SUPER_ADMIN_PASSWORD 必须至少包含大写字母、小写字母、数字、特殊字符中的三类");
  }
}

const USER_SPECS = [
  {
    role: "super_admin",
    emailEnv: "SUPER_ADMIN_EMAIL",
    passwordEnv: "SUPER_ADMIN_PASSWORD",
    required: true,
    isSystem: true,
    bio: "超级管理员账号，可管理其他管理员与系统配置。",
  },
];

async function upsertUser(prisma, spec) {
  const email = (process.env[spec.emailEnv] || "").toLowerCase().trim();
  const password = process.env[spec.passwordEnv] || "";

  if (!email || !password) {
    throw new Error(`账号 ${spec.role} 必须同时配置 ${spec.emailEnv} 和 ${spec.passwordEnv}`);
  }
  assertValidBootstrapEmail(email);
  assertStrongBootstrapPassword(password);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (!existing.isSystem) {
      throw new Error(
        `邮箱 ${email} 已属于普通用户；为防止越权，脚本拒绝将其提升为系统账号`,
      );
    }

    const passwordHash = await bcrypt.hash(password, HASH_ROUNDS);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          role: spec.role,
          isSystem: true,
          emailVerified: true,
          accountStatus: "active",
        },
      });
      await tx.session.deleteMany({ where: { userId: existing.id } });
    });
    logOk(`系统账号凭据已轮换并撤销旧会话：${email} -> ${spec.role}`);
    return true;
  }

  const passwordHash = await bcrypt.hash(password, HASH_ROUNDS);
  const userId = crypto.randomUUID();
  const profileId = crypto.randomUUID();

  await prisma.user.create({
    data: {
      id: userId,
      email,
      passwordHash,
      role: spec.role,
      isSystem: spec.isSystem,
      emailVerified: true,
      accountStatus: "active",
      profile: {
        create: {
          id: profileId,
          username: email.replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""),
          displayName: `${spec.role} (system)`,
          bio: spec.bio,
          language: "zh",
          theme: "default",
          isPublic: false,
        },
      },
    },
    select: { id: true },
  });

  logOk(`新账号已创建：${email} role=${spec.role}`);
  return true;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    logErr("环境变量 DATABASE_URL 未设置。");
    process.exit(2);
  }

  const prisma = getPrisma();
  try {
    for (const spec of USER_SPECS) {
      await upsertUser(prisma, spec);
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    logErr("创建系统账号失败：" + (err && err.message ? err.message : String(err)));
    process.exit(1);
  });
}

module.exports = {
  assertStrongBootstrapPassword,
  assertValidBootstrapEmail,
  upsertUser,
};
