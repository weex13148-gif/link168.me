# Link168 MVP P0/P1 Closeout and Launch-Test Runbook

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On 2026-07-15, close every frozen P0/P1 item on `integration/mvp-closeout-r1`, prove the result on the exact Git SHA, and enter pre-production launch testing only after every hard gate is green.

**Architecture:** Keep one development line and use sequential quality gates. Reuse the detailed source-aware AI, enterprise Host, and CI design in `docs/superpowers/plans/2026-07-14-mvp-single-mainline-closeout-plan.md`; add the remaining product-closure work without adding Prisma models or a second product line. Production deployment is out of scope: the final state is a verified pre-production candidate.

**Tech Stack:** Next.js, TypeScript, Prisma 7, PostgreSQL 16, Jest, GitHub Actions, Node.js 22.

## Global Constraints

- Work only on `integration/mvp-closeout-r1`; do not modify `master`.
- Use an isolated Git worktree and test-driven changes with one reviewable commit per task.
- Do not create Prisma models or migrations unless an existing migration is required to make the checked-in schema runnable.
- Do not change plan prices, membership rules, `/showcase`, or `/jeepwork` route ownership.
- `super_admin` is the only platform administrator; Workspace roles stay Workspace-scoped.
- Free users keep all basic components except real AI calls.
- Never display “开发中”, “Demo”, “Mock”, or “即将开放”; hide an unfinished non-core entry instead.
- Never fake a successful Alibaba Bailian, Alibaba Cloud Mail, object-storage, or Alipay call.
- Do not delete temporary Agent branches until the exact final SHA has passed CI.
- Do not deploy production or alter production data during this runbook.

## Frozen Release Blockers

### P0 engineering

1. AI compensation must reverse the original plan/Credit source and be idempotent.
2. Enterprise public pages and metadata must reject missing, unverified, platform, and cross-Workspace Hosts.
3. Node.js 22 CI must run clean install, Prisma validation/generation, typecheck, lint, Jest, build, and diff checks.
4. Platform Logo selection must persist a stable platform key and render a local approved asset, not an Emoji disguise.
5. `quote` and `contact-form` must exist as real free profile modules and create real Leads.
6. Dashboard metrics must use real visits, consultations, Leads, and won conversions; visits must not be estimated from link clicks.

### P1 engineering and operations

1. Media replace/delete must clear the database reference and remove the owned old object without deleting shared or foreign files.
2. Product modules must select an owned active Product instead of asking the merchant to type a raw Product UUID; product ordering must persist.
3. Every visible `/jeepwork` navigation item must resolve to a super-admin page; otherwise hide that navigation item for this release.
4. External-service readiness must distinguish “configured and passed”, “not configured”, and “failed”; only the first state is green.

## Day Schedule — Asia/Tokyo

| Time | Gate | Deliverable |
|---|---|---|
| 08:00–08:30 | Gate 0 | Worktree, exact baseline SHA, clean install, baseline failure record |
| 08:30–11:30 | Gate 1 | AI compensation and enterprise Host P0 commits |
| 11:30–12:30 | Gate 2 | Package cleanup, CI workflow, first GitHub Actions run |
| 13:30–15:30 | Gate 3 | Platform Logo, quote/contact-form, four metrics |
| 15:30–17:00 | Gate 4 | Media lifecycle, Product binding/order, Jeepwork visible-route closure |
| 17:00–18:00 | Gate 5 | Full local verification and exact-SHA GitHub Actions success |
| After Gate 5 | Gate 6 | Pre-production launch testing and evidence report |

The clock is not an acceptance criterion. If a gate is red, stop there, record the evidence, and do not enter the next gate.

---

### Task 0: Establish the immutable baseline

**Files:**
- Read: `docs/superpowers/plans/2026-07-14-mvp-single-mainline-closeout-plan.md`
- Read: `docs/CURRENT_MVP.md`
- Read: `01_PRODUCT_DOCS/PRODUCT_CONSTITUTION.md`
- Create at the end of the day: `docs/superpowers/reports/2026-07-15-mvp-launch-readiness.md`

**Interfaces:**
- Produces: `BASELINE_SHA`, an isolated worktree, and a baseline command log.
- Consumes: GitHub branch `integration/mvp-closeout-r1`.

- [ ] **Step 1: Fetch without changing the current checkout**

```bash
git fetch origin integration/mvp-closeout-r1
BASELINE_SHA="$(git rev-parse origin/integration/mvp-closeout-r1)"
git merge-base --is-ancestor 6d9f192bf51b2c88364bcb7d5c2ff28fbd710301 "$BASELINE_SHA"
git diff --name-only 6d9f192bf51b2c88364bcb7d5c2ff28fbd710301.."$BASELINE_SHA"
```

Expected: the ancestry command exits 0. Before implementation, the diff may contain only this runbook. If it contains business-code changes, stop and review those commits before using this runbook; do not reset or overwrite them.

- [ ] **Step 2: Create the isolated worktree**

```bash
git worktree add -b codex-mvp-closeout-20260715 ../link168-mvp-closeout origin/integration/mvp-closeout-r1
cd ../link168-mvp-closeout
git status --short --branch
```

Expected: local ephemeral branch is `codex-mvp-closeout-20260715`, based exactly on `origin/integration/mvp-closeout-r1`, and the worktree is clean. Never push the ephemeral branch name.

- [ ] **Step 3: Establish the clean-environment baseline**

```bash
node --version
npm --version
npm ci
npx prisma validate
npx prisma generate
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build
git diff --check
```

Expected before fixes: Node reports v22.x; known P0 tests/workflow may be missing or fail. Record every exit code. An install or Prisma failure is Gate 0 red and must be fixed before business code.

---

### Task 1: Close AI compensation P0

**Files:**
- Create: `tests/ai-credit-compensation.test.ts`
- Modify: `src/lib/ai/permissions.ts`
- Modify: `src/lib/billing/entitlements/index.ts`
- Modify: `src/lib/ai/commercial-agent.ts`
- Modify: `src/app/api/workbench/ai/chat/route.ts`

**Interfaces:**
- Produces: `AiCreditSource`, `consumeCredit(...).operationKey`, and `refundConsumedCredit(...)` exactly as defined by Task 1 of the 2026-07-14 implementation plan.
- Consumes: existing `AiCreditLedger.metadata` and `bindIdempotencyKey`; no schema change.

- [ ] **Step 1: Execute every checkbox in Task 1 of the existing implementation plan**

The mandatory behaviours are:

```ts
type AiCreditSource = "plan" | "credit";

type SuccessfulConsumption = {
  success: true;
  source: AiCreditSource;
  balanceAfter: number;
  operationKey: string;
};
```

`refundConsumedCredit` must read the original consume ledger, use `refund:${operationKey}` as its idempotency key, restore balance only for `source === "credit"`, and create an offset ledger without minting Credit for `source === "plan"`.

- [ ] **Step 2: Prove RED then GREEN**

```bash
npm test -- --runInBand tests/ai-credit-compensation.test.ts
npm test -- --runInBand tests/ai-closeout.test.ts tests/billing-closeout.test.ts
```

Expected: all suites PASS after implementation, including duplicate-refund, foreign-operation, monthly-plan-net-usage, and concurrent optimistic-lock cases.

- [ ] **Step 3: Commit the isolated result**

```bash
git add tests/ai-credit-compensation.test.ts src/lib/ai/permissions.ts src/lib/billing/entitlements/index.ts src/lib/ai/commercial-agent.ts src/app/api/workbench/ai/chat/route.ts
git commit -m "fix(ai): compensate original credit source"
```

---

### Task 2: Close enterprise Host P0

**Files:**
- Modify: `src/lib/workspace-public-host.ts`
- Modify: `src/app/__w/[workspaceId]/page.tsx`
- Modify: `src/app/__w/[workspaceId]/p/[slug]/page.tsx`
- Modify: `tests/domains.test.ts`
- Modify: `tests/security-closeout.test.ts`

**Interfaces:**
- Produces: `validateWorkspacePublicRequestHost(workspaceId, rawHost): Promise<string | null>`.
- Consumes: existing verified-domain lookup and Workspace active-state rules.

- [ ] **Step 1: Execute every checkbox in Task 2 of the existing implementation plan**

The shared boundary must remain:

```ts
export async function validateWorkspacePublicRequestHost(
  workspaceId: string,
  rawHost: string | null | undefined,
): Promise<string | null> {
  const normalizedHost = normalizeHost(rawHost);
  if (!normalizedHost) return null;
  return (await assertWorkspacePublicHost(workspaceId, normalizedHost))
    ? normalizedHost
    : null;
}
```

Both page rendering and metadata generation must call the same gate before loading Workspace or Profile data.

- [ ] **Step 2: Prove RED then GREEN**

```bash
npm test -- --runInBand tests/domains.test.ts tests/security-closeout.test.ts
```

Expected: PASS for missing Host, unknown Host, unverified Host, cross-Workspace Host, platform Host, mixed-case Host, port removal, and verified Host.

- [ ] **Step 3: Commit the isolated result**

```bash
git add src/lib/workspace-public-host.ts src/app/__w/[workspaceId]/page.tsx src/app/__w/[workspaceId]/p/[slug]/page.tsx tests/domains.test.ts tests/security-closeout.test.ts
git commit -m "fix(domains): fail closed on enterprise host"
```

---

### Task 3: Establish the CI P0 gate

**Files:**
- Modify: `package.json`
- Create: `.github/workflows/mvp-closeout.yml`
- Create: `tests/single-mainline-regression.test.ts`

**Interfaces:**
- Produces: one `MVP Closeout` workflow on Node.js 22 with PostgreSQL 16.
- Consumes: existing npm scripts and Prisma config.

- [ ] **Step 1: Execute every checkbox in Task 3 of the existing implementation plan**

Remove duplicate `test`, `test:d2`, and `test:d4` keys. The workflow must run, in order:

```text
npm ci
npx prisma validate
npx prisma generate
npx prisma migrate deploy
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build
git diff --check
```

- [ ] **Step 2: Run the focused regression suite**

```bash
npm test -- --runInBand tests/single-mainline-regression.test.ts
```

Expected: PASS and exactly one occurrence of each test script key.

- [ ] **Step 3: Commit and push only the three completed P0 tasks**

```bash
git add package.json .github/workflows/mvp-closeout.yml tests/single-mainline-regression.test.ts
git commit -m "ci: add Node 22 MVP release gate"
git push origin HEAD:integration/mvp-closeout-r1
```

Expected: GitHub Actions starts on the pushed SHA. Do not hide failures with `continue-on-error`.

---

### Task 4: Close the product-surface P0s

**Files:**
- Modify: `src/features/profile-modules/types.ts`
- Modify: `src/features/profile-modules/registry.ts`
- Modify: `src/components/dashboard-v1/types.ts`
- Modify: `src/components/dashboard-v1/LinksPanel.tsx`
- Modify: `src/lib/link-icons.ts`
- Modify: `src/app/api/dashboard/links/route.ts`
- Modify: `src/app/api/dashboard/links/[id]/route.ts`
- Modify: `src/components/share/SharePageRenderer.tsx`
- Create: `public/platform-logos/wechat.svg`
- Create: `public/platform-logos/douyin.svg`
- Create: `public/platform-logos/xiaohongshu.svg`
- Create: `public/platform-logos/bilibili.svg`
- Create: `public/platform-logos/youtube.svg`
- Create: `public/platform-logos/linkedin.svg`
- Create: `public/platform-logos/instagram.svg`
- Create: `public/platform-logos/facebook.svg`
- Create: `public/platform-logos/x.svg`
- Modify: `src/lib/analytics/stats.ts`
- Modify: `src/lib/analytics/events.ts`
- Modify: `src/app/api/dashboard/stats/route.ts`
- Create: `tests/profile-module-closeout.test.ts`
- Create: `tests/analytics-closeout.test.ts`

**Interfaces:**
- Produces module types `quote` and `contact-form`.
- Produces `iconType: "platform"` with an allowlisted `iconValue` platform key.
- Produces four server-derived metrics: `visits`, `consultations`, `leads`, `conversions`.
- Consumes existing `Link.payloadJson`, `LinkClick`, `ProfileVisit`, `Lead`, and `/api/contact`; no schema change.

- [ ] **Step 1: Write failing module tests**

The tests must assert:

```ts
expect(getProfileModuleDefinition("quote")?.free).toBe(true);
expect(getProfileModuleDefinition("contact-form")?.free).toBe(true);
expect(allowedIconTypes).toContain("platform");
expect(resolvePlatformIcon("linkedin")).toMatch(/^\/platform-logos\//);
expect(resolvePlatformIcon("https://attacker.example/icon.svg")).toBeNull();
```

Add API tests proving a merchant can create/update/reorder/delete both modules, a non-owner receives 403/404 according to the existing ownership convention, and a public submission creates a real Lead with `sourceComponent` equal to `quote` or `contact_form`.

- [ ] **Step 2: Implement platform-logo persistence without remote image injection**

Use this boundary in the shared icon resolver:

```ts
export type PlatformIconKey =
  | "wechat"
  | "douyin"
  | "xiaohongshu"
  | "bilibili"
  | "youtube"
  | "linkedin"
  | "instagram"
  | "facebook"
  | "x";

export function resolvePlatformIcon(value: string | null | undefined): string | null {
  if (!value || !PLATFORM_ICON_PATHS[value as PlatformIconKey]) return null;
  return PLATFORM_ICON_PATHS[value as PlatformIconKey];
}
```

Persist the stable key in `iconValue`; render only local allowlisted paths. Existing `default`, `emoji`, and `custom` records must remain readable.

- [ ] **Step 3: Implement real quote and contact forms**

Use `Link.type` and `payloadJson`; do not add a table. The public submit payload must be explicit:

```ts
type ContactSubmission = {
  profileId: string;
  sourceComponent: "quote" | "contact_form";
  sourcePage: string;
  name: string;
  email?: string;
  phone?: string;
  wechat?: string;
  message?: string;
  interestedProductId?: string;
};
```

Require `name` and at least one contact method. Use the existing `/api/contact` ownership, publication, restriction, and product-snapshot checks. Show success only after the API returns a persisted Lead ID.

- [ ] **Step 4: Write failing four-metric tests**

The test fixtures must include 10 non-bot `ProfileVisit` rows, 2 bot visits, 3 contact-link clicks, 1 unrelated normal-link click, 4 inquiry/AI Leads, 2 won Leads, and unrelated Profiles. Assert:

```ts
expect(metrics).toEqual({
  visits: 10,
  consultations: 7,
  leads: 4,
  conversions: 2,
});
```

`visits` must query `ProfileVisit` with `isBot: false`; it must never derive visits from `LinkClick`. `leads` counts owned Profile Leads. `conversions` counts the canonical won status. `consultations` counts owned contact-channel interactions using existing contact Link clicks plus persisted inquiry/AI Lead sources, with test fixtures preventing double-counting.

- [ ] **Step 5: Implement one shared metric query**

Both the dashboard cards and funnel must consume the same server function:

```ts
export interface CoreMvpMetrics {
  visits: number;
  consultations: number;
  leads: number;
  conversions: number;
}

export async function getCoreMvpMetrics(
  profileId: string,
  range: { from: Date; to: Date },
): Promise<CoreMvpMetrics>;
```

Filter every table by the same `profileId` and half-open interval `[from, to)`. Remove the link-click page-view estimate from the production code path.

- [ ] **Step 6: Run and commit the product P0 tests**

```bash
npm test -- --runInBand tests/profile-module-closeout.test.ts tests/analytics-closeout.test.ts tests/leads-closeout.test.ts
git add src tests public
git commit -m "feat(mvp): close profile modules and core metrics"
```

Expected: all targeted suites PASS; `git diff --cached --name-only` must contain only files needed by Task 4 before committing.

---

### Task 5: Close the P1 lifecycle and operations gaps

**Files:**
- Modify: `src/app/api/dashboard/avatar/route.ts`
- Modify: `src/app/api/dashboard/media/background/route.ts`
- Modify: `src/app/api/dashboard/media/cover/route.ts`
- Modify: `src/app/api/dashboard/media/carousel/route.ts`
- Modify: `src/app/api/dashboard/media/popup/route.ts`
- Modify: `src/app/api/dashboard/links/icon/route.ts`
- Modify: `src/components/dashboard-v1/LinksPanel.tsx`
- Modify: `src/components/workbench/ProductsClient.tsx`
- Modify: `src/app/api/dashboard/products/route.ts`
- Modify: `src/app/api/dashboard/products/[id]/route.ts`
- Create: `src/app/api/dashboard/products/reorder/route.ts`
- Modify: `src/components/admin/AdminKit.tsx`
- Create: `tests/media-lifecycle.test.ts`
- Create: `tests/product-binding-order.test.ts`
- Create: `tests/jeepwork-visible-routes.test.ts`

**Interfaces:**
- Produces idempotent owned-media deletion and old-object cleanup.
- Produces owned active Product selection and persistent `sortOrder` updates.
- Produces a Jeepwork navigation set in which every visible href resolves and remains `super_admin`-only.

- [ ] **Step 1: Write media lifecycle tests before changing routes**

Each media type must prove:

```text
upload -> database reference points to new owned object
replace -> reference points to new object and old owned object is deleted
delete -> reference is null and owned object is deleted
repeat delete -> success without deleting another object
foreign/shared path -> rejected and never deleted
```

Use the existing storage adapter and moderation result. Do not call `fs.unlink` directly from UI code.

- [ ] **Step 2: Implement product selection and order persistence**

The editor must load the signed-in merchant's active Products and persist `interestedProductId` only when ownership is verified server-side. Reorder must submit the complete ordered owned-ID list in one request and update `sortOrder` transactionally. Reject missing, duplicate, inactive, or foreign IDs.

- [ ] **Step 3: Close Jeepwork visible routes with the smaller safe change**

For each visible Jeepwork href, assert the page module exists and calls the shared super-admin guard. If a page is not needed to operate this MVP release, remove only its navigation entry; keep its API and route namespace for future work. Do not add placeholder pages.

- [ ] **Step 4: Run and commit P1 tests**

```bash
npm test -- --runInBand tests/media-lifecycle.test.ts tests/product-binding-order.test.ts tests/jeepwork-visible-routes.test.ts tests/security-closeout.test.ts
git add src tests
git commit -m "fix(mvp): close media product and admin lifecycles"
```

Expected: all targeted suites PASS and no user-visible placeholder copy is introduced.

---

### Task 6: Run the hard release gate

**Files:**
- No application changes unless a failing command first proves a defect.

**Interfaces:**
- Produces: exact candidate SHA `CANDIDATE_SHA` and a green local evidence log.
- Consumes: Tasks 1–5.

- [ ] **Step 1: Run focused regression suites**

```bash
npm test -- --runInBand \
  tests/ai-credit-compensation.test.ts \
  tests/ai-closeout.test.ts \
  tests/billing-closeout.test.ts \
  tests/domains.test.ts \
  tests/security-closeout.test.ts \
  tests/profile-module-closeout.test.ts \
  tests/analytics-closeout.test.ts \
  tests/media-lifecycle.test.ts \
  tests/product-binding-order.test.ts \
  tests/jeepwork-visible-routes.test.ts \
  tests/console-navigation.test.ts \
  tests/legacy-routes.test.ts
```

- [ ] **Step 2: Run the complete clean gate**

```bash
rm -rf node_modules .next
npm ci
npx prisma validate
npx prisma generate
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build
git diff --check
git status --short
```

Expected: every command exits 0 and `git status --short` is empty.

- [ ] **Step 3: Push and bind evidence to the exact SHA**

```bash
CANDIDATE_SHA="$(git rev-parse HEAD)"
git push origin HEAD:integration/mvp-closeout-r1
test "$CANDIDATE_SHA" = "$(git rev-parse origin/integration/mvp-closeout-r1)"
```

Expected: `MVP Closeout` GitHub Actions succeeds for `CANDIDATE_SHA`. A queued, missing, cancelled, neutral, or failed run is Gate 5 red.

---

### Task 7: Enter pre-production launch testing

**Files:**
- Create: `docs/superpowers/reports/2026-07-15-mvp-launch-readiness.md`
- Modify after all tests pass: `docs/CURRENT_MVP.md`

**Interfaces:**
- Produces: a launch-readiness verdict for the exact candidate SHA.
- Consumes: a non-production PostgreSQL database and configured pre-production environment.

- [ ] **Step 1: Verify required environment without printing secrets**

Require non-empty values for the deployment's database, session/auth, encryption, public URL, and any provider selected for real testing. Log only `configured` or `not configured`. A missing required staging value is a blocked test, never a pass.

- [ ] **Step 2: Run the production build in pre-production**

Apply checked-in migrations to the non-production database, start the standalone build, and verify health before browser testing. Do not point `DATABASE_URL` at production.

- [ ] **Step 3: Execute the core browser journey at 360, 390, and 430 CSS pixels**

For each width, verify through visible browser actions and database readback:

```text
register -> verify email -> login -> onboarding
create/edit card -> add link/profile/product/service/image/platform Logo
add quote/contact form -> publish -> refresh -> public page shows latest state
copy public link -> open incognito -> QR opens same public page
visitor consultation -> persisted Lead -> merchant follow-up -> won/closed
dashboard -> visits/consultations/Leads/conversions match seeded actions
logout/foreign account -> ownership and super-admin boundaries reject access
```

There must be no horizontal clipping, unreachable primary action, hover-only core control, or fake success state.

- [ ] **Step 4: Test external services only when configured**

```text
Alibaba Bailian: one successful reception, one forced provider failure, correct source-aware compensation
Alibaba Cloud Mail: registration verification and password reset delivery
Object storage/moderation: upload, replace, delete, rejected unsafe or invalid file
Alipay sandbox: create order, signed callback, duplicate callback idempotency, wrong-signature rejection
Domain/HTTPS: verified Host works; missing/unverified/cross-Workspace Host returns 404
```

If credentials or sandbox endpoints are unavailable, record the item as `BLOCKED_NOT_CONFIGURED`; do not mark launch ready.

- [ ] **Step 5: Write the exact-SHA readiness report**

The report must contain actual values and no placeholders:

```markdown
# Link168 MVP Launch Readiness — 2026-07-15

- Branch: `integration/mvp-closeout-r1`
- Candidate SHA: actual 40-character SHA
- Local clean gate: pass/fail
- GitHub Actions URL: actual run URL
- GitHub Actions: pass/fail
- Pre-production URL: actual non-production URL
- Production changed: no

## P0 results

One row per frozen P0 with command/browser evidence.

## P1 results

One row per frozen P1 with command/browser evidence.

## External services

Use only PASS, FAIL, or BLOCKED_NOT_CONFIGURED.

## Verdict

Use exactly one: READY_FOR_PRODUCTION_APPROVAL or NOT_READY.
```

- [ ] **Step 6: Update canonical status only after a green verdict**

Update `docs/CURRENT_MVP.md` with the candidate SHA, CI run, completed evidence, and any explicitly future-reserved items. Do not call the MVP complete when any P0/P1 row is FAIL or BLOCKED.

- [ ] **Step 7: Stop before production**

The successful endpoint of this plan is `READY_FOR_PRODUCTION_APPROVAL`. Actual production deployment, DNS cutover, live Alipay activation, data migration, and `master` integration require a separate explicit approval.

---

## Failure and Rollback Rules

- Fix only the first proven failing boundary; add or strengthen a regression test before changing implementation.
- Never rewrite published history or force-push the integration branch.
- Set `FAILED_TASK_SHA` to the commit reported by `git log -1 --format=%H`, then revert a self-contained bad task with `git revert "$FAILED_TASK_SHA"`; do not use `git reset --hard`.
- Preserve database evidence and provider callback payload hashes, but never commit secrets or personal data.
- If the repository is not locally mounted, stop implementation. Connector-only whole-file replacement is not an acceptable code workspace.

## Plan Self-Review

- Scope coverage: all audited P0/P1 items map to Tasks 1–5; launch testing maps to Task 7.
- Safety: one branch, isolated worktree, no production write, no schema expansion, and no fake provider success.
- Type consistency: AI uses one `operationKey`; profile modules use existing `Link.type/payloadJson`; metrics share one `CoreMvpMetrics` interface.
- Acceptance: source tests, clean build, exact-SHA CI, database readback, browser journey, mobile widths, permissions, and provider failures are all required.
- Exit condition: only `READY_FOR_PRODUCTION_APPROVAL`; production deployment remains a separate decision.
