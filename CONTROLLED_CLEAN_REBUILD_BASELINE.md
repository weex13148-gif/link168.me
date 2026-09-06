# Controlled Clean Rebuild Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` to execute later construction tasks task-by-task. This document is the single rebuild baseline contract; it is not a new PRD, product constitution, roadmap, or OWNER decision register.

**Goal:** 在不迁移 legacy 产品结构、不修改 DB-1、不创建额外 worktree 的前提下，建立唯一可验证的 Link168 Controlled Clean Rebuild 施工基线。

**Architecture:** 新实现从 CURRENT Product Authority 正向建模，优先建立 Personal Page 的 Draft / Preview / Publish 边界，再由 Published Facts 驱动 Public Page 与后续 Visitor AI。legacy Workbench、Dashboard、Admin、旧 Prisma schema 与旧 API 只作为受边界约束的证据或兼容面，不作为新产品合同。

**Tech Stack:** Next.js 16.2.11 App Router、React、TypeScript 6.0.3、Prisma 7.9.0、PostgreSQL、Jest；本轮不新增依赖、不创建 rebuild development database。

## Global Constraints

- CURRENT authority 优先级：`00_CURRENT_GUIDANCE_INDEX.md` → `CURRENT_PRODUCT_AUTHORITY.md` → `OWNER_DECISION_REGISTER.md` → `DEVELOPMENT_EXECUTION_RULES.md` → `MVP_ACCEPTANCE_TESTS.md` → `LINK168_UI_DESIGN_SYSTEM.md` → `LINK168_MVP_PAGE_AND_INTERACTION_SPEC.md` → `CHINA_PRODUCTION_COMPLIANCE_GATE.md`。
- `OD-001` 至 `OD-058` 已冻结；代码与 OD 冲突时修改代码，不修改、重编号、删除或静默覆盖 OD。
- `Draft` 不得被 Public Page 或 Visitor AI 读取；一次 Publish 必须原子地产生共同 `Published Business Facts` 与 Published pointer。
- 普通用户 canonical route 为 `/console`；平台运营 canonical route 为 `/jeepwork`；个人公开地址以 `/{username}` 为基础。
- 新内部 API 不得沿用 `/api/dashboard/**`、`/api/workbench/**` 或 `/api/admin/**` 作为 CURRENT 合同；legacy API 仅可保留为兼容或迁移边界。
- DB-1 `link168_ui_audit` 仅作 legacy audit / rollback evidence；禁止迁移、reset、delete、modify 或向 Git 暴露 `.env.local` / credentials。
- 不创建额外 worktree、recovery branch、temporary branch；历史分支不 merge、rebase、cherry-pick。
- 未经本轮真实运行验证的功能必须标记为 `待核验`；禁止用 mock、静态数据或 API 200 声明真实集成完成。
- 本轮只做 baseline initialization；完成后停止，不自动进入 Page、AI、Lead、Team 或 Billing 实现。

---

## 1. Repository Baseline

```text
primary worktree:
C:\Users\bifuc\.codex\worktrees\a056\link1688

branch before:
codex/current-product-authority-reconciliation-20260812

HEAD before:
f85b4ab69720a591436a17f5fe539b33edc8eadb

rebuild branch:
codex/controlled-clean-rebuild-20260814

parent SHA:
f85b4ab69720a591436a17f5fe539b33edc8eadb

working tree before:
CLEAN

extra worktree created:
NO
```

The branch was created directly in the existing primary worktree. No reset, checkout of another commit, force-push, or historical branch integration is part of this baseline.

## 2. Authority Verification

```text
OD:
58 unique (OD-001 … OD-058)

IF:
20 unique (IF-01 … IF-20)

Acceptance:
234 unique

CURRENT authority checksum:
24/24 PASS

R2 original ZIP checksum:
PASS

fixed logo assets:
PRESENT and checksum-covered

authority conflicts:
0 observed in this baseline
```

The R2 checksum manifest intentionally refers to the original package. Seven current Markdown hashes differ from that manifest because the CURRENT authority files were subsequently updated; the current authority manifest is the checksum used for present-day authority verification. The R2 ZIP and fixed logo assets remain unchanged and verified.

The PDF references were visually inspected as references only:

- `LINK168_UI_REFERENCE.pdf`: direction 2, warm ivory / brand gold / action blue, fixed logo system, responsive widths 360 / 375 / 390 / 430 / 1440.
- `LINK168_INTERACTION_REFERENCE.pdf`: `IF-01` through `IF-17` reference flows; `IF-18` through `IF-20` remain defined by CURRENT Markdown until PDF synchronization.
- `PRODUCT_DESIGN_CODEX_HANDOFF_AUDIT.pdf`: development mode ready, product feature complete not claimed.

## 3. Legacy Boundary

### REUSE AS-IS CANDIDATE

These are candidates only. Each must pass CURRENT compatibility, dependency, test, and legacy-assumption review before import:

- `src/lib/billing/payment-safety.ts`
- `src/components/theme/normalize.ts`
- theme types that do not encode legacy product behavior
- Prisma-independent validation / parsing portions of `src/lib/contact-entry-domain.ts`
- `src/lib/public-url-security.ts`
- checksum-verified assets under `assets/link168-logo-system/`

### REUSE AFTER ISOLATION / REFACTOR

- auth token, cookie / session, and password-reset primitives
- rate-limit interface and provider boundary
- AI adapter timeout, error mapping, and safe failure
- AI credit compensation, idempotency, and bucket-expiry algorithms
- billing state machine, callback audit, signature verification, and refund safety
- report anti-abuse, Jeepwork authentication, admin audit logging, and owned-media cleanup protection
- basic visit / inquiry / Lead count algorithms, without importing old Won / CRM funnel assumptions

### REWRITE FROM CURRENT AUTHORITY

- Identity, Personal context, Team context, and ownership boundaries
- Page, Page Draft, Preview, Published Version, Published Facts, and Published pointer
- Visitor AI orchestration over Published Facts
- Lead, Lead Source, origin Page, Assignee, Routing, and Handoff
- Team, Member Page, Owner Transfer, Team dissolution, restore, retention, and legal hold
- Personal billing owner, Team billing owner, independent plans, and independent AI credit ledgers
- Consent and Policy Version records
- Jeepwork formal data layer

### RETIRE / DO NOT MIGRATE

- `src/app/dashboard/**`
- `src/app/workbench/**`
- `src/app/admin/**`
- `/api/dashboard/**`
- `/api/workbench/**`
- `/api/admin/**`
- `WorkspaceSwitcher` as a product concept
- legacy viewer role, Showcase / Competition models, old CRM funnel, and old Lead statuses such as `Qualified`, `Won`, `Lost`, `following_up`, and `viewed`
- `providerMode=mock` as a production default
- Commercial Agent, generic multi-agent platform, historical enterprise UI, Booking legacy direction, and old free-form modules unless CURRENT authority later explicitly includes them

## 4. CURRENT Domain Model Contract

The following is the rebuild domain boundary, not a request to implement all entities in this baseline commit:

```text
Identity
  └─ Account / authentication / username / consent references

Personal
  └─ Personal business context + Personal Page + personal billing owner

Team
  ├─ Team owner / admin / member access
  ├─ Team Page
  ├─ Member Page
  ├─ Team billing owner
  └─ shared Team AI credit ledger

Page
  ├─ Page Draft
  ├─ Preview
  ├─ Published Version
  ├─ Published Facts
  ├─ Published Pointer
  ├─ Section / Theme / Renderer
  └─ Public identity route

Visitor AI
  └─ Published Facts reader → safe answer / Direct Form fallback

Lead
  ├─ source / origin Page / conversation context
  ├─ assignee / routing / handoff
  └─ three current statuses: New → Contacted → Closed

Billing / Credits
  ├─ Personal plan + Personal credit ledger
  ├─ Team plan + Team shared credit ledger
  └─ Order / subscription / payment / refund audit

Lifecycle / Compliance
  ├─ account cancellation / retention / legal hold
  ├─ consent / policy version
  └─ audit / report / Jeepwork operations
```

The first implementation must not make a public page read mutable draft data, make Visitor AI read arbitrary backend state, approximate Lead ownership with `claimedBy` or `Profile.userId`, or make all subscriptions and credits directly User-owned.

## 5. Canonical Route and API Contract

### Canonical routes

```text
/console
/jeepwork
/{username}
```

Compatibility routes may redirect or remain historical, but they cannot become a second internal product surface.

### New API namespace design

New contracts are organized by canonical bounded context:

```text
/api/console/**       authenticated Personal / Team console operations
/api/public/**        Published Page / Published Facts / visitor-safe reads
/api/jeepwork/**      platform operations, moderation, sales, audit, activation
```

Exact endpoint names, request schemas, response schemas, authorization rules, idempotency keys, and acceptance mappings must be defined per vertical slice before implementation. The namespaces above are engineering boundaries; they do not add product capabilities beyond CURRENT authority.

## 6. First Vertical Slice

The only first construction slice is:

```text
Registration / authenticated Personal context
  → Personal Page
  → Draft
  → Editor
  → Preview
  → Publish
  → Published Version / Published Facts / Published pointer
  → Public Page
```

### Contract mapping

```text
Page IDs:
AUTH-02, ONB-01, CON-01, CON-02, EDT-01, PRE-01, PUB-01

Interaction IDs:
IF-01, IF-02

Acceptance IDs:
AT-AUTH-001, AT-AUTH-002, AT-AUTH-003, AT-AUTH-004, AT-AUTH-006
AT-ONB-001, AT-ONB-003, AT-ONB-004, AT-ONB-005, AT-ONB-006
AT-CON-001, AT-CON-005, AT-CON-006
AT-PAGE-001, AT-PAGE-003, AT-PAGE-005
AT-PUB-001, AT-PUB-002, AT-PUB-003, AT-PUB-004, AT-PUB-005,
AT-PUB-006, AT-PUB-007, AT-PUB-008, AT-PUB-010
AT-PUBLIC-001, AT-PUBLIC-010
AT-UI-001, AT-A11Y-001
```

The slice must prove, with real persistence and authorization, that:

1. registration atomically reserves `username` and retains user input on failure;
2. a new account has one Personal Page and one editable Draft context;
3. Editor and Preview read Draft, while Public Page reads only Published Facts;
4. Publish creates a complete version and atomically switches the Published pointer;
5. a Publish failure retains Draft and keeps the previous Published version public;
6. the initial public page has a real canonical URL and safe empty / error states.

Visitor AI is deliberately excluded from this first slice. Its next slice depends on the Published Facts boundary being verified first.

## 7. Subsequent Vertical Slice Order

```text
1. Personal → Page → Draft → Preview → Publish → Public
2. Visitor AI → Published Facts → visitor inquiry → Lead → routing → handoff
3. Team → Member → Member Page → Team Lead ownership → permissions
4. Personal billing → Team billing → AI credits → orders → subscription
5. account lifecycle → Team lifecycle → retention → legal hold → Jeepwork → Production Gate validation
```

Every slice is contract-first and test-first: select OD / IF / AT IDs, write the failing acceptance or domain test, implement the smallest compliant behavior, run relevant tests, then run the repository verification gates.

## 8. Database Strategy

```text
DB-1 legacy database:
LEGACY AUDIT ONLY

business data migration:
NOT REQUIRED

legacy DB modified:
NO

legacy DB schema modified:
NO

new rebuild development DB:
NOT CREATED
```

When a clean rebuild database is later authorized, it must have a different database name, be explicitly rebuild-only, safe to reset, free of production credentials, and contain no legacy data. It must not point migrations at `link168_ui_audit`.

No `.env.local`, `DATABASE_URL`, password, API key, token, payment credential, email credential, or AI provider secret is copied, printed, committed, or included in this baseline.

## 9. Verification Gates

### Completed for baseline initialization

```text
repository reality:
PASS

branch / parent SHA:
PASS

working tree before baseline:
CLEAN

Node:
v22.23.1

npm:
10.9.8

Next.js:
16.2.11

TypeScript:
6.0.3

Prisma:
7.9.0

CURRENT checksum:
24/24 PASS

OD / IF / Acceptance uniqueness:
58 / 20 / 234 unique

PDF reference inspection:
PASS
```

### Required for every implementation change

```text
npx prisma validate
npx prisma generate
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test -- --runInBand
npm.cmd run build
git diff --check
```

Browser Golden Path, real database isolation, provider success / safe failure, mobile widths 360 / 375 / 390 / 430 / 1440, keyboard / accessibility, and China Production Compliance Gate are separate evidence gates. Build or unit tests alone cannot mark Feature Complete or Production Ready.

## 10. Baseline Scope Verification

```text
legacy DB modified:
NO

legacy DB schema modified:
NO

business data migrated:
NO

historical branches merged:
NO

extra worktree created:
NO

extra arbitrary branches created:
NO

new rebuild dev DB created:
NO

secrets exposed:
NO

feature implementation started:
NO
```

## 11. Construction Stop Condition

```text
CURRENT AUTHORITY:
FROZEN / VERIFIED

LEGACY:
BOUNDED

DATABASE:
CLASSIFIED; DB-1 UNTOUCHED

REBUILD BASELINE:
ESTABLISHED

CONSTRUCTION BRANCH:
ONE

PRIMARY CURRENT WORKTREE:
ONE

FIRST VERTICAL SLICE:
DEFINED WITH OD / IF / AT MAPPING

FEATURE IMPLEMENTATION:
READY TO START
```

This baseline initialization ends here. The next action requires a separate, explicitly scoped implementation task for the first vertical slice; this document does not authorize automatic Page, Visitor AI, Lead, Team, Billing, lifecycle, or Production deployment work.
