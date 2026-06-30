// Link168 系统账号 / 测试账号生成脚本（Node.js + Prisma）
// 运行：node scripts/db/create-system-users.js
// 环境变量覆盖：
//   DEMO_EMAIL / DEMO_PASSWORD
//   ADMIN_EMAIL / ADMIN_PASSWORD
//   SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD
//
// 本脚本只在账号不存在时插入。密码只写 bcrypt hash，从不写明文。
// 输出中不会打印明文密码或完整 API Key。

"use strict";

const crypto = require("crypto");
const bcrypt = require("bcrypt");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env.local") });

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
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

function logInfo(msg) {
  console.log(`${CYAN}[db:create-users]${RESET} ${msg}`);
}
function logWarn(msg) {
  console.log(`${YELLOW}[db:create-users]${RESET} ${msg}`);
}
function logOk(msg) {
  console.log(`${GREEN}[db:create-users]${RESET} ${msg}`);
}
function logErr(msg) {
  console.error(`${RED}[db:create-users]${RESET} ${msg}`);
}

const HASH_ROUNDS = 12;

const USER_SPECS = [
  {
    role: "user",
    emailEnv: "DEMO_EMAIL",
    passwordEnv: "DEMO_PASSWORD",
    fallbackEmail: "demo@example.com",
    fallbackPassword: "demo-password-1234",
    isSystem: true,
    bio: "Demo 用户，用于功能验证；其主页数据可随时被管理员重置。",
  },
  {
    role: "admin",
    emailEnv: "ADMIN_EMAIL",
    passwordEnv: "ADMIN_PASSWORD",
    fallbackEmail: "admin@example.com",
    fallbackPassword: "admin-password-1234",
    isSystem: true,
    bio: "系统管理员账号，可处理举报、隐藏/恢复主页。",
  },
  {
    role: "super_admin",
    emailEnv: "SUPER_ADMIN_EMAIL",
    passwordEnv: "SUPER_ADMIN_PASSWORD",
    fallbackEmail: "super-admin@example.com",
    fallbackPassword: "super-admin-password-1234",
    isSystem: true,
    bio: "超级管理员账号，可管理其他管理员与系统配置。",
  },
];

async function upsertUser(prisma, spec) {
  const email = (process.env[spec.emailEnv] || spec.fallbackEmail).toLowerCase().trim();
  const password = process.env[spec.passwordEnv] || spec.fallbackPassword;

  if (!email || !email.includes("@")) {
    logWarn(`跳过账号（邮箱不合法）：role=${spec.role} email=${email}`);
    return false;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== spec.role) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: spec.role, isSystem: spec.isSystem },
      });
      logOk(`账号已存在并更新角色：${email} -> ${spec.role}`);
    } else {
      logInfo(`账号已存在，跳过：${email}（role=${existing.role}）`);
    }
    return true;
  }

  const passwordHash = await bcrypt.hash(password, HASH_ROUNDS);
  const userId = crypto.randomUUID();
  const profileId = crypto.randomUUID();

  const { id: newUserId } = await prisma.user.create({
    data: {
      id: userId,
      email,
      passwordHash,
      role: spec.role,
      isSystem: spec.isSystem,
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

main().catch((err) => {
  logErr("创建系统账号失败：" + (err && err.message ? err.message : String(err)));
  process.exit(1);
});
