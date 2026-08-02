// link168 database backup script
// Reads DATABASE_URL from environment and runs pg_dump.
// Produces a time-stamped .sql.gz in the configured BACKUP_DIR.

"use strict";

const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

function logInfo(msg) {
  console.log(`${CYAN}[db:backup]${RESET} ${msg}`);
}
function logWarn(msg) {
  console.log(`${YELLOW}[db:backup]${RESET} ${msg}`);
}
function logOk(msg) {
  console.log(`${GREEN}[db:backup]${RESET} ${msg}`);
}
function logErr(msg) {
  console.error(`${RED}[db:backup]${RESET} ${msg}`);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function timestamp() {
  const d = new Date();
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
}

function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function which(cmd) {
  try {
    // cross-platform which using node's execSync
    const out = execSync(
      process.platform === "win32" ? `where ${cmd}` : `which ${cmd}`,
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    ).trim();
    return out.split(/\r?\n/)[0];
  } catch (e) {
    return null;
  }
}

function createPgEnvironment(databaseUrl) {
  const parsed = new URL(databaseUrl);
  const pgEnvironment = {
    ...process.env,
    PGHOST: parsed.hostname,
    PGPORT: parsed.port || "5432",
    PGUSER: decodeURIComponent(parsed.username),
    PGPASSWORD: decodeURIComponent(parsed.password),
    PGDATABASE: parsed.pathname.replace(/^\//, ""),
  };
  const sslMode = parsed.searchParams.get("sslmode");
  if (sslMode) pgEnvironment.PGSSLMODE = sslMode;
  return pgEnvironment;
}

function main() {
  console.log(`${BOLD}=== Link168 Database Backup ===${RESET}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV || "(unset)"}`);

  // 1. Validate DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logErr("DATABASE_URL is missing. Please set it in your environment or .env file.");
    process.exit(2);
  }

  // 2. Ensure pg_dump exists
  const pgDumpPath = which("pg_dump");
  if (!pgDumpPath) {
    logErr("pg_dump is not installed or not in PATH.");
    logErr("Please install PostgreSQL client tools:");
    logErr("  macOS:  brew install postgresql");
    logErr("  Linux:  apt install postgresql-client   (Debian/Ubuntu)");
    logErr("          dnf install postgresql          (Fedora/RHEL)");
    logErr("  Windows: https://www.postgresql.org/download/windows/");
    process.exit(3);
  }
  logInfo(`pg_dump found: ${pgDumpPath}`);

  // 3. Ensure gzip exists (optional for compression)
  const gzipPath = which("gzip");
  if (!gzipPath) {
    logWarn("gzip not found. Will produce uncompressed .sql instead of .sql.gz.");
  }

  // 4. Create backup directory
  const backupDir = path.resolve(process.env.BACKUP_DIR || "./backups/db");
  fs.mkdirSync(backupDir, { recursive: true });
  logInfo(`Backup directory: ${backupDir}`);

  // 5. Compose filenames
  const ts = timestamp();
  const sqlName = `link168-db-${ts}.sql`;
  const sqlPath = path.join(backupDir, sqlName);
  const gzName = `${sqlName}.gz`;
  const gzPath = path.join(backupDir, gzName);

  // 6. Run pg_dump
  logInfo(`Dumping database to: ${sqlPath}`);
  const dumpResult = spawnSync("pg_dump", ["--no-owner", "--file", sqlPath], {
    stdio: ["ignore", "pipe", "pipe"],
    env: createPgEnvironment(databaseUrl),
    encoding: "utf8",
  });

  if (dumpResult.status !== 0) {
    logErr(`pg_dump failed with exit code ${dumpResult.status}.`);
    if (dumpResult.stderr && dumpResult.stderr.length > 0) {
      // Do not echo raw stderr verbatim - it may contain the connection string.
      logErr("stderr output (sensitive fields redacted) is not shown; inspect output on server.");
    }
    try {
      if (fs.existsSync(sqlPath)) fs.unlinkSync(sqlPath);
    } catch (_) {}
    process.exit(4);
  }

  // 7. Optionally gzip
  let finalPath = sqlPath;
  if (gzipPath) {
    logInfo("Compressing with gzip ...");
    const gzResult = spawnSync("gzip", [sqlPath], {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
    if (gzResult.status === 0) {
      finalPath = gzPath;
    } else {
      logWarn("gzip failed, keeping uncompressed .sql file.");
    }
  }

  // 8. chmod 600 on Unix-ish systems
  try {
    fs.chmodSync(finalPath, 0o600);
  } catch (_) {
    // Windows may not support this mode, ignore.
  }

  const stat = fs.statSync(finalPath);
  logOk(`Backup completed.`);
  console.log(`  file: ${finalPath}`);
  console.log(`  size: ${humanSize(stat.size)}`);
  console.log(`  name: ${path.basename(finalPath)}`);
  console.log();
  logWarn("Do NOT commit this file to git. It contains user data.");
}

main();
