import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const packagePath = path.join(root, "package.json");
const lockPath = path.join(root, "package-lock.json");
const checkOnly = process.argv.includes("--check");
const sections = ["dependencies", "devDependencies", "optionalDependencies"];
const forbiddenTags = new Set(["latest", "*", "next"]);
const nodeRange = ">=22 <23";
const checkCommand = "node scripts/refactor/pin-direct-dependencies.mjs --check";

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function fail(code, details) {
  console.error(`${code}${details ? ` ${details}` : ""}`);
  process.exit(1);
}

const pkg = readJson(packagePath);
const lock = readJson(lockPath);
const lockRoot = lock.packages?.[""];

if (!lockRoot || typeof lockRoot !== "object") {
  fail("LOCKFILE_ROOT_MISSING", 'packages[""]');
}

const violations = [];
let changed = false;

for (const section of sections) {
  const declarations = pkg[section] ?? {};
  const lockDeclarations = lockRoot[section] ?? {};

  for (const [name, declaration] of Object.entries(declarations)) {
    if (typeof declaration !== "string" || declaration.length === 0) {
      violations.push(`${section}.${name}=INVALID_DECLARATION`);
      continue;
    }

    if (forbiddenTags.has(declaration)) {
      const resolvedVersion = lock.packages?.[`node_modules/${name}`]?.version;
      if (typeof resolvedVersion !== "string" || resolvedVersion.length === 0) {
        fail("LOCKED_VERSION_MISSING", `${section}.${name}`);
      }

      if (checkOnly) {
        violations.push(`${section}.${name}=${declaration}`);
      } else {
        declarations[name] = resolvedVersion;
        lockDeclarations[name] = resolvedVersion;
        changed = true;
      }
    }
  }

  if (!checkOnly) {
    pkg[section] = declarations;
    lockRoot[section] = lockDeclarations;
  }
}

if (!checkOnly && violations.length > 0) {
  fail("DEPENDENCY_POLICY_VIOLATION", violations.join(","));
}

if (checkOnly) {
  if (pkg.engines?.node !== nodeRange) {
    violations.push(`engines.node=${pkg.engines?.node ?? "MISSING"}`);
  }
  if (pkg.scripts?.["check:dependencies"] !== checkCommand) {
    violations.push("scripts.check:dependencies=MISSING_OR_INVALID");
  }
  if (lockRoot.engines?.node !== nodeRange) {
    violations.push(`lock.engines.node=${lockRoot.engines?.node ?? "MISSING"}`);
  }

  for (const section of sections) {
    const declarations = pkg[section] ?? {};
    const lockDeclarations = lockRoot[section] ?? {};
    for (const [name, declaration] of Object.entries(declarations)) {
      if (lockDeclarations[name] !== declaration) {
        violations.push(`lock.${section}.${name}=OUT_OF_SYNC`);
      }
    }
  }

  if (violations.length > 0) {
    fail("DEPENDENCY_POLICY_VIOLATION", violations.join(","));
  }

  console.log("DEPENDENCY_POLICY_OK");
  process.exit(0);
}

pkg.engines = { node: nodeRange };
pkg.scripts = {
  ...pkg.scripts,
  "check:dependencies": checkCommand,
};
lockRoot.engines = { node: nodeRange };

fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);

console.log(changed ? "DEPENDENCIES_PINNED" : "DEPENDENCY_METADATA_UPDATED");
