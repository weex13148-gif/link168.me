// link168 database verify script
// Uses Prisma Client to check that expected tables + key columns exist,
// and prints counts. Never prints password hashes, secrets, or connection strings.

"use strict";

const path = require("path");
require("dotenv").config();

const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

function logInfo(msg) {
  console.log(`${CYAN}[db:verify]${RESET} ${msg}`);
}
function logWarn(msg) {
  console.log(`${YELLOW}[db:verify]${RESET} ${msg}`);
}
function logOk(msg) {
  console.log(`${GREEN}[db:verify]${RESET} ${msg}`);
}
function logErr(msg) {
  console.error(`${RED}[db:verify]${RESET} ${msg}`);
}

const REQUIRED_TABLES = [
  "users",
  "profiles",
  "links",
  "sessions",
  "reports",
  "short_links",
  "link_clicks",
  "password_reset_tokens",
  "email_verification_tokens",
  "login_attempts",
  "app_configs",
  "ai_usage_logs",
];

// key column checks: table -> [column, ...]
const REQUIRED_COLUMNS = {
  users: ["email", "password_hash", "role", "email_verified"],
  profiles: ["username"],
  links: ["total_clicks"],
};

const COUNT_TABLES = ["users", "profiles", "links", "short_links", "reports", "ai_usage_logs"];

// Resolve the path to the generated Prisma client
// The project outputs it to src/generated/prisma/client via tsconfig paths,
// so we resolve through the project root using relative require.
function loadPrisma() {
  // Try @prisma/client first (standard location) and then the generated one.
  try {
    const { PrismaClient } = require("@prisma/client");
    return new PrismaClient();
  } catch (e) {
    // Fall back to the custom generated location
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

async function main() {
  console.log(`${BOLD}=== Link168 Database Verify ===${RESET}`);
  const nodeEnv = (process.env.NODE_ENV || "").toLowerCase();
  console.log(`NODE_ENV: ${nodeEnv || "(unset)"}`);

  if (!process.env.DATABASE_URL) {
    logErr("DATABASE_URL is missing. Cannot verify.");
    process.exit(2);
  }

  const prisma = loadPrisma();

  let failed = false;

  // 1. Check tables exist via `pg_tables`
  logInfo("Checking required tables ...");
  const tableRows = await prisma
    .$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
  const existingTables = new Set(tableRows.map((r) => r.tablename));

  for (const t of REQUIRED_TABLES) {
    if (existingTables.has(t)) {
      console.log(`  - ${t} ${GREEN}OK${RESET}`);
    } else {
      console.log(`  - ${t} ${RED}MISSING${RESET}`);
      failed = true;
    }
  }

  // 2. Check required columns
  logInfo("Checking required columns ...");
  for (const [table, cols] of Object.entries(REQUIRED_COLUMNS)) {
    if (!existingTables.has(table)) {
      console.log(`  - ${table} ${RED}skipped (table missing)${RESET}`);
      continue;
    }
    let tableFailed = false;
    for (const col of cols) {
      try {
        const res = await prisma.$queryRaw`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = ${table}
            AND column_name = ${col}
          LIMIT 1`;
        if (Array.isArray(res) && res.length > 0) {
          console.log(`  - ${table}.${col} ${GREEN}OK${RESET}`);
        } else {
          console.log(`  - ${table}.${col} ${RED}MISSING${RESET}`);
          tableFailed = true;
        }
      } catch (e) {
        console.log(`  - ${table}.${col} ${RED}ERROR${RESET}`);
        tableFailed = true;
      }
    }
    if (tableFailed) failed = true;
  }

  // 3. Counts
  logInfo("Counting rows ...");
  for (const t of COUNT_TABLES) {
    if (!existingTables.has(t)) {
      console.log(`  - ${t}: ${YELLOW}n/a (table missing)${RESET}`);
      continue;
    }
    try {
      const rows = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS c FROM "${t}"`);
      const count = rows && rows[0] ? rows[0].c : 0;
      console.log(`  - ${t}: ${count}`);
    } catch (e) {
      console.log(`  - ${t}: ${RED}ERROR${RESET}`);
    }
  }

  // Never print password hashes, never print connection strings.
  logInfo("Sanity: confirming users.password_hash exists but will NOT be printed.");

  await prisma.$disconnect();

  if (failed) {
    logErr("数据库结构验证失败");
    process.exit(1);
  }
  logOk("数据库结构验证通过");
}

main().catch((e) => {
  logErr(`Fatal error: ${e && e.message ? e.message : String(e)}`);
  try {
    if (e && typeof e === "object" && e.message && e.message.includes("DATABASE_URL")) {
      logInfo("Ensure DATABASE_URL is set in your environment or .env file.");
    }
  } catch (_) {}
  process.exit(1);
});
