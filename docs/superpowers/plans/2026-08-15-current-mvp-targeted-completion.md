# Link168 CURRENT MVP Targeted Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐 CURRENT 初始化、Team/Member Page、AI/Lead、Billing/Lifecycle、Console、Jeepwork 与 Provider 边界，使 canonical runtime 达到 `TARGETED COMPLETION ROUND COMPLETE` 并可交付独立只读复审。

**Architecture:** 继续使用 `current_*` 数据表和 `/api/current/**` 作为唯一新业务边界；legacy 代码只保留为兼容或历史资产，不作为 CURRENT source of truth。每个 Wave 必须形成 `Route/UI → Service → Repository → CURRENT Model` 闭环，先完成数据与业务边界，再接页面，最后清理 canonical legacy 依赖。

**Tech Stack:** Next.js 16 App Router、React、TypeScript 6、Prisma 7、PostgreSQL 17。

## Global Constraints

> 轮次说明（2026-09-05）：下列基线 SHA、测试限制和 NOT RUN 记录来自 2026-08-15 执行轮次，保留供追溯，不自动扩展为永久产品或全局权限。恢复开发先读取 `docs/DEVELOPMENT_STATUS.md`、实际 Git 状态和用户最新指令；已完成 Task 1–3 不重复施工。涉及生产环境和真实服务的操作仍按项目规则单独确认。

- 正式仓库：`C:\Users\bifuc\.codex\worktrees\a056\link1688`。
- 正式分支：`codex/controlled-clean-rebuild-20260814`；不得创建第二条施工主线。
- 开始基线：`04c0e2ab8976dec4976f6b9a59d76b0508bd820b`。
- `CURRENT Product Authority > legacy implementation`；不得从旧 DTO、旧 Prisma 模型或旧 UI 反推产品规则。
- DB-1 `link168_ui_audit`：`DO NOT MODIFY / DO NOT MIGRATE / DO NOT RESET`。
- 允许创建 migration 文件，但不得应用到 DB-1；运行验收使用独立 CURRENT database。
- 不升级依赖，不安装新包，不引入测试 API Key，不虚构 Provider 厂商。
- 遵守 OWNER 指令：`NO NEW UNIT TEST DEVELOPMENT / NO INTEGRATION TEST DEVELOPMENT / NO E2E DEVELOPMENT / NO LIVE PROVIDER TEST`。
- 未配置 Provider 必须返回 `explicit unavailable`，不得 fake success、mock production path 或 placeholder persistence。
- 每个任务完成时运行相关 lint/typecheck；每个 Wave 独立提交；最终工作树必须 CLEAN。
- 任何完成声明必须以 wiring evidence 为准，不能以文件存在、Service 存在或 build PASS 代替。

---

## Wave 0 — 执行前冻结与共享契约

### Task 1: 冻结施工基线与 CURRENT 契约审计

**Files:**
- Review: `00_CURRENT_GUIDANCE_INDEX.md`
- Review: `CURRENT_PRODUCT_AUTHORITY.md`
- Review: `DEVELOPMENT_EXECUTION_RULES.md`
- Review: `LINK168_MVP_PAGE_AND_INTERACTION_SPEC.md`
- Review: `MVP_ACCEPTANCE_TESTS.md`
- Create: `.superpowers/sdd/2026-08-15-current-mvp-targeted-completion/task-1-report.md`

**Interfaces:**
- Consumes: OD-001—OD-058、IF-001—IF-020、234 条 Acceptance。
- Produces: OD/IF/Acceptance 到 Wave 的审计映射；后续任务仅在存在实际调用者时创建对应 CURRENT 类型。

- [ ] 执行 `git rev-parse --show-toplevel`、`git branch --show-current`、`git rev-parse HEAD`、`git status --short`，确认正式 worktree、branch 和 CLEAN。
- [ ] 从 CURRENT index 按规定顺序重读 authority，并在 Task 1 report 中为本计划每个 Wave 标注对应 OD/IF/Acceptance；发现冲突时停止，不自行改 OD。
- [ ] 审查 `src/lib/current/contracts.ts`，记录未来接口的现有类型、调用者和缺口；不得为了预声明而新增无调用者的接口。
- [ ] 确认每类接口在对应任务创建：bootstrap（Task 2）、workspace operation gate（Task 5）、lead assignment event（Task 7）、billing provider ports（Task 8/10）、owned media（Task 13）。
- [ ] 运行 `npx.cmd tsc --noEmit --incremental false`，确认现有共享契约保持可编译。
- [ ] 不创建代码提交；Task 1 的完成证据是 report 与静态验证结果。

---

## Wave 1 — CURRENT 初始化与 Publication 可达性

### Task 2: 建立幂等 Personal Runtime Bootstrap

**Files:**
- Create: `src/lib/current/bootstrap/service.ts`
- Create: `src/app/api/current/bootstrap/route.ts`
- Modify: `src/lib/current/page-service.ts`
- Modify: `src/app/console/page.tsx`
- Modify: `src/app/console/pages/page.tsx`
- Modify: `src/app/api/auth/register/route.ts`

**Interfaces:**
- Produces:

```ts
export interface CurrentPersonalRuntime {
  identityId: string;
  workspaceId: string;
  pageId: string;
  draftId: string;
  billingAccountId: string;
}

export function ensureCurrentPersonalRuntime(
  userId: string,
): Promise<CurrentResult<CurrentPersonalRuntime>>;
```

- [ ] 在单个 Prisma transaction 中查询 legacy `User/Profile` 仅作为一次性身份输入，不把它们作为 CURRENT runtime source of truth。
- [ ] 幂等创建 `CurrentIdentity`，规范化 username；冲突时返回 `CONFLICT`，不得静默改名。
- [ ] 创建 personal `CurrentWorkspace`，再回填 `CurrentIdentity.personalWorkspaceId`，处理两表关系循环。
- [ ] 创建 personal `CurrentPage`、初始 `CurrentPageDraft` 和 personal `CurrentBillingAccount`；重复调用返回同一组记录。
- [ ] `/api/current/bootstrap` 仅允许登录用户为自己初始化，不接受客户端传入 owner、workspace 或 billing owner。
- [ ] 注册成功后调用 bootstrap；若 CURRENT 表或依赖不可用，保留账号并返回明确的初始化失败状态，不伪造成功页面。
- [ ] `/console` 与 `/console/pages` 在未初始化时调用 bootstrap，成功后重定向到 `/console/pages/{pageId}`。
- [ ] 检查现有 Draft → Preview → Publish → Published Facts → Public 链路在 bootstrap 数据上无需 legacy Profile/Product。
- [ ] 运行 Prisma validate、相关 lint、typecheck 和 `git diff --check`。
- [ ] 提交：`feat(current): bootstrap personal runtime`。

### Task 3: 扩展 CURRENT Page 列表与统一访问入口

**Files:**
- Modify: `src/app/api/current/pages/route.ts`
- Modify: `src/app/console/pages/page.tsx`
- Modify: `src/lib/current/page-service.ts`
- Create: `src/lib/current/repositories/prisma-current-page-list-repository.ts`

**Interfaces:**
- Produces:

```ts
export function listCurrentPagesForActor(
  userId: string,
): Promise<CurrentResult<readonly CurrentPageRef[]>>;
```

- [ ] 返回个人页面、Actor 有 active membership 的 Team Page 和 Member Page；服务端决定可见范围。
- [ ] 页面列表显示 kind、workspace、publication status 和公开地址，不读取 legacy Profile/Product。
- [ ] 保持现有 `[pageId]` 编辑和 preview 页面复用统一授权上下文。
- [ ] 运行相关 lint、typecheck、build 路由检查与 `git diff --check`。
- [ ] 提交：`feat(current): expose authorized page list`。

---

## Wave 2 — Team、Member Page 与 Lifecycle Gate

### Task 4: 建立 Team 管理 API 与 Member Page 创建闭环

**Files:**
- Create: `src/lib/current/team/page-service.ts`
- Create: `src/app/api/current/teams/route.ts`
- Create: `src/app/api/current/teams/[workspaceId]/members/route.ts`
- Create: `src/app/api/current/teams/[workspaceId]/member-pages/route.ts`
- Create: `src/app/console/team/page.tsx`
- Create: `src/app/console/team/[workspaceId]/page.tsx`
- Modify: `src/lib/current/team/service.ts`
- Modify: `src/lib/current/repositories/prisma-current-workspace-repository.ts`

**Interfaces:**
- Produces:

```ts
export function createCurrentTeam(input: {
  actorUserId: string;
  name: string;
  slug: string;
  idempotencyKey: string;
}): Promise<CurrentResult<{ workspaceId: string; teamPageId: string }>>;

export function ensureCurrentMemberPage(input: {
  actorUserId: string;
  workspaceId: string;
  memberIdentityId: string;
}): Promise<CurrentResult<CurrentPageRef>>;
```

- [ ] 创建 Team 时在一个 transaction 内创建 workspace、owner membership、Team Page、Draft 和 Team Billing Account。
- [ ] 成员邀请/加入只使用 `CurrentWorkspaceMember`；角色限定 `owner/admin/member`，不得引入 legacy viewer。
- [ ] 成员 active 后幂等创建 `kind="member"` 页面，ownerIdentity 指向成员，workspace 指向 Team。
- [ ] Team 管理页面列出成员、Team Page、Member Pages，并链接到通用 CURRENT editor。
- [ ] 客户端不得指定越权 role、page owner 或 billing owner；全部由服务端校验和派生。
- [ ] 写入 `CurrentAuditLog`，覆盖 Team 创建、成员状态变化和 Member Page 创建。
- [ ] 运行相关 lint、typecheck、Prisma validate 和 `git diff --check`。
- [ ] 提交：`feat(current): wire team and member pages`。

### Task 5: 接通 Owner Transfer、Dissolution、Restore 与 Retention

**Files:**
- Create: `src/app/api/current/teams/[workspaceId]/owner/route.ts`
- Create: `src/app/api/current/teams/[workspaceId]/lifecycle/route.ts`
- Create: `src/app/api/internal/current/team-retention/route.ts`
- Create: `src/lib/current/lifecycle/gate.ts`
- Modify: `src/lib/current/team/service.ts`
- Modify: `src/lib/current/lifecycle/service.ts`
- Modify: `src/lib/current/page-service.ts`
- Modify: `src/lib/current/leads/runtime.ts`
- Modify: `src/lib/current/ai/service.ts`

**Interfaces:**
- Produces:

```ts
export function assertCurrentWorkspaceOperation(input: {
  workspaceId: string;
  operation: "edit" | "publish" | "visitor_ai" | "lead_create" | "invite" | "billing";
}): Promise<CurrentResult<true>>;
```

- [ ] Owner Transfer 验证目标是 active member，并在 transaction 中同步 workspace owner、owner/member role 和 Team billing contact。
- [ ] Dissolution 强制 second confirmation 与 idempotency key，禁用 Team/Member Pages、Visitor AI、新 Leads、邀请、续费并冻结 Team credits。
- [ ] Restore 仅在 30 天 deadline 内恢复允许恢复的状态，不把 Team credits 转入 Personal。
- [ ] Retention executor 把过期 `pending_deletion` 转为 restricted retention，并提供删除/匿名化 hook 与 legal hold 分离。
- [ ] internal route 复用现有服务器内部认证模式，不暴露匿名执行入口。
- [ ] Page、AI、Lead、Invite、Billing 在操作前统一调用 lifecycle gate，不能只依赖 UI 隐藏。
- [ ] 运行相关 lint、typecheck、Prisma validate 和 `git diff --check`。
- [ ] 提交：`feat(current): enforce team lifecycle gates`。

---

## Wave 3 — Visitor AI、Lead 与 Handoff

### Task 6: 将 Visitor AI 和 Direct Lead Form 接入公开页面

**Files:**
- Create: `src/components/current-ai/visitor-panel.tsx`
- Create: `src/components/current-lead/direct-form.tsx`
- Modify: `src/components/current-page/renderer.tsx`
- Modify: `src/components/current-page/adapters.ts`
- Modify: `src/app/[username]/page.tsx`
- Modify: `src/app/api/current/visitor/route.ts`
- Modify: `src/app/api/current/leads/route.ts`

**Interfaces:**
- Consumes: `/api/current/visitor`、`/api/current/leads`、Published Facts。
- Produces: 公开页面上的 AI 对话入口和 Provider 不可用时的直接留资入口。

- [ ] Public renderer 只从 Published Facts 构造 AI context、offering 列表和 responsible members。
- [ ] Visitor Panel 不接受客户端传入 assignee、routing strategy 或 workspace ownership。
- [ ] AI Provider 缺配置、超时或失败时展示 direct form fallback，不展示 fake AI answer。
- [ ] Direct form 生成并发送稳定 idempotency key，Lead 来源和 origin page 来自当前公开页面。
- [ ] 对 Team pending dissolution/closed 状态返回明确不可用，不创建 Lead。
- [ ] 运行相关 lint、typecheck、build 和 `git diff --check`。
- [ ] 提交：`feat(current): expose visitor ai and lead capture`。

### Task 7: 建立 Lead 查询、状态与持久 Handoff 历史

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/202608150001_current_lead_assignment_events/migration.sql`
- Modify: `src/lib/current/contracts.ts`
- Modify: `src/lib/current/repositories/prisma-current-lead-repository.ts`
- Create: `src/lib/current/leads/query-service.ts`
- Create: `src/app/api/current/leads/[leadId]/route.ts`
- Replace: `src/app/console/leads/page.tsx`

**Interfaces:**
- Produces:

```ts
export interface CurrentLeadAssignmentEvent {
  leadId: string;
  fromIdentityId: string | null;
  toIdentityId: string;
  reason: string;
  actorIdentityId: string;
  createdAt: string;
}
```

- [ ] 新增 `CurrentLeadAssignmentEvent`，保留每次 server-validated assignment/handoff 历史；不得只覆盖 `assigneeIdentityId`。
- [ ] 初始 routing 与后续 handoff 在同一 transaction 内写 Lead、Assignment Event 和 CurrentAuditLog。
- [ ] 查询 API 按 personal/team ownership 和 active membership 过滤，禁止客户端任意 workspaceId 越权。
- [ ] Console Leads 页面只调用 `/api/current/leads/**`，支持状态 `new/contacted/closed`，不得恢复 Qualified/Won/Lost。
- [ ] 用持久 DB unique idempotency 作为最终防线；保留进程内缓存只能作为优化，不能作为唯一一致性边界。
- [ ] 将 rate limiter 抽象为共享 port；未配置共享实现时明确标记单实例能力，不虚构多实例保障。
- [ ] 生成 migration 但不应用到 DB-1；运行 Prisma validate、generate、lint、typecheck 和 `git diff --check`。
- [ ] 提交：`feat(current): persist lead handoff history`。

---

## Wave 4 — Billing、AI Credits 与 Payment Boundary

### Task 8: 将 Personal/Team Billing 接入 Console

**Files:**
- Create: `src/app/api/current/billing/personal/route.ts`
- Create: `src/app/api/current/billing/teams/[workspaceId]/route.ts`
- Create: `src/app/console/billing/page.tsx`
- Replace: `src/app/console/membership/page.tsx`
- Modify: `src/lib/current/billing/service.ts`

**Interfaces:**
- Consumes: `CurrentBillingAccount`、`CurrentBillingLedgerEntry`、lifecycle gate。
- Produces: Personal 与每个 Team 独立账单摘要和 credit balance。

- [ ] Personal Billing 只能绑定 personal workspace/account；Team Billing 只能绑定对应 Team account。
- [ ] Console 分开显示 Personal plan/credits 与各 Team plan/shared credits，不合并余额。
- [ ] Team Member Page 和 Team Visitor AI 只引用 Team billing account。
- [ ] 移除 CURRENT billing service 对 `@/lib/billing/payments` 的直接 import，改为注入 CURRENT payment availability port。
- [ ] 未配置订单 Provider 时返回稳定 `PROVIDER_UNAVAILABLE` 和配置要求，不生成 Order。
- [ ] 运行相关 lint、typecheck、build 和 `git diff --check`。
- [ ] 提交：`feat(current): expose independent billing ownership`。

### Task 9: 接通 AI Credit Reserve/Settle/Refund

**Files:**
- Create: `src/lib/current/billing/ai-credit-port.ts`
- Modify: `src/lib/current/ai/service.ts`
- Modify: `src/lib/current/ai/runtime.ts`
- Modify: `src/lib/current/billing/service.ts`

**Interfaces:**
- Produces:

```ts
export interface CurrentAiCreditPort {
  reserve(input: { workspaceId: string; operationId: string; amount: number }): Promise<CurrentResult<void>>;
  settle(input: { workspaceId: string; operationId: string }): Promise<CurrentResult<void>>;
  refund(input: { workspaceId: string; operationId: string; reason: string }): Promise<CurrentResult<void>>;
}
```

- [ ] AI 请求前根据 Published Facts 的 workspace 选择 Personal 或 Team billing account 并 reserve。
- [ ] Provider 成功后 settle；Provider 失败、timeout 或无 usable answer 时 refund/compensate。
- [ ] reserve、settle、refund 使用 operationId 幂等，账本余额不能因重试重复扣减或退款。
- [ ] credit 不足时返回明确错误并保留 direct form fallback。
- [ ] 运行相关 lint、typecheck、build 和 `git diff --check`。
- [ ] 提交：`feat(current): wire ai credit accounting`。

### Task 10: 建立 Provider-neutral CURRENT Payment 模型与端口

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/202608150002_current_payment_boundary/migration.sql`
- Create: `src/lib/current/payment/contracts.ts`
- Create: `src/lib/current/payment/service.ts`
- Create: `src/lib/current/payment/configuration-required-adapter.ts`
- Create: `src/app/api/current/payments/orders/route.ts`
- Create: `src/app/api/current/payments/callbacks/[provider]/route.ts`
- Create: `src/app/api/current/payments/refunds/route.ts`

**Interfaces:**
- Produces provider-neutral `CurrentOrder`、`CurrentPayment`、`CurrentPaymentCallback`、`CurrentRefund` 与 `CurrentPaymentProvider`。

- [ ] Order 显式引用 `CurrentBillingAccount`，不得默认 User-owned。
- [ ] Callback 保存原始审计摘要、signature verification 结果和 idempotency key；未配置 Provider 时拒绝处理。
- [ ] Refund 验证原 Payment、金额上限、幂等和 audit；不得调用 legacy Order/Payment 表作为 CURRENT source of truth。
- [ ] configuration-required adapter 的所有 mutation 返回 `PROVIDER_UNAVAILABLE`，不生成 fake paid/refunded 状态。
- [ ] 生成 migration 但不应用到 DB-1；运行 Prisma validate、generate、lint、typecheck 和 `git diff --check`。
- [ ] 提交：`feat(current): define payment boundary`。

---

## Wave 5 — Console Canonical Retirement

### Task 11: 清除 `/console` 的 legacy runtime 依赖

**Files:**
- Replace: `src/app/console/enterprise/page.tsx`
- Modify: `src/app/console/account/page.tsx`
- Modify: `src/app/console/analytics/page.tsx`
- Modify: `src/app/console/products/page.tsx`
- Modify: `src/app/console/knowledge/page.tsx`
- Modify: `src/app/console/notifications/page.tsx`
- Retire from canonical path: `src/components/console/ContactEntriesClient.tsx`

**Interfaces:**
- Consumes: Wave 2 Team/Member APIs、Wave 3 Lead APIs、Wave 4 Billing APIs。
- Produces: `/console/**` canonical paths with zero Dashboard/Workbench runtime dependency。

- [ ] `/console/enterprise` 改为 Team/Member Page/Lead 的 CURRENT 导航或 authority 允许的明确 redirect。
- [ ] canonical Console 中清除 `/api/dashboard/**`、`/api/workbench/**`、`/api/workspaces/**` 和 legacy contact-entry Lead 调用。
- [ ] 对 CURRENT MVP 不要求的旧页面使用明确兼容重定向，不重新实现历史产品方向。
- [ ] 运行 `rg` 证明 `src/app/console` 不再 import Workbench/Dashboard runtime，且不再请求 legacy canonical APIs。
- [ ] 运行 lint、typecheck、build 和 `git diff --check`。
- [ ] 提交：`refactor(current): retire console legacy runtime`。

---

## Wave 6 — Jeepwork CURRENT Platform

### Task 12: 重建 Jeepwork 操作与审计表面

**Files:**
- Create: `src/components/current-jeepwork/shell.tsx`
- Create: `src/lib/current/platform/service.ts`
- Create: `src/app/api/current/jeepwork/summary/route.ts`
- Create: `src/app/api/current/jeepwork/audit/route.ts`
- Replace: `src/app/jeepwork/audit/page.tsx`
- Modify: `src/app/jeepwork/users/page.tsx`
- Modify: `src/app/jeepwork/reports/page.tsx`
- Modify: `src/app/jeepwork/roles/page.tsx`
- Modify: `src/app/jeepwork/system-health/page.tsx`
- Modify: `src/app/jeepwork/settings/payment/page.tsx`

**Interfaces:**
- Consumes: `CurrentIdentity`、`CurrentWorkspace`、`CurrentPage`、`CurrentLead`、`CurrentBillingAccount`、`CurrentLifecycleRecord`、`CurrentAuditLog`。
- Produces: CURRENT platform summary、audit query 和 authority 明确允许的操作入口。

- [ ] 保留经过复核的 super_admin authentication primitive，但所有业务查询改用 current models。
- [ ] 新 shell 不依赖 `AdminShell` 的业务状态；可复用纯视觉 primitive，但不得复用 legacy data loaders。
- [ ] Audit 页面只读 `CurrentAuditLog`；过滤器按 action、workspace、target、actor 工作。
- [ ] 对 CURRENT authority 未要求的 legacy admin 功能直接 redirect/404/标记 historical，不迁移 User/Profile/Showcase/Competition 业务。
- [ ] 所有 Jeepwork CURRENT mutation 写 `CurrentAuditLog`，不得只写 `adminAuditLog`。
- [ ] 运行 `rg` 证明 canonical `/jeepwork/**` 不再依赖 legacy Admin business data layer。
- [ ] 运行 lint、typecheck、build 和 `git diff --check`。
- [ ] 提交：`refactor(current): rebuild jeepwork platform surface`。

---

## Wave 7 — Email、SMS 与 Storage Boundaries

### Task 13: 建立未配置时安全失败的 Provider Ports

**Files:**
- Create: `src/lib/current/providers/email.ts`
- Create: `src/lib/current/providers/sms.ts`
- Create: `src/lib/current/providers/storage.ts`
- Create: `src/lib/current/providers/status.ts`
- Modify: `src/lib/current/team/service.ts`
- Modify: `src/components/current-page/editor.tsx`
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/202608150003_current_owned_media/migration.sql`

**Interfaces:**
- Produces: `CurrentEmailPort`、`CurrentSmsPort`、`CurrentStoragePort`、`CurrentOwnedMedia`。

- [ ] Team invitation 通过 Email/SMS port；未配置时 invitation 保持可重试状态并返回 explicit unavailable，不标记 sent。
- [ ] Storage port 验证 MIME、大小、owner identity、workspace ownership 和 object key；禁止客户端指定任意 filesystem path。
- [ ] 上传成功写 `CurrentOwnedMedia`；失败执行 cleanup；Page Draft 只能引用 actor 有权使用的 owned media。
- [ ] 未冻结 Provider 厂商时只实现 configuration-required adapter，不猜测 vendor API。
- [ ] 生成 migration 但不应用到 DB-1；运行 Prisma validate、generate、lint、typecheck 和 `git diff --check`。
- [ ] 提交：`feat(current): add provider neutral messaging and storage`。

---

## Wave 8 — Final Wiring Review 与独立复审交付

### Task 14: 静态验证、Legacy Matrix 与服务器验收包

**Files:**
- Create: `docs/audits/CURRENT_TARGETED_COMPLETION_REPORT.md`

**Interfaces:**
- Produces: 完整 Domain Wiring Matrix、Legacy Dependency Matrix、Provider Matrix、Security Closure 和 server validation checklist。

- [ ] 逐域追踪 Personal、Page、Draft、Preview、Publish、Public、AI、Lead、Handoff、Team、Member Page、Billing、AI Credits、Lifecycle、Consent、Jeepwork。
- [ ] 对每个域记录实际 `Route/UI → Service → Repository → CURRENT Model` 文件和调用点；任何断链标记 OPEN/PARTIAL。
- [ ] 运行 `prisma validate`、`npm run lint`、`npx.cmd tsc --noEmit --incremental false`、`npm run build`、`git diff --check`。
- [ ] 准确记录测试状态：unit/integration/E2E/live Provider/server runtime 均按 OWNER 指令标记 NOT RUN，不伪造 PASS。
- [ ] 确认 migration 未应用到 DB-1，并为 OWNER 独立 CURRENT database 提供 migration、bootstrap、登录、编辑、发布、公开访问、AI/Lead、Team/Billing/Lifecycle 验收顺序。
- [ ] 运行 `rg` 验证 canonical Current paths 不依赖 Dashboard、Workbench、Admin business runtime、legacy Workspace/Subscription/Credit/Audit/Profile/Product。
- [ ] 若仍有 P0/P1 断链，输出 `TARGETED COMPLETION ROUND INCOMPLETE / ENGINEERING BLOCKERS REMAIN`；只有全部关闭才输出 `READY FOR INDEPENDENT RE-AUDIT: YES`。
- [ ] 提交：`docs(current): record targeted completion evidence`。
- [ ] 最终执行 `git status --short`，必须为空。

---

## Execution Order and Review Gates

```text
Wave 0 contracts
  → Wave 1 bootstrap/publication reachability
  → Wave 2 team/member/lifecycle
  → Wave 3 visitor AI/lead/handoff
  → Wave 4 billing/credits/payment
  → Wave 5 console retirement
  → Wave 6 jeepwork retirement
  → Wave 7 provider ports
  → Wave 8 final wiring review
```

每个 Wave 的 reviewer gate 必须回答：

1. 是否存在真实上层调用，而不只是 model/service 文件？
2. 是否只读写 CURRENT 数据边界？
3. 是否有 server-side authorization、ownership、idempotency 和 safe failure？
4. 是否引入 legacy product assumption？
5. 是否具备独立提交和回退能力？

任一答案不满足，则该 Wave 不得进入下一阶段。
