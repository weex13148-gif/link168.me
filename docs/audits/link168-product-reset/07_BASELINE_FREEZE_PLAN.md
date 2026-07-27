# 工作区基线冻结与隔离方案

本文件只提供建议，不执行任何 `git add`、`git commit`、`git branch`、`git worktree add`、`git stash`、`git reset`、`git clean` 或其他 Git 写操作。

## 1. 冻结原则

1. 当前分支和 HEAD 已符合预期，不切换分支。
2. 现有工作区保持原样，不清理、不隐藏、不重置。
3. 审计文档和业务代码分开提交。
4. `sites/link168-test`、nested `.git`、node_modules、dist、`.vinext`、`.wrangler` 不进入 Link168 主应用基线。
5. Schema、迁移、生成客户端、发布逻辑、权限/Workspace、支付和 AI 额度不得混成一个无法回滚的大提交。
6. 来源不明文件不能提交；业务改动必须由老板确认是否纳入基线。

## 2. 推荐提交分组

### Group 0：审计文档

精确文件列表：

```text
docs/audits/link168-product-reset/00_EXECUTIVE_SUMMARY.md
docs/audits/link168-product-reset/01_CURRENT_ARCHITECTURE.md
docs/audits/link168-product-reset/02_PRODUCT_ALIGNMENT_MATRIX.md
docs/audits/link168-product-reset/03_KEEP_REFACTOR_HIDE_REMOVE.md
docs/audits/link168-product-reset/04_RISK_REGISTER.md
docs/audits/link168-product-reset/05_NEXT_BATCH_RECOMMENDATION.md
docs/audits/link168-product-reset/06_UNCOMMITTED_CHANGE_INVENTORY.md
docs/audits/link168-product-reset/07_BASELINE_FREEZE_PLAN.md
```

建议提交信息：`docs(audit): record Link168 product reset and baseline inventory`

建议：先独立提交审计文档。这样后续业务提交不会把审计判断和实现变更混在一起；但在老板确认之前只建议，不执行。

### Group 1：数据库 Schema 与迁移（需老板确认）

精确文件列表：

```text
prisma/schema.prisma
prisma/migrations/202607270001_profile_first_publish/migration.sql
```

建议提交信息：`feat(profile): require explicit first publication`

范围：Profile 默认不公开、首次发布时间、发布状态迁移。风险：这是数据库和公开性行为变更，必须确认历史用户默认公开状态、隔离数据库 migration 和回滚/前向兼容方案。

### Group 2：Prisma 生成物（不独立提交）

精确文件列表：

```text
src/generated/prisma/edge.js
src/generated/prisma/index-browser.js
src/generated/prisma/index.d.ts
src/generated/prisma/index.js
src/generated/prisma/package.json
src/generated/prisma/schema.prisma
```

建议：若仓库政策要求跟踪生成物，仅在 Group 1 获批且重新生成结果核对后随 Schema 提交；禁止单独提交。若政策不跟踪，则保持不提交。当前不执行任何处理。

### Group 3：注册、Onboarding 与首次发布

精确文件列表：

```text
src/app/api/auth/login/route.ts
src/app/api/auth/register/route.ts
src/app/api/dashboard/profile/route.ts
src/app/api/dashboard/route.ts
src/app/account/security/page.tsx
src/app/account/sessions/page.tsx
src/app/verify-email/page.tsx
src/components/AuthCard.tsx
src/components/onboarding/OnboardingWizard.tsx
src/components/dashboard-v1/PublicationPanel.tsx
src/components/dashboard-v1/types.ts
src/lib/onboarding.ts
src/lib/handle.ts
src/lib/username-registry.ts
src/lib/dashboard-data.ts
tests/saas-ease-closeout.test.ts
```

建议提交信息：`feat(onboarding): guide users through profile publication`

风险：包含认证跳转、公开状态和发布前置条件；应与 Group 1 同时验收，但可在 Git 上分开提交。

### Group 4：统一 Console 信息架构

精确文件列表：

```text
src/app/console/page.tsx
src/app/console/account/page.tsx
src/app/console/ai-reception/page.tsx
src/app/console/ai/[assistant]/page.tsx
src/app/console/analytics/page.tsx
src/app/console/card/page.tsx
src/app/console/enterprise/page.tsx
src/app/console/knowledge/page.tsx
src/app/console/leads/page.tsx
src/app/console/membership/page.tsx
src/app/console/notifications/page.tsx
src/app/console/products/page.tsx
src/app/console/short-links/page.tsx
src/components/layout/console-navigation.ts
src/components/dashboard/DashboardSidebar.tsx
src/components/notifications/NotificationBell.tsx
src/lib/legacy-console-routes.ts
src/proxy.ts
src/components/workbench/WorkbenchShell.tsx
src/app/dashboard/page.tsx
src/app/workbench/page.tsx
src/app/workbench/account/page.tsx
src/app/workbench/ai/page.tsx
src/app/workbench/ai/[assistant]/page.tsx
src/app/workbench/analytics/page.tsx
src/app/workbench/card/page.tsx
src/app/workbench/enterprise/page.tsx
src/app/workbench/knowledge/page.tsx
src/app/workbench/leads/page.tsx
src/app/workbench/membership/page.tsx
src/app/workbench/products/page.tsx
src/app/workbench/short-links/page.tsx
src/app/workbench/notifications/page.tsx
src/components/dashboard-v1/DashboardFrame.tsx
src/components/dashboard-v1/DashboardV1Client.tsx
src/components/dashboard-v1/AppearancePanel.tsx
src/components/dashboard-v1/LinksPanel.tsx
src/components/dashboard-v1/SharePanel.tsx
src/components/dashboard-v1/UpgradeDialog.tsx
tests/console-navigation.test.ts
tests/legacy-routes.test.ts
tests/mobile-layout.test.ts
jest.config.js
tsconfig.json
```

建议提交信息：`refactor(console): make console the canonical user workspace`

风险：这是最大的一组 UI/入口变更；必须证明旧入口只兼容跳转、不形成第二套业务逻辑，并完成移动端验收。`jest.config.js`/`tsconfig.json` 的 `sites` 排除不能替代独立 site 的隔离。

### Group 5：公开页、Lead 与四类指标

精确文件列表：

```text
src/app/contact/page.tsx
src/app/workbench/leads/page.tsx
src/app/api/workbench/leads/route.ts
src/components/workbench/LeadsClient.tsx
src/components/public-profile/PublicProfileClientWrapper.tsx
src/components/share/PublicContactActions.tsx
src/components/share/PublicProfileHero.tsx
src/components/share/PublicProfileStickyAction.tsx
src/components/share/SharePageRenderer.tsx
src/app/page.tsx
tests/public-profile-redesign.test.tsx
```

建议提交信息：`feat(leads): align public actions with lead follow-up flow`

风险：当前 Lead 主要按 Profile 归属，尚未统一到 Workspace；新旧 Lead 状态仍兼容共存。合并前需专项复审数据隔离和统计真实性。

### Group 6：AI 接待入口和 UI

精确文件列表：

```text
src/app/workbench/ai/page.tsx
src/app/workbench/ai/[assistant]/page.tsx
src/components/ai/AiChatClient.tsx
src/components/ai/ReceptionConfigClient.tsx
tests/ai-reception-ui-closeout.test.ts
```

建议提交信息：`refactor(ai): route reception experience through console`

风险：本组只应处理入口/UI；真实 Provider、额度、退款、RAG 和权限不能因为 UI 提交而被写成已验收。

### Group 7：支付 return URL

精确文件列表：

```text
src/lib/billing/payments.ts
```

建议提交信息：`fix(billing): return paid users to canonical membership page`

风险：只改变 return URL，不等于真实支付宝回调/支付/退款通过；必须独立提交并保留待配置/待服务器测试标记。

## 3. 禁止提交的文件

### 明确禁止

```text
sites/link168-test/node_modules/**
sites/link168-test/dist/**
sites/link168-test/.vinext/**
sites/link168-test/.wrangler/**
sites/link168-test/.git/**
sites/link168-test/.openai/hosting.json
```

此外，根目录 `.env.local`、任何 `.env`、密钥、证书、完整数据库连接串、上传文件和本地数据库文件均禁止提交；本批不读取其值、不执行清理。

### 不得单独提交

```text
src/generated/prisma/edge.js
src/generated/prisma/index-browser.js
src/generated/prisma/index.d.ts
src/generated/prisma/index.js
src/generated/prisma/package.json
src/generated/prisma/schema.prisma
```

## 4. 需要老板确认的事项

1. 是否批准 Group 1 的公开状态 Schema/迁移进入正式基线。
2. 是否批准 Group 3 的注册/登录/onboarding 行为变化。
3. 是否批准 `/console` 成为唯一普通用户主入口，旧 `/workbench`/`/dashboard` 只做兼容跳转。
4. 是否批准当前 55 个已跟踪业务改动和 17 个未跟踪业务文件纳入后续基线；本报告不自动批准。
5. 是否保留 `.superpowers/sdd/**` 流程文档，或作为外部审阅材料不进入主仓库。
6. `sites/link168-test` 是否属于独立项目；在确认前不得纳入 Link168 主仓库。
7. Prisma 生成文件是否是仓库正式跟踪物。
8. 是否允许后续建立独立开发分支/worktree；当前分支不应在工作区未隔离前继续写代码。

## 5. 是否应先提交审计文档

建议是。先只提交 Group 0 的 8 个审计文档，形成可追溯的审计基线；随后由老板确认 Group 1–7 的业务分组。审计文档提交本身不代表批准任何业务改动。

## 6. 是否应创建独立分支或 worktree

建议后续创建，但本批不执行：

- 推荐分支：`codex/link168-batch-1-closeout-20260727`
- 推荐 worktree：`D:\77.me\link168-worktrees\batch-1-closeout-20260727`
- 当前 `recovery/direct-goal-closeout-20260722` 保持只读冻结，直到未提交差异完成审阅或获得明确处理决定。

## 7. 安全执行顺序（仅建议命令，不执行）

```powershell
# 1. 在当前分支再次核对状态（只读）
git status --short
git diff --check

# 2. 由老板确认后，仅提交审计文档
git add docs/audits/link168-product-reset/00_EXECUTIVE_SUMMARY.md `
  docs/audits/link168-product-reset/01_CURRENT_ARCHITECTURE.md `
  docs/audits/link168-product-reset/02_PRODUCT_ALIGNMENT_MATRIX.md `
  docs/audits/link168-product-reset/03_KEEP_REFACTOR_HIDE_REMOVE.md `
  docs/audits/link168-product-reset/04_RISK_REGISTER.md `
  docs/audits/link168-product-reset/05_NEXT_BATCH_RECOMMENDATION.md `
  docs/audits/link168-product-reset/06_UNCOMMITTED_CHANGE_INVENTORY.md `
  docs/audits/link168-product-reset/07_BASELINE_FREEZE_PLAN.md
git commit -m "docs(audit): record Link168 product reset and baseline inventory"

# 3. 老板确认后再创建独立 worktree；不在当前脏工作区继续开发
git branch codex/link168-batch-1-closeout-20260727
git worktree add D:\77.me\link168-worktrees\batch-1-closeout-20260727 codex/link168-batch-1-closeout-20260727

# 4. 在新 worktree 中按批准的 Group 逐组提交；每组先看 staged diff
git add <老板批准的精确文件列表>
git diff --cached --stat
git diff --cached --name-status
git commit -m "<对应 Group 的提交信息>"
```

以上命令只是建议，尤其不能在没有老板确认时执行；本批没有执行其中任何写操作。
