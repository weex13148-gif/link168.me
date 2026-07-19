# Link168 Phase 1 Identity, Profile and Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将注册、邮箱验证、登录、密码重置、主页发布、公开访问和头像媒体收口为一条权限一致、令牌原子消费、默认不公开、资源稳定可追踪的基础链路。

**Architecture:** Phase 1 在现有 Next.js App Router 和 Prisma 数据模型上采用领域规则 + Prisma 适配器的绞杀式迁移。纯规则位于 `src/domains`，数据库和本地存储实现位于 `src/infrastructure`，现有 Route 只做协议解析和调用；旧字段保留兼容读取，但新写入只有一个权威入口。

**Tech Stack:** Next.js App Router、TypeScript、Prisma 7、PostgreSQL 16、Redis 7、Jest、GitHub Actions、Node.js 22、npm lockfile v3。

## Global Constraints

- 唯一长期重构分支：`refactor/link168-modular-monolith-r1`。
- Phase 1 起始基线：`fd9e65703e3094345497ca6879e0972d22eade92`。
- 不直接修改 `master`，不 force push，不连接生产服务器、生产数据库或真实外部服务。
- 不删除 `/showcase` 和 `/jeepwork`；`/jeepwork` 仍只允许 `super_admin`。
- 新注册主页必须默认 `isPublic = false`，邮箱未验证时不得发布或暴露公开资源。
- 账号状态、邮箱验证和限制状态必须共同决定能力，页面、API 和元数据不得各自解释规则。
- 邮箱验证和密码重置令牌必须在单个数据库事务中原子消费。
- 媒体新写入必须使用 `MediaAsset`；禁止通过遍历目录寻找当前头像。
- 头像生命周期只允许 `uploading → pending_review|approved|rejected → deleted`。
- 功能开关默认关闭；新旧写入不得同时启用。
- 所有生产代码先写失败测试；每个任务独立 PR、完整 CI、复核后合并。
- Node.js 固定 22.x；CI 使用 PostgreSQL 16 与 Redis 7。
- Phase 0 的 5 个 npm 中等风险和 Turbopack NFT warning 保持可见，不使用破坏性自动升级掩盖。

---

## File Map

**Create**

- `src/domains/identity/account-capabilities.ts`
- `src/domains/identity/credential-consumption.ts`
- `src/domains/profile/public-profile-access.ts`
- `src/domains/media/media-asset.ts`
- `src/infrastructure/identity/prisma-credential-consumption.ts`
- `src/infrastructure/profile/prisma-public-profile-access.ts`
- `src/infrastructure/media/local-media-storage.ts`
- `src/infrastructure/media/prisma-media-assets.ts`
- `scripts/refactor/backfill-avatar-media-assets.mjs`
- `tests/refactor/phase1/account-capabilities.test.ts`
- `tests/refactor/phase1/auth-capabilities-integration.test.ts`
- `tests/refactor/phase1/jeepwork-capabilities.test.ts`
- `tests/refactor/phase1/credential-consumption.test.ts`
- `tests/refactor/phase1/private-publishing.test.ts`
- `tests/refactor/phase1/public-profile-access.test.ts`
- `tests/refactor/phase1/public-resource-guards.test.ts`
- `tests/refactor/phase1/media-asset.test.ts`
- `tests/refactor/phase1/avatar-pipeline.test.ts`
- `tests/refactor/phase1/avatar-backfill.test.ts`
- `tests/refactor/phase1/phase1-verification.test.ts`
- `docs/superpowers/reports/2026-07-19-phase-1-verification.json`
- `docs/superpowers/reports/2026-07-19-phase-1-final-gate.md`
- `prisma/migrations/20260719090000_profile_private_by_default/migration.sql`
- `prisma/migrations/20260719091000_media_assets/migration.sql`

**Modify**

- `prisma/schema.prisma`
- `docs/superpowers/reports/2026-07-19-schema-baseline.json`
- `src/lib/auth.ts`
- `src/lib/jeepwork-auth.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/verify-email/confirm/route.ts`
- `src/app/api/auth/reset-password/route.ts`
- `src/app/api/dashboard/route.ts`
- `src/app/api/dashboard/profile/route.ts`
- `src/app/[username]/page.tsx`
- `src/app/go/[linkId]/route.ts`
- `src/app/api/dashboard/avatar/route.ts`
- `src/app/api/avatar/[username]/route.ts`
- `src/components/dashboard-v1/DashboardV1Client.tsx`
- `src/components/dashboard-v1/core-store.ts`
- `src/components/dashboard-v1/dashboard-api.ts`
- `src/components/dashboard-v1/types.ts`
- `.github/workflows/mvp-closeout.yml`
- `package.json`, `package-lock.json`

---

### Task 1: Define the Single Account Capability Model

**Files:**
- Create: `src/domains/identity/account-capabilities.ts`
- Create: `tests/refactor/phase1/account-capabilities.test.ts`

**Interfaces:**

```ts
export type AccountCapabilityInput = Readonly<{
  accountStatus: string;
  emailVerified: boolean;
  role: string;
  restrictionTypes: readonly string[];
}>;

export type AccountCapabilities = Readonly<{
  canLogin: boolean;
  canEnterDashboard: boolean;
  canModifySensitiveData: boolean;
  canPublishProfile: boolean;
  canExposePublicResources: boolean;
  canEnterJeepwork: boolean;
  blockedBy: string | null;
}>;

export function evaluateAccountCapabilities(input: AccountCapabilityInput): AccountCapabilities;
```

Rules in exact priority order:

```text
accountStatus !== active       → every capability false, blockedBy ACCOUNT_INACTIVE
BANNED                          → every capability false, blockedBy BANNED
SECURITY_RISK                   → every capability false, blockedBy SECURITY_RISK
ADMIN_FREEZE                    → login/dashboard true; sensitive/publish/public/Jeepwork false
emailVerified === false         → login/dashboard true; sensitive/publish/public/Jeepwork false
role !== super_admin            → canEnterJeepwork false
otherwise                       → all ordinary capabilities true; Jeepwork true only for super_admin
```

- [ ] **Step 1: Write RED tests** covering active verified user, unverified user, admin freeze, banned/security risk, deactivated account, verified super-admin and unverified super-admin.
- [ ] **Step 2: Run** `npm test -- tests/refactor/phase1/account-capabilities.test.ts --runInBand`.
  Expected: FAIL because the module does not exist.
- [ ] **Step 3: Implement the exact pure evaluator** with frozen return objects and no Prisma, Next.js, logging or environment access.
- [ ] **Step 4: Run targeted test, `npm run check:boundaries`, `npm run typecheck`**; all must return 0.
- [ ] **Step 5: Commit** `feat(identity): add unified account capabilities`.

---

### Task 2: Apply Capabilities to Sessions, Login and Dashboard Guards

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/app/api/auth/login/route.ts`
- Modify: `src/app/api/dashboard/route.ts`
- Create: `tests/refactor/phase1/auth-capabilities-integration.test.ts`

**Interfaces:**

```ts
export type CurrentUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  role: string;
  accountStatus: string;
};

export async function getAccountCapabilitiesForUser(
  user: Pick<CurrentUser, "id" | "emailVerified" | "role" | "accountStatus">,
): Promise<AccountCapabilities>;
```

`getCurrentUserByToken()` must select `accountStatus`; an inactive account returns `null` and its session is no longer accepted. `requireAuthenticatedUser`, `requireDashboardUser` and `requireActiveUser` remain compatibility adapters but delegate decisions to `evaluateAccountCapabilities`.

- [ ] **Step 1: Write RED integration tests** proving a deactivated session is rejected, unverified account may enter dashboard, unverified account fails `requireActiveUser`, ADMIN_FREEZE may enter dashboard but cannot publish, and login uses the same capability result.
- [ ] **Step 2: Run** `npm test -- tests/refactor/phase1/auth-capabilities-integration.test.ts --runInBand`.
  Expected: FAIL because `CurrentUser` lacks `accountStatus` and guards use split rules.
- [ ] **Step 3: Modify session selection and compatibility guards**. Do not remove exported legacy constants in this task.
- [ ] **Step 4: Replace login route's separate deactivated/restriction decisions** with one capability result while preserving stable public error codes: `ACCOUNT_DEACTIVATED`, `ACCOUNT_BANNED`, `SECURITY_RESTRICTED`.
- [ ] **Step 5: Return `capabilities` from `/api/dashboard`** so UI can disable publish actions without reconstructing policy.
- [ ] **Step 6: Run targeted tests plus full `npm test -- --runInBand`, typecheck, lint and build**.
- [ ] **Step 7: Commit** `refactor(identity): use one capability policy for user access`.

---

### Task 3: Apply the Same Capabilities to Jeepwork

**Files:**
- Modify: `src/lib/jeepwork-auth.ts`
- Modify: `src/lib/admin-auth.ts`
- Create: `tests/refactor/phase1/jeepwork-capabilities.test.ts`

**Required behavior:**

```text
role != super_admin       → reject
accountStatus != active   → reject
BANNED/SECURITY_RISK      → reject
ADMIN_FREEZE              → reject
email unverified          → reject
restriction query failure → fail closed with 503 at login and null session at page/API reads
```

- [ ] **Step 1: Write RED tests** for deactivated, unverified, ADMIN_FREEZE and active verified super-admin sessions and login.
- [ ] **Step 2: Run** `npm test -- tests/refactor/phase1/jeepwork-capabilities.test.ts --runInBand`.
- [ ] **Step 3: Extend Jeepwork user selects** to include `accountStatus` and `emailVerified`, query active restrictions, and call the shared evaluator.
- [ ] **Step 4: Ensure `getJeepworkSessionUser`, page helpers and login handler fail closed** without exposing restriction details.
- [ ] **Step 5: Run targeted and full gates**.
- [ ] **Step 6: Commit** `fix(jeepwork): enforce unified account capabilities`.

---

### Task 4: Atomically Consume Email and Password Tokens

**Files:**
- Create: `src/domains/identity/credential-consumption.ts`
- Create: `src/infrastructure/identity/prisma-credential-consumption.ts`
- Modify: `src/app/api/auth/verify-email/confirm/route.ts`
- Modify: `src/app/api/auth/reset-password/route.ts`
- Modify: `src/lib/auth.ts`
- Create: `tests/refactor/phase1/credential-consumption.test.ts`

**Interfaces:**

```ts
export type CredentialConsumeFailure =
  | "INVALID_OR_EXPIRED"
  | "ACCOUNT_MISMATCH"
  | "ACCOUNT_INACTIVE";

export type CredentialConsumeResult =
  | { ok: true; userId: string }
  | { ok: false; reason: CredentialConsumeFailure };

export async function consumeEmailVerificationCredential(input: {
  credential: string;
  expectedUserId: string | null;
  now?: Date;
}): Promise<CredentialConsumeResult>;

export async function consumePasswordResetCredential(input: {
  token: string;
  passwordHash: string;
  now?: Date;
}): Promise<CredentialConsumeResult>;
```

Email transaction must use a conditional token update (`used=false`, `expiresAt>now`) as the claim, then set `emailVerified=true`, clear only active `EMAIL_UNVERIFIED`, clear legacy `FROZEN_EMAIL_UNVERIFIED*`, and preserve all other restrictions. Password transaction must claim one unused/unexpired token, update password, delete every session for that user, and invalidate remaining unused reset tokens.

- [ ] **Step 1: Write RED tests** with concurrent `Promise.all` calls proving exactly one succeeds for each token type and the loser returns `INVALID_OR_EXPIRED`.
- [ ] **Step 2: Run targeted test against PostgreSQL 16**; expected FAIL from current validate-then-consume window.
- [ ] **Step 3: Implement Prisma transaction adapters**; the pure domain file contains only result types and public contracts.
- [ ] **Step 4: Replace confirm/reset routes** so no route calls separate validate and consume functions.
- [ ] **Step 5: Keep old exported helpers only as deprecated wrappers if existing tests import them; wrappers must call the atomic adapter rather than recreate split state.**
- [ ] **Step 6: Run targeted test twice, full Jest, typecheck, lint and build.**
- [ ] **Step 7: Commit** `fix(identity): consume verification credentials atomically`.

---

### Task 5: Make Profiles Private by Default and Separate Editing from Publishing

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260719090000_profile_private_by_default/migration.sql`
- Modify: `src/app/api/auth/register/route.ts`
- Modify: `src/app/api/dashboard/profile/route.ts`
- Modify: `src/components/dashboard-v1/DashboardV1Client.tsx`
- Modify: `src/components/dashboard-v1/types.ts`
- Modify: `docs/superpowers/reports/2026-07-19-schema-baseline.json`
- Create: `tests/refactor/phase1/private-publishing.test.ts`

**Migration SQL:**

```sql
ALTER TABLE "profiles" ALTER COLUMN "is_public" SET DEFAULT false;
```

No bulk rewrite of existing profiles occurs in the migration. New registrations and newly upserted profiles explicitly write `false`.

**Route behavior:**

```text
ordinary profile edits      → requireDashboardUser
isPublic false              → requireDashboardUser
isPublic true               → require capability canPublishProfile
username change             → existing sensitive guard remains
```

- [ ] **Step 1: Write RED tests** proving Prisma default false, registration writes false, profile upsert fallback false, unverified users can edit display name/bio but cannot set `isPublic:true`, verified users can publish, and UI fallback is not public.
- [ ] **Step 2: Run targeted test**; expected failures on current `true` defaults and all-or-nothing `requireActiveUser`.
- [ ] **Step 3: Apply migration and route split**; preserve existing data and username rules.
- [ ] **Step 4: Update dashboard response/types** to expose capabilities and disable publication with an explicit verification message.
- [ ] **Step 5: Replace 30-day copy** with `邮箱验证完成前，主页保持未发布；你仍可继续编辑资料。`
- [ ] **Step 6: Regenerate schema fingerprint using `node scripts/refactor/schema-fingerprint.mjs`, verify with `--check`, run migration on clean PostgreSQL 16 and full gates.**
- [ ] **Step 7: Commit** `fix(profile): keep new pages private until verified`.

---

### Task 6: Create One Public Profile Access Decision

**Files:**
- Create: `src/domains/profile/public-profile-access.ts`
- Create: `src/infrastructure/profile/prisma-public-profile-access.ts`
- Modify: `src/app/[username]/page.tsx`
- Create: `tests/refactor/phase1/public-profile-access.test.ts`

**Interfaces:**

```ts
export type PublicProfileAccessState =
  | "PUBLIC"
  | "NOT_PUBLISHED"
  | "EMAIL_UNVERIFIED"
  | "ACCOUNT_INACTIVE"
  | "ADMIN_FROZEN"
  | "SECURITY_RESTRICTED"
  | "BANNED"
  | "UNAVAILABLE";

export function decidePublicProfileAccess(input: {
  isPublic: boolean;
  capabilities: AccountCapabilities;
  restrictionTypes: readonly string[];
}): PublicProfileAccessState;

export async function loadPublicProfileAccess(userId: string, isPublic: boolean): Promise<{
  state: PublicProfileAccessState;
  capabilities: AccountCapabilities;
}>;
```

Metadata and page rendering must call the same adapter. `UNAVAILABLE` is fail-closed and produces non-indexable metadata. No request-time mutation such as creating a freeze record is allowed in the public GET path.

- [ ] **Step 1: Write RED matrix tests** for every state and source assertions proving metadata/page both import the adapter and no longer call `syncEmailVerificationRestriction`.
- [ ] **Step 2: Run targeted test**.
- [ ] **Step 3: Implement pure decision and Prisma loader** selecting accountStatus/emailVerified/role and active restrictions.
- [ ] **Step 4: Refactor `[username]/page.tsx`** while preserving username current/reserved/redirect behavior and existing state components.
- [ ] **Step 5: Verify page and metadata decisions match for every state; run full gates.**
- [ ] **Step 6: Commit** `refactor(profile): centralize public profile access`.

---

### Task 7: Guard Every Secondary Public Resource

**Files:**
- Modify: `src/app/go/[linkId]/route.ts`
- Modify: `src/app/api/avatar/[username]/route.ts`
- Create: `tests/refactor/phase1/public-resource-guards.test.ts`

**Required behavior:**

```text
/go/<link>:
  active link + PUBLIC profile access → record click and redirect
  every other state                  → redirect to / without recording

/api/avatar/<username>:
  PUBLIC profile access + approved asset/status → image
  authenticated owner preview                  → image even if profile private, but not if asset rejected/deleted
  every other visitor state                    → 404 or 403 without filesystem scan
```

- [ ] **Step 1: Write RED tests** proving `/go` does not count private/unverified/deactivated/frozen profiles and avatar route imports the access adapter.
- [ ] **Step 2: Run targeted test**; current `/go` must fail because it checks only link activity.
- [ ] **Step 3: Add public access guard before analytics writes** and use safe URL validation before redirect.
- [ ] **Step 4: Add owner-preview authorization helper to avatar route**; MediaAsset direct lookup is completed in Task 9, so this task may retain existing file resolution behind the new authorization boundary only.
- [ ] **Step 5: Run targeted and full gates.**
- [ ] **Step 6: Commit** `fix(profile): guard public links and avatar access`.

---

### Task 8: Add the MediaAsset Domain and Persistent Model

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260719091000_media_assets/migration.sql`
- Create: `src/domains/media/media-asset.ts`
- Create: `src/infrastructure/media/local-media-storage.ts`
- Create: `src/infrastructure/media/prisma-media-assets.ts`
- Modify: `docs/superpowers/reports/2026-07-19-schema-baseline.json`
- Create: `tests/refactor/phase1/media-asset.test.ts`

**Prisma fields:**

```prisma
model MediaAsset {
  id                 String    @id @default(uuid()) @db.Uuid
  ownerUserId        String    @map("owner_user_id") @db.Uuid
  profileId          String?   @map("profile_id") @db.Uuid
  purpose            String
  storageProvider    String    @default("local") @map("storage_provider")
  objectKey          String    @unique @map("object_key")
  mimeType           String    @map("mime_type")
  sizeBytes          Int       @map("size_bytes")
  moderationStatus   String    @default("uploading") @map("moderation_status")
  moderationProvider String?   @map("moderation_provider")
  moderationReason   String?   @map("moderation_reason")
  approvedAt         DateTime? @map("approved_at") @db.Timestamptz(6)
  deletedAt          DateTime? @map("deleted_at") @db.Timestamptz(6)
  createdAt          DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt          DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  owner              User      @relation("MediaAssetOwner", fields: [ownerUserId], references: [id], onDelete: Restrict)
  profile            Profile?  @relation("ProfileMediaAssets", fields: [profileId], references: [id], onDelete: SetNull)
  avatarForProfile   Profile?  @relation("ProfileAvatarAsset")

  @@index([ownerUserId, purpose, createdAt])
  @@index([profileId, moderationStatus])
  @@map("media_assets")
}
```

Add `User.mediaAssets`, `Profile.mediaAssets`, `Profile.avatarAssetId @unique` and `Profile.avatarAsset`. Keep `avatarUrl` and `avatarModerationStatus` as compatibility read fields during Phase 1.

**Domain interfaces:**

```ts
export type MediaModerationStatus = "uploading" | "pending_review" | "approved" | "rejected" | "deleted";
export function canExposeMedia(status: MediaModerationStatus): boolean;
export function assertMediaTransition(from: MediaModerationStatus, to: MediaModerationStatus): void;
```

**Storage interface:**

```ts
export interface MediaStorage {
  put(input: { objectKey: string; data: Buffer }): Promise<void>;
  read(objectKey: string): Promise<Buffer>;
  delete(objectKey: string): Promise<"deleted" | "not_found">;
}
```

`LocalMediaStorage` resolves only keys under `avatars/<profileId>/...` and rejects traversal.

- [ ] **Step 1: Write RED domain/storage/repository tests** including invalid transitions, traversal rejection, exact-key read/delete and ownership isolation.
- [ ] **Step 2: Run targeted tests**.
- [ ] **Step 3: Add Prisma model/migration and adapters** with no route integration yet.
- [ ] **Step 4: Generate and verify schema fingerprint; migrate clean PostgreSQL 16.**
- [ ] **Step 5: Run full gates.**
- [ ] **Step 6: Commit** `feat(media): add persistent media asset lifecycle`.

---

### Task 9: Move Avatar Upload, Read and Delete to MediaAsset

**Files:**
- Modify: `src/app/api/dashboard/avatar/route.ts`
- Modify: `src/app/api/avatar/[username]/route.ts`
- Modify: `src/components/dashboard-v1/core-store.ts`
- Modify: `src/components/dashboard-v1/dashboard-api.ts`
- Modify: `src/components/dashboard-v1/types.ts`
- Create: `tests/refactor/phase1/avatar-pipeline.test.ts`

**POST workflow:**

```text
validate declared and detected type
create MediaAsset(uploading)
write exact objectKey
moderate
rejected → mark rejected, delete object, return 400
approved/pending → update asset state, atomically assign Profile.avatarAssetId
replace previous assigned asset only after new assignment succeeds
return truthful moderationStatus and publicEffective boolean
```

**DELETE workflow:**

```text
load owned assigned asset
clear Profile.avatarAssetId in transaction
delete exact objectKey
success/not_found → mark deleted
storage failure → restore assignment or return 500; never claim deleted
```

**GET workflow:** direct `avatarAsset.objectKey` lookup only. Delete `findAvatarFile()` and all `readdir/stat` recursive discovery from the request path.

**Client rules:** allow source images up to 10MB, compress first to 512×512 JPEG, then reject if the compressed file exceeds the server avatar limit. Success copy:

```text
approved       → 头像已更新。
pending_review → 头像已上传，审核通过后将在公开主页生效。
```

- [ ] **Step 1: Write RED tests** proving no recursive scan imports, exact MediaAsset lookup, truthful pending response, rejected cleanup, failed deletion truthfulness, source >2MB compression path and compressed-size enforcement.
- [ ] **Step 2: Run targeted tests**.
- [ ] **Step 3: Implement route pipeline using Task 8 adapters** and preserve cache revalidation only after assignment changes.
- [ ] **Step 4: Update client API/result types and copy.**
- [ ] **Step 5: Run media tests, full Jest, typecheck, lint, build and diff check.**
- [ ] **Step 6: Commit** `refactor(media): serve avatars from stable media assets`.

---

### Task 10: Provide a Deterministic Legacy Avatar Backfill

**Files:**
- Create: `scripts/refactor/backfill-avatar-media-assets.mjs`
- Create: `tests/refactor/phase1/avatar-backfill.test.ts`
- Modify: `package.json`, `package-lock.json`

**Command:**

```json
{
  "backfill:avatar-assets": "node scripts/refactor/backfill-avatar-media-assets.mjs"
}
```

Default is dry-run. `--apply` is required for writes; `--database-url` is forbidden so the script only uses the already scoped `DATABASE_URL`. The script:

```text
select profiles where avatarUrl is not null and avatarAssetId is null
for each profile, find only files matching <normalizedUsername>-<profileId>-* under configured avatar root
0 matches  → record missing
1 match    → create approved legacy MediaAsset and assign
>1 matches → choose newest mtime, record duplicates, assign newest
remote URL → record external_skipped
write JSON summary; never delete files
```

- [ ] **Step 1: Write RED tests** using a temporary upload root and non-production PostgreSQL fixture.
- [ ] **Step 2: Run targeted test.**
- [ ] **Step 3: Implement dry-run/apply modes, idempotency and summary fields** `scanned`, `wouldCreate`, `created`, `missing`, `duplicates`, `externalSkipped`, `errors`.
- [ ] **Step 4: Run dry-run twice and apply twice in CI fixture; second apply must create zero rows.**
- [ ] **Step 5: Run full gates.**
- [ ] **Step 6: Commit** `build(media): add idempotent legacy avatar backfill`.

---

### Task 11: Verify the Complete Phase 1 Chain and Record the Gate

**Files:**
- Create: `tests/refactor/phase1/phase1-verification.test.ts`
- Modify: `.github/workflows/mvp-closeout.yml`
- Create runtime report: `docs/superpowers/reports/2026-07-19-phase-1-verification.json`
- Create final record: `docs/superpowers/reports/2026-07-19-phase-1-final-gate.md`

**Required scenario:**

```text
register → profile private
unverified login → dashboard allowed
unverified edit → allowed
unverified publish/public page/avatar/go → denied
email credential → exactly one atomic success
verified publish → allowed
public page/avatar/go → allowed
admin freeze/deactivation → all public resources denied
password reset credential → exactly one success and every old session revoked
avatar upload pending/approved/rejected/delete → truthful state and exact object lifecycle
```

**Required commands in order:**

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

- [ ] **Step 1: Add scenario-level RED tests** before any missing integration is patched.
- [ ] **Step 2: Resolve only defects exposed by the scenario; do not add Phase 2 dashboard/catalog work.**
- [ ] **Step 3: Run the full ordered gate in a clean checkout with PostgreSQL 16 and Redis 7.**
- [ ] **Step 4: Write JSON report with exact SHA, Node/npm versions, command exit codes, suite/test counts and warning summary.**
- [ ] **Step 5: Create final gate PR containing only the report after all implementation PRs have merged.**
- [ ] **Step 6: Require green `Link168 Refactor Gate`, review the final diff, merge and record final SHA.**

Final status format:

```text
PHASE=1
STATUS=READY_FOR_NEXT_PHASE
FINAL_SHA=<exact green merge SHA>
WORKFLOW=Link168 Refactor Gate
PRODUCTION_CHANGES=none
USER_VISIBLE_BEHAVIOR_CHANGES=private-by-default and truthful media states in the refactor branch only
NEXT_PLAN=docs/superpowers/plans/2026-07-19-link168-phase-2-catalog-dashboard-public-renderer.md
```

Only after this gate may Phase 2 be planned against the actual green tree.