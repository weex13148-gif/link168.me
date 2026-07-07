// link168 database migration script
// Runs `prisma migrate status` then `prisma migrate deploy`.
// Requires CONFIRM_PRODUCTION_MIGRATE=yes when NODE_ENV=production.

"use strict";

const { spawnSync } = require("child_process");
const path = require("path");
require("dotenv").config();

const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

function logInfo(msg) {
  console.log(`${CYAN}[db:migrate]${RESET} ${msg}`);
}
function logWarn(msg) {
  console.log(`${YELLOW}[db:migrate]${RESET} ${msg}`);
}
function logOk(msg) {
  console.log(`${GREEN}[db:migrate]${RESET} ${msg}`);
}
function logErr(msg) {
  console.error(`${RED}[db:migrate]${RESET} ${msg}`);
}

function runNpx(args, opts) {
  const nodeCmd = process.platform === "win32" ? "npx.cmd" : "npx";
  return spawnSync(nodeCmd, args, {
    stdio: opts && opts.pipeErr ? ["ignore", "pipe", "pipe"] : "inherit",
    env: process.env,
    encoding: "utf8",
  });
}

function main() {
  console.log(`${BOLD}=== Link168 Database Migrate ===${RESET}`);
  const nodeEnv = (process.env.NODE_ENV || "").toLowerCase();
  console.log(`NODE_ENV: ${nodeEnv || "(unset)"}`);

  if (!process.env.DATABASE_URL) {
    logErr("DATABASE_URL is missing.");
    process.exit(2);
  }

  // 1. Production gate
  if (nodeEnv === "production") {
    const confirm = String(process.env.CONFIRM_PRODUCTION_MIGRATE || "no").toLowerCase();
    if (confirm !== "yes") {
      logErr("NODE_ENV=production detected but CONFIRM_PRODUCTION_MIGRATE=yes is not set.");
      logWarn("Production migrations change the production schema and may lock tables.");
      logWarn("Strongly recommended: first run `npm run db:backup`.");
      logInfo("If you really want to migrate production, run:");
      console.log(`  NODE_ENV=production CONFIRM_PRODUCTION_MIGRATE=yes npm run db:migrate`);
      process.exit(4);
    }
    logWarn("Production migration confirmed. Will proceed.");
  } else {
    logInfo("Non-production environment detected. Skipping CONFIRM_PRODUCTION_MIGRATE check.");
    logWarn("Tip: back up first with `npm run db:backup` before migrating.");
  }

  // 2. Prisma migrate status
  logInfo("Running `prisma migrate status` ...");
  const statusRes = runNpx(["prisma", "migrate", "status"], { pipeErr: false });
  if (statusRes.status !== 0) {
    logErr(`prisma migrate status returned ${statusRes.status}.`);
    process.exit(5);
  }

  // 3. Prisma migrate deploy
  logInfo("Running `prisma migrate deploy` ...");
  const deployRes = runNpx(["prisma", "migrate", "deploy"], { pipeErr: false });
  if (deployRes.status !== 0) {
    logErr(`prisma migrate deploy returned ${deployRes.status}.`);
    process.exit(6);
  }

  logOk("Migration deploy completed.");

  // 4. Verify
  logInfo("Running `npm run db:verify` ...");
  const verifyRes = spawnSync(process.execPath, [path.join(__dirname, "verify-db.js")], {
    stdio: "inherit",
    env: process.env,
  });
  if (verifyRes.status !== 0) {
    logErr("Post-migration verify failed. Please inspect the output above.");
    process.exit(7);
  }

  logOk("All done.");
}

main();
