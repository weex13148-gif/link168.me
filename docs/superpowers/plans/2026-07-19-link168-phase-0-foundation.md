# Link168 Phase 0 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 冻结全面重构基线，建立确定性的 Node/依赖/CI、共享领域契约、功能开关、审计接口、依赖边界和数据库指纹，不改变用户可见业务行为。

**Architecture:** Phase 0 只建设施工地基。现有 Route、页面和 Prisma 业务模型保持行为不变；新增代码位于 `src/shared`、`src/domains`、`src/infrastructure` 与 `scripts/refactor`。后续领域迁移必须复用这些契约和门禁。

**Tech Stack:** Next.js App Router、TypeScript、Prisma 7、PostgreSQL 16、Redis 7、Jest、GitHub Actions、Node.js 22、npm lockfile v3。

## Global Constraints

- 唯一长期重构分支：`refactor/link168-modular-monolith-r1`。
- 批准基线：`5e8831b12e7528a4956ecae6953ad694609c3a20`。
- 不直接修改 `master`，不 force push，不接触生产数据库或生产外部服务。
- 不删除 `/showcase` 和 `/jeepwork`。
- 不增加业务表，不改变注册、主页、AI、Lead、会员和支付行为。
- 所有生产代码先写失败测试。
- Node.js 固定 22.x；CI 使用 PostgreSQL 16 与 Redis 7。
- 直接依赖不得使用 `latest`、`*` 或 `next`。
- 全部门禁通过后才可标记 `READY_FOR_NEXT_PHASE`。

---

## File Map

**Create**

- `.nvmrc`, `.node-version`
- `scripts/refactor/verify-baseline.mjs`
- `scripts/refactor/pin-direct-dependencies.mjs`
- `scripts/refactor/check-domain-boundaries.mjs`
- `scripts/refactor/schema-fingerprint.mjs`
- `scripts/refactor/run-phase0-verification.mjs`
- `src/shared/domain-error.ts`
- `src/shared/result.ts`
- `src/shared/feature-flags.ts`
- `src/shared/audit.ts`
- `src/infrastructure/audit/noop-audit-recorder.ts`
- `src/domains/README.md`, `src/infrastructure/README.md`, `src/shared/README.md`
- `docs/superpowers/refactor/legacy-inventory.json`
- `docs/superpowers/reports/2026-07-19-schema-baseline.json`
- `docs/superpowers/reports/2026-07-19-phase-0-verification.json`
- `tests/refactor/foundation/*.test.ts`

**Modify**

- `package.json`, `package-lock.json`
- `.github/workflows/mvp-closeout.yml`

---

### Task 1: Lock the Approved Baseline

**Files:**
- Create: `scripts/refactor/verify-baseline.mjs`
- Create: `tests/refactor/foundation/baseline.test.ts`

**Produces:** `node scripts/refactor/verify-baseline.mjs` verifies that the approved SHA is an ancestor of HEAD and rejects an unexpectedly dirty worktree.

- [ ] **Step 1: Write the failing test**

```ts
import fs from "node:fs";

it("locks the approved baseline and checks ancestry and status", () => {
  const source = fs.readFileSync("scripts/refactor/verify-baseline.mjs", "utf8");
  expect(source).toContain("5e8831b12e7528a4956ecae6953ad694609c3a20");
  expect(source).toContain("merge-base");
  expect(source).toContain("status");
});
```

- [ ] **Step 2: Verify RED**

```bash
npm test -- tests/refactor/foundation/baseline.test.ts --runInBand
```

Expected: `ENOENT` for the missing script.

- [ ] **Step 3: Implement the CLI**

```js
import { execFileSync } from "node:child_process";

const baseline = "5e8831b12e7528a4956ecae6953ad694609c3a20";
const git = (args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const head = git(["rev-parse", "HEAD"]);

try {
  execFileSync("git", ["merge-base", "--is-ancestor", baseline, head], { stdio: "ignore" });
} catch {
  console.error(`BASELINE_NOT_ANCESTOR baseline=${baseline} head=${head}`);
  process.exit(1);
}

const status = git(["status", "--porcelain"]);
if (status && process.env.ALLOW_DIRTY_WORKTREE !== "true") {
  console.error(`DIRTY_WORKTREE\n${status}`);
  process.exit(1);
}

console.log(JSON.stringify({ baseline, head, clean: status.length === 0 }, null, 2));
```

- [ ] **Step 4: Verify GREEN and commit**

```bash
npm test -- tests/refactor/foundation/baseline.test.ts --runInBand
ALLOW_DIRTY_WORKTREE=true node scripts/refactor/verify-baseline.mjs
git add scripts/refactor/verify-baseline.mjs tests/refactor/foundation/baseline.test.ts
git commit -m "test(refactor): lock approved foundation baseline"
```

---

### Task 2: Pin Node 22 and Direct Dependencies

**Files:**
- Create: `.nvmrc`, `.node-version`
- Create: `scripts/refactor/pin-direct-dependencies.mjs`
- Modify: `package.json`, `package-lock.json`
- Create: `tests/refactor/foundation/dependency-policy.test.ts`

**Produces:** `node scripts/refactor/pin-direct-dependencies.mjs [--check]`. It reads exact versions from `package-lock.json` and rewrites only direct declarations that currently use floating tags.

- [ ] **Step 1: Write RED tests**

```ts
import fs from "node:fs";

const read = (file: string) => fs.readFileSync(file, "utf8");

it("uses Node 22 and no floating direct dependency", () => {
  expect(read(".nvmrc").trim()).toBe("22");
  expect(read(".node-version").trim()).toBe("22");
  const pkg = JSON.parse(read("package.json"));
  expect(pkg.engines).toEqual({ node: ">=22 <23" });
  for (const section of ["dependencies", "devDependencies", "optionalDependencies"]) {
    for (const version of Object.values(pkg[section] ?? {})) {
      expect(["latest", "*", "next"]).not.toContain(version);
    }
  }
});
```

- [ ] **Step 2: Implement deterministic pinning**

The script must:

```text
read package.json
read package-lock.json
for dependencies/devDependencies/optionalDependencies
  when declaration is latest, * or next
  read packages["node_modules/<name>"].version
  fail if no locked version exists
  write the exact version into package.json and packages["" ] in package-lock.json
set engines.node to >=22 <23
add check:dependencies script
--check exits 1 if any floating declaration remains
```

Use exact command names:

```json
{
  "check:dependencies": "node scripts/refactor/pin-direct-dependencies.mjs --check"
}
```

- [ ] **Step 3: Generate and verify**

```bash
printf '22\n' > .nvmrc
printf '22\n' > .node-version
node scripts/refactor/pin-direct-dependencies.mjs
node scripts/refactor/pin-direct-dependencies.mjs --check
npm ci
npm test -- tests/refactor/foundation/dependency-policy.test.ts --runInBand
```

Expected: no direct dependency uses a floating tag and `npm ci` succeeds without regenerating the lock tree.

- [ ] **Step 4: Commit**

```bash
git add .nvmrc .node-version package.json package-lock.json scripts/refactor/pin-direct-dependencies.mjs tests/refactor/foundation/dependency-policy.test.ts
git commit -m "build(refactor): pin runtime and direct dependencies"
```

---

### Task 3: Replace the Old CI Branch Gate

**Files:**
- Modify: `.github/workflows/mvp-closeout.yml`
- Modify: `tests/refactor/foundation/dependency-policy.test.ts`

**Produces:** workflow name `Link168 Refactor Gate`, covering pushes and PRs for `master` and `refactor/link168-modular-monolith-r1`.

- [ ] **Step 1: Add RED assertions**

Require the workflow source to contain:

```text
name: Link168 Refactor Gate
- master
- refactor/link168-modular-monolith-r1
image: postgres:16
image: redis:7-alpine
node-version: 22
npm run check:dependencies
```

Also assert it does not contain `continue-on-error`.

- [ ] **Step 2: Replace workflow behavior**

Use:

```yaml
on:
  push:
    branches: [master, refactor/link168-modular-monolith-r1]
  pull_request:
    branches: [master, refactor/link168-modular-monolith-r1]
  workflow_dispatch:
```

Services:

```yaml
postgres:
  image: postgres:16
redis:
  image: redis:7-alpine
```

Before tests, generate non-persistent CI-only values at runtime rather than committing fixed secret-shaped values:

```yaml
- name: Prepare CI-only runtime values
  run: |
    echo "SESSION_SECRET=$(openssl rand -hex 32)" >> "$GITHUB_ENV"
    echo "CONFIG_ENCRYPTION_KEY=$(openssl rand -hex 32)" >> "$GITHUB_ENV"
```

Required steps, with no `continue-on-error`:

```text
checkout(fetch-depth 0)
setup-node 22
npm ci
verify-baseline
check:dependencies
prisma validate
prisma generate
prisma migrate deploy
typecheck
lint
jest --runInBand
build
git diff --check
```

- [ ] **Step 3: Verify and commit**

```bash
npm test -- tests/refactor/foundation/dependency-policy.test.ts --runInBand
git add .github/workflows/mvp-closeout.yml tests/refactor/foundation/dependency-policy.test.ts
git commit -m "ci(refactor): verify the unique modular monolith mainline"
```

---

### Task 4: Add DomainError and Result

**Files:**
- Create: `src/shared/domain-error.ts`
- Create: `src/shared/result.ts`
- Create: `tests/refactor/foundation/shared-contracts.test.ts`

**Produces:**

```ts
type DomainErrorCode =
  | "VALIDATION_ERROR" | "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND"
  | "CONFLICT" | "RATE_LIMITED" | "DEPENDENCY_UNAVAILABLE" | "INTERNAL_ERROR";

class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly details: Readonly<Record<string, unknown>>;
}

type Result<T, E extends Error = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

- [ ] **Step 1: RED tests**

Test that `DomainError` preserves code/details, `ok(value)` returns `{ok:true,value}`, `err(error)` returns `{ok:false,error}`, and `unwrap(err(error))` throws the original error.

- [ ] **Step 2: Implement only these interfaces**

Create `DomainError`, `ok`, `err`, and `unwrap`. Freeze a copied details object. Do not add HTTP mapping in Phase 0.

- [ ] **Step 3: Verify and commit**

```bash
npm test -- tests/refactor/foundation/shared-contracts.test.ts --runInBand
npm run typecheck
git add src/shared/domain-error.ts src/shared/result.ts tests/refactor/foundation/shared-contracts.test.ts
git commit -m "feat(shared): add domain result and error contracts"
```

---

### Task 5: Add Refactor Feature Flags and Single-Writer Protection

**Files:**
- Create: `src/shared/feature-flags.ts`
- Modify: `tests/refactor/foundation/shared-contracts.test.ts`

**Produces:**

```ts
type RefactorFeatureFlags = {
  newDashboard: boolean;
  newProfileDomain: boolean;
  newMediaPipeline: boolean;
  newAiReception: boolean;
  newLeadPipeline: boolean;
  newBilling: boolean;
};

getRefactorFeatureFlags(env?: Record<string, string | undefined>): RefactorFeatureFlags
assertSingleWriter(input: { label: string; legacyWriterEnabled: boolean; newWriterEnabled: boolean }): void
```

- [ ] **Step 1: RED tests**

Require all flags to default false; accept only literal `true` or `false`; reject `1`, `yes`, and empty strings; reject legacy and new writers being enabled simultaneously.

- [ ] **Step 2: Implement**

Map exact environment names:

```text
LINK168_NEW_DASHBOARD
LINK168_NEW_PROFILE_DOMAIN
LINK168_NEW_MEDIA_PIPELINE
LINK168_NEW_AI_RECEPTION
LINK168_NEW_LEAD_PIPELINE
LINK168_NEW_BILLING
```

Invalid values throw `DomainError("VALIDATION_ERROR", "INVALID_FEATURE_FLAG", ...)`. Dual writers throw `DomainError("CONFLICT", "MULTIPLE_WRITERS_ENABLED", ...)`.

- [ ] **Step 3: Verify and commit**

```bash
npm test -- tests/refactor/foundation/shared-contracts.test.ts --runInBand
npm run typecheck
git add src/shared/feature-flags.ts tests/refactor/foundation/shared-contracts.test.ts
git commit -m "feat(shared): add safe refactor feature flags"
```

---

### Task 6: Add the AuditRecorder Contract

**Files:**
- Create: `src/shared/audit.ts`
- Create: `src/infrastructure/audit/noop-audit-recorder.ts`
- Modify: `tests/refactor/foundation/shared-contracts.test.ts`

**Produces:**

```ts
type AuditOutcome = "success" | "denied" | "failed";
type AuditEvent = Readonly<{
  eventId: string;
  occurredAt: Date;
  actorUserId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  outcome: AuditOutcome;
  metadata: Readonly<Record<string, unknown>>;
}>;
interface AuditRecorder { record(event: AuditEvent): Promise<void>; }
```

- [ ] **Step 1: RED test** — construct a complete immutable event and verify `NoopAuditRecorder.record()` resolves.
- [ ] **Step 2: Implement the interface and no-op adapter** — no database table or logging side effect in Phase 0.
- [ ] **Step 3: Verify and commit**

```bash
npm test -- tests/refactor/foundation/shared-contracts.test.ts --runInBand
npm run typecheck
git add src/shared/audit.ts src/infrastructure/audit/noop-audit-recorder.ts tests/refactor/foundation/shared-contracts.test.ts
git commit -m "feat(shared): add audit recorder contract"
```

---

### Task 7: Enforce Domain Dependency Direction

**Files:**
- Create: `scripts/refactor/check-domain-boundaries.mjs`
- Create: `tests/refactor/foundation/domain-boundaries.test.ts`
- Create: `src/domains/README.md`, `src/infrastructure/README.md`, `src/shared/README.md`
- Modify: `package.json`, `package-lock.json`

**Produces:** `npm run check:boundaries`.

- [ ] **Step 1: RED fixture tests**

Create temporary domain files and assert:

```text
@/shared/result                  allowed
@/app/page                      rejected
@/components/Button             rejected
@/infrastructure/database       rejected
```

- [ ] **Step 2: Implement checker**

Recursively scan `.ts` and `.tsx` files under `src/domains`. Print `DOMAIN_BOUNDARY_VIOLATION` and exit 1 for imports beginning with `@/app/`, `@/components/`, or `@/infrastructure/`; otherwise print `DOMAIN_BOUNDARIES_OK`.

Add exact script:

```json
{
  "check:boundaries": "node scripts/refactor/check-domain-boundaries.mjs"
}
```

Layer README rules:

```text
domains: business rules; may depend on shared and local domain modules
infrastructure: implements adapters; does not define business policy
shared: only stable cross-domain contracts; no feature-specific workflows
```

- [ ] **Step 3: Verify and commit**

```bash
npm test -- tests/refactor/foundation/domain-boundaries.test.ts --runInBand
npm run check:boundaries
git add package.json package-lock.json scripts/refactor/check-domain-boundaries.mjs src/domains/README.md src/infrastructure/README.md src/shared/README.md tests/refactor/foundation/domain-boundaries.test.ts
git commit -m "build(refactor): enforce domain dependency direction"
```

---

### Task 8: Record Legacy Ownership

**Files:**
- Create: `docs/superpowers/refactor/legacy-inventory.json`
- Create: `tests/refactor/foundation/legacy-inventory.test.ts`

**Produces:** unique entries with `path`, `status`, `ownerPhase`, and `reason`.

- [ ] **Step 1: RED test** — require unique existing paths, valid status, non-empty reason, and explicit KEEP entries for `src/app/showcase` and `src/app/jeepwork`.

- [ ] **Step 2: Create exact initial inventory**

```json
[
  {"path":"src/app/workbench","status":"MIGRATING","ownerPhase":2,"reason":"Consolidate ordinary user routes into the single six-entry dashboard."},
  {"path":"src/app/api","status":"MIGRATING","ownerPhase":1,"reason":"Routes become protocol adapters and stop owning business policy."},
  {"path":"src/components/share","status":"MIGRATING","ownerPhase":2,"reason":"Consolidate public rendering into one module interpreter and renderer."},
  {"path":"src/lib/ai","status":"MIGRATING","ownerPhase":3,"reason":"Move conversation, knowledge and lead policy into Reception and CRM."},
  {"path":"src/app/showcase","status":"KEEP","ownerPhase":5,"reason":"The approved constitution explicitly forbids deleting showcase."},
  {"path":"src/app/jeepwork","status":"KEEP","ownerPhase":1,"reason":"Keep the separate super-administrator surface and apply unified account capabilities."}
]
```

PR #52 remains patch material only; do not merge or promote `integration/release-risk-closeout-20260716` as another mainline.

- [ ] **Step 3: Verify and commit**

```bash
npm test -- tests/refactor/foundation/legacy-inventory.test.ts --runInBand
git add docs/superpowers/refactor/legacy-inventory.json tests/refactor/foundation/legacy-inventory.test.ts
git commit -m "docs(refactor): record legacy ownership inventory" -m "PR #52 remains patch material only."
```

---

### Task 9: Lock the Prisma Schema Fingerprint

**Files:**
- Create: `scripts/refactor/schema-fingerprint.mjs`
- Create: `docs/superpowers/reports/2026-07-19-schema-baseline.json`
- Create: `tests/refactor/foundation/schema-fingerprint.test.ts`

**Produces:** `node scripts/refactor/schema-fingerprint.mjs [--check]`.

- [ ] **Step 1: RED test** — spawn `--check`, require exit 0 and `SCHEMA_FINGERPRINT_OK`.

- [ ] **Step 2: Implement**

Recursively include every `.prisma` and `.sql` file under `prisma`, sort normalized relative paths, and calculate SHA-256 over repeated `path + NUL + content + NUL`. The report contains exactly:

```json
{
  "algorithm": "sha256",
  "digest": "runtime-generated-digest",
  "fileCount": 0,
  "files": []
}
```

The shown values describe the schema; the script writes the real digest, count and paths. `--check` compares committed and current objects exactly and prints `SCHEMA_FINGERPRINT_MISMATCH` on divergence.

- [ ] **Step 3: Generate, verify and commit**

```bash
node scripts/refactor/schema-fingerprint.mjs
node scripts/refactor/schema-fingerprint.mjs --check
npm test -- tests/refactor/foundation/schema-fingerprint.test.ts --runInBand
git add scripts/refactor/schema-fingerprint.mjs docs/superpowers/reports/2026-07-19-schema-baseline.json tests/refactor/foundation/schema-fingerprint.test.ts
git commit -m "docs(refactor): lock the Prisma schema baseline"
```

---

### Task 10: Add Reproducible Phase 0 Verification

**Files:**
- Create: `scripts/refactor/run-phase0-verification.mjs`
- Create: `tests/refactor/foundation/verification-runner.test.ts`
- Modify: `package.json`, `package-lock.json`, `.github/workflows/mvp-closeout.yml`
- Create at runtime: `docs/superpowers/reports/2026-07-19-phase-0-verification.json`

**Produces:** `npm run verify:phase0`.

- [ ] **Step 1: RED structural test**

Require these exact command strings in this exact order:

```text
npm ci
node scripts/refactor/verify-baseline.mjs
npm run check:dependencies
npm run check:boundaries
node scripts/refactor/schema-fingerprint.mjs --check
npx prisma validate
npx prisma generate
npx prisma migrate deploy
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build
git diff --check
```

- [ ] **Step 2: Implement runner**

Use `spawnSync(command, { shell:true, encoding:"utf8", env:process.env })`. Stop at the first non-zero exit. Write a JSON report with:

```text
phase
status = READY_FOR_NEXT_PHASE or BLOCKED
gitHead
nodeVersion
npmVersion
generatedAt
results[] = command, exitCode, stdoutTail, stderrTail
```

Exit 1 unless every command ran and returned 0.

Add:

```json
{
  "verify:phase0": "node scripts/refactor/run-phase0-verification.mjs"
}
```

Add `check:boundaries` and schema fingerprint checks to CI before Prisma validation.

- [ ] **Step 3: Commit runner**

```bash
npm test -- tests/refactor/foundation/verification-runner.test.ts --runInBand
npm test -- tests/refactor/foundation --runInBand
git add package.json package-lock.json .github/workflows/mvp-closeout.yml scripts/refactor/run-phase0-verification.mjs tests/refactor/foundation/verification-runner.test.ts
git commit -m "build(refactor): add reproducible phase zero verification"
```

- [ ] **Step 4: Run full gate with non-production PostgreSQL 16 and Redis 7**

```bash
npm run verify:phase0
cat docs/superpowers/reports/2026-07-19-phase-0-verification.json
git diff --check
```

Expected: report status `READY_FOR_NEXT_PHASE` and every exit code 0.

- [ ] **Step 5: Commit evidence**

```bash
git add docs/superpowers/reports/2026-07-19-phase-0-verification.json
git commit -m "docs(refactor): record verified phase zero foundation"
```

---

### Task 11: Push and Verify GitHub Actions

- [ ] **Step 1: Fast-forward safety**

```bash
git fetch origin
git merge-base --is-ancestor origin/refactor/link168-modular-monolith-r1 HEAD
git status --short
```

Expected: ancestor check 0 and clean worktree. Never force push.

- [ ] **Step 2: Push**

```bash
git push origin refactor/link168-modular-monolith-r1
```

- [ ] **Step 3: Require green `Link168 Refactor Gate`**

Every workflow step must succeed: install, baseline, dependency policy, boundary policy, schema baseline, Prisma validate/generate/migrate, typecheck, lint, Jest, build and diff check.

- [ ] **Step 4: Failure format**

```text
BLOCKED_GATE=PHASE_0
FAILED_COMMAND=<exact command>
EXIT_CODE=<actual code>
ERROR_SUMMARY=<first actionable root cause>
ATTEMPTED_FIXES=<actual attempts>
SAFE_TO_RESUME_FROM=<last green SHA>
```

- [ ] **Step 5: Final gate record**

```text
PHASE=0
STATUS=READY_FOR_NEXT_PHASE
FINAL_SHA=<exact green SHA>
WORKFLOW=Link168 Refactor Gate
PRODUCTION_CHANGES=none
USER_VISIBLE_BEHAVIOR_CHANGES=none
NEXT_PLAN=docs/superpowers/plans/2026-07-19-link168-phase-1-identity-profile-media.md
```

Only after this gate may the Phase 1 detailed plan be written against the actual green tree.
