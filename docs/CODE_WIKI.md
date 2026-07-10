# Link168 Code Wiki

> 本文档为 Link168 项目的结构化代码知识库，覆盖项目整体架构、模块职责、关键类与函数、依赖关系及运行方式。
> 事实基线：本地代码 + Prisma Schema + `PRD.md`。所有描述以本地真实代码为准。

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术栈与依赖](#2-技术栈与依赖)
3. [项目目录结构](#3-项目目录结构)
4. [整体架构](#4-整体架构)
5. [数据模型（Prisma Schema）](#5-数据模型prisma-schema)
6. [核心模块职责](#6-核心模块职责)
7. [关键类与函数说明](#7-关键类与函数说明)
8. [API 路由总览](#8-api-路由总览)
9. [环境变量](#9-环境变量)
10. [构建与运行](#10-构建与运行)
11. [安全与合规约束](#11-安全与合规约束)
12. [已知问题与限制](#12-已知问题与限制)

---

## 1. 项目概述

**Link168** 是面向中文创作者、小商家、自由职业者、一人公司和小型销售团队的 **AI 经营名片平台**。

### 1.1 产品定位

核心价值链：

> 展示身份 → 展示产品服务 → 二维码短链接引流 → AI 接待咨询 → 收集客户线索 → 跟进转化 → 数据分析 → 持续经营

### 1.2 核心能力

| 能力域 | 实现位置 | 状态 |
|---|---|---|
| 公开经营名片 | `/[username]` | 已实现 |
| 名片编辑器 V1 | `/dashboard` | 已实现 |
| 经营工作台 | `/workbench`（13 页） | 已实现 |
| 平台管理后台 | `/jeepwork`（20 页） | 已实现 |
| 受控展示中心 | `/showcase`（4 页） | 已实现 |
| 访客侧 AI 接待助手 | `commercial-agent.ts` | 已实现 |
| 用户侧经营 AI 工具箱 | `assistants.ts`（8 个 Agent） | 已实现 |
| 会员订阅与支付宝支付 | `billing/` | 已实现（退款未联调支付宝） |
| 企业工作空间 | `Workspace`/`WorkspaceMember` 模型 + `/api/workspaces` | 数据模型已就绪，UI 待完善 |

### 1.3 项目元信息

- 项目路径：`D:\link168\link.me`
- 框架：Next.js（App Router）+ React + TypeScript
- ORM：Prisma 7（PostgreSQL）
- 构建输出：`standalone`（用于阿里云服务器部署）
- 当前版本：V1 功能扩展期末尾，整体完成度约 80%

---

## 2. 技术栈与依赖

### 2.1 运行时依赖（`package.json`）

| 依赖 | 用途 |
|---|---|
| `next`、`react`、`react-dom` | Next.js App Router 框架 |
| `@prisma/client`、`@prisma/adapter-pg`、`prisma` | Prisma ORM + PostgreSQL 适配器 |
| `pg` | PostgreSQL 驱动 |
| `bcrypt` | 密码哈希 |
| `nodemailer` | 邮件发送（阿里云邮件推送 SMTP） |
| `qrcode`、`react-qr-code` | 二维码生成 |
| `lucide-react` | 图标库 |
| `uuid` | UUID 生成 |
| `dotenv` | 环境变量加载 |

### 2.2 可选依赖

| 依赖 | 用途 |
|---|---|
| `@upstash/redis` | Upstash Redis 限流后端 |
| `ioredis` | 自建 Redis 限流后端 |

### 2.3 开发依赖

- `typescript`、`@types/*`：类型定义
- `eslint`、`eslint-config-next`：代码检查
- `tailwindcss`、`@tailwindcss/postcss`：样式系统

### 2.4 外部服务

| 服务 | 提供方 | 用途 |
|---|---|---|
| PostgreSQL | 阿里云 | 主数据库 |
| 阿里云百炼 | 阿里云 | AI 模型（企业 AI 工作台） |
| 阿里云邮件推送 | 阿里云 | SMTP 邮件 |
| 支付宝 | 蚂蚁集团 | 在线支付收款 |
| 腾讯云 | 腾讯云 | 主站 Web 应用部署 |

---

## 3. 项目目录结构

```
link.me/
├── src/
│   ├── app/                       # Next.js App Router 路由
│   │   ├── [username]/            # 公开经营名片
│   │   ├── dashboard/             # V1 名片编辑器
│   │   ├── workbench/             # V1 经营工作台（13 页）
│   │   ├── jeepwork/              # 平台管理后台（20 页）
│   │   ├── showcase/              # 受控展示中心（4 页）
│   │   ├── console/               # V2 统一控制台（占位）
│   │   ├── admin/                 # 历史废弃后台（全 404）
│   │   ├── account/               # 账号安全、会话管理
│   │   ├── login/ register/       # 认证页面
│   │   ├── pricing/               # 套餐定价
│   │   ├── go/[linkId]/           # 链接跳转
│   │   ├── s/[slug]/              # 短链接跳转
│   │   ├── api/                   # API 路由（详见第 8 节）
│   │   ├── layout.tsx             # 根布局
│   │   ├── page.tsx               # 官网首页
│   │   ├── globals.css            # 全局样式
│   │   ├── sitemap.ts             # 站点地图
│   │   ├── robots.ts              # 爬虫规则
│   │   └── manifest.ts            # PWA 清单
│   ├── components/                # React 组件
│   │   ├── share/                 # 公开主页渲染与模块
│   │   ├── dashboard-v1/          # V1 名片编辑器
│   │   ├── workbench/             # V1 工作台
│   │   ├── admin/                 # Jeepwork 后台组件
│   │   ├── showcase/              # Showcase 组件
│   │   ├── public-profile/        # 公开主页客户端包装
│   │   ├── ai/                    # AI 聊天客户端
│   │   ├── layout/                # Console 布局
│   │   ├── workspace/             # 工作空间组件
│   │   ├── theme/                 # 主题系统
│   │   └── ...                    # 通用组件
│   ├── features/
│   │   └── profile-modules/       # 用户组件注册表与校验
│   ├── lib/                       # 核心业务库（详见第 6 节）
│   │   ├── ai/                    # AI 系统
│   │   ├── billing/               # 计费、订单、会员、支付
│   │   ├── analytics/             # 数据分析
│   │   ├── admin-governance/      # 管理治理权限
│   │   ├── cache/                 # 缓存策略
│   │   ├── content-safety/        # 内容安全
│   │   ├── i18n/                  # 国际化
│   │   ├── notifications/         # 通知
│   │   ├── observability/         # 可观测性
│   │   ├── ops/                   # 运维
│   │   ├── seo/                   # SEO
│   │   ├── workspace/             # 工作空间
│   │   ├── auth.ts                # 用户鉴权
│   │   ├── admin-auth.ts          # 管理员鉴权
│   │   ├── jeepwork-auth.ts       # Jeepwork 鉴权
│   │   ├── db.ts                  # Prisma 客户端
│   │   ├── mail.ts                # 邮件服务
│   │   ├── rate-limit.ts          # 限流
│   │   ├── upload-storage.ts      # 文件上传
│   │   ├── public-url-security.ts # 公开 URL 安全
│   │   └── ...                    # 其他工具
│   ├── generated/prisma/          # Prisma 生成的客户端（禁止手改）
│   ├── types/                     # 全局类型声明
│   └── proxy.ts                   # 代理配置
├── prisma/
│   ├── schema.prisma              # 数据模型定义（37 个模型）
│   └── migrations/                # 数据库迁移脚本（17 个）
├── docs/                          # 项目文档（PRD、审计、规划、报告）
├── scripts/
│   ├── db/                        # 数据库备份/恢复/迁移脚本
│   └── ai-test/                   # AI 测试脚本
├── public/                        # 静态资源
├── .github/workflows/             # GitHub Actions（standalone 构建）
├── package.json
├── tsconfig.json
├── next.config.ts                 # Next.js 配置（standalone 输出）
├── prisma.config.ts               # Prisma 配置
├── eslint.config.mjs
├── postcss.config.mjs
├── .env.example                   # 环境变量模板
├── PRD.md                         # 产品需求文档
├── PROJECT_RULES.md               # 工程与安全红线
├── ROADMAP.md                     # 路线规划
├── SPRINT.md                      # 当前迭代
└── README.md                      # 项目说明
```

---

## 4. 整体架构

### 4.1 架构分层

```
┌────────────────────────────────────────────────────────────┐
│  浏览器 / 访客端                                              │
└──────────────┬─────────────────────────────────────────────┘
               │ HTTPS
┌──────────────▼─────────────────────────────────────────────┐
│  Next.js App Router（standalone server.js）                  │
│  ┌────────────────────────────────────────────────────────┐│
│  │  路由层 (src/app/**)                                    ││
│  │  - 页面：SSR/RSC（公开主页、后台、Showcase）              ││
│  │  - API：Route Handlers（RESTful）                        ││
│  └────────────────────────────────────────────────────────┘│
│  ┌────────────────────────────────────────────────────────┐│
│  │  业务层 (src/lib/**)                                    ││
│  │  - auth / billing / ai / analytics / content-safety     ││
│  └────────────────────────────────────────────────────────┘│
│  ┌────────────────────────────────────────────────────────┐│
│  │  数据访问层                                              ││
│  │  - Prisma Client（@prisma/adapter-pg）                  ││
│  │  - 文件存储 (upload-storage)                             ││
│  └────────────────────────────────────────────────────────┘│
└──────────────┬─────────────────────────────────────────────┘
               │
   ┌───────────┼───────────┬─────────────┬─────────────┐
   ▼           ▼           ▼             ▼             ▼
┌──────┐  ┌────────┐  ┌─────────┐  ┌──────────┐  ┌─────────┐
│ PG   │  │ 阿里云  │  │ 支付宝   │  │ 阿里云    │  │ 文件    │
│ DB   │  │ 百炼 AI │  │ 支付     │  │ 邮件推送  │  │ 存储    │
└──────┘  └────────┘  └─────────┘  └──────────┘  └─────────┘
```

### 4.2 部署架构

| 组件 | 规格 | 提供方 | 状态 |
|---|---|---|---|
| 主站 Web 应用 | 4 核 4G | 腾讯云 | 已实现 |
| PostgreSQL | 2 核 2G | 阿里云 | 已实现 |
| 邮件推送 | - | 阿里云邮件推送 | 已实现 |
| AI 模型 | - | 阿里云百炼 | 已实现 |
| 支付收款 | - | 支付宝 | 已实现 |
| 微信支付 | - | - | 仅占位，未实现 |

### 4.3 构建部署流程

- 本地开发：`npm run dev`
- 生产构建：`next build` → `output: "standalone"` 生成 `.next/standalone/`
- 部署方式：GitHub Actions Linux 环境构建 standalone 产物 → 上传到阿里云服务器 → PM2 启动 `server.js`
- 启动命令：`PORT=3000 HOSTNAME=127.0.0.1 pm2 start server.js --name link168`

### 4.4 多端路由体系

当前存在三套并存的用户后台入口（V2 将统一为 `/console`）：

| 路由前缀 | 用途 | 状态 |
|---|---|---|
| `/dashboard` | V1 名片编辑器 | 已实现（V2 并入 `/console/profile`） |
| `/workbench` | V1 经营工作台（13 页） | 已实现（V2 并入 `/console/*`） |
| `/jeepwork` | 平台管理后台（20 页，仅 super_admin） | 已实现 |
| `/showcase` | 受控外部展示（4 页） | 已实现 |
| `/console` | V2 统一控制台 | 占位，未实现 |

---

## 5. 数据模型（Prisma Schema）

Prisma Schema 位于 [prisma/schema.prisma](file:///d:/link168/link.me/prisma/schema.prisma)，定义了 **37 个模型**。生成器输出到 `src/generated/prisma/`（禁止手改）。

### 5.1 模型分类

#### 5.1.1 用户与认证（8 个）

| 模型 | 用途 | 关键字段 |
|---|---|---|
| `User` | 用户主表 | `id`, `email`, `passwordHash`, `role`, `emailVerified`, `accountStatus`, `isSystem` |
| `FreezeRecord` | 用户冻结/限制记录（V2-002） | `userId`, `type`(EMAIL_UNVERIFIED/ADMIN_FREEZE/SECURITY_RISK/BANNED), `isActive`, `expiresAt` |
| `UsernameHistory` | Username 历史审计 + 旧地址重定向 | `userId`, `username`, `normalizedUsername`, `replacedBy`, `reservedUntil` |
| `UsernameRegistry` | Username 注册中心（占用、90 天保留、永久封禁） | `normalizedUsername`(unique), `status`(CURRENT/RESERVED_90_DAYS/PERMANENTLY_RESERVED) |
| `Session` | 用户会话 | `userId`, `tokenHash`, `expiresAt`, `userAgent`, `ipAddress` |
| `PasswordResetToken` | 密码重置 Token（2 小时过期） | `userId`, `tokenHash`, `used` |
| `EmailVerificationToken` | 邮箱验证 Token（24 小时过期） | `userId`, `tokenHash`, `used` |
| `LoginAttempt` | 登录尝试记录（限流用） | `email`, `ipAddress`, `success`, `locked`, `lockUntil` |

#### 5.1.2 公开主页与链接（5 个）

| 模型 | 用途 |
|---|---|
| `Profile` | 公开主页主表（username、displayName、bio、avatar、theme、template、联系方式、`contactVisibility`） |
| `Link` | 主页组件（type: link/text/group-title/qr/wechat/shop/booking/map/phone） |
| `LinkClick` | 链接点击统计 |
| `ProfileVisit` | 主页访问统计 |
| `ShortLink` / `ShortLinkClick` | 短链接与点击统计 |

#### 5.1.3 客户工作台业务（8 个）

| 模型 | 用途 |
|---|---|
| `Product` | 产品与服务 |
| `KnowledgeDoc` | 企业知识库文档 |
| `Lead` | 客户线索（来源：表单/AI 接待/手动） |
| `LeadFollowUp` | 线索跟进记录（追加式，不可删除） |
| `AiServiceConfig` | AI 客服配置（不含 API Key） |
| `AiConversation` | AI 对话会话 |
| `AiMessage` | AI 对话消息 |
| `EmailSendLog` | 邮件发送日志（节流用） |

#### 5.1.4 AI 额度与会员计费（5 个）

| 模型 | 用途 |
|---|---|
| `AiCreditAccount` | AI 额度账户（`balance` ≥ 0，`version` 乐观锁） |
| `AiCreditLedger` | AI 额度流水（幂等键 `idempotencyKey`，entryType: grant/consume/refund/adjustment/expire） |
| `AiUsageLog` | AI 调用日志（按日聚合） |
| `MembershipSubscription` | 会员订阅（planCode、status、currentPeriodStart/End） |
| `Order` | 正式订单（状态机：pending→processing→paid→refunded/closed） |

#### 5.1.5 平台治理（4 个）

| 模型 | 用途 |
|---|---|
| `AppConfig` | 平台配置（敏感字段加密存储） |
| `AdminAuditLog` | 管理员操作审计日志（不可删除） |
| `ContentModerationRecord` | 内容审核记录（pending/approved/rejected 三态） |
| `Report` | 用户举报 |

#### 5.1.6 Showcase 与比赛（5 个）

| 模型 | 用途 |
|---|---|
| `ShowcaseContent` | 展示页动态章节内容 |
| `ShowcaseSequence` | 章节顺序与可见性 |
| `ShowcaseAIDemoCall` | 比赛 AI 演示调用记录（与正式用户数据隔离） |
| `ShowcaseAIDebugLog` | 比赛 AI 调试台记录 |
| `ShowcasePromptDraft` | 比赛 AI 提示词草稿 |
| `CompetitionFile` | 比赛文件管理（受保护目录存储） |

#### 5.1.7 工作空间（V2 新增，2 个）

| 模型 | 用途 |
|---|---|
| `Workspace` | 工作空间（personal/team/enterprise） |
| `WorkspaceMember` | 工作空间成员（owner/admin/member/viewer） |

### 5.2 关键关系

- `User` 1:1 `Profile`（公开主页）
- `User` 1:N `Session`、`FreezeRecord`、`Order`、`Product`、`KnowledgeDoc`
- `Profile` 1:N `Link`、`Lead`、`AiConversation`、`ProfileVisit`
- `User` 1:1 `AiCreditAccount` 1:N `AiCreditLedger`
- `User` 1:1 `MembershipSubscription`
- `Lead` N:1 `Product`（产品快照保存在 Lead 上防止丢失）
- `Lead` 1:N `LeadFollowUp`
- `AiConversation` 1:N `AiMessage`，1:1 `Lead`（AI 收集的线索）
- `Workspace` 1:N `WorkspaceMember` N:1 `User`

### 5.3 数据隔离原则

- 所有业务数据通过 `userId`（或 `profileId → userId`）做租户隔离
- `AiCreditAccount`、`MembershipSubscription` 与 User 关系为 `Restrict`（用户删除时不可级联清零）
- Showcase 数据与生产用户数据严格隔离（独立沙箱表）

---

## 6. 核心模块职责

### 6.1 认证与权限模块

#### 6.1.1 用户鉴权 [src/lib/auth.ts](file:///d:/link168/link.me/src/lib/auth.ts)

**职责**：用户注册、登录、会话管理、密码重置、邮箱验证、账号注销、限制查询。

**关键能力**：
- Session Token：32 字节随机 + SHA256 哈希存储，30 天有效期
- Cookie：`link168_session`，HttpOnly、SameSite=Lax、可配置 Secure
- 四级鉴权函数：
  - `requireUser`：仅验证 session 存在
  - `requireAuthenticatedUser`：验证 session + 用户存在（用于登出、邮箱验证、查看限制状态）
  - `requireDashboardUser`：验证 + 限制查询 + 拒绝 BANNED/SECURITY_RISK（允许 EMAIL_UNVERIFIED 进入后台）
  - `requireActiveUser`：最严格，无任何限制（用于发布公开主页、修改 username）
- 限制类型：`EMAIL_UNVERIFIED`、`ADMIN_FREEZE`、`SECURITY_RISK`、`BANNED`
- 登录限流：同邮箱/IP 15 分钟内失败 5 次锁定 15 分钟
- 邮件发送统一服务：60 秒间隔 + 24 小时限额（每邮箱 10 封、每 IP 50 封）+ 日志记录
- 账号注销：软删除（`accountStatus=deactivated`）+ 删除 session + 匿名化公开信息

**关键导出**：`createSession`、`getCurrentUserFromRequest`、`requireUser`、`requireDashboardUser`、`requireActiveUser`、`getActiveRestrictions`、`canShowPublicProfile`、`sendVerificationEmailWithPolicy`、`deactivateUserAccount`。

#### 6.1.2 Jeepwork 管理员鉴权 [src/lib/jeepwork-auth.ts](file:///d:/link168/link.me/src/lib/jeepwork-auth.ts)

**职责**：平台管理后台（`/jeepwork`）独立鉴权。

**关键能力**：
- 独立 Cookie：`link168_admin_session`，HttpOnly、SameSite=Strict，8 小时有效
- 复用 `Session` 表（同一用户的 session，但通过 Cookie 名区分）
- 仅 `admin` 和 `super_admin` 角色可登录
- 三级页面守卫：`jeepworkPageAdminOnly`、`jeepworkPageSuperAdminOnly`、`requireJeepworkSuperAdmin`
- 登录限流：IP/邮箱双维度，15 分钟 5 次

#### 6.1.3 管理治理权限 [src/lib/admin-governance/permissions.ts](file:///d:/link168/link.me/src/lib/admin-governance/permissions.ts)

**职责**：管理员角色与权限矩阵定义。

### 6.2 AI 系统模块（[src/lib/ai/](file:///d:/link168/link.me/src/lib/ai/)）

AI 系统分为**双产品线**：

#### 6.2.1 访客侧 AI 接待助手

**核心文件**：
- [commercial-agent.ts](file:///d:/link168/link.me/src/lib/ai/commercial-agent.ts)：CommercialAgent 主逻辑
- [public-access.ts](file:///d:/link168/link.me/src/lib/ai/public-access.ts)：三层权限校验
- [compliance.ts](file:///d:/link168/link.me/src/lib/ai/compliance.ts)：合规检查
- [risk-log.ts](file:///d:/link168/link.me/src/lib/ai/risk-log.ts)：风控日志
- [privacy.ts](file:///d:/link168/link.me/src/lib/ai/privacy.ts)：隐私保护

**API 路由**：
- `/api/ai/customer-service`：访客 AI 客服
- `/api/ai/conversion-agent`：转化引导
- `/api/ai/sales-agent`：产品咨询
- `/api/ai/reports`：AI 举报
- `/api/ai/risk-events`：风控事件

**三层权限模型**（`checkPublicAiAccess`）：
1. 公开访问层：用户是否启用 AI 接待（`AiServiceConfig.enabled`）
2. 套餐层：用户套餐是否包含访客侧 AI 额度（`entitlements.features.aiEnabled`）
3. 平台层：平台是否开启 AI 与公开 AI（`AppConfig.aiEnabled && aiPublicEnabled`）+ 百炼配置是否就绪

#### 6.2.2 用户侧经营 AI 工具箱

**核心文件**：
- [assistants.ts](file:///d:/link168/link.me/src/lib/ai/assistants.ts)：8 个 Agent 定义
- [credits.ts](file:///d:/link168/link.me/src/lib/ai/credits.ts)：额度扣减与回补
- [conversations.ts](file:///d:/link168/link.me/src/lib/ai/conversations.ts)：会话管理
- [permissions.ts](file:///d:/link168/link.me/src/lib/ai/permissions.ts)：权限与额度（含已知 BUG，见第 12 节）
- [entitlement-guard.ts](file:///d:/link168/link.me/src/lib/ai/entitlement-guard.ts)：权益守卫
- [gateway.ts](file:///d:/link168/link.me/src/lib/ai/gateway.ts)：统一网关

**8 个 Agent**（定义在 `AI_ASSISTANTS`）：
1. 财税助理（tax）
2. 法务助理（legal）
3. 市场调研助理（market）
4. 设计助理（design）
5. 社媒运营助理（social）
6. 销售顾问助理（sales）
7. 业务客服（customerService）
8. 产品咨询（salesAgent）

每个 Agent 定义包含：`title`、`displayTitle`、`category`、`role`、`capabilities`、`systemPrompt`、`outputFormat`（强制 JSON：summary/suggestions/content）、`riskNotice`、`disclaimer`、`maxMessageLength`、`defaultTemperature`、`defaultMaxTokens`。

**API 路由**：
- `/api/workbench/ai/chat`：聊天
- `/api/workbench/ai/conversations`、`/api/workbench/ai/conversations/[id]`：会话管理
- `/api/workbench/ai/status`：额度状态

#### 6.2.3 AI Provider

- [providers/bailian.ts](file:///d:/link168/link.me/src/lib/ai/providers/bailian.ts)：阿里云百炼原生接口
- [providers/bailian-application.ts](file:///d:/link168/link.me/src/lib/ai/providers/bailian-application.ts)：百炼应用接口
- [enterprise-bailian.ts](file:///d:/link168/link.me/src/lib/ai/enterprise-bailian.ts)：企业百炼配置解析
- [providers/registry.ts](file:///d:/link168/link.me/src/lib/ai/providers/registry.ts)：Provider 注册表
- [provider.ts](file:///d:/link168/link.me/src/lib/ai/provider.ts)：统一 Provider 入口
- [provider-error.ts](file:///d:/link168/link.me/src/lib/ai/provider-error.ts)：错误类

**安全约束**：
- API Key 仅由超级管理员配置中心管理（`AppConfig` 加密存储）
- 浏览器永不接触 API Key
- 免费用户服务端必须拒绝真实 AI 调用

#### 6.2.4 AI 额度系统

- `AiCreditAccount`：余额 + 乐观锁版本号
- `AiCreditLedger`：流水（幂等键 `idempotencyKey = referenceType:referenceId`）
- 扣减顺序：套餐月度额度 → Credit 余额
- 幂等保证：同一业务操作仅产生一条流水
- 失败回补：`refundCredit` 自动回补

### 6.3 计费与会员模块（[src/lib/billing/](file:///d:/link168/link.me/src/lib/billing/)）

#### 6.3.1 套餐定义 [plans.ts](file:///d:/link168/link.me/src/lib/billing/plans.ts)

7 个套餐（`PLAN_DEFINITIONS`）：

| 套餐代码 | 名称 | 年付（分） | AI Credits | 状态 |
|---|---|---|---|---|
| `free` | 免费版 | 0 | 0 | 已实现 |
| `member_basic` | Plus（旧版兼容） | 18800 | 300 | legacy |
| `member_plus` | Plus 会员 | 18800 | 300 | legacy |
| `pro` | Pro 年付 | 38800 | 2000 | 已实现（推荐） |
| `enterprise` | 企业版 | 联系销售 | 10000 | contactSales |
| `enterprise_pro_plus` | 企业专业 Plus | 398800 | 50000 | legacy |
| `internal_test` | 内部测试 | 1 | 10000 | 仅 super_admin |

**关键函数**：
- `getPlanDefinition(planCode)`：获取套餐定义
- `getPlanPriceCents(planCode, billingCycle)`：获取价格（分）
- `formatPriceDisplay(planCode, billingCycle)`：格式化展示
- `generateOrderId()`：生成订单号 `L + 时间戳base36 + 随机hex`

#### 6.3.2 订单与支付 [orders.ts](file:///d:/link168/link.me/src/lib/billing/orders.ts)

**订单状态机**（`ORDER_STATUS` + `ALLOWED_TRANSITIONS`）：
```
pending → processing → paid → refund_processing → refunded/partially_refunded
pending → cancelled / expired
paid → closed
failed → cancelled / closed
```

**关键函数**：
- `createOrder`：创建订单（30 分钟超时，复用未支付订单，拒绝非 super_admin 购买 internal_test）
- `processPaymentSuccess`：处理支付成功（事务内：更新订单 + upsert 会员 + 发放 AI Credits）
- `processRefund`：处理退款（**已知 BUG：仅更新本地状态，未调用支付宝 `alipay.trade.refund`**）
- `cancelOrder`、`closeExpiredOrders`、`getOrdersForAdmin`

**幂等保证**：
- 订单创建：`idempotencyKey = order:${userId}:${planCode}:${billingCycle}:${Date.now()}`
- 支付成功：`updateMany` + `providerTradeNo: null` 条件防并发
- AI Credits 发放：`idempotencyKey = grant:order:${orderId}`

#### 6.3.3 支付 Provider [providers/](file:///d:/link168/link.me/src/lib/billing/providers/)

- `index.ts`：Provider 注册（支付宝已实现，沙箱已实现，微信占位）
- `sandbox.ts`：沙箱支付 Provider
- 支付宝 Provider（独立模块）

#### 6.3.4 会员生命周期 [membership.ts](file:///d:/link168/link.me/src/lib/billing/membership.ts) + [membership-lifecycle.ts](file:///d:/link168/link.me/src/lib/billing/membership-lifecycle.ts)

- 当前为**惰性降级**：3 天宽限期，下次调用时检查
- 无定时任务扫描过期会员（V2 待实现 `/api/internal/cron/membership-expiry`）

#### 6.3.5 权益 [entitlements/index.ts](file:///d:/link168/link.me/src/lib/billing/entitlements/index.ts)

`getUserEntitlements(userId)` 返回：
- `hasActiveMembership`、`isLegacyActive`、`isGracePeriod`、`gracePeriodDays`
- `features`：`aiEnabled`、`advancedModels`、`fileUpload`、`enterpriseMemory`、`removeBranding`、`advancedStats`、`customDomain`、`prioritySupport`
- `limits`：`products`、`knowledgeDocs`、`aiChatsPerMonth`、`teamSeats`

#### 6.3.6 对账与 Webhook

- [reconciliation.ts](file:///d:/link168/link.me/src/lib/billing/reconciliation.ts)、[alipay-reconciliation.ts](file:///d:/link168/link.me/src/lib/billing/alipay-reconciliation.ts)：对账
- [webhooks.ts](file:///d:/link168/link.me/src/lib/billing/webhooks.ts)、[callback-audit.ts](file:///d:/link168/link.me/src/lib/billing/callback-audit.ts)：Webhook 处理与审计
- [payment-state-machine.ts](file:///d:/link168/link.me/src/lib/billing/payment-state-machine.ts)：支付状态机
- [payment-diagnostics.ts](file:///d:/link168/link.me/src/lib/billing/payment-diagnostics.ts)：支付诊断
- [refund-service.ts](file:///d:/link168/link.me/src/lib/billing/refund-service.ts)：退款服务

**Webhook 路由**：
- `/api/payments/alipay/notify`：支付宝回调
- `/api/payments/sandbox/notify`：沙箱回调
- `/api/payments/wechat/notify`：微信回调（占位）
- `/api/internal/cron/reconcile-alipay`：定时对账（需 `PAYMENT_RECONCILE_SECRET`）

### 6.4 公开主页模块

#### 6.4.1 服务端入口 [src/app/[username]/page.tsx](file:///d:/link168/link.me/src/app/[username]/page.tsx)

**职责**：根据 username 解析并渲染公开主页。

**Username 解析流程**（`resolveUsername`）：
1. 直接查询 `Profile.username`
2. 查询 `UsernameRegistry`（CURRENT → 跳转；PERMANENTLY_RESERVED → 显示已保留；RESERVED_90_DAYS → 跳转到新地址）
3. 查询 `UsernameHistory`（90 天保留期内 → 跳转到新地址）
4. 都找不到 → 404

**渲染流程**：
1. 加载 Profile + Links
2. 检查用户限制（`canShowPublicProfile`）：BANNED/ADMIN_FREEZE/SECURITY_RISK/EMAIL_UNVERIFIED → 显示对应状态页
3. 检查 `profile.isPublic`：未公开 → 显示未发布状态页
4. 加载 Products
5. 生成 JSON-LD 结构化数据（Person + ProfilePage schema）
6. 渲染 `PublicProfileClientWrapper`

**关键特性**：
- `dynamic = "force-dynamic"`：每次请求都重新渲染
- 图标 moderation 状态过滤：未 approved 显示占位
- 联系方式可见性：`contactVisibility` = public/contacts_only/private
- URL 安全：`sanitizePublicUrl` 过滤危险协议
- 模板选择：business / creator / conversion（默认 business）

#### 6.4.2 渲染器 [SharePageRenderer.tsx](file:///d:/link168/link.me/src/components/share/SharePageRenderer.tsx)

**职责**：根据模板与主题渲染公开主页。

**模板**：`business`、`creator`、`conversion`

**主题系统**（[components/theme/](file:///d:/link168/link.me/src/components/theme/)）：
- `presetThemes.ts`：12 个预设主题（免费 3 个 + 会员 9 个）
  - 免费：Link168 草木默认、草木原色、简约白
  - 会员：商务黑、蓝色科技、橙色活力、浅绿清新、夜樱粉、日落橙、海洋蓝、森林绿、极简灰、暖茶棕
- `normalize.ts`：自定义主题规范化
- `types.ts`：主题类型定义

#### 6.4.3 用户组件 [src/features/profile-modules/](file:///d:/link168/link.me/src/features/profile-modules/)

**职责**：组件注册表 + 校验。

- `registry.ts`：组件注册表
- `types.ts`：组件类型定义
- `validators.ts`：组件 payload 校验

#### 6.4.4 公开主页模块组件 [src/components/share/modules/](file:///d:/link168/link.me/src/components/share/modules/)

17 个模块组件：

| 模块 | 用途 |
|---|---|
| `AiChatModule` | AI 接待助手入口 |
| `BilibiliVideoModule` | B 站视频 |
| `YoutubeVideoModule` | YouTube 视频 |
| `NeteaseMusicModule` | 网易云音乐 |
| `MusicLinkModule` | 音乐链接 |
| `VideoLinkModule` | 视频链接 |
| `CarouselModule` | 轮播图 |
| `CoverImageModule` | 封面图 |
| `PopupImageModule` | 弹窗图片 |
| `CopyTextModule` | 复制文本 |
| `DividerModule` | 分隔线 |
| `BookingModule` | 预约 |
| `ProductCardModule` | 产品卡片 |
| `ServiceCardModule` | 服务卡片 |
| `OfferModule` | Offer 模块 |
| `SafeImage` | 图片安全包装 |
| `ModuleFallback` | 兜底组件 |

### 6.5 用户后台模块

#### 6.5.1 V1 名片编辑器 [src/app/dashboard/](file:///d:/link168/link.me/src/app/dashboard/) + [src/components/dashboard-v1/](file:///d:/link168/link.me/src/components/dashboard-v1/)

**职责**：单页应用式名片编辑器。

**核心组件**：
- `DashboardV1Client.tsx`：主客户端
- `DashboardFrame.tsx`：框架（桌面侧栏 + 移动底部导航 + 右侧手机预览）
- `HomePanel.tsx`：首页
- `ProfilePanel.tsx`：资料编辑
- `LinksPanel.tsx`：链接管理
- `AppearancePanel.tsx`：外观设置（主题、模板）
- `AccountPanel.tsx`：账号设置
- `SharePanel.tsx`：分享设置
- `StatsPanel.tsx`：数据统计
- `AddModuleDrawer.tsx`：添加模块抽屉
- `UpgradeDialog.tsx`：升级对话框
- `PhonePreview.tsx`：手机预览
- `core-store.ts`、`account-store.ts`、`link-state.ts`：状态管理
- `dashboard-api.ts`：API 调用
- `types.ts`：类型定义

**API 路由**（`/api/dashboard/*`）：
- `profile`、`appearance`、`avatar`、`username`
- `links`、`links/[id]`、`links/reorder`、`links/icon`、`links/favicon`
- `products`、`products/[id]`
- `knowledge`、`knowledge/[id]`
- `short-links`、`short-links/[id]`
- `media/[type]/[...path]`、`media/background`、`media/carousel`、`media/cover`、`media/popup`
- `analytics`、`stats`、`entitlements`

#### 6.5.2 V1 经营工作台 [src/app/workbench/](file:///d:/link168/link.me/src/app/workbench/)

13 个页面：`account`、`ai`、`ai/[assistant]`、`ai/reception`、`ai-service`、`analytics`、`card`、`enterprise`、`knowledge`、`leads`、`membership`、`notifications`、`products`、`short-links` + 首页

**核心组件**：
- `WorkbenchShell.tsx`：工作台外壳
- `LeadsClient.tsx`：线索管理
- `ProductsClient.tsx`：产品管理
- `ShortLinksClient.tsx`：短链接管理

**API 路由**（`/api/workbench/*`）：
- `ai/chat`、`ai/conversations`、`ai/conversations/[id]`、`ai/status`
- `ai-config`
- `knowledge`、`knowledge/[id]`
- `leads`、`leads/[id]`
- `membership`

### 6.6 平台管理后台模块 [src/app/jeepwork/](file:///d:/link168/link.me/src/app/jeepwork/)

20 个页面：首页、login、users、users/[id]、profiles、reports、reports/[id]、audit、logs、governance、roles、system-health、ai-cost、ai-usage、ai-safety、competition-center、competition-ai-debug、showcase、settings/ai、settings/api、settings/payment

**核心组件**（[src/components/admin/](file:///d:/link168/link.me/src/components/admin/)）：
- `AdminShell.tsx`：后台外壳
- `AdminUsersClient.tsx`、`AdminUsersDesktopTable.tsx`：用户管理
- `AdminProfilesClient.tsx`：主页管理
- `AdminReportsClient.tsx`：举报处理
- `AdminAiUsageClient.tsx`：AI 用量
- `AdminPaymentSettingsClient.tsx`：支付配置
- `AdminSettingsApiClient.tsx`：API 配置
- `AiCreditAuditPanel.tsx`：AI 额度审计
- `PaymentDiagnosticsPanel.tsx`：支付诊断
- `ConfirmModal.tsx`：确认弹窗

**API 路由**（`/api/jeepwork/*`）：
- `auth/login`、`auth/logout`、`auth/me`
- `users`、`users/[id]`、`users/[id]/membership`、`users/[id]/restrictions`、`users/batch`、`users/reset-password`、`users/summary`
- `profiles`、`profiles/[username]`
- `reports`、`reports/[id]`
- `audit`、`logs`
- `ai-credits`、`ai-usage`、`ai-safety`
- `membership`、`orders`、`reconciliation`
- `moderation`
- `system-health`、`system-health/dry-run`、`system-health/exec-cleanup`、`system-health/exec-email-freeze`
- `competition-center/*`、`competition-ai-debug`、`competition-files/*`
- `showcase`
- `settings/ai`、`settings/api`、`settings/payment`
- `summary`

### 6.7 Showcase 模块 [src/app/showcase/](file:///d:/link168/link.me/src/app/showcase/)

4 个页面：首页、judge（评委）、investor（投资人）、government（政府）

**核心组件**（[src/components/showcase/](file:///d:/link168/link.me/src/components/showcase/)）：
- `ShowcaseGate.tsx`：访问门禁
- `ShowcaseLayout.tsx`：布局
- `ShowcaseModeSelector.tsx`：模式选择
- `JudgeShowcase.tsx`、`InvestorShowcase.tsx`、`GovernmentShowcase.tsx`：三种视角
- `ShowcaseExperience.tsx`、`ShowcaseRoadshow.tsx`：体验与路演
- `EvidencePanel.tsx`：可信证据中心
- `StatusBadge.tsx`：状态徽章
- `ShowcaseVisitLogger.tsx`：访问日志
- `CompetitionCenterClient.tsx`：比赛中心

**隔离边界**：
- 不写入用户业务数据库
- AI 演示调用独立沙箱（`ShowcaseAIDemoCall`）
- 访客身份与生产用户身份不互通
- 内容由 `ShowcaseContent` 维护，与业务表隔离

**API 路由**（`/api/showcase/*`）：
- `ai-demo`、`content`、`files`、`files/[id]/download`、`session`、`track`、`visit`

### 6.8 限流模块 [src/lib/rate-limit.ts](file:///d:/link168/link.me/src/lib/rate-limit.ts)

**职责**：分布式/内存限流适配层（滑动窗口）。

**实现**：
- 优先 Redis（`RATE_LIMIT_STORE=redis-generic` 或 `upstash-rest`）
- 回退进程内 Map（默认）
- Redis 失败自动降级到内存，不阻塞业务

**关键函数**：
- `rateLimit(request, key, max, windowMs)`：基于 IP 的限流
- `rateLimitByKey(fullKey, max, windowMs)`：基于自定义 key 的限流
- `shouldBypassRateLimit()`：仅 `NODE_ENV !== "production" && AUTH_RATE_LIMIT_BYPASS === "true"` 时绕过

**覆盖场景**：注册、登录、找回密码、AI、短链、后台登录

### 6.9 内容安全模块

#### 6.9.1 [src/lib/content-safety/provider.ts](file:///d:/link168/link.me/src/lib/content-safety/provider.ts)

**职责**：内容审核 Provider（云内容安全或人工复核模式）。

#### 6.9.2 [src/lib/content-safety.ts](file:///d:/link168/link.me/src/lib/content-safety.ts)

**职责**：内容安全入口。

**审核规则**：
- `ContentModerationRecord` 三态：pending / approved / rejected
- 媒体审核状态：approved 允许公开，pending/pending_manual_review/rejected 禁止公开
- 历史 null 按 legacy 兼容规则处理
- 普通访客不得通过直接 URL 绕过状态检查

### 6.10 文件上传与公开 URL 安全

#### 6.10.1 [src/lib/upload-storage.ts](file:///d:/link168/link.me/src/lib/upload-storage.ts)

**职责**：文件上传与存储。

**安全约束**：
- 文件名清洗（防路径穿越）
- 类型白名单
- 大小校验
- 禁止上传脚本、可执行文件、服务器配置文件
- 所有文件操作服务端权限验证

#### 6.10.2 [src/lib/public-url-security.ts](file:///d:/link168/link.me/src/lib/public-url-security.ts)

**职责**：公开 URL 安全过滤。

**函数**：`sanitizePublicUrl`、`sanitizeMapUrl`、`sanitizePhoneNumber` 等。

### 6.11 平台配置 [src/lib/app-config.ts](file:///d:/link168/link.me/src/lib/app-config.ts)

**职责**：平台配置中心（`AppConfig` 表）。

**特性**：
- 敏感字段 AES-256-GCM 加密存储
- 仅返回脱敏值给前端
- 配置项：AI、SMTP、支付、存储、短信等

### 6.12 数据分析模块 [src/lib/analytics/](file:///d:/link168/link.me/src/lib/analytics/)

- `index.ts`：入口
- `stats.ts`：统计
- `events.ts`：事件
- `attribution.ts`：归因
- `short-links.ts`：短链接分析

### 6.13 工作空间模块 [src/lib/workspace/](file:///d:/link168/link.me/src/lib/workspace/)

- `index.ts`：服务端工作空间逻辑
- `client-types.ts`：客户端类型

**API 路由**：`/api/workspaces`、`/api/workspaces/[workspaceId]`、`/api/workspaces/[workspaceId]/members`

### 6.14 缓存策略 [src/lib/cache/public-profile.ts](file:///d:/link168/link.me/src/lib/cache/public-profile.ts)

**职责**：公开主页缓存精准失效。

**策略**：使用 `revalidatePath` 精准失效，覆盖：
- profile 保存
- isPublic 开关
- appearance 保存
- username 变更
- avatar 保存
- 组件操作

**约束**：禁止同时设置 `dynamic="force-dynamic"` 和 `revalidate=0`（会导致重复查询数据库）。

### 6.15 国际化 [src/lib/i18n/](file:///d:/link168/link.me/src/lib/i18n/)

- `server.ts`、`client.ts`、`hooks.ts`、`index.ts`
- 默认语言：中文（zh）

### 6.16 可观测性 [src/lib/observability/](file:///d:/link168/link.me/src/lib/observability/)

- `ai-metrics.ts`：AI 指标
- `ai-trace.ts`：AI 追踪

### 6.17 运维健康 [src/lib/ops/health.ts](file:///d:/link168/link.me/src/lib/ops/health.ts)

**API 路由**：`/api/health`

---

## 7. 关键类与函数说明

### 7.1 数据访问

#### `db` ([src/lib/db.ts](file:///d:/link168/link.me/src/lib/db.ts))

```typescript
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const db = new PrismaClient({ adapter, log: ["error", "warn"] });
```

- 使用 `@prisma/adapter-pg` 适配器（Prisma 7）
- 开发环境全局缓存避免热重载创建多个连接
- `AuditDbClient` 类型：事务客户端类型（用于审计日志写入）

### 7.2 认证函数

| 函数 | 模块 | 用途 |
|---|---|---|
| `createSession(userId, request)` | auth.ts | 创建用户 session |
| `getCurrentUserFromRequest(request)` | auth.ts | 从请求获取当前用户 |
| `getCurrentUserFromCookies()` | auth.ts | 从 cookies 获取当前用户（Server Component） |
| `requireUser(request)` | auth.ts | 要求登录（401 if not） |
| `requireDashboardUser(request)` | auth.ts | 要求登录 + 无 BANNED/SECURITY_RISK |
| `requireActiveUser(request)` | auth.ts | 要求登录 + 无任何限制 |
| `getActiveRestrictions(userId)` | auth.ts | 获取用户所有有效限制 |
| `canShowPublicProfile(restrictions)` | auth.ts | 是否可公开展示主页 |
| `canUserLogin(restrictions)` | auth.ts | 是否可登录 |
| `requireJeepworkAdmin(request)` | jeepwork-auth.ts | 要求 admin 或 super_admin |
| `requireJeepworkSuperAdmin(request)` | jeepwork-auth.ts | 要求 super_admin |
| `jeepworkLoginHandler(request, email, password)` | jeepwork-auth.ts | Jeepwork 登录处理 |

### 7.3 计费函数

| 函数 | 模块 | 用途 |
|---|---|---|
| `getPlanDefinition(planCode)` | plans.ts | 获取套餐定义 |
| `getPlanPriceCents(planCode, billingCycle)` | plans.ts | 获取价格（分） |
| `generateOrderId()` | plans.ts | 生成订单号 |
| `createOrder({ userId, planCode, billingCycle })` | orders.ts | 创建订单 |
| `processPaymentSuccess({ orderNo, providerTradeNo, ... })` | orders.ts | 处理支付成功 |
| `processRefund({ orderId, reason, refundedBy })` | orders.ts | 处理退款（未联调支付宝） |
| `cancelOrder(orderId, userId, reason)` | orders.ts | 取消订单 |
| `closeExpiredOrders()` | orders.ts | 关闭超时订单 |
| `getUserEntitlements(userId)` | entitlements/index.ts | 获取用户权益 |

### 7.4 AI 函数

| 函数 | 模块 | 用途 |
|---|---|---|
| `checkPublicAiAccess({ userId, serviceConfig })` | public-access.ts | 校验访客 AI 三层权限 |
| `getAiCreditBalance(userId)` | credits.ts | 获取 AI 额度余额 |
| `consumeAiCredits({ userId, amount, idempotencyKey, ... })` | credits.ts | 扣减 AI 额度（幂等） |
| `getAssistantDefinition(title)` | assistants.ts | 获取 Agent 定义 |
| `normalizeAssistantTitle(raw)` | assistants.ts | 标准化 Agent 标题 |

### 7.5 错误类

| 类 | 模块 | 用途 |
|---|---|---|
| `BillingPermissionError` | orders.ts | 计费权限错误（403） |
| `OrderNotFoundError` | orders.ts | 订单不存在（404） |
| `RestrictionQueryError` | auth.ts | 限制查询失败 |
| `EmailSendError` | auth.ts | 邮件发送失败 |

### 7.6 常量

| 常量 | 模块 | 用途 |
|---|---|---|
| `SESSION_COOKIE_NAME = "link168_session"` | auth.ts | 用户 session cookie 名 |
| `JEEPWORK_COOKIE_NAME = "link168_admin_session"` | jeepwork-auth.ts | 管理员 session cookie 名 |
| `ROLE_SUPER_ADMIN = "super_admin"` | auth.ts | 超级管理员角色 |
| `ROLE_ADMIN = "admin"` | auth.ts | 管理员角色 |
| `ROLE_USER = "user"` | auth.ts | 普通用户角色 |
| `RESTRICTION_TYPE_*` | auth.ts | 限制类型常量 |
| `ORDER_STATUS` | orders.ts | 订单状态枚举 |
| `PAYMENT_CHANNEL` | orders.ts | 支付通道枚举 |
| `PLAN_CODES` | plans.ts | 套餐代码枚举 |
| `PLAN_DEFINITIONS` | plans.ts | 套餐定义 |
| `AI_ASSISTANTS` | assistants.ts | AI Agent 定义 |
| `AI_CHAT_CREDIT_COST = 1` | credits.ts | 单次 AI 聊天消耗 Credits |

---

## 8. API 路由总览

### 8.1 认证 `/api/auth/*`

| 路由 | 方法 | 用途 |
|---|---|---|
| `/api/auth/register` | POST | 注册 |
| `/api/auth/login` | POST | 登录 |
| `/api/auth/logout` | POST | 登出 |
| `/api/auth/me` | GET | 获取当前用户 |
| `/api/auth/forgot-password` | POST | 忘记密码 |
| `/api/auth/reset-password` | POST | 重置密码 |
| `/api/auth/change-password` | POST | 修改密码 |
| `/api/auth/verify-email` | POST | 发送验证邮件 |
| `/api/auth/verify-email/confirm` | POST | 确认邮箱验证 |
| `/api/auth/username` | POST | 修改 username |
| `/api/auth/sessions` | GET/DELETE | 会话管理 |
| `/api/auth/deactivate` | POST | 账号注销 |

### 8.2 用户后台 `/api/dashboard/*` 和 `/api/workbench/*`

详见第 6.5 节。

### 8.3 计费 `/api/billing/*` 和 `/api/pay/*` 和 `/api/payments/*`

| 路由 | 用途 |
|---|---|
| `/api/billing/config` | 计费配置 |
| `/api/billing/orders` | 订单列表/创建 |
| `/api/billing/orders/[orderId]` | 订单详情 |
| `/api/billing/orders/[orderId]/refund` | 退款 |
| `/api/pay/create-order` | 创建支付订单 |
| `/api/pay/notify` | 支付通知 |
| `/api/payments/alipay/notify` | 支付宝回调 |
| `/api/payments/alipay/test` | 支付宝测试 |
| `/api/payments/sandbox/notify` | 沙箱回调 |
| `/api/payments/sandbox/route` | 沙箱路由 |
| `/api/payments/wechat/notify` | 微信回调（占位） |

### 8.4 AI `/api/ai/*`

| 路由 | 用途 |
|---|---|
| `/api/ai/customer-service` | 访客 AI 客服 |
| `/api/ai/conversion-agent` | 转化引导 |
| `/api/ai/sales-agent` | 产品咨询 |
| `/api/ai/reports` | AI 举报 |
| `/api/ai/risk-events` | 风控事件 |

### 8.5 平台管理 `/api/jeepwork/*`

详见第 6.6 节。

### 8.6 公开接口 `/api/public/*`

| 路由 | 用途 |
|---|---|
| `/api/public/[username]/vcard` | vCard 下载 |
| `/api/public/[username]/visit` | 访问记录 |

### 8.7 其他

| 路由 | 用途 |
|---|---|
| `/api/contact` | 联系表单 |
| `/api/reports` | 举报提交 |
| `/api/qrcode` | 二维码生成 |
| `/api/notifications/*` | 通知 |
| `/api/avatar/[username]` | 头像 |
| `/api/health` | 健康检查 |
| `/api/internal/cron/reconcile-alipay` | 支付宝对账定时任务 |
| `/api/internal/cron/membership-expiry` | 会员过期降级（待实现） |
| `/api/workspaces/*` | 工作空间 |
| `/api/enterprise/organizations/*` | 企业组织 |
| `/api/enterprise-ai/*` | 企业 AI |
| `/api/showcase/*` | Showcase |
| `/api/admin/*` | 旧版后台 API（部分仍使用） |

---

## 9. 环境变量

完整模板见 [.env.example](file:///d:/link168/link.me/.env.example)。

### 9.1 必填项

| 变量 | 用途 |
|---|---|
| `DATABASE_URL` | PostgreSQL 连接串 |
| `SESSION_SECRET` | Session 加密密钥 |
| `ADMIN_SECRET` | 管理员密钥（至少 32 字符） |
| `CONFIG_ENCRYPTION_KEY` | 配置加密密钥 |
| `NEXT_PUBLIC_APP_URL` | 应用 URL（前端可见） |

### 9.2 Cookie 与 HTTPS

| 变量 | 默认 | 用途 |
|---|---|---|
| `COOKIE_SECURE` | true | Cookie 仅 HTTPS 传输 |
| `COOKIE_SAME_SITE` | lax | SameSite 策略 |

### 9.3 限流

| 变量 | 用途 |
|---|---|
| `RATE_LIMIT_STORE` | 限流后端：memory / redis-generic / upstash-rest |
| `REDIS_URL` | Redis 连接串（可选） |
| `UPSTASH_REDIS_REST_URL` | Upstash REST URL（可选） |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Token（可选） |
| `AUTH_RATE_LIMIT_BYPASS` | 仅开发环境绕过限流（生产环境无效） |

### 9.4 数据库备份

| 变量 | 用途 |
|---|---|
| `BACKUP_DIR` | 备份目录（默认 `./backups/db`） |
| `CONFIRM_RESTORE` | 确认恢复（`npm run db:restore` 必需） |
| `CONFIRM_PRODUCTION_MIGRATE` | 确认生产迁移 |

### 9.5 系统用户

| 变量 | 用途 |
|---|---|
| `DEMO_EMAIL` / `DEMO_PASSWORD` | Demo 用户 |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | 管理员 |
| `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` | 超级管理员 |

### 9.6 SMTP（可选，应急兜底）

| 变量 | 用途 |
|---|---|
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | SMTP 配置 |
| `MAIL_FROM` | 发件人 |

### 9.7 AI

| 变量 | 用途 |
|---|---|
| `BAILIAN_APP_ID` | 百炼应用 ID |
| `BAILIAN_APP_BASE_URL` | 百炼 API 基础 URL |
| `DASHSCOPE_WORKSPACE_ID` | DashScope 工作空间 ID |

### 9.8 支付对账

| 变量 | 用途 |
|---|---|
| `PAYMENT_RECONCILE_SECRET` | 支付宝对账 cron 密钥（至少 32 字符） |

### 9.9 重要约束

- `DATABASE_URL`、`SESSION_SECRET`、`ADMIN_SECRET`、`CONFIG_ENCRYPTION_KEY` 只能由服务器环境变量提供，不能通过网页后台配置
- 超级管理员配置中心对敏感字段加密保存，只返回脱敏值
- 第三方 API Key 建议通过超级管理员配置中心填写，不写入源码
- 禁止提交 `.sql` / `.sql.gz` 备份文件到 Git

---

## 10. 构建与运行

### 10.1 本地开发

```bash
# 安装依赖
npm install

# 数据库迁移
npm run db:migrate

# 创建系统用户（可选）
npm run db:create-users

# 开发运行
npm run dev

# 质量检查
npm run lint
npm run typecheck
npm run build

# 数据库备份/恢复
npm run db:backup
npm run db:restore
npm run db:verify
```

### 10.2 NPM Scripts

| 脚本 | 用途 |
|---|---|
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建（standalone） |
| `npm run start` | 启动 standalone server（`node .next/standalone/server.js`） |
| `npm run lint` | ESLint 检查 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run check` | lint + typecheck + build |
| `npm run db:backup` | 数据库备份 |
| `npm run db:restore` | 数据库恢复 |
| `npm run db:migrate` | 数据库迁移 |
| `npm run db:verify` | 数据库验证 |
| `npm run db:create-users` | 创建系统用户 |

### 10.3 生产部署

**架构**：GitHub Actions Linux 构建 standalone 产物 → 部署到阿里云服务器 → PM2 启动

**关键约束**（来自项目记忆）：
- 阿里云 2 核 2G 服务器只负责运行，不负责构建
- 构建统一由 GitHub Actions Linux 环境完成
- 部署包仅包含 `.next`、本次修改后的源码、修改过的 `package.json` 和 lockfile
- 部署包**不得包含**：`.env`、`node_modules`、数据库文件、备份目录、Git 历史、真实 API Key
- 启动命令：`PORT=3000 HOSTNAME=127.0.0.1 pm2 start server.js --name link168-test --update-env`
- 数据库迁移仅在有未应用 migration 时执行 `npx prisma migrate deploy`
- 禁止 `prisma migrate reset`、`prisma db push --force-reset`、`dropdb`

**GitHub Actions 工作流**：
- [.github/workflows/build-standalone.yml](file:///d:/link168/link.me/.github/workflows/build-standalone.yml)：standalone 构建
- [.github/workflows/v1-check.yml](file:///d:/link168/link.me/.github/workflows/v1-check.yml)：V1 检查

### 10.4 next.config.ts 关键配置

```typescript
const nextConfig: NextConfig = {
  output: "standalone",                    // 独立部署输出
  poweredByHeader: false,                  // 隐藏 X-Powered-By
  serverExternalPackages: [                // 服务端外部包
    "pg", "@prisma/adapter-pg",
    "@upstash/redis", "ioredis"
  ],
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },        // 全局安全头
      { source: "/api/:path*", headers: [{ Cache-Control: "private, no-store" }] }
    ];
  }
};
```

**安全头**：
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Cross-Origin-Opener-Policy: same-origin-allow-popups`
- `X-DNS-Prefetch-Control: on`

### 10.5 TypeScript 配置

- `target: ES2017`、`strict: true`、`moduleResolution: bundler`
- 路径别名：`@/* → ./src/*`
- JSX: `react-jsx`
- 增量编译：`incremental: true`

---

## 11. 安全与合规约束

### 11.1 工程红线（来自 PROJECT_RULES.md）

- 密钥、API Key、数据库密码、SMTP 密码、支付私钥**绝不写入仓库**
- AI 请求必须经由服务端代理，浏览器不接触 API Key
- 支付回调必须验签、校验金额、幂等处理
- 免费用户服务端必须拒绝真实 AI 调用
- 文件上传需校验类型、大小、路径穿越
- 所有管理 API 逐请求鉴权
- 支付发起必须使用服务端生成金额，不能信任浏览器传入金额
- 微信和支付宝回调必须实现服务端签名验证、订单信息校验和幂等保护

### 11.2 数据库安全

- 严禁 Agent 擅自连接生产环境
- 严禁在生产执行 `prisma migrate reset`
- 内部 Service Account（`isSystem=true`）密码/角色不可通过后台 API 修改
- `admin_audit_logs` 不可被任何人删除

### 11.3 密码策略

- 哈希算法：bcrypt（cost factor 12）
- 密码长度：8 位（前后端校验一致）
- 重置 Token：2 小时过期
- 邮箱验证 Token：24 小时过期

### 11.4 Session 策略

- Token：32 字节随机 + SHA256 哈希存储
- 有效期：30 天（用户）/ 8 小时（管理员）
- Cookie：HttpOnly、SameSite=Lax（用户）/ Strict（管理员）
- 多端登录：支持，可查看与撤销其他 session

### 11.5 限流策略

- 注册/登录/找回密码：IP + 邮箱双维度
- AI 接待：每日上限 + 风控
- 短链接：IP 维度
- 后台登录：IP + 邮箱双维度，15 分钟 5 次

### 11.6 内容审核

- 三态：pending / approved / rejected
- 媒体审核：approved 才允许公开
- 历史 null 按 legacy 兼容
- 普通访客不得通过直接 URL 绕过状态检查

### 11.7 公开主页隐私

- `profile` 不存在/未公开/冻结/封禁/联系方式私有 → 返回 404
- 统一错误信息不暴露账号状态
- vCard 隐私：`contactVisibility=private` 时返回 404

### 11.8 安全响应头

详见第 10.4 节。

---

## 12. 已知问题与限制

### 12.1 P0 缺口（必须修复）

1. **AI 额度不一致 BUG**
   - `src/lib/ai/permissions.ts` 的 `PLAN_AI_LIMITS` 与 `src/lib/billing/plans.ts` 的 `PLAN_DEFINITIONS` 数值不一致
   - `permissions.ts` 缺失 `enterprise_pro_plus` 和 `internal_test` 键
   - 影响：套餐展示、扣减、查询走不同源
   - 目标：以 `plans.ts` 为单一真实源

2. **退款未调用支付宝接口**
   - `processRefund` 仅更新本地订单状态
   - 未调用支付宝 `alipay.trade.refund`
   - 影响：用户钱包到账与平台订单状态不一致

3. **无自动到期降级**
   - 当前为惰性降级：3 天宽限期，下次调用时检查
   - 无定时任务扫描过期会员
   - 影响：过期用户在宽限期内仍可正常使用 AI

4. **`/admin` 6 页面全部 404**
   - UI 入口存在但功能未实现

### 12.2 P1 缺口（V2 必须交付）

1. `/console` 统一控制台
2. Workspace 数据模型与迁移（数据模型已就绪，UI 待完善）
3. 企业工作空间能力
4. Channel 独立模型
5. AI 双产品线额度分账
6. `/dashboard` `/workbench` 兼容重定向

### 12.3 P2 缺口（V2 尽量交付）

1. 知识库向量检索升级（当前仅 prompt stuffing，最多 12 篇）
2. Lead 自动从 AI 接待会话收集
3. 移动端 `/console` 全量适配

### 12.4 当前限制

- 双后台心智混乱（`/dashboard` + `/workbench`）
- 企业版功能未实现（无 Workspace 模型，数据模型已就绪但 UI 待完善）
- 微信支付仅有框架占位，未开放
- 退款只更新本地订单状态，未调用支付宝退款接口
- 到期降级依赖惰性计算，无定时任务
- AI 成本统计只有 Credit 计数，无真实成本计算
- 知识库仅 prompt stuffing，无向量检索、无分片、无 rerank

### 12.5 未来预留（V2 不交付）

- 微信小程序
- SSO（单点登录）
- 私有化部署
- 完整 CRM
- 线索自动分配
- 多级审批
- 数字人
- AI 电话
- 在线商城
- 多级分销
- 展会徽章扫描

---

## 附录 A：关键文件路径索引

### A.1 套餐与计费

- [src/lib/billing/plans.ts](file:///d:/link168/link.me/src/lib/billing/plans.ts)：套餐定义（单一真实源目标）
- [src/lib/billing/orders.ts](file:///d:/link168/link.me/src/lib/billing/orders.ts)：订单与退款
- [src/lib/billing/payments.ts](file:///d:/link168/link.me/src/lib/billing/payments.ts)：支付入口
- [src/lib/billing/membership.ts](file:///d:/link168/link.me/src/lib/billing/membership.ts)：会员状态
- [src/lib/billing/reconciliation.ts](file:///d:/link168/link.me/src/lib/billing/reconciliation.ts)：对账
- [src/lib/billing/alipay-reconciliation.ts](file:///d:/link168/link.me/src/lib/billing/alipay-reconciliation.ts)：支付宝对账
- [src/lib/billing/entitlements/index.ts](file:///d:/link168/link.me/src/lib/billing/entitlements/index.ts)：权益
- [src/lib/billing/providers/](file:///d:/link168/link.me/src/lib/billing/providers/)：支付 Provider

### A.2 AI

- [src/lib/ai/permissions.ts](file:///d:/link168/link.me/src/lib/ai/permissions.ts)：AI 权限与额度（含已知 BUG）
- [src/lib/ai/credits.ts](file:///d:/link168/link.me/src/lib/ai/credits.ts)：额度扣减与回补
- [src/lib/ai/assistants.ts](file:///d:/link168/link.me/src/lib/ai/assistants.ts)：用户侧 8 个 Agent
- [src/lib/ai/commercial-agent.ts](file:///d:/link168/link.me/src/lib/ai/commercial-agent.ts)：访客侧 AI 接待助手
- [src/lib/ai/public-access.ts](file:///d:/link168/link.me/src/lib/ai/public-access.ts)：访客侧三层权限
- [src/lib/ai/providers/bailian.ts](file:///d:/link168/link.me/src/lib/ai/providers/bailian.ts)：阿里云百炼
- [src/lib/ai/providers/bailian-application.ts](file:///d:/link168/link.me/src/lib/ai/providers/bailian-application.ts)：百炼应用接口
- [src/lib/ai/compliance.ts](file:///d:/link168/link.me/src/lib/ai/compliance.ts)：合规
- [src/lib/ai/risk-log.ts](file:///d:/link168/link.me/src/lib/ai/risk-log.ts)：风控
- [src/lib/ai/privacy.ts](file:///d:/link168/link.me/src/lib/ai/privacy.ts)：隐私

### A.3 数据库

- [prisma/schema.prisma](file:///d:/link168/link.me/prisma/schema.prisma)：Schema 定义
- [prisma/migrations/](file:///d:/link168/link.me/prisma/migrations/)：迁移脚本（17 个）
- [scripts/db/backup-db.js](file:///d:/link168/link.me/scripts/db/backup-db.js)：备份
- [scripts/db/restore-db.js](file:///d:/link168/link.me/scripts/db/restore-db.js)：恢复
- [scripts/db/export-sanitized-db.js](file:///d:/link168/link.me/scripts/db/export-sanitized-db.js)：脱敏导出
- [scripts/db/migrate-db.js](file:///d:/link168/link.me/scripts/db/migrate-db.js)：迁移

### A.4 路由

- [src/app/[username]/page.tsx](file:///d:/link168/link.me/src/app/[username]/page.tsx)：公开主页
- [src/app/dashboard/page.tsx](file:///d:/link168/link.me/src/app/dashboard/page.tsx)：V1 名片编辑器
- [src/app/workbench/](file:///d:/link168/link.me/src/app/workbench/)：V1 工作台（13 页）
- [src/app/jeepwork/](file:///d:/link168/link.me/src/app/jeepwork/)：平台控制平面（20 页）
- [src/app/showcase/](file:///d:/link168/link.me/src/app/showcase/)：受控展示（4 页）
- [src/app/admin/](file:///d:/link168/link.me/src/app/admin/)：废弃后台（6 页全 404）

### A.5 鉴权

- [src/lib/auth.ts](file:///d:/link168/link.me/src/lib/auth.ts)：用户鉴权
- [src/lib/admin-auth.ts](file:///d:/link168/link.me/src/lib/admin-auth.ts)：管理员鉴权
- [src/lib/jeepwork-auth.ts](file:///d:/link168/link.me/src/lib/jeepwork-auth.ts)：jeepwork 鉴权
- [src/lib/admin-governance/permissions.ts](file:///d:/link168/link.me/src/lib/admin-governance/permissions.ts)：管理治理权限

### A.6 安全

- [src/lib/rate-limit.ts](file:///d:/link168/link.me/src/lib/rate-limit.ts)：限流
- [src/lib/public-url-security.ts](file:///d:/link168/link.me/src/lib/public-url-security.ts)：公开 URL 安全
- [src/lib/upload-storage.ts](file:///d:/link168/link.me/src/lib/upload-storage.ts)：文件上传
- [src/lib/content-safety/provider.ts](file:///d:/link168/link.me/src/lib/content-safety/provider.ts)：内容安全

### A.7 文档

- [PROJECT_RULES.md](file:///d:/link168/link.me/PROJECT_RULES.md)：工程与安全红线
- [PRD.md](file:///d:/link168/link.me/PRD.md)：产品需求文档
- [ROADMAP.md](file:///d:/link168/link.me/ROADMAP.md)：路线规划
- [SPRINT.md](file:///d:/link168/link.me/SPRINT.md)：当前迭代
- [docs/UI_ARCHITECTURE.md](file:///d:/link168/link.me/docs/UI_ARCHITECTURE.md)：UI 架构
- [docs/USER_COMPONENT_CATALOG.md](file:///d:/link168/link.me/docs/USER_COMPONENT_CATALOG.md)：组件目录
- [docs/PRICING_AND_ENTITLEMENTS.md](file:///d:/link168/link.me/docs/PRICING_AND_ENTITLEMENTS.md)：套餐权益
- [docs/SHOWCASE_AND_DEMO.md](file:///d:/link168/link.me/docs/SHOWCASE_AND_DEMO.md)：Showcase 规范
- [docs/JEEPWORK_ADMIN_SPEC.md](file:///d:/link168/link.me/docs/JEEPWORK_ADMIN_SPEC.md)：Jeepwork 规范
- [docs/DOCUMENT_INDEX.md](file:///d:/link168/link.me/docs/DOCUMENT_INDEX.md)：文档索引

---

## 附录 B：版本记录

| 日期 | 变更 | 作者 |
|---|---|---|
| 2026-07-07 | 创建 Code Wiki 文档，覆盖项目架构、模块、关键类、API、运行方式 | TRAE Agent |

---

> 本文档基于 Link168 项目本地真实代码生成，所有描述以代码为准。如发现与代码不一致，以代码为准。
