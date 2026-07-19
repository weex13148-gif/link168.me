import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const prismaRoot = path.join(root, "prisma");
const reportPath = path.join(
  root,
  "docs/superpowers/reports/2026-07-19-schema-baseline.json",
);
const checkOnly = process.argv.includes("--check");
const nul = Buffer.from([0]);

function collectSchemaFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSchemaFiles(absolutePath));
      continue;
    }
    if (
      entry.isFile() &&
      (entry.name.endsWith(".prisma") || entry.name.endsWith(".sql"))
    ) {
      files.push(absolutePath);
    }
  }
  return files;
}

function normalizeRelativePath(absolutePath) {
  return path.relative(root, absolutePath).split(path.sep).join("/");
}

function createFingerprint() {
  const absoluteFiles = collectSchemaFiles(prismaRoot).sort((left, right) =>
    normalizeRelativePath(left).localeCompare(normalizeRelativePath(right)),
  );
  const files = absoluteFiles.map(normalizeRelativePath);
  const hash = crypto.createHash("sha256");

  for (let index = 0; index < absoluteFiles.length; index += 1) {
    hash.update(Buffer.from(files[index], "utf8"));
    hash.update(nul);
    hash.update(fs.readFileSync(absoluteFiles[index]));
    hash.update(nul);
  }

  return {
    algorithm: "sha256",
    digest: hash.digest("hex"),
    fileCount: files.length,
    files,
  };
}

const current = createFingerprint();

if (checkOnly) {
  if (!fs.existsSync(reportPath)) {
    console.error(`SCHEMA_FINGERPRINT_MISMATCH missing=${path.relative(root, reportPath)}`);
    process.exit(1);
  }

  let committed;
  try {
    committed = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  } catch (error) {
    console.error(
      `SCHEMA_FINGERPRINT_MISMATCH invalid_report=${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }

  if (JSON.stringify(committed) !== JSON.stringify(current)) {
    console.error(
      `SCHEMA_FINGERPRINT_MISMATCH committed=${JSON.stringify(committed)} current=${JSON.stringify(current)}`,
    );
    process.exit(1);
  }

  console.log("SCHEMA_FINGERPRINT_OK");
  process.exit(0);
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(current, null, 2)}\n`);
console.log(`SCHEMA_FINGERPRINT_WRITTEN ${current.digest}`);
