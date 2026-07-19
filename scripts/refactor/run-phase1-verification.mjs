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
  "docs/superpowers/reports/2026-07-19-phase-1-verification.json",
);
const tailLength = 2400;
const maxBuffer = 96 * 1024 * 1024;
const ansiPattern = /\u001B\[[0-?]*[ -/]*[@-~]/g;

function clean(value) {
  return typeof value === "string" ? value.replace(ansiPattern, "") : "";
}

function tail(value) {
  const text = clean(value);
  return text.length <= tailLength ? text : text.slice(-tailLength);
}

function runShell(command) {
  const result = spawnSync(command, {
    shell: true,
    encoding: "utf8",
    env: process.env,
    maxBuffer,
  });
  const stdout = clean(result.stdout);
  const stderr = clean(
    result.error
      ? `${result.stderr ?? ""}\n${result.error.message}`
      : result.stderr,
  );
  return {
    command,
    exitCode: typeof result.status === "number" ? result.status : 1,
    stdoutTail: tail(stdout),
    stderrTail: tail(stderr),
    fullOutput: `${stdout}\n${stderr}`,
  };
}

function readCommand(command) {
  const result = runShell(command);
  return result.exitCode === 0 ? result.stdoutTail.trim() : "UNKNOWN";
}

function parseJestSummary(output) {
  const suites = output.match(/Test Suites:\s+(\d+) passed,\s+(\d+) total/);
  const tests = output.match(/Tests:\s+(\d+) passed,\s+(\d+) total/);
  return {
    suitesPassed: suites ? Number(suites[1]) : null,
    suitesTotal: suites ? Number(suites[2]) : null,
    testsPassed: tests ? Number(tests[1]) : null,
    testsTotal: tests ? Number(tests[2]) : null,
  };
}

function collectWarnings(results) {
  const lines = results
    .flatMap((result) => result.fullOutput.split(/\r?\n/))
    .map((line) => line.trim())
    .filter((line) => /warning|warn|vulnerabil|turbopack|deprecated/i.test(line));
  return [...new Set(lines)].slice(0, 30);
}

const gitHead = readCommand("git rev-parse HEAD");
const npmVersion = readCommand("npm --version");
const results = [];

for (const command of commands) {
  const result = runShell(command);
  results.push(result);
  if (result.exitCode !== 0) break;
}

const ready =
  results.length === commands.length &&
  results.every((result) => result.exitCode === 0);
const jestResult = results.find((result) => result.command === "npm test -- --runInBand");
const report = {
  phase: 1,
  status: ready ? "READY_FOR_NEXT_PHASE" : "BLOCKED",
  gitHead,
  nodeVersion: process.version,
  npmVersion,
  generatedAt: new Date().toISOString(),
  testSummary: parseJestSummary(jestResult?.fullOutput ?? ""),
  warningSummary: collectWarnings(results),
  results: results.map(({ fullOutput: _fullOutput, ...result }) => result),
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

if (!ready) process.exit(1);
