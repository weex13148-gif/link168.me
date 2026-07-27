# 未提交差异清单与分类

审计时间：2026-07-27。分类基于本批开始时实际工作区和实际 diff；六份既有审计报告确认是在第 0 批中新增，本文件和 `07_BASELINE_FREEZE_PLAN.md` 是第 0.5 批新增。

## 1. 实际基线

| 项目 | 实际结果 | 预期 | 结论 |
|---|---|---|---|
| 仓库根目录 | `D:/77.me/link1688` | `D:\77.me\link1688` | 一致 |
| 分支 | `recovery/direct-goal-closeout-20260722` | 同名 | 一致 |
| HEAD | `3febe5003984dd691d0b46826935136922aa013f` | 同值 | 一致 |
| 暂存区 | 无 staged 文件 | 无 | 一致 |
| 已跟踪未提交修改 | 61 个 | 未指定 | 存在 |
| 未跟踪文件 | 29,844 个（含 nested repo 和生成目录） | 未指定 | 存在 |

开始前执行的命令：

```text
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --short
git status --porcelain=v2
git diff --stat
git diff --name-status
git diff --cached --stat
git diff --cached --name-status
git ls-files --others --exclude-standard
```

已跟踪 diff 统计：61 个文件，1,411 insertions，2,240 deletions。暂存区为空。`git status --porcelain=v2` 的已跟踪状态均为 `.M`，未跟踪目录/文件均为 `?`。

## 2. 分类数量

| 分类 | 数量 | 说明 |
|---|---:|---|
| A. AUDIT_DOC | 6 | 第 0 批已创建的六份报告 |
| B. PREEXISTING_BUSINESS_CHANGE | 86 | 55 个已跟踪业务/配置/测试文件 + 31 个未跟踪业务/流程文件 |
| C. GENERATED_ARTIFACT | 29,703 | 6 个已跟踪 Prisma 生成文件 + `sites` 下 29,697 个工具/构建依赖文件 |
| D. SECRET_OR_ENVIRONMENT | 1 | `sites/link168-test/.openai/hosting.json`，部署环境配置；未发现密钥值 |
| E. UNKNOWN | 109 | `sites` 中 30 个未能确认归属的源/锁文件 + nested `.git` 的 79 个文件 |
| **合计** | **29,905** | 61 个已跟踪 + 29,844 个未跟踪 |

分类是“每个文件一个分类”。对 `sites/link168-test` 的 29,807 个文件，报告以精确目录集合和数量展开，避免把二万多个 node_modules/构建文件复制进审计文档：

- `sites/link168-test/node_modules/**`、`dist/**`、`.vinext/**`、`.wrangler/**`：29,697 个，C。
- `sites/link168-test/.openai/hosting.json`：1 个，D。
- `sites/link168-test/.git/**`：79 个，E。
- 其余 30 个明确路径见第 5 节，除 hosting 配置外均为 E。

## 3. A：AUDIT_DOC

以下 6 个文件在第 0 批开始时不存在，在第 0 批中创建；本批不修改它们。

| Git 状态 | 文件 | 摘要 | 业务/数据库/支付AI权限Workspace | 疑似密钥/个人数据 | 单独提交 | 推荐批次 |
|---|---|---|---|---|---|---|
| `??` | `docs/audits/link168-product-reset/00_EXECUTIVE_SUMMARY.md` | 审计执行摘要 | 否/否/否/否/否 | 否 | 是 | 审计文档 |
| `??` | `docs/audits/link168-product-reset/01_CURRENT_ARCHITECTURE.md` | 当前架构、路由、Schema、CI | 否/否/否/否/是（描述） | 否 | 是 | 审计文档 |
| `??` | `docs/audits/link168-product-reset/02_PRODUCT_ALIGNMENT_MATRIX.md` | 新版能力映射矩阵 | 否/否/否/否/是（描述） | 否 | 是 | 审计文档 |
| `??` | `docs/audits/link168-product-reset/03_KEEP_REFACTOR_HIDE_REMOVE.md` | 模块处理建议 | 否/否/否/否/是（描述） | 否 | 是 | 审计文档 |
| `??` | `docs/audits/link168-product-reset/04_RISK_REGISTER.md` | 风险登记 | 否/否/否/否/是（描述） | 否 | 是 | 审计文档 |
| `??` | `docs/audits/link168-product-reset/05_NEXT_BATCH_RECOMMENDATION.md` | 下一批建议 | 否/否/否/否/是（描述） | 否 | 是 | 审计文档 |

目录中未发现除这 6 个文件外的其他现有审计报告；第 0.5 批将新增本文件和 07 文件。

## 4. B：已跟踪 PREEXISTING_BUSINESS_CHANGE（逐文件）

这些文件在第 0 批开始前已经是未提交状态。以下摘要来自实际 `git diff`，不是文件名推断。`域`列依次表示：业务逻辑、数据库、支付/AI/权限/Workspace/租户、疑似密钥或个人数据。

| Git 状态 | 文件 | 实际 diff 摘要 | 域 | 单独提交/推荐批次 | 风险 |
|---|---|---|---|---|---|
| `M` | `jest.config.js` | 将 `sites` 加入测试忽略 | 否/否/否/否 | 否；工程隔离 | 可能掩盖 site 测试，不应单独视为产品完成 |
| `M` | `prisma/schema.prisma` | Profile 默认不公开，新增首次发布时间 | 是/是/发布权限/否 | 否；数据库发布批次 | 需要迁移和历史数据策略 |
| `M` | `src/app/account/security/page.tsx` | 返回入口改为 `/console/card` | 是/否/入口/否 | 否；控制台收口 | 依赖 console 迁移 |
| `M` | `src/app/account/sessions/page.tsx` | 返回入口改为 `/console/card` | 是/否/入口/否 | 否；控制台收口 | 同上 |
| `M` | `src/app/api/auth/login/route.ts` | 登录返回服务端决定的 onboarding/console 目标 | 是/否/权限入口/否 | 否；注册发布批次 | 改变登录行为，需回归认证流程 |
| `M` | `src/app/api/auth/register/route.ts` | 新用户默认不公开并进入 onboarding | 是/否/发布权限/否 | 否；注册发布批次 | 改变注册与邮件后的路径 |
| `M` | `src/app/api/dashboard/profile/route.ts` | 发布前校验、首次发布时间、事务、PATCH 兼容 | 是/是/发布权限/否 | 否；注册发布批次 | 发布校验与旧客户端兼容风险 |
| `M` | `src/app/api/dashboard/route.ts` | 名片文本清洗、长度/敏感词校验、默认不公开 | 是/否/发布安全/否 | 否；注册发布批次 | 与 profile route 存在双入口 |
| `M` | `src/app/api/workbench/leads/route.ts` | 新增 Lead 状态组筛选 | 是/否/Lead租户/否 | 否；Lead 收口批次 | 仍保留历史状态兼容，口径可能分裂 |
| `M` | `src/app/console/page.tsx` | 首页改为单一主动作和访问/咨询/留资/成交指标 | 是/否/入口+统计/否 | 否；控制台收口 | 依赖真实指标和 profile 状态 |
| `M` | `src/app/contact/page.tsx` | 页面入口/文案对齐控制台 | 是/否/入口/否 | 否；控制台收口 | 需核对公开联系流程 |
| `M` | `src/app/dashboard/page.tsx` | 旧入口转为 console 兼容入口 | 是/否/入口/否 | 否；控制台收口 | 兼容跳转要保留旧链接语义 |
| `M` | `src/app/help/page.tsx` | 帮助页入口对齐新后台 | 是/否/入口/否 | 否；控制台收口 | 文案可能仍引用旧入口 |
| `M` | `src/app/page.tsx` | 首页 CTA/入口调整 | 是/否/入口/否 | 否；控制台收口 | 公开营销页需单独验收 |
| `M` | `src/app/verify-email/page.tsx` | 验证页路径/返回入口调整 | 是/否/认证入口/否 | 否；注册发布批次 | 与注册邮件状态联动 |
| `M` | `src/app/workbench/ai/[assistant]/page.tsx` | AI 页面入口改向 console | 是/否/AI入口/否 | 否；控制台收口 | 不能改变真实 AI 权益边界 |
| `M` | `src/app/workbench/ai/page.tsx` | AI 工作台入口改向 console | 是/否/AI入口/否 | 否；控制台收口 | 旧链接兼容风险 |
| `M` | `src/app/workbench/analytics/page.tsx` | 统计页面改为新信息架构 | 是/否/统计/否 | 否；控制台收口 | 不能把演示指标当真实指标 |
| `M` | `src/app/workbench/card/page.tsx` | 卡片编辑入口改向 console | 是/否/发布权限/否 | 否；控制台收口 | 依赖统一编辑器 |
| `M` | `src/app/workbench/leads/page.tsx` | Lead 页面入口调整 | 是/否/Lead/否 | 否；控制台收口 | 需和 API 状态组一致 |
| `M` | `src/app/workbench/page.tsx` | 旧工作台入口兼容调整 | 是/否/入口/否 | 否；控制台收口 | 不应形成第二后台 |
| `M` | `src/app/workbench/products/page.tsx` | 产品入口调整 | 是/否/产品租户/否 | 否；控制台收口 | 产品仍主要按 userId 归属 |
| `M` | `src/components/AuthCard.tsx` | 使用服务端 redirectTo，不再硬编码 dashboard | 是/否/认证入口/否 | 否；注册发布批次 | 需覆盖未登录/已登录分支 |
| `M` | `src/components/ai/AiChatClient.tsx` | AI 交互入口/文案调整 | 是/否/AI/否 | 否；AI 收口批次 | 不能伪造调用成功 |
| `M` | `src/components/ai/ReceptionConfigClient.tsx` | AI 接待配置入口调整 | 是/否/AI权限/否 | 否；AI 收口批次 | 需验证 provider 未配置安全失败 |
| `M` | `src/components/dashboard-v1/AppearancePanel.tsx` | 编辑器样式/信息架构调整 | 是/否/发布/否 | 否；控制台收口 | UI 改动需移动端验收 |
| `M` | `src/components/dashboard-v1/DashboardFrame.tsx` | 编辑器拆为 content/style/publish 区段 | 是/否/发布/否 | 否；控制台收口 | 可能影响预览与保存一致性 |
| `M` | `src/components/dashboard-v1/DashboardV1Client.tsx` | 编辑器状态、保存和发布接线调整 | 是/否/发布/否 | 否；控制台收口 | 业务状态较集中，需独立复审 |
| `M` | `src/components/dashboard-v1/LinksPanel.tsx` | 链接编辑器入口/布局调整 | 是/否/组件/否 | 否；控制台收口 | 组件 CRUD 闭环需确认 |
| `M` | `src/components/dashboard-v1/SharePanel.tsx` | 分享面板入口/文案调整 | 是/否/分享/否 | 否；控制台收口 | 公开 URL 需真实校验 |
| `M` | `src/components/dashboard-v1/UpgradeDialog.tsx` | 升级入口调整 | 是/否/会员/否 | 否；商业收口批次 | 套餐显示必须与合同配置一致 |
| `M` | `src/components/dashboard-v1/types.ts` | 编辑器类型增加发布字段 | 是/否/发布/否 | 否；数据库/发布批次 | 与 DTO/schema 需同步 |
| `M` | `src/components/dashboard/DashboardSidebar.tsx` | 侧栏入口对齐 console | 是/否/入口/否 | 否；控制台收口 | 三套导航并存风险 |
| `M` | `src/components/layout/console-navigation.ts` | 主导航改为概览/名片/客户/数据/AI 接待 | 是/否/入口/否 | 否；控制台收口 | 这是用户心智主线，需单独复审 |
| `M` | `src/components/notifications/NotificationBell.tsx` | 通知入口/行为调整 | 是/否/入口/否 | 否；控制台收口 | 通知链接需不再指向旧后台 |
| `M` | `src/components/onboarding/OnboardingWizard.tsx` | 新增三步名片创建/预览/发布路径 | 是/否/发布/否 | 否；注册发布批次 | 真实持久化和移动端需验收 |
| `M` | `src/components/public-profile/PublicProfileClientWrapper.tsx` | 公开页 CTA/AI 接线调整 | 是/否/公开AI/否 | 否；公开闭环批次 | 公开页必须继续可用且不泄露内部数据 |
| `M` | `src/components/share/PublicContactActions.tsx` | 联系动作文案/入口调整 | 是/否/Lead/否 | 否；公开闭环批次 | 需确认来源组件和 Lead 生成 |
| `M` | `src/components/share/PublicProfileHero.tsx` | 公开页主动作调整 | 是/否/公开页/否 | 否；公开闭环批次 | CTA 不能伪造 AI/联系成功 |
| `M` | `src/components/share/PublicProfileStickyAction.tsx` | 粘性 CTA 统一为咨询/留需求 | 是/否/Lead+AI/否 | 否；公开闭环批次 | 需浏览器验收单一 CTA |
| `M` | `src/components/share/SharePageRenderer.tsx` | 公开渲染入口调整 | 是/否/公开页/否 | 否；公开闭环批次 | 编辑/预览/公开一致性风险 |
| `M` | `src/components/workbench/LeadsClient.tsx` | Lead 默认筛选为待处理，状态组 UI | 是/否/Lead/否 | 否；Lead 收口批次 | 旧状态和新状态仍并存 |
| `M` | `src/components/workbench/WorkbenchShell.tsx` | 明确 workbench 仅为兼容来源 | 是/否/入口/否 | 否；控制台收口 | 不能仅靠注释证明已收口 |
| `M` | `src/lib/billing/payments.ts` | 支付宝 return_url 改到 console | 是/否/支付/否 | 否；支付独立批次 | 真实回调仍待配置/服务器验证 |
| `M` | `src/lib/dashboard-data.ts` | Profile DTO 增加 firstPublishedAt | 是/是/发布/否 | 否；数据库/发布批次 | DTO 与生成客户端需一致 |
| `M` | `src/lib/handle.ts` | 扩大临时用户名识别规则 | 是/否/注册/否 | 否；注册发布批次 | 可能误判合法旧用户名 |
| `M` | `src/lib/notifications/store.ts` | 通知 actionUrl 改到 console | 是/否/入口/否 | 否；控制台收口 | 通知历史数据兼容 |
| `M` | `src/lib/username-registry.ts` | 新注册 profile 默认不公开 | 是/是/发布权限/否 | 否；注册发布批次 | 与迁移默认值一致性需验证 |
| `M` | `src/proxy.ts` | 增加旧 dashboard/workbench 到 console 的 308 重定向 | 是/否/权限入口/否 | 否；控制台收口 | Host/登录/查询参数兼容风险 |
| `M` | `tests/ai-reception-ui-closeout.test.ts` | 测试期待 console AI 接待入口 | 是/否/AI/否 | 否；AI/控制台测试 | 主要为结构性测试，不是浏览器验收 |
| `M` | `tests/console-navigation.test.ts` | 更新主导航与 console-only 合同 | 是/否/入口/否 | 否；控制台测试 | 不能证明所有旧入口已不可达 |
| `M` | `tests/legacy-routes.test.ts` | 将 dashboard 测试改为兼容重定向 | 是/否/入口/否 | 否；控制台测试 | 只检查源文件文本 |
| `M` | `tests/mobile-layout.test.ts` | 更新移动布局断言 | 是/否/UI/否 | 否；控制台测试 | 非视觉真实设备测试 |
| `M` | `tests/public-profile-redesign.test.tsx` | 更新公开 CTA 文案断言 | 是/否/公开Lead/AI/否 | 否；公开闭环测试 | Mock 通过不等于生产接口通过 |
| `M` | `tsconfig.json` | 将 `sites` 排除 TypeScript | 否/否/工程隔离/否 | 否；工程隔离 | 可能掩盖独立 site 类型问题 |

## 5. B：未跟踪 PREEXISTING_BUSINESS_CHANGE（逐文件/目录）

### `.superpowers/sdd/**`：12 个流程文档

以下 12 个文件在第 0 批开始前已存在，属于既有任务/评审文档，不属于本次审计报告；不涉及业务代码、数据库、支付、AI、权限或租户，也不包含本轮发现的密钥。可单独提交，但必须由老板确认是否纳入 Link168 基线：

```text
.superpowers/sdd/progress.md
.superpowers/sdd/task-5-brief.md
.superpowers/sdd/task-5-report.md
.superpowers/sdd/task-5-review-package-r2.md
.superpowers/sdd/task-5-review-package.md
.superpowers/sdd/task-6-brief.md
.superpowers/sdd/task-6-report.md
.superpowers/sdd/task-6-review-package-r2.md
.superpowers/sdd/task-6-review-package-r3.md
.superpowers/sdd/task-6-review-package.md
.superpowers/sdd/task-7-brief.md
.superpowers/sdd/task-7-report.md
```

### 业务/数据库/测试未跟踪文件

| Git 状态 | 文件 | 实际摘要 | 域 | 单独提交/推荐批次 | 风险 |
|---|---|---|---|---|---|
| `??` | `prisma/migrations/202607270001_profile_first_publish/migration.sql` | Profile 默认不公开，新增 first_published_at | 是/是/发布权限/否 | 否；数据库发布批次 | 未在本批执行隔离迁移 |
| `??` | `src/app/console/account/page.tsx` | console 账号页 | 是/否/入口/否 | 否；控制台收口 | 新入口与旧账号页重复 |
| `??` | `src/app/console/ai-reception/page.tsx` | console AI 接待页 | 是/否/AI权限/否 | 否；AI/控制台批次 | 真实 provider 未验证 |
| `??` | `src/app/console/ai/[assistant]/page.tsx` | console 助手详情页 | 是/否/AI权限/否 | 否；AI/控制台批次 | 动态助手权限需复核 |
| `??` | `src/app/console/analytics/page.tsx` | console 经营数据页 | 是/否/统计/否 | 否；控制台批次 | 需要真实事件数据 |
| `??` | `src/app/console/card/page.tsx` | console 名片编辑页 | 是/否/发布/否 | 否；控制台/发布批次 | 与旧 DashboardV1 共用底座，需复审 |
| `??` | `src/app/console/enterprise/page.tsx` | console 企业页 | 是/否/Workspace租户/否 | 否；企业权限批次 | 不能据页面存在认定企业闭环 |
| `??` | `src/app/console/knowledge/page.tsx` | console 知识库页 | 是/否/AI租户/否 | 否；AI/RAG批次 | 当前不是完整 RAG |
| `??` | `src/app/console/leads/page.tsx` | console Lead 页 | 是/否/Lead租户/否 | 否；Lead 批次 | 仍依赖个人 profile 归属 |
| `??` | `src/app/console/membership/page.tsx` | console 会员页 | 是/否/支付会员/否 | 否；商业批次 | 真实支付未验证 |
| `??` | `src/app/console/notifications/page.tsx` | console 通知页 | 是/否/入口/否 | 否；控制台批次 | 需检查通知权限 |
| `??` | `src/app/console/products/page.tsx` | console 产品页 | 是/否/产品租户/否 | 否；产品批次 | Product 仍 userId 归属 |
| `??` | `src/app/console/short-links/page.tsx` | console 短链页 | 是/否/统计/否 | 否；控制台批次 | 短链归属需继续复核 |
| `??` | `src/components/dashboard-v1/PublicationPanel.tsx` | 发布/分享/下线 UI | 是/否/发布权限/否 | 否；发布批次 | 仅 UI 不能证明公开成功 |
| `??` | `src/lib/legacy-console-routes.ts` | 旧后台到 console 路由映射 | 是/否/入口/否 | 否；控制台批次 | 308 重定向兼容风险 |
| `??` | `src/lib/onboarding.ts` | onboarding 完成判定和登录目标 | 是/否/注册发布/否 | 否；注册发布批次 | 判定规则需与服务端一致 |
| `??` | `tests/saas-ease-closeout.test.ts` | onboarding、发布、console 路由和 CTA 结构测试 | 是/是（读取 Schema/迁移）/发布/否 | 否；对应业务批次 | 源码文本测试不能替代真实流程 |

## 6. C：GENERATED_ARTIFACT

### 已跟踪 Prisma 生成文件：6 个

这些文件实际 diff 主要是 `firstPublishedAt` 字段和 Prisma 内联 Schema/客户端元数据变化；业务源头是 `prisma/schema.prisma`，不应单独提交。

```text
src/generated/prisma/edge.js
src/generated/prisma/index-browser.js
src/generated/prisma/index.d.ts
src/generated/prisma/index.js
src/generated/prisma/package.json
src/generated/prisma/schema.prisma
```

域：业务逻辑否（生成代码会影响编译）、数据库是（由 Schema 派生）、支付/AI/权限/Workspace 否（仅派生全 Schema）、疑似密钥/个人数据否。建议：若仓库政策继续跟踪生成物，只能与经批准的 Schema/迁移提交绑定；否则禁止独立提交。

### `sites/link168-test` 生成文件：29,697 个

以下目录下所有文件统一分类 C，均为依赖、构建、字体、Cloudflare/Wrangler 或部署生成物；不适合提交：

```text
sites/link168-test/node_modules/**
sites/link168-test/dist/**
sites/link168-test/.vinext/**
sites/link168-test/.wrangler/**
```

它们涉及独立 site 的构建环境，不属于 Link168 主应用业务、数据库、支付、AI 或租户边界；不能通过“排除 sites”配置把它们变成主仓库可提交内容。

## 7. D：SECRET_OR_ENVIRONMENT

| Git 状态 | 文件 | 摘要 | 域 | 是否适合提交 | 风险 |
|---|---|---|---|---|---|
| `??`（目录折叠） | `sites/link168-test/.openai/hosting.json` | Sites 部署项目配置，含项目标识，不含本轮发现的密钥 | 否/否/部署环境/否 | 否，待专门确认 | 不应与主应用基线混合；项目标识也不应随意公开扩散 |

仓库根目录还存在 `.env.example` 和被忽略的 `.env.local`。本批未读取或输出其值；它们不在未提交状态清单中。内容扫描只报告文件名/命中路径，没有发现未跟踪差异中出现私钥、完整 Token 或完整连接字符串的证据，但不能替代密钥轮换和生产配置审计。

## 8. E：UNKNOWN

### `sites/link168-test` 中 30 个未知源/锁文件

这些文件不是 Link168 主应用，也无法从主仓库 Git 历史确认来源；应保持隔离，不得纳入任何 Link168 基线提交：

```text
sites/link168-test/.gitignore
sites/link168-test/drizzle.config.ts
sites/link168-test/eslint.config.mjs
sites/link168-test/next.config.ts
sites/link168-test/package-lock.json
sites/link168-test/package.json
sites/link168-test/postcss.config.mjs
sites/link168-test/README.md
sites/link168-test/tsconfig.json
sites/link168-test/vite.config.ts
sites/link168-test/app/chatgpt-auth.ts
sites/link168-test/app/ExperienceLab.tsx
sites/link168-test/app/globals.css
sites/link168-test/app/layout.tsx
sites/link168-test/app/page.tsx
sites/link168-test/build/sites-vite-plugin.ts
sites/link168-test/db/index.ts
sites/link168-test/db/schema.ts
sites/link168-test/drizzle/meta/_journal.json
sites/link168-test/examples/d1/app/api/notes/route.ts
sites/link168-test/examples/d1/db/schema.ts
sites/link168-test/public/favicon.svg
sites/link168-test/public/file.svg
sites/link168-test/public/globe.svg
sites/link168-test/public/link168-logo.png
sites/link168-test/public/mist-forest.webp
sites/link168-test/public/og.png
sites/link168-test/public/window.svg
sites/link168-test/tests/rendered-html.test.mjs
sites/link168-test/worker/index.ts
```

这些文件中 `ExperienceLab.tsx` 明确写明是“不连接正式数据”的验收镜像，使用页面内存状态和演示数字；它不是主应用真实闭环证据。

### `sites/link168-test/.git/**` 中 79 个 nested Git 文件

该目录是一个嵌套 Git 仓库的内部控制文件集合，来源、独立分支、历史和归属未纳入主仓库基线；分类 E，不读取/修改，不提交。

## 9. 是否存在来源不明改动

存在。具体为整个 `sites/link168-test` 独立站目录及其 nested Git/构建环境，以及 `.superpowers` 既有流程文档是否应进入正式主仓库基线尚未得到老板逐项确认。主应用 55 个已跟踪文件和 17 个未跟踪业务文件虽然能按功能识别，但仍属于审计开始前已有未提交改动，不能自动视为已批准基线。

## 10. 工作区是否适合直接进入第 1 批

不适合。原因不是本地编译：第 0 批曾验证当前代码门禁通过；阻断原因是工作区包含 29,844 个未跟踪文件、嵌套仓库、构建依赖和来源不明 site，且主应用业务改动尚未按边界独立审阅/提交。第 1 批应在老板确认提交分组或提供独立 worktree 后开始。
