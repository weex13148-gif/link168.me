# Profile 发布状态机与统一公开访问策略：精确实施计划

## 1. 目标、范围与基线

本计划把名片的“保存资料”和“改变公开状态”拆成两个服务端边界：常规资料保存永远不能写入 `isPublic`，仅发布/下线命令可改变公开状态。所有个人公开页、Workspace 员工公开页、自定义域名承载的同一路由，以及公开 API，必须经同一个安全解析器决定可见性。

实施前基线：分支 `codex/link168-product-reset-baseline-20260727`，提交 `e79bfd0f0655475c3b76e1c9c7804351c294acbe`。本计划不授权对既有未提交业务差异作提交、清理或合并。

技术约束：Next.js App Router、TypeScript、Prisma 7 + `@prisma/adapter-pg`、PostgreSQL、Jest。所有数据库写操作使用 `db.$transaction(async (tx) => ...)`；不连接生产库，不在本批执行迁移或生成 Prisma Client。

## 2. 已验证的设计前提

| 项目 | 仓库证据与结论 | 实施决定 |
| --- | --- | --- |
| `Profile.id` | `prisma/schema.prisma`：`String @id @db.Uuid` | 参数是 PostgreSQL UUID。 |
| `User.id` | 同文件：`String @id @db.Uuid` | 命令外键使用 UUID。 |
| Profile 表与用户列 | `@@map("profiles")`、`userId @map("user_id") @db.Uuid` | SQL 使用 `"profiles"`、`"user_id"`。 |
| 现有发布字段 | `isPublic @map("is_public")`、`firstPublishedAt @map("first_published_at") @db.Timestamptz(6)` | 保留字段；首次时间只由发布命令写入。 |
| ID 生成 | User/Profile 由应用侧 UUID 提供；部分新模型使用 `@default(uuid())` | 新命令主键采用数据库 UUID 默认值。 |
| Adapter 与原始 SQL | `src/lib/db.ts` 使用 `PrismaPg`；`src/lib/domains.ts` 已在事务中使用 `$queryRaw` 与 `FOR UPDATE` | 发布服务可在事务客户端上使用参数化 tagged-template SQL。 |
| 事务客户端 | `AuditDbClient` 从 `$transaction` 回调参数推导 | 发布服务定义同样的 `PublicationDbClient`，并把 `tx` 传入审计写入器。 |
| 幂等先例 | `AiCreditLedger.idempotencyKey @unique`，AI 代码处理唯一冲突 | 新建专用命令表；不把发布写入 AI 账本。 |
| 审计先例 | `AdminAuditLog` / `writeAdminAuditLog` 可接受事务客户端，且会脱敏元数据 | 复用该表和函数；补充发布动作常量。 |
| Jeepwork 隐藏 | `FreezeRecord` 已有 UUID、`type`、`source`、`isActive`、清除字段；`canShowPublicProfile` 已拒绝 `ADMIN_FREEZE` | 以有来源标识的 `FreezeRecord` 表示平台隐藏，不再改写用户的 `is_public`。 |
| 公开安全 DTO | `toProfileDto` 返回 phone、email、wechat、address 等 owner 字段 | 不可复用；新建公开解析器和最小白名单 DTO。 |
| Workspace 公开路径 | `src/app/%5F_w/[workspaceId]/p/[slug]/page.tsx` 通过 `requireWorkspacePublicRequestHost` 与 `resolveWorkspacePublicProfile` 解析 | 保留宿主机/域名证明流程，只替换可见性决策与 DTO 来源。 |

### SQL 类型规则

发布原子更新的实际形式是参数化 SQL，例如：

```sql
UPDATE "profiles"
SET "is_public" = TRUE,
    "first_published_at" = COALESCE("first_published_at", NOW()),
    "publication_history_status" = CASE
      WHEN "publication_history_status" = 'NEVER_PUBLISHED' THEN 'FIRST_PUBLISH_KNOWN'
      ELSE "publication_history_status"
    END
WHERE "id" = $1 AND "user_id" = $2 AND "is_public" = FALSE
RETURNING "id", "is_public", "first_published_at", "publication_history_status";
```

`$1`、`$2` 与 UUID 列比较时由 PostgreSQL 推断为 UUID，故不写 `::uuid`。这不是否定仓库中现存的显式转换，而是避免在本服务中增加不必要的类型断言。

## 3. 目标状态机与可见性契约

Profile 运行状态由 `is_public` 与限制共同决定：`PRIVATE`（false）、`PUBLIC`（true 且所有限制通过）、`PUBLIC_BLOCKED`（true 但邮箱验证、冻结、封禁或安全风险拒绝）。`PUBLIC_BLOCKED` 不把用户意图改回私有；解除限制后自动恢复可访问。

历史状态单独用枚举表示，避免把“首次发布时间为空”误判为从未发布：

```prisma
enum PublicationHistoryStatus {
  NEVER_PUBLISHED
  FIRST_PUBLISH_KNOWN
  LEGACY_HISTORY_UNKNOWN

  @@map("publication_history_status")
}
```

公开解析器的唯一成功条件是：存在 Profile、`isPublic === true`、owner `emailVerified === true`、`getActiveRestrictions(userId)` 经 `canShowPublicProfile` 允许、请求所属 Workspace/域名已被既有 host 证明允许。任一不满足时返回统一的 `not_found` 公共结果；页面为 404，公开 API 为既有资源不存在语义，不返回用户名、头像、姓名、bio 或限制原因。只有 Jeepwork 认证管理端可见具体阻断原因。

## 4. 文件地图

计划中新建的业务文件：`src/lib/profile-publication-service.ts`、`src/lib/public-profile-resolver.ts`、`src/app/api/dashboard/profile/publish/route.ts`、`src/app/api/dashboard/profile/unpublish/route.ts`、`prisma/migrations/202607270002_profile_publication_state/migration.sql`、`scripts/backfill-profile-publication-history.ts`，以及各任务列出的测试。现有文件仅在其所属任务中修改。不得触碰 `sites/`、`.superpowers/`、现有未提交生成物、任何环境文件。

## 5. Task 1 — Schema、迁移与历史数据安全落地

**修改路径。** 修改 `prisma/schema.prisma` 的 `User`、`Profile` 关系及字段；新建上述 migration 和 `scripts/backfill-profile-publication-history.ts`；新建 `tests/profile-publication-schema.test.ts`。禁止修改既有 `202607270001_profile_first_publish`、`is_public`、`first_published_at` 的历史数据或任何业务路由。

**精确 Schema 草案。** `Profile` 加 `publicationHistoryStatus PublicationHistoryStatus? @map("publication_history_status")` 和 `publicationCommands ProfilePublicationCommand[]`；`User` 加 `publicationCommands ProfilePublicationCommand[]`。新模型为：

```prisma
model ProfilePublicationCommand {
  id                       String   @id @default(uuid()) @db.Uuid
  profileId                String   @map("profile_id") @db.Uuid
  userId                   String   @map("user_id") @db.Uuid
  action                   String   @db.VarChar(16)
  idempotencyKey           String   @map("idempotency_key") @db.VarChar(128)
  requestHash              String   @map("request_hash") @db.Char(64)
  state                    String   @default("processing") @db.VarChar(16)
  resultIsPublic           Boolean? @map("result_is_public")
  firstPublishedAtSnapshot DateTime? @map("first_published_at_snapshot") @db.Timestamptz(6)
  completedAt              DateTime? @map("completed_at") @db.Timestamptz(6)
  createdAt                DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  profile                  Profile  @relation(fields: [profileId], references: [id], onDelete: Cascade)
  user                     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([profileId, idempotencyKey], map: "profile_publication_commands_profile_id_idempotency_key_key")
  @@index([userId, createdAt])
  @@index([profileId, action, completedAt])
  @@map("profile_publication_commands")
}
```

唯一约束刻意不含 `action`：同一 profile 的同一 key 绝不可被 publish 与 unpublish 共用。`requestHash` 为 `action + "\n" + canonical request body` 的 SHA-256 hex；相同 key、不同 hash 返回 409 `IDEMPOTENCY_KEY_REUSED`。

**迁移分期。** 第一 migration 只创建 enum、可空 `publication_history_status` 和命令表/索引；不更新任一既有 Profile。首版代码将新创建 Profile 明确设为 `NEVER_PUBLISHED`，对空值按 `LEGACY_HISTORY_UNKNOWN` 读取。部署后脚本先用 `--dry-run` 只输出空值总数、每批 ID 范围和拟更新数；实际运行使用 `--limit 500 --after-id <UUID>`，按 `id` 稳定排序，只更新本批空值为 `LEGACY_HISTORY_UNKNOWN`，每批输出 JSON 计数和续跑游标。完成后以只读计数确认空值为零，再在单独 migration 设置默认 `NEVER_PUBLISHED` 与 `NOT NULL`。绝不由回填写 `is_public` 或填充 `first_published_at`。

**先失败测试。** `tests/profile-publication-schema.test.ts`：`publication schema maps UUID command foreign keys and leaves legacy history nullable`; mock：无；数据库：临时 PostgreSQL 测试库；seed：一条 `is_public=true, first_published_at=null` 的历史 Profile；动作：应用第一 migration；预期失败原因（实现前）：enum、字段及命令表不存在；通过条件：历史行仍有原 `is_public` 与空首次时间，状态列仍可空，命令表的 profile/key 唯一约束存在。命令：`npm test -- --runInBand tests/profile-publication-schema.test.ts`。

**执行与提交。** 最小实现后运行该测试、`npx prisma validate`、`npx prisma generate`、`npm run lint`、`npm run typecheck`。精确暂存：`git add prisma/schema.prisma prisma/migrations/202607270002_profile_publication_state/migration.sql scripts/backfill-profile-publication-history.ts tests/profile-publication-schema.test.ts`。提交：`feat(profile-publication): add publication state persistence`。回滚：仅回滚该提交；若 migration 已应用，先执行经审阅的反向 migration，绝不删除含命令历史的表。

## 6. Task 2 — 原子发布服务、幂等、审计与并发

**修改路径。** 新建 `src/lib/profile-publication-service.ts`、`tests/profile-publication-service.test.ts`、`tests/profile-publication-concurrency.integration.test.ts`；修改 `src/lib/admin-audit-log.ts` 仅增加发布/下线审计动作常量。禁止修改 dashboard route、组件、公开页面。

**算法。** 请求先校验 action 和 8–128 字符 ASCII `Idempotency-Key`，计算 hash。回调式事务采用 PostgreSQL 默认 `READ COMMITTED`：

1. 以 `(profile_id, idempotency_key)` 插入 `processing` 命令；唯一冲突时读取该命令并锁定该行。hash 不同则 409；同 hash 且 `completed` 则返回存储快照；同 hash 且 `processing` 的等待者在唯一索引释放后重新读取并获得已完成行。
2. 在同一事务内按 owner 读取 Profile 与 User，读取有效 FreezeRecord，并验证邮箱和公开资格；资格不通过时回滚命令创建并返回领域错误，不把拒绝写成可重放成功。
3. publish 使用第 2 节的单条 `UPDATE ... WHERE is_public=false RETURNING`；未命中表示已公开，读取行并返回成功，且不改变首次时间。unpublish 使用 `UPDATE "profiles" SET "is_public"=FALSE WHERE "id"=$1 AND "user_id"=$2 AND "is_public"=TRUE RETURNING ...`；未命中表示已下线，返回成功且保留首次时间。
4. 写 command 的结果快照、`state=completed`、`completed_at`；在相同 `tx` 调用 `writeAdminAuditLog`，metadata 仅含 action、profileId、状态、是否重放、命令 ID，不能含联系方式、请求头或 key。

同 key 的唯一索引和同 Profile 的 UPDATE 行锁分别序列化重试和相反动作；不使用 advisory lock，不提升全局事务隔离。数据库异常使整个事务回滚，故不会留下失败 command；参数、认证、资格拒绝同样不入命令表。超时后的相同请求会读到 completed 结果；同 key 不同请求明确冲突。

**先失败测试。**

- `publishes once and preserves the first timestamp on replay`：单元 mock Prisma transaction、raw update、审计写入；seed：私有 Profile；动作：相同 publish/key 两次；失败原因：服务不存在；通过：一次状态更新、两次均 200、同一首次时间、一个 completed command。
- `rejects a reused key whose request hash represents another action`：同 mock；seed：已完成 publish command；动作：unpublish 复用 key；通过：409、无 Profile 更新。
- `parallel publish and unpublish serialize to one valid final row`：真实临时 PostgreSQL，seed：可发布私有 Profile；动作：两个独立客户端并发不同 key；通过：两个 command completed、Profile 最终值等于最后获得行锁的动作、首次时间只会从 null 变为一个值。

命令分别为 `npm test -- --runInBand tests/profile-publication-service.test.ts` 与 `npm test -- --runInBand tests/profile-publication-concurrency.integration.test.ts`。完成后运行 `npm run lint`、`npm run typecheck`。精确暂存：`git add src/lib/profile-publication-service.ts src/lib/admin-audit-log.ts tests/profile-publication-service.test.ts tests/profile-publication-concurrency.integration.test.ts`。提交：`feat(profile-publication): add atomic idempotent commands`。回滚：仅回滚该提交；Task 1 schema 保留但没有调用者。

## 7. Task 3 — Dashboard 路由边界

**修改路径。** 修改 `src/app/api/dashboard/profile/route.ts`；新建 publish/unpublish route；新建 `tests/dashboard-profile-publication-routes.test.ts`。禁止修改前端、Prisma schema、Jeepwork。

常规 `PUT/PATCH /api/dashboard/profile` 从 request schema 删除 `isPublic`，若 body 出现该字段返回 400 `PUBLICATION_FIELD_FORBIDDEN`，并禁止在 upsert/updateData 写首次时间。`POST /api/dashboard/profile/publish` 与 `/unpublish` 只接受 idempotency header（无 body，或严格空对象），经认证后调用 Task 2。成功返回公开状态、首次时间和 `replayed`；资格不足返回不泄露限制细节的 409，未认证为 401。

**先失败测试。** `regular profile save rejects isPublic`; mock service 与 db；action：PUT `{isPublic:true}`；通过：400、service 未调用、Profile 未写。`publish route forwards one idempotency key`; action：POST header；通过：200 和精确 service 参数。`unpublish requires key`; 通过：400。命令：`npm test -- --runInBand tests/dashboard-profile-publication-routes.test.ts`。完成后 lint/typecheck。精确暂存：`git add src/app/api/dashboard/profile/route.ts src/app/api/dashboard/profile/publish/route.ts src/app/api/dashboard/profile/unpublish/route.ts tests/dashboard-profile-publication-routes.test.ts`。提交：`feat(api): isolate profile publication commands`。回滚：回滚此提交会恢复旧 route，故只允许在 Task 2 未被外部客户端依赖时执行。

## 8. Task 4 — Dashboard 与 Onboarding 客户端

**修改路径。** 修改 `src/components/dashboard-v1/dashboard-api.ts`、`core-store.ts`、`PublicationPanel.tsx`、`AppearancePanel.tsx`、`DashboardV1Client.tsx`、`src/components/onboarding/OnboardingWizard.tsx`；新建 `tests/publication-panel.test.tsx` 与 `tests/onboarding-publication.test.tsx`。禁止修改 server route 以外的后端、Schema、公开解析器。

保存外观资料不再携带 `isPublic`。面板发布/下线调用专用 POST，并为一次用户动作生成 UUID key；网络超时重试复用原 key，成功或终态错误后才生成新 key。Onboarding 不再向常规保存接口发送 `{isPublic:true}`，改调用 publish endpoint；资格拒绝显示可行动但不泄露后台限制名称的提示。

**先失败测试。** `PublicationPanel retries the same publish key after a timeout`：MSW/fetch mock，首次超时、第二次成功；通过：两请求 header 相同。`AppearancePanel save never sends isPublic`：通过：payload 无该键。`Onboarding publishes through the command endpoint`：通过：URL 与 method 正确。命令：`npm test -- --runInBand tests/publication-panel.test.tsx tests/onboarding-publication.test.tsx`。完成后 lint/typecheck。精确暂存：`git add src/components/dashboard-v1/dashboard-api.ts src/components/dashboard-v1/core-store.ts src/components/dashboard-v1/PublicationPanel.tsx src/components/dashboard-v1/AppearancePanel.tsx src/components/dashboard-v1/DashboardV1Client.tsx src/components/onboarding/OnboardingWizard.tsx tests/publication-panel.test.tsx tests/onboarding-publication.test.tsx`。提交：`feat(dashboard): use dedicated publication commands`。回滚：回滚本提交只恢复 UI 行为，不回滚服务端保护。

## 9. Task 5 — 个人公开解析器、页面与公开 API

**修改路径。** 新建 `src/lib/public-profile-resolver.ts`、`tests/public-profile-resolver.test.ts`；修改 `src/app/[username]/page.tsx`、`src/app/api/[username]/products/route.ts`、`src/app/api/public/[username]/vcard/route.ts`、`src/app/api/public/[username]/ai-reception-config/route.ts`、`src/app/api/contact/route.ts`、`src/app/sitemap.ts`、`src/app/s/[slug]/route.ts`、`src/app/api/public/links/[linkId]/click/route.ts`、`src/lib/ai/commercial-agent.ts`。禁止修改 owner DTO、Dashboard、Workspace 路由。

解析器按 username 或 profileId 读取最小字段并返回判别联合：`{kind:"visible", profile: PublicProfileDto}` 或 `{kind:"not_found"}`。DTO 只含公开页已批准的呈现字段；联系方式须经过既有 `contactVisibility` 与各字段安全净化后才加入，不返回 owner `id`、email verification、限制、审计或命令数据。所有列出的消费者只使用该解析器；metadata 必须先解析可见性，不能在 404 前取 displayName/bio/avatar。sitemap 只列可见 profile。

**先失败测试。** `never exposes metadata for private, restricted, or unverified profile`：真实 resolver mock db/restriction，三个 seed；action：页面 metadata 与 GET；通过：均为 not_found，响应无姓名、bio、avatar。`products route applies the same resolver`：私有 profile 的产品 seed；通过：404 而非产品 JSON。`visible profile permits contact policy only`：公开 seed；通过：只有显式公开联系方式出现。命令：`npm test -- --runInBand tests/public-profile-resolver.test.ts tests/public-vcard-privacy.test.ts`。完成后 lint/typecheck。精确暂存：`git add src/lib/public-profile-resolver.ts src/app/[username]/page.tsx src/app/api/[username]/products/route.ts src/app/api/public/[username]/vcard/route.ts src/app/api/public/[username]/ai-reception-config/route.ts src/app/api/contact/route.ts src/app/sitemap.ts src/app/s/[slug]/route.ts src/app/api/public/links/[linkId]/click/route.ts src/lib/ai/commercial-agent.ts tests/public-profile-resolver.test.ts tests/public-vcard-privacy.test.ts`。提交：`fix(public): centralize profile visibility resolution`。回滚：回滚此提交恢复旧读取路径，必须连同已知泄露风险公告处理，不可把它当作常规回滚。

## 10. Task 6 — Workspace、自定义域名与员工公开入口

**修改路径。** 修改 `src/app/%5F_w/[workspaceId]/p/[slug]/page.tsx`、`src/lib/domains.ts` 中公开 profile 返回投影；新建 `tests/workspace-public-profile-visibility.test.ts`。禁止修改 host 验证函数、Domain schema、个人公开页。

先继续调用 `requireWorkspacePublicRequestHost(workspaceId)` 与 `resolveWorkspacePublicProfile(workspaceId, slug)`，再把关联的 owner Profile 送入 Task 5 resolver；不得把 workspace 员工目录页面 `employees/page.tsx` 当成公开访问 API。自定义域名沿同一 App Router 页面，因而使用相同 resolver；host 不通过仍按既有逻辑拒绝。

**先失败测试。** `workspace slug hides profile before metadata construction when owner is restricted`：mock 有效 host、workspace binding、受限 owner；通过：404、metadata 不含名片字段。`verified custom host and platform host receive identical visible DTO`：同一公开 seed；通过：严格相等。命令：`npm test -- --runInBand tests/workspace-public-profile-visibility.test.ts`。完成后 lint/typecheck。精确暂存：`git add src/app/%5F_w/[workspaceId]/p/[slug]/page.tsx src/lib/domains.ts tests/workspace-public-profile-visibility.test.ts`。提交：`fix(workspace): enforce shared public profile visibility`。回滚：仅回滚此提交保留个人公开 resolver；恢复前先确认 Workspace 路由没有回到 metadata 泄露。

## 11. Task 7 — Jeepwork 隐藏与恢复语义

**修改路径。** 修改 `src/app/api/jeepwork/profiles/[username]/route.ts`、`src/lib/admin-audit-log.ts`；新建 `tests/jeepwork-profile-visibility.test.ts`。禁止修改 `Profile.isPublic`、发布命令、公开 resolver、FreezeRecord schema。

`hide-profile` 在事务内对 user 创建或复用一条 `type=ADMIN_FREEZE`、`source=jeepwork_profile_visibility`、`isActive=true` 的 FreezeRecord，并写入当前管理员与 reason 的脱敏 metadata；不更新 `profiles.is_public`。`restore-profile` 仅 `updateMany` 清除相同 type/source 的活跃记录，填写 `clearedAt`、`clearedByUserId` 与 `clearedBySource=JEEPWORK_PROFILE_VISIBILITY_RESTORE`；绝不清除其他 ADMIN_FREEZE、安全风险、封禁或邮箱限制。回复中的“公开”改为“用户发布意图仍为公开；平台可见性已恢复/仍被其他限制阻止”。

**先失败测试。** `hide preserves publish intent and blocks the shared resolver`：真实 transaction mock、公开 profile；通过：`isPublic` 不变，指定 FreezeRecord 活跃，解析器 not_found。`restore only clears Jeepwork visibility record`：seed 两条不同 source 的 ADMIN_FREEZE；通过：仅目标 source 被清除。命令：`npm test -- --runInBand tests/jeepwork-profile-visibility.test.ts`。完成后 lint/typecheck。精确暂存：`git add src/app/api/jeepwork/profiles/[username]/route.ts src/lib/admin-audit-log.ts tests/jeepwork-profile-visibility.test.ts`。提交：`fix(jeepwork): model profile hiding as scoped restriction`。回滚：仅回滚该提交；若已创建限制记录，恢复旧代码前先提供一次性、审阅过的管理迁移方案，不能自动删除记录。

## 12. Task 8 — 全链路验收与防回归

**修改路径。** 只新建 `tests/profile-publication-e2e.test.ts`、`tests/public-access-policy-matrix.test.ts`；发现功能缺陷即回到其所属的 Task 1–7 修复并以该任务的提交完成，本任务不修改生产文件。禁止改 Schema、迁移、客户端文案以外的产品范围、sites、生成目录。

**先失败验收矩阵。** 真实临时 PostgreSQL + Next route handler 集成测试，固定 UUID seed：

| 测试名 | 动作 | 通过条件 |
| --- | --- | --- |
| `publication command is idempotent across retry` | 同 key publish 两次 | 一命令、一审计、首次时间不变。 |
| `save API cannot publish` | PUT 包含 `isPublic` | 400，DB 仍私有。 |
| `all public entrances share not-found privacy` | private、unverified、ADMIN_FREEZE、BANNED 各访问个人页、产品、vCard、AI、contact、short link、Workspace | 每个入口都拒绝且不泄露 metadata。 |
| `workspace custom host cannot bypass policy` | 有效 custom host 访问受限名片 | 404。 |
| `jeepwork restore preserves unrelated restrictions` | hide/restore 后仍有安全限制 | 仍不可公开。 |
| `first publish remains immutable after unpublish and republish` | publish → unpublish → publish | 首次时间严格相同，历史状态为 `FIRST_PUBLISH_KNOWN`。 |

命令：`npm test -- --runInBand tests/profile-publication-e2e.test.ts tests/public-access-policy-matrix.test.ts`，随后完整执行 `npx prisma validate`、`npx prisma generate`、`npm run lint`、`npm run typecheck`、`npm test -- --runInBand`、`npm run build`、`git diff --check`。精确暂存：`git add tests/profile-publication-e2e.test.ts tests/public-access-policy-matrix.test.ts`；提交前用 `git diff --cached --name-only` 核对。提交：`test(public): lock publication and visibility policy`。回滚：回滚此提交只移除防回归测试，不回滚前七项架构提交。

## 13. 提交顺序、停止条件与边界

提交顺序严格为 Task 1 至 Task 8：

1. `feat(profile-publication): add publication state persistence`
2. `feat(profile-publication): add atomic idempotent commands`
3. `feat(api): isolate profile publication commands`
4. `feat(dashboard): use dedicated publication commands`
5. `fix(public): centralize profile visibility resolution`
6. `fix(workspace): enforce shared public profile visibility`
7. `fix(jeepwork): model profile hiding as scoped restriction`
8. `test(public): lock publication and visibility policy`

每项在其失败测试、专门测试、lint、typecheck 通过且 `git diff --check` 为零后才可精确暂存并提交；任何阶段发现既有未提交文件混入、真实数据库测试不可用、迁移与实际表不同、或公开入口不能统一拒绝，立即停止该任务，不借由 reset、stash、clean、restore 或目录级暂存修复。

不在本计划范围：会员、支付、AI 点数规则、Workspace 权限模型重构、域名绑定逻辑重写、`/showcase`、生产数据迁移执行、worktree 创建、对现有未提交业务改动的审查或提交。
