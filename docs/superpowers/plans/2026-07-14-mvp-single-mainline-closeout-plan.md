# Link168 MVP Single-Mainline Closeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the current MVP closeout on `integration/mvp-closeout-r1` by correcting AI compensation accounting, enforcing fail-closed enterprise Host validation, establishing a real Node.js 22 CI gate, and removing temporary closeout branches only after verification.

**Architecture:** Keep `integration/mvp-closeout-r1` as the only active MVP development line. Implement source-aware AI consumption compensation inside the existing credit ledger service, centralize enterprise Host validation in the existing workspace public-host module, and make GitHub Actions the final evidence gate. Do not add another product line, Prisma model, or long-lived feature branch.

**Tech Stack:** Next.js, TypeScript, Prisma 7, PostgreSQL, Jest, GitHub Actions, Node.js 22.

## Global Constraints

- Work only on `integration/mvp-closeout-r1`.
- Do not modify `master`.
- Do not create a third development line.
- Do not start TRAE agents or add long-lived task branches.
- Do not add Prisma models or migrations.
- Do not call real Alipay, Alibaba Bailian, SMTP, or production databases.
- Do not change public plan prices or expand MVP scope.
- Every implementation task starts with a failing test and ends with a focused commit.
- Do not delete the five `agent/closeout-r1-*` branches until all CI jobs pass on the final integration SHA.

---

## File Map

- `src/lib/ai/permissions.ts`: single authority for AI plan/Credit consumption and compensation.
- `src/lib/billing/entitlements/index.ts`: monthly plan-usage calculation from ledger entries.
- `src/lib/ai/commercial-agent.ts`: public AI caller; consumes once and compensates using the returned operation key.
- `src/app/api/workbench/ai/chat/route.ts`: workbench AI caller; same operation-key contract.
- `src/lib/workspace-public-host.ts`: pure normalized Host validation shared by page and metadata rendering.
- `src/app/__w/[workspaceId]/page.tsx`: enterprise home page and metadata.
- `src/app/__w/[workspaceId]/p/[slug]/page.tsx`: enterprise member profile page and metadata.
- `package.json`: one definition per script key.
- `.github/workflows/mvp-closeout.yml`: Node.js 22 CI for the unique MVP line.
- `tests/ai-credit-compensation.test.ts`: focused AI accounting tests.
- `tests/domains.test.ts`: enterprise Host fail-closed tests.
- `tests/single-mainline-regression.test.ts`: source-level guardrails for the selected mainline.
- `docs/superpowers/specs/2026-07-14-mvp-single-mainline-closeout-design.md`: approved design.
- `docs/superpowers/plans/2026-07-14-mvp-single-mainline-closeout-plan.md`: this plan.

---

### Task 1: Make AI compensation source-aware and idempotent

**Files:**
- Create: `tests/ai-credit-compensation.test.ts`
- Modify: `src/lib/ai/permissions.ts`
- Modify: `src/lib/billing/entitlements/index.ts`
- Modify: `src/lib/ai/commercial-agent.ts`
- Modify: `src/app/api/workbench/ai/chat/route.ts`

**Interfaces:**
- Produces:
  - `export type AiCreditSource = "plan" | "credit"`
  - `consumeCredit(...): Promise<{ success: true; source: AiCreditSource; balanceAfter: number; operationKey: string } | { success: false; reason: string }>`
  - `refundConsumedCredit(params: { userId: string; operationKey: string; reason: string; metadata?: Record<string, unknown> }): Promise<{ success: boolean; source?: AiCreditSource; balanceAfter?: number; alreadyApplied?: boolean; reason?: string }>`
- Consumes:
  - Existing `bindIdempotencyKey(userId, rawKey, context)` from `src/lib/ai/credits.ts`.
  - Existing `AiCreditLedger.metadata` JSON field; no schema change.

- [ ] **Step 1: Write failing source-aware accounting tests**

Create `tests/ai-credit-compensation.test.ts` with isolated mocks for `db.$transaction`, `aiCreditAccount`, and `aiCreditLedger`. Include these exact behavioral tests:

```ts
import { consumeCredit, refundConsumedCredit } from "@/lib/ai/permissions";

jest.mock("@/lib/db", () => ({
  db: {
    membershipSubscription: { findUnique: jest.fn() },
    product: { count: jest.fn() },
    knowledgeDoc: { count: jest.fn() },
    aiCreditAccount: { findUnique: jest.fn(), create: jest.fn() },
    aiCreditLedger: { aggregate: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

describe("AI source-aware compensation", () => {
  test("plan consumption compensation does not increase Credit balance", async () => {
    // Arrange transaction so consume writes metadata.creditSource="plan" and refund sees it.
    // Assert account.update is never called during compensation.
    // Assert refund ledger amount is +1 and metadata.reversesOperationKey matches consume operationKey.
  });

  test("credit consumption compensation restores exactly the deducted Credit", async () => {
    // Arrange original consume metadata.creditSource="credit", amount=-1, balanceAfter=9.
    // Assert one optimistic-lock account update to balance 10.
    // Assert one refund ledger with balanceAfter 10.
  });

  test("repeated compensation is idempotent", async () => {
    // Arrange an existing refund ledger with idempotencyKey `refund:${operationKey}`.
    // Assert success=true, alreadyApplied=true and no account update/create.
  });

  test("missing or foreign consume operation is rejected", async () => {
    // Arrange no consume ledger for the supplied user/account.
    // Assert success=false and reason is "未找到可退款的原始消费".
  });
});
```

Replace each comment in the actual test file with concrete mock return values and `expect(...)` assertions. The required assertions are:

```ts
expect(result).toMatchObject({ success: true, source: "plan", alreadyApplied: false });
expect(tx.aiCreditAccount.update).not.toHaveBeenCalled();
expect(tx.aiCreditLedger.create).toHaveBeenCalledWith(expect.objectContaining({
  data: expect.objectContaining({ entryType: "refund", amount: 1 }),
}));
```

and, for Credit compensation:

```ts
expect(tx.aiCreditAccount.update).toHaveBeenCalledTimes(1);
expect(tx.aiCreditAccount.update).toHaveBeenCalledWith(expect.objectContaining({
  data: expect.objectContaining({ balance: 10, version: { increment: 1 } }),
}));
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
npm test -- --runInBand tests/ai-credit-compensation.test.ts
```

Expected: FAIL because `refundConsumedCredit` and `operationKey` do not exist and plan compensation currently adds Credit balance.

- [ ] **Step 3: Add operation-key and source metadata to consumption**

In `src/lib/ai/permissions.ts`, define:

```ts
export type AiCreditSource = "plan" | "credit";

type ConsumeCreditResult =
  | { success: true; source: AiCreditSource; balanceAfter: number; operationKey: string }
  | { success: false; reason: string };

function readCreditSource(metadata: unknown): AiCreditSource | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>).creditSource;
  return value === "plan" || value === "credit" ? value : null;
}
```

Change `consumeCredit` so it binds the raw idempotency key exactly once and writes the source into ledger metadata:

```ts
const operationKey = idempotencyKey
  ? bindIdempotencyKey(userId, idempotencyKey, {
      profileId: metadata?.profileId as string | undefined,
      conversationId: metadata?.conversationId as string | undefined,
    })
  : bindIdempotencyKey(userId, `${referenceType}:${referenceId}`, {
      profileId: metadata?.profileId as string | undefined,
      conversationId: metadata?.conversationId as string | undefined,
    });

await tx.aiCreditLedger.create({
  data: {
    id: crypto.randomUUID(),
    accountId: account.id,
    entryType: "consume",
    amount: -amount,
    balanceAfter: newBalance,
    idempotencyKey: operationKey,
    referenceType,
    referenceId,
    metadata: {
      ...(metadata ?? {}),
      creditSource: source,
      operationKey,
    },
  },
});

return { success: true, source, balanceAfter: newBalance, operationKey };
```

When an existing consume ledger is found, read `creditSource` from its metadata and return its stored `operationKey`; reject an entry of a different type instead of reporting success.

- [ ] **Step 4: Implement compensation against the original consume ledger**

Add to `src/lib/ai/permissions.ts`:

```ts
export async function refundConsumedCredit(params: {
  userId: string;
  operationKey: string;
  reason: string;
  metadata?: Record<string, unknown>;
}): Promise<{
  success: boolean;
  source?: AiCreditSource;
  balanceAfter?: number;
  alreadyApplied?: boolean;
  reason?: string;
}> {
  const account = await getOrCreateCreditAccount(params.userId);
  const refundKey = `refund:${params.operationKey}`;

  return db.$transaction(async (tx) => {
    const existingRefund = await tx.aiCreditLedger.findUnique({
      where: { idempotencyKey: refundKey },
      select: { balanceAfter: true, metadata: true, entryType: true },
    });
    if (existingRefund) {
      if (existingRefund.entryType !== "refund") {
        return { success: false, reason: "退款幂等键冲突" };
      }
      return {
        success: true,
        source: readCreditSource(existingRefund.metadata) ?? undefined,
        balanceAfter: existingRefund.balanceAfter,
        alreadyApplied: true,
      };
    }

    const consume = await tx.aiCreditLedger.findUnique({
      where: { idempotencyKey: params.operationKey },
      select: { id: true, accountId: true, entryType: true, amount: true, metadata: true },
    });
    if (!consume || consume.accountId !== account.id || consume.entryType !== "consume") {
      return { success: false, reason: "未找到可退款的原始消费" };
    }

    const source = readCreditSource(consume.metadata);
    if (!source) return { success: false, reason: "原始消费缺少额度来源" };
    const refundAmount = Math.abs(consume.amount);
    const current = await tx.aiCreditAccount.findUnique({ where: { id: account.id } });
    if (!current) return { success: false, reason: "额度账户不存在" };

    let balanceAfter = current.balance;
    if (source === "credit") {
      balanceAfter = current.balance + refundAmount;
      await tx.aiCreditAccount.update({
        where: { id: account.id, version: current.version },
        data: { balance: balanceAfter, version: { increment: 1 } },
      });
    }

    await tx.aiCreditLedger.create({
      data: {
        id: crypto.randomUUID(),
        accountId: account.id,
        entryType: "refund",
        amount: refundAmount,
        balanceAfter,
        idempotencyKey: refundKey,
        referenceType: "ai_compensation",
        referenceId: consume.id,
        reason: params.reason,
        metadata: {
          ...(params.metadata ?? {}),
          creditSource: source,
          reversesOperationKey: params.operationKey,
          reversesLedgerId: consume.id,
        },
      },
    });

    return { success: true, source, balanceAfter, alreadyApplied: false };
  });
}
```

Do not catch and convert unknown transaction failures into success. Only an already-existing `refund:${operationKey}` ledger is an idempotent success.

- [ ] **Step 5: Calculate monthly plan usage as net plan-only consumption**

In `src/lib/billing/entitlements/index.ts`, replace the aggregate over all `consume` entries with a ledger read that includes `consume` and `refund`, then count only entries whose metadata has `creditSource: "plan"`:

```ts
const monthEntries = creditAccount
  ? await db.aiCreditLedger.findMany({
      where: {
        accountId: creditAccount.id,
        createdAt: { gte: monthStart },
        entryType: { in: ["consume", "refund"] },
      },
      select: { amount: true, metadata: true },
    })
  : [];

const netPlanAmount = monthEntries.reduce((sum, entry) => {
  const metadata = entry.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return sum;
  return (metadata as Record<string, unknown>).creditSource === "plan"
    ? sum + entry.amount
    : sum;
}, 0);

const aiUsed = Math.max(0, -netPlanAmount);
```

This excludes Credit-funded calls from plan usage and lets plan refunds offset the original plan consume entry.

- [ ] **Step 6: Update AI callers to use the returned operation key**

In `src/lib/ai/commercial-agent.ts` and `src/app/api/workbench/ai/chat/route.ts`:

1. Pass the raw validated client request ID into `consumeCredit`; do not pre-bind it in the caller.
2. After successful consume, retain `creditResult.operationKey`.
3. Replace every failure-path `refundCredit(...)` call with:

```ts
const refundResult = await refundConsumedCredit({
  userId,
  operationKey: creditResult.operationKey,
  reason: "模型调用失败自动补偿",
  metadata: { conversationId, traceId },
});
```

Use specific reason text for provider failure, output moderation failure, and assistant-message persistence failure. Preserve current risk logging when `refundResult.success` is false.

- [ ] **Step 7: Run focused and existing AI tests**

Run:

```bash
npm test -- --runInBand tests/ai-credit-compensation.test.ts tests/ai-closeout.test.ts tests/enterprise-quota.test.ts
```

Expected: all suites PASS; no test permits plan-source compensation to increase Credit balance.

- [ ] **Step 8: Commit Task 1**

```bash
git add src/lib/ai/permissions.ts src/lib/billing/entitlements/index.ts src/lib/ai/commercial-agent.ts src/app/api/workbench/ai/chat/route.ts tests/ai-credit-compensation.test.ts
git commit -m "fix(ai): make credit compensation source-aware"
```

---

### Task 2: Enforce fail-closed enterprise Host validation for pages and metadata

**Files:**
- Modify: `src/lib/workspace-public-host.ts`
- Modify: `src/app/__w/[workspaceId]/page.tsx`
- Modify: `src/app/__w/[workspaceId]/p/[slug]/page.tsx`
- Modify: `tests/domains.test.ts`

**Interfaces:**
- Produces:
  - `validateWorkspacePublicRequestHost(workspaceId: string, rawHost: string | null | undefined): Promise<string | null>`
- Consumes:
  - Existing Host normalization and `assertWorkspacePublicHost` rules.

- [ ] **Step 1: Add failing Host-gate tests**

Append to `tests/domains.test.ts` concrete tests for:

```ts
describe("validateWorkspacePublicRequestHost", () => {
  test("returns null when Host is missing", async () => {
    await expect(validateWorkspacePublicRequestHost("w1", null)).resolves.toBeNull();
  });

  test("returns null for unknown or cross-workspace Host", async () => {
    resolveWorkspacePublicHostMock.mockResolvedValue(null);
    await expect(validateWorkspacePublicRequestHost("w1", "other.example.com")).resolves.toBeNull();
  });

  test("returns normalized verified Host", async () => {
    resolveWorkspacePublicHostMock.mockResolvedValue({ workspaceId: "w1", host: "brand.example.com" });
    await expect(validateWorkspacePublicRequestHost("w1", "Brand.Example.com:443")).resolves.toBe("brand.example.com");
  });
});
```

Use the existing domain-test mock style and actual exported resolver names from `src/lib/workspace-public-host.ts`.

- [ ] **Step 2: Run Host tests and confirm RED**

Run:

```bash
npm test -- --runInBand tests/domains.test.ts
```

Expected: FAIL because the shared fail-closed request helper does not exist and current pages allow missing Host.

- [ ] **Step 3: Add one shared request Host validator**

In `src/lib/workspace-public-host.ts`, add:

```ts
export async function validateWorkspacePublicRequestHost(
  workspaceId: string,
  rawHost: string | null | undefined,
): Promise<string | null> {
  const normalizedHost = normalizeHost(rawHost);
  if (!normalizedHost) return null;
  const allowed = await assertWorkspacePublicHost(workspaceId, normalizedHost);
  return allowed ? normalizedHost : null;
}
```

Reuse the module's existing normalization helper. Do not add `NEXT_PUBLIC_APP_URL` bypasses. Any localhost development exception must remain centralized in the existing domain resolver.

- [ ] **Step 4: Make enterprise home page and metadata use the same Host gate**

In `src/app/__w/[workspaceId]/page.tsx`:

```ts
async function requireVerifiedHost(workspaceId: string): Promise<string> {
  const { headers } = await import("next/headers");
  const host = await validateWorkspacePublicRequestHost(
    workspaceId,
    (await headers()).get("host"),
  );
  if (!host) notFound();
  return host;
}
```

Then change both `generateMetadata` and the page component to call `requireVerifiedHost(workspaceId)` before querying the Workspace. Change `loadWorkspace` so Host is required, not optional:

```ts
async function loadWorkspace(workspaceId: string, host: string) {
  const verifiedHost = await validateWorkspacePublicRequestHost(workspaceId, host);
  if (!verifiedHost) return null;
  // existing workspace query follows
}
```

Do not return enterprise name or description metadata before Host verification.

- [ ] **Step 5: Apply the same gate to employee page and metadata**

In `src/app/__w/[workspaceId]/p/[slug]/page.tsx`, create the same local `requireVerifiedHost` helper or import a server-only wrapper if the module already has one. Both metadata generation and page rendering must execute the Host gate before `resolveWorkspacePublicProfile` or profile queries.

Missing Host, unknown Host, unverified Host, platform Host routed to `__w`, and cross-Workspace Host must all call `notFound()`.

- [ ] **Step 6: Run domain and page-focused tests**

Run:

```bash
npm test -- --runInBand tests/domains.test.ts tests/security-closeout.test.ts
```

Expected: PASS. Source-level checks must confirm neither `__w` page contains `if (host)` as a validation guard or a `NEXT_PUBLIC_APP_URL` bypass.

- [ ] **Step 7: Commit Task 2**

```bash
git add src/lib/workspace-public-host.ts src/app/__w/[workspaceId]/page.tsx src/app/__w/[workspaceId]/p/[slug]/page.tsx tests/domains.test.ts tests/security-closeout.test.ts
git commit -m "fix(domains): require verified host for enterprise pages"
```

---

### Task 3: Clean scripts and establish the Node.js 22 CI gate

**Files:**
- Modify: `package.json`
- Create: `.github/workflows/mvp-closeout.yml`
- Create: `tests/single-mainline-regression.test.ts`

**Interfaces:**
- Produces one GitHub Actions workflow named `MVP Closeout`.
- Consumes the existing npm scripts and Prisma configuration.

- [ ] **Step 1: Write a failing regression test for duplicate scripts and selected-mainline guardrails**

Create `tests/single-mainline-regression.test.ts`:

```ts
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("single-mainline closeout guardrails", () => {
  test("package.json defines test scripts once", () => {
    const raw = read("package.json");
    expect((raw.match(/\"test\"\s*:/g) ?? []).length).toBe(1);
    expect((raw.match(/\"test:d2\"\s*:/g) ?? []).length).toBe(1);
    expect((raw.match(/\"test:d4\"\s*:/g) ?? []).length).toBe(1);
  });

  test("enterprise pages do not bypass Host validation", () => {
    const home = read("src/app/__w/[workspaceId]/page.tsx");
    const member = read("src/app/__w/[workspaceId]/p/[slug]/page.tsx");
    expect(home).not.toContain("NEXT_PUBLIC_APP_URL ? null");
    expect(member).not.toContain("NEXT_PUBLIC_APP_URL ? null");
    expect(home).toContain("validateWorkspacePublicRequestHost");
    expect(member).toContain("validateWorkspacePublicRequestHost");
  });

  test("AI routes use source-aware compensation", () => {
    const permissions = read("src/lib/ai/permissions.ts");
    const commercial = read("src/lib/ai/commercial-agent.ts");
    const workbench = read("src/app/api/workbench/ai/chat/route.ts");
    expect(permissions).toContain("refundConsumedCredit");
    expect(commercial).toContain("refundConsumedCredit");
    expect(workbench).toContain("refundConsumedCredit");
  });
});
```

- [ ] **Step 2: Run the regression test and confirm RED**

Run:

```bash
npm test -- --runInBand tests/single-mainline-regression.test.ts
```

Expected: FAIL because `package.json` still has duplicate script keys and Tasks 1–2 are not yet complete at the start of the plan.

- [ ] **Step 3: Replace the scripts block with unique keys**

Make the `package.json` scripts object exactly:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "node .next/standalone/server.js",
  "lint": "eslint src --quiet",
  "typecheck": "tsc --noEmit",
  "test": "jest",
  "test:d2": "jest tests/domains.test.ts",
  "test:d4": "jest tests/enterprise-quota.test.ts",
  "check": "npm run lint && npm run typecheck && npm run build",
  "db:backup": "node scripts/db/backup-db.js",
  "db:restore": "node scripts/db/restore-db.js",
  "db:migrate": "node scripts/db/migrate-db.js",
  "db:verify": "node scripts/db/verify-db.js",
  "db:create-users": "node scripts/db/create-system-users.js"
}
```

Do not change dependencies or plan prices in this task.

- [ ] **Step 4: Create the real GitHub Actions workflow**

Create `.github/workflows/mvp-closeout.yml`:

```yaml
name: MVP Closeout

on:
  push:
    branches:
      - integration/mvp-closeout-r1
  pull_request:
    branches:
      - integration/mvp-closeout-r1

permissions:
  contents: read

concurrency:
  group: mvp-closeout-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: link168
          POSTGRES_PASSWORD: link168
          POSTGRES_DB: link168_ci
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U link168 -d link168_ci"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    env:
      NODE_ENV: test
      DATABASE_URL: postgresql://link168:link168@127.0.0.1:5432/link168_ci
      CONFIG_ENCRYPTION_KEY: github-actions-link168-config-key-2026
      NEXT_PUBLIC_APP_URL: http://localhost:3000

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Validate Prisma schema
        run: npx prisma validate

      - name: Generate Prisma client
        run: npx prisma generate

      - name: Apply test migrations
        run: npx prisma migrate deploy

      - name: Typecheck
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm test -- --runInBand

      - name: Build
        run: npm run build

      - name: Diff check
        run: git diff --check
```

If the repository uses a non-default Prisma schema path, preserve the current Prisma config and do not invent an alternate schema path.

- [ ] **Step 5: Run local static and full verification**

Run:

```bash
npm ci
npx prisma validate
npx prisma generate
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build
git diff --check
```

Expected: every command exits 0. Record any build-time database warning separately; do not describe a warning as a production validation success.

- [ ] **Step 6: Commit Task 3**

```bash
git add package.json .github/workflows/mvp-closeout.yml tests/single-mainline-regression.test.ts
git commit -m "ci: add Node 22 MVP closeout gate"
```

---

### Task 4: Verify the integrated P0 boundaries and finalize the unique mainline

**Files:**
- Modify only if a verified P0 is found:
  - `src/lib/billing/entitlements/index.ts`
  - `src/lib/ai/commercial-agent.ts`
  - tests covering the specific failure
- Modify: `docs/superpowers/specs/2026-07-14-mvp-single-mainline-closeout-design.md`
- Create: `docs/superpowers/reports/2026-07-14-mvp-closeout-verification.md`

**Interfaces:**
- Consumes final commits from Tasks 1–3.
- Produces a final verified SHA and explicit branch cleanup decision.

- [ ] **Step 1: Run cross-module focused tests**

Run:

```bash
npm test -- --runInBand \
  tests/security-closeout.test.ts \
  tests/billing-closeout.test.ts \
  tests/ai-closeout.test.ts \
  tests/ai-credit-compensation.test.ts \
  tests/domains.test.ts \
  tests/console-navigation.test.ts \
  tests/mobile-layout.test.ts \
  tests/legacy-routes.test.ts \
  tests/single-mainline-regression.test.ts
```

Expected: all suites PASS.

- [ ] **Step 2: Verify the selected P0 invariants in code**

Run:

```bash
rg -n 'member_basic|member_plus|enterprise_pro_plus' src --glob '!src/lib/billing/plans.ts'
rg -n 'role !== "admin"|role === "admin"' src/app/jeepwork src/lib/jeepwork-auth.ts src/lib/admin-auth.ts
rg -n 'NEXT_PUBLIC_APP_URL \? null|if \(host\)' 'src/app/__w'
rg -n 'refundCredit\(' src/lib/ai src/app/api/workbench/ai
rg -n 'workspaceProduct|workspaceKnowledge|WorkspaceProduct|WorkspaceKnowledge' prisma src/lib src/app
```

Expected:

- Historical plan aliases appear only in explicit compatibility code or user-facing legacy labels.
- Jeepwork authentication does not authorize ordinary `admin`.
- Enterprise pages contain no conditional Host bypass.
- AI failure paths use `refundConsumedCredit`, not blind balance refunds.
- Workspace ownership models and filters are identifiable for final manual review.

If the Workspace scan proves that personal entitlement counts or personal public AI queries include Workspace-owned products/knowledge documents, add a focused failing test and the minimal ownership exclusion using the existing association model. Do not add schema fields or a new ownership system.

- [ ] **Step 3: Confirm GitHub Actions success on the final integration SHA**

Push the Task 3 commit to `integration/mvp-closeout-r1`, then inspect the `MVP Closeout` workflow associated with that exact SHA.

Expected:

- Workflow name: `MVP Closeout`
- Node.js: 22
- All steps: success
- No missing or neutral required job

Do not continue to branch deletion when the workflow is absent, queued, cancelled, or failed.

- [ ] **Step 4: Write the verification report**

Create `docs/superpowers/reports/2026-07-14-mvp-closeout-verification.md` with:

```markdown
# Link168 MVP Closeout Verification

- Unique development branch: `integration/mvp-closeout-r1`
- Final verified SHA: `<exact SHA>`
- Production branch changed: no
- Production deployment performed: no
- GitHub Actions workflow: `MVP Closeout`
- GitHub Actions result: success

## Verified P0 fixes

1. AI plan compensation offsets plan usage and does not mint Credit.
2. Credit compensation restores only the originally deducted Credit.
3. Enterprise page and metadata requests require a verified Host.
4. `package.json` contains no duplicate script keys.
5. Jeepwork remains super-admin only.
6. Canonical plan codes remain `free`, `plus`, `pro`, `enterprise`, `enterprise_pro`.

## Deferred P1/P2

- List only evidence-backed remaining items.
```

Replace `<exact SHA>` with the actual commit SHA before committing; placeholders are forbidden in the committed report.

- [ ] **Step 5: Update the approved design status**

In `docs/superpowers/specs/2026-07-14-mvp-single-mainline-closeout-design.md`, change:

```text
状态：待用户最终审核
```

to:

```text
状态：实施完成，等待部署验收
```

Only after CI success.

- [ ] **Step 6: Commit verification evidence**

```bash
git add docs/superpowers/specs/2026-07-14-mvp-single-mainline-closeout-design.md docs/superpowers/reports/2026-07-14-mvp-closeout-verification.md
git commit -m "docs: record verified MVP closeout baseline"
```

Push and require one final `MVP Closeout` success for this documentation SHA.

- [ ] **Step 7: Delete temporary Agent branches after final CI success**

Delete only these refs:

```text
agent/closeout-r1-security
agent/closeout-r1-billing
agent/closeout-r1-ai
agent/closeout-r1-public
agent/closeout-r1-console
```

Before each deletion, verify its tip commit is an ancestor of the final `integration/mvp-closeout-r1` SHA. Do not delete `codex/link168-v2-direction`; mark it historical and stop development on it.

- [ ] **Step 8: Final completion evidence**

Report:

- final integration SHA;
- all task commit SHAs;
- GitHub Actions URL/result;
- deleted branch list;
- unchanged `master` SHA;
- remaining P1/P2 items;
- explicit statement that production was not deployed.

---

## Plan Self-Review

- Spec coverage: AI compensation, Host fail-closed, script cleanup, Node.js 22 CI, single-mainline evidence, and branch cleanup are each mapped to a task.
- Placeholder scan: the only angle-bracket placeholder appears inside an example report and is explicitly required to be replaced before commit.
- Type consistency: `consumeCredit` produces `operationKey`; all callers pass that exact key to `refundConsumedCredit`.
- Scope: no Prisma changes, no new product features, no production deployment, and no parallel Agent work.
