// link168 system user creation
// Uses Prisma Client + bcrypt. Saves only password_hash, never plaintext.
// Env overrides: DEMO_EMAIL, DEMO_PASSWORD, ADMIN_EMAIL, ADMIN_PASSWORD,
// SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD.

"use strict";

const bcrypt = require("bcrypt");
const path = require("path");
require("dotenv").config();

const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

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

const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";

function genStrongPassword(len = 20) {
  let out = "";
  // Prefer crypto.randomInt if available
  const rndInt = (min, max) => {
    try {
      return require("crypto").randomInt(min, max);
    } catch (_) {
      return Math.floor(Math.random() * (max - min)) + min;
    }
  };
  for (let i = 0; i < len; i++) {
    out += PASSWORD_CHARS.charAt(rndInt(0, PASSWORD_CHARS.length));
  }
  return out;
}

function loadPrisma() {
  try {
    const { PrismaClient } = require("@prisma/client");
    return new PrismaClient();
  } catch (e) {
    const genPath = path.join(process.cwd(), "src", "generated", "prisma", "client");
    try {
      const { PrismaClient } = require(genPath);
      return new PrismaClient();
    } catch (e2) {
      logErr("Could not load PrismaClient. Run `npm install && npx prisma generate`.");
      throw e2;
    }
  }
}

const ACCOUNTS = [
  {
    key: "DEMO",
    role: "user",
    username: "demo",
    displayName: "Demo User",
    emailEnv: "DEMO_EMAIL",
    pwdEnv: "DEMO_PASSWORD",
    defaultEmail: "demo@link168.me",
  },
  {
    key: "ADMIN",
    role: "admin",
    username: "admin",
    displayName: "Admin",
    emailEnv: "ADMIN_EMAIL",
    pwdEnv: "ADMIN_PASSWORD",
    defaultEmail: "admin@link168.me",
  },
  {
    key: "SUPER_ADMIN",
    role: "super_admin",
    username: "superadmin",
    displayName: "Super Admin",
    emailEnv: "SUPER_ADMIN_EMAIL",
    pwdEnv: "SUPER_ADMIN_PASSWORD",
    defaultEmail: "superadmin@link168.me",
  },
];

async function main() {
  console.log(`${BOLD}=== Link168 Create System Users ===${RESET}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV || "(unset)"}`);
  if (!process.env.DATABASE_URL) {
    logErr("DATABASE_URL is missing.");
    process.exit(2);
  }

  const prisma = loadPrisma();

  const results = [];

  for (const acc of ACCOUNTS) {
    const email = (process.env[acc.emailEnv] || acc.defaultEmail).trim();
    const providedPwd = (process.env[acc.pwdEnv] || "").trim();
    const password = providedPwd.length > 0 ? providedPwd : genStrongPassword();
    const wasAuto = providedPwd.length === 0;

    const passwordHash = await bcrypt.hash(password, 12);

    const existing = await prisma.user.findUnique({ where: { email } });
    let action;
    if (existing) {
      await prisma.user.update({
        where: { email },
        data: { passwordHash, role: acc.role, emailVerified: true, isSystem: false },
      });
      action = "updated";
    } else {
      await prisma.user.create({
        data: {
          id: require("crypto").randomUUID(),
          email,
          passwordHash,
          emailVerified: true,
          role: acc.role,
          isSystem: false,
        },
      });
      action = "created";
    }

    // create/update profile
    const user = await prisma.user.findUnique({ where: { email } });
    const existingProfile = await prisma.profile.findUnique({ where: { username: acc.username } });
    if (existingProfile) {
      await prisma.profile.update({
        where: { username: acc.username },
        data: { displayName: acc.displayName, isPublic: true, userId: user.id },
      });
    } else {
      await prisma.profile.create({
        data: {
          id: require("crypto").randomUUID(),
          userId: user.id,
          username: acc.username,
          displayName: acc.displayName,
          theme: "default",
          language: "zh",
          isPublic: true,
        },
      });
    }

    results.push({
      email,
      role: acc.role,
      username: acc.username,
      action,
      passwordShownOnce: password,
      wasAuto,
    });
  }

  await prisma.$disconnect();

  console.log();
  console.log(`${BOLD}--- Accounts (shown once; save them now) ---${RESET}`);
  for (const r of results) {
    const source = r.wasAuto ? "auto-generated" : "from env";
    console.log(`  ${GREEN}${r.action}${RESET}  role=${r.role}  user=${r.username}  email=${r.email}  (pwd ${source})`);
    console.log(`       password: ${r.passwordShownOnce}`);
  }
  console.log();
  logWarn("Passwords are shown ONCE. Save them in a secure location now.");
  logWarn("Do NOT commit, print, or persist these passwords anywhere in source code or files.");
  logOk("Done.");
}

main().catch((e) => {
  logErr(`Fatal error: ${e && e.message ? e.message : String(e)}`);
  process.exit(1);
});
