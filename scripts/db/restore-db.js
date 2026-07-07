// link168 database restore script
// Reads DATABASE_URL from environment and the backup file path from argv.
// Requires CONFIRM_RESTORE=yes.

"use strict";

const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

function logInfo(msg) {
  console.log(`${CYAN}[db:restore]${RESET} ${msg}`);
}
function logWarn(msg) {
  console.log(`${YELLOW}[db:restore]${RESET} ${msg}`);
}
function logOk(msg) {
  console.log(`${GREEN}[db:restore]${RESET} ${msg}`);
}
function logErr(msg) {
  console.error(`${RED}[db:restore]${RESET} ${msg}`);
}

function which(cmd) {
  try {
    const out = execSync(
      process.platform === "win32" ? `where ${cmd}` : `which ${cmd}`,
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    ).trim();
    return out.split(/\r?\n/)[0];
  } catch (e) {
    return null;
  }
}

function main() {
  console.log(`${BOLD}=== Link168 Database Restore ===${RESET}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV || "(unset)"}`);

  // 1. Validate DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logErr("DATABASE_URL is missing.");
    process.exit(2);
  }

  // 2. Require explicit restore confirmation
  const confirm = String(process.env.CONFIRM_RESTORE || "no").toLowerCase();
  if (confirm !== "yes") {
    logErr("CONFIRM_RESTORE=yes is required to restore the database.");
    logErr("Restore will overwrite existing tables and data.");
    logWarn("Recommended: first run `npm run db:backup` on the target database.");
    logInfo("If you really want to proceed, run:");
    console.log(`  CONFIRM_RESTORE=yes npm run db:restore -- <backup-file>`);
    process.exit(4);
  }

  // 3. Get backup file path from argv
  const argv = process.argv.slice(2);
  if (argv.length < 1) {
    logErr("Missing backup file path.");
    console.log(`Usage: CONFIRM_RESTORE=yes npm run db:restore -- ./backups/db/link168-db-<TIMESTAMP>.sql.gz`);
    process.exit(5);
  }

  const backupFile = path.resolve(argv[0]);
  if (!fs.existsSync(backupFile)) {
    logErr(`Backup file not found: ${backupFile}`);
    process.exit(6);
  }

  const ext = path.extname(backupFile).toLowerCase();
  const isGzipped = ext === ".gz" || backupFile.endsWith(".sql.gz");

  logInfo(`Backup file: ${backupFile}`);
  logWarn("This will overwrite the current database. Make sure you have backed it up first.");
  logWarn("Run `npm run db:backup` on the target server before continuing.");

  // 4. Ensure psql exists
  const psqlPath = which("psql");
  if (!psqlPath) {
    logErr("psql is not installed or not in PATH.");
    logErr("Please install PostgreSQL client tools.");
    process.exit(3);
  }
  logInfo(`psql found: ${psqlPath}`);

  // 5. Restore
  if (isGzipped) {
    logInfo("Restoring from gzip backup ...");
    const gunzip = spawnSync("gunzip", ["-c", backupFile], { stdio: ["ignore", "pipe", "pipe"] });
    if (gunzip.status !== 0) {
      logErr(`gunzip failed with exit code ${gunzip.status}.`);
      process.exit(7);
    }
    const restore = spawnSync("psql", ["--dbname", databaseUrl, "-v", "ON_ERROR_STOP=1"], {
      input: gunzip.stdout,
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
      encoding: "utf8",
    });
    if (restore.status !== 0) {
      logErr(`psql restore failed with exit code ${restore.status}.`);
      process.exit(8);
    }
  } else {
    logInfo("Restoring from plain SQL backup ...");
    const restore = spawnSync("psql", ["--dbname", databaseUrl, "-v", "ON_ERROR_STOP=1", "-f", backupFile], {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
      encoding: "utf8",
    });
    if (restore.status !== 0) {
      logErr(`psql restore failed with exit code ${restore.status}.`);
      process.exit(8);
    }
  }

  logOk("Restore completed.");
  logInfo("Next steps: run `npm run db:migrate` then `npm run db:verify`.");
}

main();
