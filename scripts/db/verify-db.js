// Link168 database verification script.
// Checks required tables and columns without printing secrets or row contents.

"use strict";

const path = require("path");
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

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
  "workspaces",
  "workspace_members",
  "leads",
];

const REQUIRED_COLUMNS = {
  users: ["email", "password_hash", "role", "email_verified"],
  profiles: ["username", "first_published_at"],
  links: ["total_clicks", "workspace_id"],
  leads: ["workspace_id", "contact_entry_id", "claimed_by_user_id"],
};

const COUNT_TABLES = ["users", "profiles", "links", "short_links", "reports", "ai_usage_logs"];

function logInfo(message) {
  console.log(`${CYAN}[db:verify]${RESET} ${message}`);
}

function logOk(message) {
  console.log(`${GREEN}[db:verify]${RESET} ${message}`);
}

function logErr(message) {
  console.error(`${RED}[db:verify]${RESET} ${message}`);
}

function loadPrisma() {
  const generatedPath = path.join(process.cwd(), "src", "generated", "prisma", "client");

  try {
    const { PrismaPg } = require("@prisma/adapter-pg");
    const { PrismaClient } = require(generatedPath);
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    return new PrismaClient({ adapter });
  } catch (error) {
    logErr("Could not load the PrismaPg-backed PrismaClient. Run `npm install && npx prisma generate`.");
    throw error;
  }
}

async function main() {
  console.log(`${BOLD}=== Link168 Database Verify ===${RESET}`);
  console.log(`NODE_ENV: ${(process.env.NODE_ENV || "").toLowerCase() || "(unset)"}`);

  if (!process.env.DATABASE_URL) {
    logErr("DATABASE_URL is missing. Cannot verify.");
    process.exit(2);
  }

  const prisma = loadPrisma();
  let failed = false;

  try {
    logInfo("Checking required tables ...");
    const tableRows = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    const existingTables = new Set(tableRows.map((row) => row.tablename));

    for (const table of REQUIRED_TABLES) {
      if (existingTables.has(table)) {
        console.log(`  - ${table} ${GREEN}OK${RESET}`);
      } else {
        console.log(`  - ${table} ${RED}MISSING${RESET}`);
        failed = true;
      }
    }

    logInfo("Checking required columns ...");
    for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
      if (!existingTables.has(table)) {
        console.log(`  - ${table} ${RED}skipped (table missing)${RESET}`);
        failed = true;
        continue;
      }

      for (const column of columns) {
        const rows = await prisma.$queryRaw`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = ${table}
            AND column_name = ${column}
          LIMIT 1
        `;
        if (rows.length > 0) {
          console.log(`  - ${table}.${column} ${GREEN}OK${RESET}`);
        } else {
          console.log(`  - ${table}.${column} ${RED}MISSING${RESET}`);
          failed = true;
        }
      }
    }

    logInfo("Counting rows ...");
    for (const table of COUNT_TABLES) {
      if (!existingTables.has(table)) {
        console.log(`  - ${table}: ${YELLOW}n/a (table missing)${RESET}`);
        continue;
      }
      const rows = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS c FROM "${table}"`);
      console.log(`  - ${table}: ${rows[0]?.c ?? 0}`);
    }

    logInfo("Sanity: users.password_hash existence was checked but its values were not read or printed.");
  } finally {
    await prisma.$disconnect();
  }

  if (failed) {
    logErr("数据库结构验证失败");
    process.exit(1);
  }

  logOk("数据库结构验证通过");
}

main().catch((error) => {
  logErr(`Fatal error: ${error?.message || String(error)}`);
  process.exit(1);
});
