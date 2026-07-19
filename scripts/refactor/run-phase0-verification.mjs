import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const commands = [
  "npm ci",
  "node scripts/refactor/verify-baseline.mjs",
  "npm run check:dependencies",
  "npm run check:boundaries",
  "node scripts/refactor/schema-fingerprint.mjs --check",
  "npx prisma validate",
  "npx prisma generate",
  "npx prisma migrate deploy",
  "npm run typecheck",
  "npm run lint",
  "npm test -- --runInBand",
  "npm run build",
  "git diff --check",
];

const root = process.cwd();
const reportPath = path.join(
  root,
  "docs/superpowers/reports/2026-07-19-phase-0-verification.json",
);
const tailLength = 1200;
const maxBuffer = 64 * 1024 * 1024;
const ansiPattern = /\u001B\[[0-?]*[ -/]*[@-~]/g;

function tail(value) {
  const text = typeof value === "string" ? value.replace(ansiPattern, "") : "";
  return text.length <= tailLength ? text : text.slice(-tailLength);
}

function runShell(command) {
  const result = spawnSync(command, {
    shell: true,
    encoding: "utf8",
    env: process.env,
    maxBuffer,
  });

  return {
    command,
    exitCode: typeof result.status === "number" ? result.status : 1,
    stdoutTail: tail(result.stdout),
    stderrTail: tail(
      result.error
        ? `${result.stderr ?? ""}\n${result.error.message}`
        : result.stderr,
    ),
  };
}

function readCommand(command) {
  const result = runShell(command);
  return result.exitCode === 0 ? result.stdoutTail.trim() : "UNKNOWN";
}

const gitHead = readCommand("git rev-parse HEAD");
const npmVersion = readCommand("npm --version");
const results = [];

for (const command of commands) {
  const result = runShell(command);
  results.push(result);

  if (result.exitCode !== 0) {
    break;
  }
}

const ready =
  results.length === commands.length &&
  results.every((result) => result.exitCode === 0);
const report = {
  phase: 0,
  status: ready ? "READY_FOR_NEXT_PHASE" : "BLOCKED",
  gitHead,
  nodeVersion: process.version,
  npmVersion,
  generatedAt: new Date().toISOString(),
  results,
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

if (!ready) {
  process.exit(1);
}
