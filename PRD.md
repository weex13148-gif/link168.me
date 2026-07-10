# Link168 V2 生产级一体化产品需求文档

- 文档名称：Link168 V2 生产级一体化产品需求文档
- 文档状态：当前有效
- 适用范围：真实生产产品的本地开发、测试、上线、运营和后续 V2 改版
- 最后更新日期：2026-07-05
- 事实基线：本地代码 + Prisma Schema + 最新代码审计（HEAD `ce45c4e`，分支 `master`）
- 目标基线：统一 `/console`、个人与企业工作空间、公开经营名片、用户组件、`/showcase` 和 `/jeepwork`

---

## 状态标签约定

文档全程使用如下统一状态标签，禁止使用"基本完成、差不多、理论上支持、应该可用、预计已有、后续完善、大概率没问题"等模糊表述：

- 【已实现】：当前代码已落地且可用
- 【部分实现】：已落地但存在功能缺口或已知 BUG
- 【本次改版】：V2 改版目标，当前无对应代码或需重构
- 【未来预留】：长期规划，V2 不交付
- 【历史废弃】：旧设计，已失效，不再维护
- 【待核验】：尚未通过代码或审计核验

---

## 1. 文档目标与生产级前提

### 1.1 文档目标

本文档是 Link168 的产品总 PRD，统一覆盖：

1. 当前真实生产状态（基于本地代码核验）
2. V2 改版目标（统一 `/console` 控制台、个人/企业工作空间、用户组件体系、AI 双产品线、Lead 与 Channel、套餐/订单/支付/退款/降级、`/showcase`、`/jeepwork`）
3. 后续演进路线与未来预留功能

### 1.2 生产级前提（最高约束）

- Link168 是**已真实上线、真实部署、真实运营**的生产级 SaaS 产品，不是教学案例、不是比赛 Demo、不是 PoC。
- `/showcase` 仅为**受控外部展示入口**（评委、投资人、政府），不等于产品本体，不得作为产品能力边界。
- 任何"教学化、Demo 化、PoC 化"的描述、命名、注释、UI 文案均禁止进入代码与文档。
- 所有变更须遵守 `PROJECT_RULES.md` 工程与安全红线，生产数据库修改须先备份、灰度、审计。
- 文档不得写入任何真实密钥、密码、连接串、Token。所有 Key 通过环境变量或 KMS 注入。

### 1.3 文档优先级

依据 `PROJECT_RULES.md` 第二章，文档读取优先级由高到低：

1. `PROJECT_RULES.md`（工程与安全红线，最高）
2. `PRD.md`（本文件）
3. `ROADMAP.md`
4. `SPRINT.md`
5. `docs/PRICING_AND_ENTITLEMENTS.md`
6. `docs/UI_ARCHITECTURE.md`

冲突裁决规则：

- 目标架构冲突 → 以老板最新指导为准
- 当前状态冲突 → 以本地真实代码/Schema 为准
- 代码未核验 → 标注【待核验】，不得自行推断
- 历史材料（`docs/archive/**`、`docs/product/01-PRD.md` 等）不得作为新开发依据

---

## 2. 产品定位与商业闭环

### 2.1 产品统一定位

Link168 是面向**中文创作者、小商家、自由职业者、一人公司和小型销售团队**的 **AI 经营名片平台**。

核心价值链（一以贯之）：

> 展示身份 → 展示产品服务 → 二维码短链接引流 → AI 接待咨询 → 收集客户线索 → 跟进转化 → 数据分析 → 持续经营

### 2.2 商业闭环

| 阶段 | 关键能力 | 当前状态 |
|---|---|---|
| 展示身份 | 公开主页 `/[username]`、3 套模板、用户组件 | 【已实现】 |
| 展示产品服务 | Product 模型、Offer 模块、文件交付 | 【已实现】 |
| 引流 | Link、ShortLink、二维码、Channel 归因 | 【部分实现】 |
| AI 接待 | 访客侧"AI 接待助手"（commercial-agent） | 【已实现】 |
| 收集线索 | Lead 模型、LeadFollowUp | 【已实现】 |
| 跟进转化 | LeadFollowUp、状态机 | 【部分实现】 |
| 数据分析 | analytics、stats、ProfileVisit、LinkClick | 【已实现】 |
| 持续经营 | 套餐、会员、AI 额度 | 【部分实现】 |

### 2.3 商业模式

- 订阅制：年付会员套餐（免费 / Plus / Pro / 企业 / 企业专业 Plus）
- 增值：AI 额度包、企业版定制、域名绑定
- 内部测试：`internal_test` 套餐年付 0.01 元，仅限 `super_admin` 验证支付闭环

---

## 3. 用户、角色与权限矩阵

### 3.1 角色定义

| 角色 | 标识 | 当前状态 | 说明 |
|---|---|---|---|
| 访客（Anonymous Visitor） | 未登录 | 【已实现】 | 浏览公开主页、与 AI 接待助手对话（受套餐与三层权限约束） |
| 注册用户（Registered User） | `role=user` | 【已实现】 | 个人工作空间所有者 |
| 企业管理员（Enterprise Admin） | `role=enterprise_admin` | 【本次改版】 | 企业工作空间管理员，当前无 Workspace 模型 |
| 企业成员（Enterprise Member） | `role=enterprise_member` | 【本次改版】 | 企业工作空间被邀请成员 |
| 平台管理员（Super Admin） | `role=super_admin` | 【已实现】 | `/jeepwork` 平台控制平面 |
| 平台运营（Platform Operator） | `role=platform_operator` | 【待核验】 | 是否在 `permissions.ts` 中独立定义待核验 |
| 比赛访客（Showcase Visitor） | Showcase Gate 校验 | 【已实现】 | `/showcase` 受控访客，非产品角色 |

### 3.2 权限矩阵（V2 目标）

| 能力域 | 访客 | 注册用户 | 企业管理员 | 企业成员 | Super Admin |
|---|---|---|---|---|---|
| 浏览公开主页 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 与 AI 接待助手对话 | 受限 | 不适用 | 不适用 | 不适用 | 不适用 |
| 个人工作空间 | ✗ | ✓ | ✓（个人副空间） | ✓（个人副空间） | ✓ |
| 企业工作空间 | ✗ | ✗ | 全权 | 受邀范围 | 跨租户审计 |
| `/console` 控制台 | ✗ | ✓ | ✓ | ✓ | ✓ |
| `/jeepwork` 平台控制 | ✗ | ✗ | ✗ | ✗ | ✓ |
| `/showcase` 受控入口 | ✗ | ✗ | ✗ | ✗ | ✓ |
| 套餐订阅与支付 | ✗ | ✓ | ✓ | 受限 | ✓ |

### 3.3 权限实现现状

- 【已实现】API 级权限校验：`src/lib/admin-governance/permissions.ts`、`src/lib/jeepwork-auth.ts`、`src/lib/admin-auth.ts`
- 【已实现】Layout 级保护：`/jeepwork`、`/workbench` 通过 layout 校验
- 【历史废弃】`middleware.ts` 不存在，未使用中间件级路由保护
- 【本次改版】V2 需在 `/console` 引入统一的 Workspace 上下文 + 路由级守卫
- 【已知缺口】`/admin` 路由 6 个页面全部 `notFound()`，权限层级需重新梳理

---

## 4. 当前代码真实状态（基于事实基线）

### 4.1 项目元信息

- 项目路径：`D:\link168\link.me`
- Git 分支：`master`，HEAD：`ce45c4e`
- 框架：Next.js（App Router）
- ORM：Prisma
- 当前未发现 `middleware.ts`

### 4.2 路由现状

| 路由前缀 | 页面数 | 当前状态 | 说明 |
|---|---|---|---|
| `/[username]` | 1 | 【已实现】 | 公开主页（SharePageRenderer，3 套模板） |
| `/dashboard` | 1 | 【已实现】 | V1 名片编辑器，单 page.tsx |
| `/workbench` | 13 | 【已实现】 | V1 用户工作台：account, ai, ai/[assistant], ai-service, analytics, card, enterprise, leads, membership, products, short-links + 首页 |
| `/jeepwork` | 20 | 【已实现】 | 平台控制平面 |
| `/showcase` | 4 | 【已实现】 | judge / investor / government + 首页 |
| `/admin` | 6 | 【部分实现】 | 全部 `notFound()` 返回 404 |
| `/console` | 0 | 【本次改版】 | V2 统一控制台，路由和 API 均不存在 |
| `/login` `/register` `/forgot-password` `/reset-password` `/verify-email` | 各 1 | 【已实现】 | 认证流程 |
| `/pricing` | 1 | 【已实现】 | 套餐展示 |
| `/go/[linkId]` `/s/[slug]` | 各 1 | 【已实现】 | 链接跳转与短链 |
| `/report` `/help` `/privacy` `/terms` | 各 1 | 【已实现】 | 公共页面 |

### 4.3 Prisma 模型清单（37 个）

User, FreezeRecord, UsernameHistory, UsernameRegistry, Profile, Link, LinkClick, ProfileVisit, ShortLink, ShortLinkClick, Session, Report, PasswordResetToken, EmailVerificationToken, LoginAttempt, AppConfig, AiUsageLog, AdminAuditLog, Lead, LeadFollowUp, EmailSendLog, Product, KnowledgeDoc, AiServiceConfig, AiConversation, AiMessage, AiCreditAccount, AiCreditLedger, MembershipSubscription, Order, CompetitionFile, ShowcaseContent, ShowcaseSequence, ShowcaseAIDemoCall, ShowcaseAIDebugLog, ShowcasePromptDraft, ContentModerationRecord

【本次改版】需新增：Workspace, WorkspaceMember, Organization, Team, Department（当前全部缺失）。

### 4.4 关键已知 BUG 与缺口

1. **AI 额度不一致 BUG**【部分实现】
   - `src/lib/ai/permissions.ts` 的 `PLAN_AI_LIMITS`：`member_basic=200`、`member_plus=2000`、`enterprise=-1`（无限）
   - `src/lib/billing/plans.ts` 的 `PLAN_DEFINITIONS`：`member_basic=300`、`member_plus=300`、`enterprise=10000`、`enterprise_pro_plus=50000`、`internal_test.aiCreditsGrant=10000`
   - `permissions.ts` 缺失 `enterprise_pro_plus` 和 `internal_test` 键
   - 影响：套餐展示、扣减、查询走不同源，运营与对账无法对齐
   - 后续任务：统一为单一真实源（建议以 `plans.ts` 为准，`permissions.ts` 改为从 `plans.ts` 派生）

2. **退款未调用支付宝接口**【部分实现】
   - `src/lib/billing/orders.ts` 的 `processRefund` 仅更新本地订单状态
   - 未调用支付宝 `alipay.trade.refund` 接口
   - 影响：用户钱包到账与平台订单状态不一致

3. **无自动到期降级**【部分实现】
   - 当前为惰性降级：3 天宽限期，下次调用时检查
   - 无定时任务（cron job）扫描过期会员并降级
   - 影响：过期用户在宽限期内仍可正常使用 AI

4. **`/admin` 6 页面全部 404**【部分实现】
   - 全部 `notFound()`，UI 入口存在但功能未实现

5. **知识库仅 prompt stuffing**【部分实现】
   - 直接拼接，最多 12 篇，无向量检索、无分片、无 rerank

6. **企业版几乎全为空壳**【部分实现】
   - 无 Workspace 模型、无成员邀请、无角色分级

---

## 5. 当前生产架构与外部依赖

### 5.1 部署架构

| 组件 | 规格 | 提供方 | 当前状态 |
|---|---|---|---|
| 主站（Web 应用） | 4 核 4G | 腾讯云 | 【已实现】 |
| PostgreSQL | 2 核 2G | 阿里云 | 【已实现】 |
| 邮件推送 | - | 阿里云邮件推送 | 【已实现】 |
| AI 模型 | - | 阿里云百炼 | 【已实现】 |
| 支付收款 | - | 支付宝 | 【已实现】（闭环已打通） |
| 微信支付 | - | - | 【本次改版】仅占位，未实现 |

### 5.2 关键依赖组件

- `src/lib/ai/providers/bailian.ts`、`bailian-application.ts`：阿里云百炼 AI Provider
- `src/lib/billing/providers/`：支付 Provider（支付宝已实现，沙箱已实现，微信占位）
- `src/lib/mail.ts`：阿里云邮件推送
- `src/lib/upload-storage.ts`：文件存储【待核验】具体后端
- `scripts/db/backup-db.{js,ps1,sh}`、`restore-db.{js,ps1,sh}`：数据库备份与恢复

### 5.3 安全边界

- 严禁 Agent 擅自连接生产环境
- 严禁在生产执行 `prisma migrate reset`
- 内部 Service Account（`isSystem=true`）密码/角色不可通过后台 API 修改
- `admin_audit_logs` 不可被任何人删除

---

## 6. 事实基线与目标基线

### 6.1 事实基线（当前真实状态）

- 双后台：`/dashboard`（V1 名片编辑器）+ `/workbench`（13 页用户工作台）
- 平台控制：`/jeepwork`（20 页）
- 受控展示：`/showcase`（4 页）
- 无 `/console` 路由和 API
- 无 Workspace / Organization / Team / Department 模型
- 支付宝闭环已通，微信未通
- AI 双产品线已分离（访客侧 commercial-agent、用户侧 assistants 7 个 Agent）
- AI 额度存在 BUG，退款未联调支付宝，无自动降级

### 6.2 目标基线（V2 改版）

- 统一 `/console` 控制台（个人工作空间 + 企业工作空间）
- 引入 Workspace 数据模型与数据归属体系
- 保留 `/dashboard` 与 `/workbench` 作为兼容路由（不删除，跳转至 `/console` 对应位置）
- 修复 AI 额度不一致、退款联调、自动降级定时任务
- 公开经营名片、用户组件、AI 双产品线、Lead、Channel 收口至 `/console`
- `/showcase` 与 `/jeepwork` 保持严格隔离

### 6.3 迁移原则

参见第 21 章与第 26 章。核心：**禁止一次性破坏性迁移**，按"新增表 → 映射 → 回填 → 双读 → 灰度 → 验证 → 旧字段退役"七步推进。

---

## 7. V2 总体信息架构（/console 统一控制台【本次改版】）

### 7.1 设计目标

将 V1 的 `/dashboard`（名片编辑器）和 `/workbench`（13 页工作台）合并为单一 `/console` 控制台，并新增企业工作空间能力。`/console` 是 V2 的用户主入口。

### 7.2 顶层信息架构

```
/console
├── /console/home                    首页（经营总览）
├── /console/profile                 名片与公开主页编辑
├── /console/products                产品与服务（Offer）
├── /console/links                   链接管理
├── /console/short-links             短链接管理
├── /console/analytics               数据分析
├── /console/leads                   客户线索
├── /console/channels                渠道与归因【本次改版】
├── /console/ai                      经营 AI 工具箱（用户侧 7 Agent）
├── /console/ai-reception            AI 接待助手配置（访客侧）
├── /console/knowledge               知识库
├── /console/membership              套餐与会员
├── /console/billing                 订单与支付
├── /console/account                 账号与安全
├── /console/workspace               工作空间切换
│   ├── /console/workspace/personal  个人工作空间
│   └── /console/workspace/enterprise 企业工作空间【本次改版】
├── /console/team                    团队与成员【本次改版】
├── /console/integrations            集成与 API【未来预留】
└── /console/settings                通用设置
```

### 7.3 控制台核心特性

- 工作空间切换器：顶部固定，可在个人与企业工作空间之间无刷新切换
- 上下文隔离：URL 中显式携带 `workspaceId`，所有数据查询与 workspace 强绑定
- 统一的导航、面包屑、权限提示
- 移动端响应式适配（参见第 24 章）

### 7.4 验收标准

- 所有 V1 的 `/dashboard` 和 `/workbench` 能力在 `/console` 中均有对应入口
- `workspaceId` 缺失时安全降级到个人工作空间
- 跨工作空间数据零泄漏（自动化测试覆盖）

---

## 8. 路由规划与兼容策略

### 8.1 兼容保留原则

V1 双后台 `/dashboard` 和 `/workbench` 在 V2 中**必须兼容保留**，不删除、不返回 404。

### 8.2 兼容实现

- `/dashboard` → 重定向到 `/console/profile`（保留 V1 编辑器入口供回滚）
- `/workbench/*` → 重定向到 `/console/*` 对应位置
- 旧 API 路径 `/api/dashboard/*` 和 `/api/workbench/*` 保留 6 个月，期间逐步迁移到 `/api/console/*`
- `/jeepwork` 与 `/showcase` 不动

### 8.3 路由映射表

| V1 路由 | V2 路由 | 兼容策略 |
|---|---|---|
| `/dashboard` | `/console/profile` | 301 重定向 |
| `/workbench` | `/console/home` | 301 重定向 |
| `/workbench/ai` | `/console/ai` | 301 重定向 |
| `/workbench/ai/[assistant]` | `/console/ai/[assistant]` | 301 重定向 |
| `/workbench/ai-service` | `/console/ai-service`（或合并入 `/console/ai`） | 301 重定向 |
| `/workbench/analytics` | `/console/analytics` | 301 重定向 |
| `/workbench/card` | `/console/profile` | 301 重定向 |
| `/workbench/enterprise` | `/console/workspace/enterprise` | 301 重定向 |
| `/workbench/leads` | `/console/leads` | 301 重定向 |
| `/workbench/membership` | `/console/membership` | 301 重定向 |
| `/workbench/products` | `/console/products` | 301 重定向 |
| `/workbench/short-links` | `/console/short-links` | 301 重定向 |
| `/workbench/account` | `/console/account` | 301 重定向 |

### 8.4 验收标准

- 旧书签访问不报 404
- 重定向后用户身份与工作空间上下文保持
- 重定向链路不超过 1 跳

---

## 9. 个人工作空间

### 9.1 当前状态

【已实现】用户注册后自动拥有个人工作空间（隐式，无 Workspace 模型）。`/workbench` 即个人工作空间入口。

### 9.2 目标状态（V2）

- 显式建立 `PersonalWorkspace`（在 Workspace 模型中 `type=personal`）
- 每个 User 拥有且仅拥有一个 PersonalWorkspace
- 个人工作空间数据：Profile、Link、Product、ShortLink、Lead、KnowledgeDoc、AiConversation、AiCreditAccount、MembershipSubscription、Order 等
- `/console/workspace/personal` 为默认工作空间

### 9.3 验收标准

- 用户登录后默认进入个人工作空间
- 个人工作空间数据无法被企业工作空间访问
- 个人工作空间删除（账号注销）须走二次确认 + 延迟删除流程

---

## 10. 企业工作空间（【本次改版】）

### 10.1 当前状态

【本次改版】Prisma 中**无 Workspace / WorkspaceMember / Organization / Team / Department 模型**，企业版相关 UI（`/workbench/enterprise`、`/console/workspace/enterprise`）几乎全为空壳。

### 10.2 目标数据模型（V2 新增）

- `Workspace`：`id`、`name`、`slug`、`type(personal|enterprise)`、`ownerId`、`createdAt`
- `WorkspaceMember`：`id`、`workspaceId`、`userId`、`role(owner|admin|member|viewer)`、`joinedAt`
- `Organization`：企业主体（统一社会信用代码、法人、联系方式）
- `Team` / `Department`：组织内分组【未来预留】

### 10.3 目标能力

- 企业管理员邀请成员加入企业工作空间
- 成员角色分级：owner / admin / member / viewer
- 数据归属：所有业务数据关联 `workspaceId`，跨工作空间严格隔离
- 企业工作空间切换：与个人工作空间并存，用户可同时拥有
- 企业套餐：`enterprise` / `enterprise_pro_plus` 关联到企业工作空间

### 10.4 验收标准

- 创建企业工作空间后，可邀请成员并分配角色
- 成员退出后无残留数据访问
- 企业工作空间删除须 7 天冷静期 + 备份导出

---

## 11. 公开经营名片（/[username]）

### 11.1 当前状态

【已实现】

- 路由：`/[username]`，文件：`src/app/[username]/page.tsx`
- 渲染器：`src/components/share/SharePageRenderer.tsx`
- 3 套模板
- 用户组件（share/modules）：13 个
- 公开 API：`/api/public/[username]/vcard`、`/api/public/[username]/visit`
- 访问统计：ProfileVisit 模型

### 11.2 模块清单（13 个）

- AiChatModule（AI 接待助手入口）
- BilibiliVideoModule、YoutubeVideoModule、NeteaseMusicModule、MusicLinkModule、VideoLinkModule（多媒体）
- CarouselModule（轮播）
- CoverImageModule（封面）
- CopyTextModule（复制文本）
- DividerModule（分隔）
- PopupImageModule（弹窗图片）
- SafeImage（图片安全包装）
- ModuleFallback（兜底）

### 11.3 V2 目标

- 增加 Offer 模块（参见第 13 章）
- 增加 Channel 入口可视化
- 模板扩展至 5 套【未来预留】
- SEO 与结构化数据增强

### 11.4 验收标准

- 公开主页在 4G 弱网下首屏 < 2s
- 模块配置错误时不导致整页崩溃（ModuleFallback 兜底）
- 访客与公开主页所有交互均被风控与审计覆盖

---

## 12. 用户组件体系

### 12.1 当前状态

【已实现】`src/features/profile-modules/` 提供 registry + validators 机制：

- `registry.ts`：模块注册表
- `types.ts`：类型定义
- `validators.ts`：校验
- `index.ts`：导出

`src/components/share/modules/` 中 13 个模块实现见第 11.2 节。

### 12.2 V2 目标

- 将组件体系拆分为"展示组件"和"经营组件"两类
- 新增经营组件：Offer 模块、Lead 表单模块、Channel 入口模块、AI 接待浮动按钮（增强）
- 组件市场【未来预留】

### 12.3 验收标准

- 每个组件独立可测、独立可禁用
- 禁用某组件不影响其他组件渲染
- 组件 schema 变更须向后兼容

---

## 13. Offer 产品服务

### 13.1 当前状态

【已实现】Product 模型：

- `/api/dashboard/products`（CRUD）
- `/api/[username]/products`（公开读取）
- `/workbench/products` 页面
- Product 与 Lead 关联（产品快照在 LeadFollowUp 中）

### 13.2 V2 目标

- 重命名为 Offer（对外品牌），代码层保留 Product 模型
- 新增：Offer 价格、库存、交付方式（文件 / 链接 / 服务时长）
- Offer 与 Channel 关联（哪个渠道推广哪个 Offer）
- Offer 在公开主页以专属模块展示

### 13.3 验收标准

- 一个 Offer 可被多个 Channel 引用
- Offer 下架后公开主页立即不可见，已生成的 Lead 保留快照

---

## 14. AI 接待助手（访客侧）

### 14.1 命名统一

- 对外统一名称：**AI 接待助手**
- 代码层：`commercial-agent.ts`、`PublicAiAssistant.tsx`
- 路由：`/api/ai/customer-service`、`/api/ai/conversion-agent`、`/api/ai/sales-agent`、`/api/ai/reports`、`/api/ai/risk-events`
- 不再使用"访客 AI"、"公开 AI"、"客服机器人"等混乱命名

### 14.2 当前状态

【已实现】

- 三层权限模型：`src/lib/ai/public-access.ts`、`src/lib/ai/permissions.ts`
- CommercialAgent：`src/lib/ai/commercial-agent.ts`
- 公开 AI 入口组件：`src/components/share/PublicAiAssistant.tsx`、`AiChatModule.tsx`
- 风控：`src/lib/ai/risk-log.ts`、`src/lib/ai/compliance.ts`
- 隐私：`src/lib/ai/privacy.ts`

### 14.3 三层权限

1. 公开访问层（是否启用 AI 接待）
2. 套餐层（套餐是否包含访客侧 AI 额度）
3. 风控层（每日上限、内容审核、敏感词）

### 14.4 V2 目标

- AI 接待助手额度与用户侧经营 AI 额度**分账**（参见第 22 章）
- 增加 AI 接待助手会话归因到 Channel
- 增加 Lead 自动收集（访客对话中表达意向 → 自动生成 Lead）
- AI 接待助手配置入口在 `/console/ai-reception`

### 14.5 验收标准

- 访客匿名对话不泄露用户隐私
- AI 接待助手额度耗尽时降级为"留言收集"模式
- 所有 AI 接待会话可被工作空间所有者审计

---

## 15. 经营 AI 工具箱（用户侧）

### 15.1 命名统一

- 对外统一名称：**经营 AI 工具箱**
- 代码层：`src/lib/ai/assistants.ts`、`src/components/ai/AiChatClient.tsx`
- 路由：`/api/workbench/ai/chat`、`/api/workbench/ai/conversations/[id]`、`/api/workbench/ai/status`
- 不再使用"工作台 AI"、"会员 AI"、"五大 AI"等混乱命名

### 15.2 当前状态

【已实现】7 个 AI Agent（定义在 `assistants.ts`）：

1. 内容创作助手
2. 营销策划助手
3. 客户跟进助手
4. 数据分析助手
5. 经营诊断助手
6. 朋友圈文案助手【待核验】具体名称以代码为准
7. 知识库问答助手【待核验】

### 15.3 额度模型

- 套餐月度额度（`PLAN_AI_LIMITS`）+ 每日风控上限（`DAILY_LIMITS`）+ Credit 余额
- 扣减顺序：套餐月度额度 → Credit
- 幂等键：`idempotencyKey = referenceType:referenceId`

### 15.4 V2 目标

- 经营 AI 额度与 AI 接待助手额度**分账**（参见第 22 章）
- 增加 Agent 编排能力（多 Agent 串联）【未来预留】
- 增加企业知识库（与个人知识库隔离）

### 15.5 验收标准

- 同一会话重复请求不重复扣费
- 额度耗尽时清晰提示并引导升级
- AI 调用失败自动回补额度（refundCredit）

---

## 16. Lead 客户线索

### 16.1 当前状态

【已实现】

- 模型：Lead、LeadFollowUp
- API：`/api/workbench/leads`、`/api/workbench/leads/[id]`
- 页面：`/workbench/leads`（`LeadsClient.tsx`）
- 来源：公开主页表单、AI 接待助手收集、手动录入【待核验】

### 16.2 V2 目标

- Lead 与 Channel 强绑定（每个 Lead 必须有 channel 归因）
- Lead 状态机：新建 → 已联系 → 跟进中 → 已转化 / 已流失
- Lead 自动分配规则【未来预留】
- Lead 跨工作空间可见性：企业工作空间内可共享

### 16.3 验收标准

- Lead 列表可按 Channel、状态、时间筛选
- Lead 跟进记录不可删除（仅可追加）
- Lead 转化后保留全量跟进历史

---

## 17. Channel 渠道与数据

### 17.1 当前状态

【部分实现】

- ShortLink 模型已存在
- 短链接 API：`/api/dashboard/short-links`
- 短链接页面：`/workbench/short-links`
- 归因：`src/lib/analytics/attribution.ts`
- 但**无独立 Channel 模型**，渠道仅作为 ShortLink 的属性

### 17.2 V2 目标

- 新增 Channel 模型（独立实体）：`id`、`workspaceId`、`name`、`type(qrcode|shortlink|wechat|offline|other)`、`offerId`、`createdAt`
- Channel 与 ShortLink 一对多
- Channel 与 Offer 多对多
- Channel 与 Lead 一对多（Lead 必须有 channel 归因）
- `/console/channels` 提供渠道管理与归因分析

### 17.3 验收标准

- 每个渠道可独立查看 PV、UV、Lead 数、转化率
- 渠道删除后历史数据保留（软删除）
- 渠道二维码支持动态参数（utm）

---

## 18. 套餐、订单、支付、退款与降级

### 18.1 套餐清单（基于 `src/lib/billing/plans.ts`，单位：分）

| 套餐代码 | 名称 | 月付 | 年付 | 状态 |
|---|---|---|---|---|
| `free` | 免费版 | 0 | 0 | 【已实现】 |
| `member_basic` | Plus（旧版兼容） | null | 18800（188 元） | 【已实现】legacy |
| `member_plus` | Plus 会员 | null | 18800（188 元） | 【已实现】legacy |
| `pro` | Pro 年付 | null | 38800（388 元） | 【已实现】 |
| `enterprise` | 企业版 | null | null（联系销售） | 【已实现】contactSales |
| `enterprise_pro_plus` | 企业专业 Plus | null | 498000（4980 元） | 【已实现】legacy |
| `enterprise_solution` | 行业方案 | null | 1680000（16800 元） | 【未来预留】按项目报价 |
| `internal_test` | 内部测试 | 1（0.01 元） | 1（0.01 元） | 【已实现】仅 super_admin |

### 18.2 AI 额度不一致 BUG（已知 BUG，必须如实记录）

**事实**：

- `src/lib/billing/plans.ts` 的 `PLAN_DEFINITIONS[].limits.aiChatsPerMonth / aiCreditsGrant`：
  - `free=0`、`member_basic=300`、`member_plus=300`、`pro=2000`、`enterprise=10000`、`enterprise_pro_plus=50000`、`internal_test.aiCreditsGrant=10000 / aiChatsPerMonth=-1`
- `src/lib/ai/permissions.ts` 的 `PLAN_AI_LIMITS`：
  - `free=0`、`starter=200`、`member_basic=200`、`pro=2000`、`member_plus=2000`、`enterprise=-1`（无限）
  - **缺失 `enterprise_pro_plus` 和 `internal_test` 键**

**影响**：

- 用户购买 `member_basic`/`member_plus` 后展示 300，实际扣减 200/2000
- `enterprise_pro_plus` 和 `internal_test` 在 `permissions.ts` 中无 key，回退到默认 0
- 对账与运营报表无法对齐

**目标状态**：以 `plans.ts` 为单一真实源，`permissions.ts` 改为从 `plans.ts` 派生（或直接删除 `PLAN_AI_LIMITS`，全部走 `getPlanDefinition`）。

**后续任务**：

1. 统一为单一真实源
2. 修复 `enterprise_pro_plus` / `internal_test` 缺失键
3. 写迁移脚本回补历史错误扣减的额度
4. 增加单测断言两源一致

**验收标准**：两源 diff 为 0，单测覆盖全部 7 个套餐。

### 18.3 订单与支付

【已实现】

- 模型：Order、MembershipSubscription
- 支付宝闭环已打通
- 微信支付仅占位（`src/lib/billing/providers/`）
- 对账：`src/lib/billing/alipay-reconciliation.ts`、`reconciliation.ts`
- Webhook：`/api/payments/alipay/notify`
- 沙箱：`/api/payments/sandbox/notify`
- 内部对账 cron：`/api/internal/cron/reconcile-alipay`

### 18.4 退款（已知 BUG，必须如实记录）

**事实**：

- `src/lib/billing/orders.ts` 的 `processRefund` 仅更新本地 Order 状态为 `refunded`
- **未调用支付宝 `alipay.trade.refund` 接口**
- 用户钱包不会收到退款

**影响**：本地状态与支付宝侧不一致，财务对账失败。

**目标状态**：调用支付宝退款接口，更新本地状态，写入审计日志，触发 MembershipSubscription 状态变更与 AI 额度回收。

**后续任务**：

1. 接入 `alipay.trade.refund`
2. 失败重试与对账
3. 退款金额校验（不超过原订单）
4. 部分退款支持

**验收标准**：退款后支付宝侧与本地状态一致；审计日志可追溯。

### 18.5 到期降级（已知缺口，必须如实记录）

**事实**：

- 当前为**惰性降级**：3 天宽限期，下次调用时检查
- 无定时任务扫描过期会员
- `aiEnabled` 计算：套餐非 free 且（会员 active 或 3 天宽限期）且 `aiChatsPerMonth != 0`

**影响**：过期用户在宽限期内仍可正常使用 AI，运营成本不可控。

**目标状态**：

- 增加 cron job 每日扫描过期会员
- 宽限期到期后自动降级为 free
- 降级后保留数据，关闭 AI 调用权限
- 通过邮件 / 站内信通知用户

**后续任务**：

1. 实现 `/api/internal/cron/membership-expire`（已有 system-health cron 框架可复用）
2. 降级前 7 天 / 3 天 / 1 天邮件提醒
3. 降级后 AI 额度冻结（不回收，续费后恢复）

**验收标准**：过期 3 天后自动降级；降级记录可审计。

---

## 19. /showcase 外部展示与可信证据中心

### 19.1 定位

`/showcase` 是**受控外部展示入口**，用于比赛评委、投资人、政府监管方查看产品能力与可信证据。**不等于产品本体**，不承载生产用户能力。

### 19.2 当前状态

【已实现】4 个页面：

- `/showcase`（首页，ShowcaseModeSelector）
- `/showcase/judge`（评委视角，JudgeShowcase）
- `/showcase/investor`（投资人视角，InvestorShowcase）
- `/showcase/government`（政府视角，GovernmentShowcase）

配套组件：`ShowcaseGate`、`ShowcaseLayout`、`ShowcaseExperience`、`ShowcaseRoadshow`、`EvidencePanel`、`StatusBadge`、`ShowcaseVisitLogger`。

模型：ShowcaseContent、ShowcaseSequence、ShowcaseAIDemoCall、ShowcaseAIDebugLog、ShowcasePromptDraft。

### 19.3 与产品本体的隔离

- `/showcase` 不写入用户业务数据库
- `/showcase` 的 AI 演示调用独立沙箱（`ShowcaseAIDemoCall`）
- `/showcase` 的访客身份与生产用户身份不互通
- `/showcase` 内容由 `ShowcaseContent` 维护，与 `Profile`、`Product` 等业务表隔离

### 19.4 V2 目标

- 增强可信证据中心：代码审计报告、安全审计、合规审计、SLA
- 增加 Roadshow 模式（投演示流）
- 增加访客访问日志与转化追踪

### 19.5 验收标准

- `/showcase` 不可越权访问 `/console` 或 `/jeepwork`
- Showcase 数据不可反向污染生产数据

---

## 20. /jeepwork 平台控制平面

### 20.1 定位

`/jeepwork` 是**平台控制平面**，仅 Super Admin 可访问。**与企业管理员严格隔离**：企业工作空间管理员无法访问 `/jeepwork`。

### 20.2 当前状态

【已实现】20 个页面：

- 首页、login、users、users/[id]、profiles、reports、reports/[id]、audit、logs、governance、roles、system-health、ai-cost、ai-usage、ai-safety、competition-center、competition-ai-debug、showcase、settings/ai、settings/api、settings/payment

### 20.3 关键能力

- 用户管理：`/api/jeepwork/users`、`/api/jeepwork/users/[id]/membership`、`/api/jeepwork/users/[id]/restrictions`
- AI 治理：`/api/jeepwork/ai-credits`、`/api/jeepwork/ai-usage`、`/api/jeepwork/ai-safety`
- 审计：`/api/jeepwork/audit`
- 对账：`/api/jeepwork/reconciliation`、`/api/jeepwork/orders`
- 系统健康：`/api/jeepwork/system-health/exec-cleanup`、`/api/jeepwork/system-health/exec-email-freeze`
- 审核：`/api/jeepwork/moderation`

### 20.4 隔离边界

- `/jeepwork` 路由仅校验 `super_admin` 角色
- `/jeepwork` 的所有写操作进入 `admin_audit_logs`
- 企业管理员 token 不可调用 `/api/jeepwork/*`

### 20.5 V2 目标

- 增加多租户管理：Workspace 列表、跨租户审计、租户级资源配额
- 增加 SLO 监控与告警
- 增加数据导出与合规报告

### 20.6 验收标准

- 非超级管理员访问 `/jeepwork` 返回 404
- 所有写操作有审计记录
- 审计日志不可删除

---

## 21. Workspace 与数据归属

### 21.1 迁移原则（最高约束）

**禁止一次性破坏性迁移**。所有 Workspace 相关变更必须按以下七步推进：

1. **新增表**：新增 `Workspace`、`WorkspaceMember`、`Organization` 等表，不修改旧表
2. **映射**：在旧表（Profile、Link、Product 等）新增 `workspaceId` 字段（可空）
3. **回填**：通过迁移脚本为每条旧数据创建个人工作空间并回填 `workspaceId`
4. **双读**：业务代码同时读取旧字段和新字段，优先新字段，缺失时回退旧字段
5. **灰度**：按用户 ID 哈希灰度切换读取路径
6. **验证**：对比双读结果、对账数据一致性
7. **旧字段退役**：全部验证通过后，将 `workspaceId` 设为 NOT NULL，移除回退逻辑

### 21.2 数据归属规则

| 数据 | 个人工作空间 | 企业工作空间 |
|---|---|---|
| Profile | 归属个人 | 企业下成员的个人 Profile 独立 |
| Product / Offer | 归属个人 | 归属企业 |
| Link / ShortLink | 归属个人 | 归属企业 |
| Lead | 归属个人 | 归属企业（成员可见范围由角色决定） |
| KnowledgeDoc | 归属个人 | 归属企业 |
| AiConversation | 归属个人 | 归属企业 |
| AiCreditAccount | 归属个人 | 企业套餐共享 |
| MembershipSubscription | 归属个人 | 归属企业 |
| Order | 归属个人 | 归属企业 |

### 21.3 跨工作空间访问

- 个人工作空间数据对企业工作空间**完全不可见**
- 企业工作空间内成员可见范围由角色决定
- Super Admin 可跨工作空间审计但不可读取业务明文（除非有合规授权）

### 21.4 验收标准

- 跨工作空间访问返回 403
- 工作空间切换时数据上下文立即隔离
- 数据归属错误率 = 0（自动化测试覆盖）

---

## 22. 权益与用量

### 22.1 AI 双产品线额度分账

V2 强制要求：**AI 接待助手额度**（访客侧）与**经营 AI 点数**（用户侧）**分账**，不可共用。

| 维度 | AI 接待助手（访客侧） | 经营 AI 工具箱（用户侧） |
|---|---|---|
| 额度来源 | 套餐 `aiReceptionQuota` | 套餐 `aiChatsPerMonth / aiCreditsGrant` |
| 消耗者 | 访客 | 工作空间所有者或成员 |
| 扣减账户 | 工作空间所有者的 `AiCreditAccount`，但分账目 | 工作空间所有者的 `AiCreditAccount` |
| 计费维度 | 会话次数 + token | 调用次数 + token |

### 22.2 当前状态

【部分实现】当前 `AiCreditAccount` 单一余额，未区分访客侧与用户侧。

### 22.3 V2 目标

- `AiCreditAccount` 拆分 `receptionBalance` 和 `operationBalance`
- `AiCreditLedger` 增加 `source(reception|operation)` 字段
- 套餐定义增加 `aiReceptionQuota` 独立额度
- 套餐升级时两类额度独立发放

### 22.4 其他权益

- `products`：产品数量上限
- `knowledgeDocs`：知识库文档上限
- `teamSeats`：团队席位（企业版）
- `customDomain`：自定义域名
- `removeBranding`：去品牌标识
- `prioritySupport`：优先客服

### 22.5 验收标准

- 用户可在 `/console/membership` 查看两类额度独立余额
- 两类额度不可互转
- 额度耗尽时降级策略明确（参见第 14.4、15.5 节）

---

## 23. 隐私、安全、审计与合规

### 23.1 隐私数据最小化

- 仅收集业务必需的个人信息
- 公开主页默认不展示手机号、邮箱（用户主动开启）
- IP 地址脱敏存储（截断最后一段）
- AI 对话日志中敏感信息自动打码

### 23.2 内容审核

【已实现】

- 模型：ContentModerationRecord
- 三态：`pending` / `approved` / `rejected`
- Provider：`src/lib/content-safety/provider.ts`
- 入口：`/api/jeepwork/moderation`

### 23.3 审计

- `AdminAuditLog`：管理员操作日志，不可删除
- `AiUsageLog`：AI 调用日志
- `AiCreditLedger`：额度变更流水
- `LoginAttempt`：登录尝试
- `Session`：会话管理

### 23.4 安全控制

- 密码哈希：bcrypt
- Session：`SESSION_SECRET` 环境变量
- CSRF：SameSite Cookie + Token
- 限流：`src/lib/rate-limit.ts`
- 输入校验：Zod schema
- 文件上传：`src/lib/upload-storage.ts` + 类型白名单
- 公开 URL 安全：`src/lib/public-url-security.ts`

### 23.5 合规

- 用户注销：二次确认 + 延迟删除 + 数据导出
- 数据导出：`scripts/db/export-sanitized-db.js`
- GDPR / 个人信息保护法对齐【部分实现】
- ICP 备案【待核验】

### 23.6 验收标准

- 所有写操作可审计
- 敏感字段不出现在前端 Bundle
- 隐私政策与代码实际处理一致

---

## 24. 移动端

### 24.1 当前状态

【部分实现】

- 公开主页 `/[username]` 移动端适配【已实现】
- `/workbench` 部分页面移动端适配【部分实现】
- `/jeepwork` 移动端基本不适配【待核验】

### 24.2 V2 目标

- `/console` 全量移动端响应式
- 关键操作（查看 Lead、回复 AI、查看数据）移动端可用
- 微信内置浏览器兼容
- PWA 支持【未来预留】
- 微信小程序【未来预留】（参见第 29 章）

### 24.3 验收标准

- 主流移动设备屏幕（375px / 414px / 768px）下 UI 不溢出
- 移动端首屏 LCP < 2.5s
- 触控目标 ≥ 44px

---

## 25. 非功能需求

### 25.1 性能

- 公开主页首屏 LCP < 2.5s（4G）
- `/console` 页面切换 < 500ms
- AI 接待助手首响应 < 3s（含模型推理）
- 数据库查询 P95 < 200ms

### 25.2 可用性

- 主站可用性 SLA 99.5%
- 数据库可用性 SLA 99.9%
- 支付回调幂等，失败自动重试

### 25.3 数据隔离

- 工作空间间零泄漏
- 生产 / 测试数据库物理隔离
- 测试数据不可流入生产

### 25.4 审计

- 所有写操作留痕
- 审计日志保留 ≥ 1 年【待核验】具体保留策略
- 审计日志不可删除

### 25.5 备份恢复

- 数据库每日全量备份（`scripts/db/backup-db.js`）
- 保留 7 天滚动备份【待核验】
- 恢复演练每季度 1 次【未来预留】

### 25.6 错误降级

- AI Provider 不可用时降级到备用模型或提示稍后重试
- 支付回调失败时本地状态不回滚
- 公开主页模块错误时 ModuleFallback 兜底

### 25.7 幂等

- 所有支付回调幂等
- 所有额度扣减幂等（`idempotencyKey`）
- 所有 Webhook 幂等

### 25.8 限流

- 公开 API 限流：`src/lib/rate-limit.ts`
- AI 接待助手：每日上限 + 风控
- 登录尝试：`LoginAttempt` 模型 + 锁定策略

### 25.9 移动端适配

- 参见第 24 章

### 25.10 可观测性

- 健康检查：`/api/health`
- 日志：`/jeepwork/logs`
- AI 用量：`/jeepwork/ai-usage`、`/jeepwork/ai-cost`
- 系统健康：`/jeepwork/system-health`
- 支付诊断：`PaymentDiagnosticsPanel`
- AI 额度审计：`AiCreditAuditPanel`

### 25.11 隐私数据最小化

- 参见第 23.1 节

---

## 26. 迁移原则

### 26.1 总原则

- 渐进式重构（PROJECT_RULES.md 第五章）
- 不删除现有可用数据（PROJECT_RULES.md 第六章）
- 上线前只读检查（PROJECT_RULES.md 第七章）
- 生产数据库修改须先备份 + 测试库验证 + 审批

### 26.2 Workspace 迁移

参见第 21 章。

### 26.3 路由迁移

参见第 8 章。

### 26.4 AI 额度统一迁移

1. 新增 `PLAN_AI_LIMITS_V2`（从 `plans.ts` 派生）
2. 业务代码双读 `PLAN_AI_LIMITS` 和 `PLAN_AI_LIMITS_V2`，优先 V2
3. 灰度切换
4. 旧 `PLAN_AI_LIMITS` 退役
5. 回补历史错误扣减

### 26.5 退款联调迁移

1. 新增 `alipayRefund` 模块
2. `processRefund` 调用 `alipayRefund`
3. 失败重试 + 对账
4. 灰度（先 internal_test 套餐）

### 26.6 验收标准

- 每步迁移可独立回滚
- 每步迁移通过 `npm run lint` + `npx tsc --noEmit` + `npm run build`
- 生产部署前完成只读检查

---

## 27. 验收标准

### 27.1 通用验收标准

- 所有新增 API 有 OpenAPI 注释
- 所有新增页面有 E2E 用例【未来预留】
- 所有 BUG 修复有回归用例
- `npm run lint` 通过
- `npx tsc --noEmit` 通过
- `npm run build` 通过
- 比赛记录 Agent 更新四项台账（PROJECT_RULES.md 第十一章）

### 27.2 关键验收项

| 项 | 验收标准 | 当前状态 |
|---|---|---|
| `/console` 统一控制台 | 全部 V1 能力有对应入口，工作空间上下文隔离 | 【本次改版】 |
| Workspace 数据模型 | 5 个新模型建立，迁移七步走完 | 【本次改版】 |
| AI 额度统一 | 两源 diff = 0，单测覆盖 7 个套餐 | 【本次改版】 |
| 退款联调 | 支付宝侧与本地状态一致 | 【本次改版】 |
| 自动降级 | 过期 3 天后自动降级 | 【本次改版】 |
| `/dashboard` `/workbench` 兼容 | 旧路由 301 重定向，不报 404 | 【本次改版】 |
| 公开主页 | 首屏 LCP < 2.5s | 【已实现】 |
| `/jeepwork` 隔离 | 非超管返回 404 | 【已实现】 |
| `/showcase` 隔离 | 不污染生产数据 | 【已实现】 |

---

## 28. 当前缺口与后续任务

### 28.1 P0 缺口（必须修复）

1. **AI 额度不一致 BUG**（第 18.2 节）
2. **退款未调用支付宝**（第 18.4 节）
3. **无自动到期降级**（第 18.5 节）
4. **`/admin` 6 页面全部 404**（第 4.4 节）

### 28.2 P1 缺口（V2 必须交付）

1. `/console` 统一控制台
2. Workspace 数据模型与迁移
3. 企业工作空间能力
4. Channel 独立模型
5. AI 双产品线额度分账
6. `/dashboard` `/workbench` 兼容重定向

### 28.3 P2 缺口（V2 尽量交付）

1. 知识库向量检索升级
2. Lead 自动从 AI 接待会话收集
3. 移动端 `/console` 全量适配

### 28.4 P3 缺口（未来预留，参见第 29 章）

1. 微信小程序
2. SSO
3. 私有化部署
4. 完整 CRM
5. 线索自动分配
6. 多级审批
7. 数字人
8. AI 电话
9. 在线商城
10. 多级分销
11. 展会徽章扫描

---

## 29. 未来预留

以下功能为长期规划，V2 不交付，但产品长期不排除。

### 29.1 微信小程序

- 详细设计见 `docs/WECHAT_MINIPROGRAM_FUTURE_DESIGN.md`
- 微信支付闭环随之打通
- 与 Web 端数据互通

### 29.2 SSO（单点登录）

- 企业客户接入企业微信 / 飞书 / 钉钉 SSO
- OIDC / SAML 协议支持

### 29.3 私有化部署

- 面向大型企业客户
- 提供 Docker Compose / K8s 部署包
- 数据库与 AI Provider 可替换

### 29.4 完整 CRM

- Lead 之外增加 Contact、Account、Opportunity
- 销售漏斗可视化
- 销售预测

### 29.5 线索自动分配

- 基于规则（地域、产品、成员负载）
- 基于算法（Round Robin、权重）
- 工作空间内成员分配

### 29.6 多级审批

- 企业工作空间内多级审批流
- 报销、合同、采购等场景

### 29.7 数字人

- AI 接待助手升级为数字人形象
- 视频生成
- 直播带货

### 29.8 AI 电话

- AI 外呼与接听
- 与 Lead 系统打通
- 通话录音转写

### 29.9 在线商城

- Product 升级为完整商品
- 购物车、订单、物流、售后
- 与现有 Order 系统并存

### 29.10 多级分销

- 渠道推广返佣
- 多级关系链
- 与 Channel 系统打通

### 29.11 展会徽章扫描

- 现场扫描参会者徽章
- 自动生成 Lead
- 与 Channel（线下展会）绑定

---

## 附录 A：关键文件路径索引

### A.1 套餐与计费

- `src/lib/billing/plans.ts`：套餐定义（单一真实源目标）
- `src/lib/billing/orders.ts`：订单与退款（含已知 BUG）
- `src/lib/billing/payments.ts`：支付入口
- `src/lib/billing/membership.ts`：会员状态
- `src/lib/billing/reconciliation.ts`：对账
- `src/lib/billing/alipay-reconciliation.ts`：支付宝对账
- `src/lib/billing/entitlements/index.ts`：权益
- `src/lib/billing/providers/`：支付 Provider

### A.2 AI

- `src/lib/ai/permissions.ts`：AI 权限与额度（含已知 BUG）
- `src/lib/ai/credits.ts`：额度扣减与回补
- `src/lib/ai/assistants.ts`：用户侧 7 个 Agent
- `src/lib/ai/commercial-agent.ts`：访客侧 AI 接待助手
- `src/lib/ai/public-access.ts`：访客侧三层权限
- `src/lib/ai/providers/bailian.ts`：阿里云百炼
- `src/lib/ai/compliance.ts`：合规
- `src/lib/ai/risk-log.ts`：风控
- `src/lib/ai/privacy.ts`：隐私

### A.3 数据库

- `prisma/schema.prisma`：Schema 定义
- `prisma/migrations/`：迁移脚本
- `scripts/db/backup-db.js`：备份
- `scripts/db/restore-db.js`：恢复
- `scripts/db/export-sanitized-db.js`：脱敏导出
- `scripts/db/migrate-db.js`：迁移

### A.4 路由

- `src/app/[username]/page.tsx`：公开主页
- `src/app/dashboard/page.tsx`：V1 名片编辑器
- `src/app/workbench/`：V1 工作台（13 页）
- `src/app/jeepwork/`：平台控制平面（20 页）
- `src/app/showcase/`：受控展示（4 页）
- `src/app/admin/`：废弃后台（6 页全 404）

### A.5 鉴权

- `src/lib/auth.ts`：用户鉴权
- `src/lib/admin-auth.ts`：管理员鉴权
- `src/lib/jeepwork-auth.ts`：jeepwork 鉴权
- `src/lib/admin-governance/permissions.ts`：管理治理权限

### A.6 安全

- `src/lib/rate-limit.ts`：限流
- `src/lib/public-url-security.ts`：公开 URL 安全
- `src/lib/upload-storage.ts`：文件上传
- `src/lib/content-safety/provider.ts`：内容安全

### A.7 文档

- `PROJECT_RULES.md`：工程与安全红线
- `PRD.md`：本文件
- `LINK168_3_DAY_CONTINUOUS_DEVELOPMENT_PLAN.md`：3 天连续开发计划
- `docs/audits/LINK168_LOCAL_CODE_AND_PRD_AUDIT_20260705.md`：本地代码与 PRD 审计
- `docs/audits/product-audit-vlink-ai-backend-20260705.md`：AI 后端审计
- `docs/audits/audit-remediation-20260703.md`：审计整改
- `docs/REPOSITORY_VERSION_POLICY.md`：仓库版本策略
- `docs/WECHAT_MINIPROGRAM_FUTURE_DESIGN.md`：微信小程序未来设计

---

## 附录 B：变更记录

| 日期 | 变更 | 来源 |
|---|---|---|
| 2026-07-05 | 创建文件，覆盖全部 29 章 + 附录 A/B | Agent C（PRD 总控团队） |

---

> 本文档为 Link168 V2 生产级一体化产品需求文档，所有变更须遵循 `PROJECT_RULES.md` 的渐进式重构、不删除数据、上线前只读检查等约束。任何与本地真实代码冲突的描述以代码为准。
