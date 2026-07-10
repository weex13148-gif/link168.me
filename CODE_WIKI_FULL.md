# Link168 Code Wiki

> 面向中文创作者、小商家、自由职业者、一人公司和小型销售团队的 AI 经营名片平台。

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术栈](#2-技术栈)
3. [项目结构](#3-项目结构)
4. [核心模块详解](#4-核心模块详解)
5. [数据库模型](#5-数据库模型)
6. [路由系统](#6-路由系统)
7. [认证与权限](#7-认证与权限)
8. [AI 系统](#8-ai-系统)
9. [计费与会员](#9-计费与会员)
10. [内容安全](#10-内容安全)
11. [项目运行](#11-项目运行)
12. [开发规范](#12-开发规范)

---

## 1. 项目概述

Link168 是一个真实上线运营的 AI 经营名片平台，核心功能包括：

- **公开经营名片**：用户可创建统一的公开主页，展示个人资料、内容平台、产品服务、联系方式和二维码
- **名片编辑器**：支持 20 种内容模块、3 套模板、12 个预设主题
- **经营工作台**：产品管理、客户线索、数据分析、短链接、AI 工具箱
- **AI 接待助手**：访客侧 AI 接待，支持多轮会话、产品推荐、知识库引用、线索收集
- **会员订阅**：免费版 / Plus / Pro / 企业版，支付宝年付支付闭环
- **平台管理后台**：用户治理、会员管理、订单管理、AI 治理、内容审核、安全审计

**版本状态**：V1 功能扩展期末尾，整体完成度约 80%，V2 改版方向：统一 `/console`、合并双后台、统一 AI 命名、企业工作空间

---

## 2. 技术栈

| 分类 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js | latest (App Router) |
| 语言 | TypeScript | latest |
| UI | React | latest |
| 样式 | Tailwind CSS | latest |
| ORM | Prisma | ^7.8.0 |
| 数据库 | PostgreSQL | ^8.21.0 |
| 密码 | bcrypt | ^6.0.0 |
| 邮件 | Nodemailer | ^9.0.1 |
| 二维码 | qrcode, react-qr-code | ^1.5.4, ^2.2.0 |
| 图标 | lucide-react | latest |
| AI | 阿里云百炼 | - |
| 支付 | 支付宝 | - |
| 缓存 | Redis (可选) | @upstash/redis, ioredis |

---

## 3. 项目结构

```
src/
├── app/                    # Next.js App Router 页面与路由
│   ├── [username]/         # 公开经营名片
│   ├── api/                # API 路由
│   ├── console/            # 统一控制台 (V2)
│   ├── dashboard/          # 名片编辑器 V1
│   ├── workbench/          # 经营工作台
│   ├── jeepwork/           # 平台管理后台
│   ├── showcase/           # 比赛与路演展示中心
│   ├── login/              # 登录页
│   ├── register/           # 注册页
│   ├── pricing/            # 定价页
│   └── ...                 # 其他公共页面
├── components/             # UI 组件
│   ├── admin/              # 管理后台组件
│   ├── ai/                 # AI 相关组件
│   ├── layout/             # 布局组件
│   ├── workbench/          # 工作台组件
│   └── ...                 # 通用组件
├── lib/                    # 核心业务逻辑
│   ├── ai/                 # AI 模块
│   ├── analytics/          # 数据分析
│   ├── billing/            # 计费与会员
│   ├── content-safety/     # 内容安全
│   ├── i18n/               # 国际化
│   ├── observability/      # 可观测性
│   └── ...                 # 其他工具库
├── features/               # 功能模块
│   └── profile-modules/    # 名片模块注册
├── generated/              # Prisma 生成代码
└── types/                  # 全局类型定义
```

---

## 4. 核心模块详解

### 4.1 数据库连接

**文件**: [src/lib/db.ts](file:///d:/77.me/code/link168-current/src/lib/db.ts)

- 使用 Prisma Client + PostgreSQL 适配器
- 全局单例模式，避免重复连接
- 开发环境记录 error/warn 日志，生产环境仅记录 error
- 提供 `AuditDbClient` 事务类型

```typescript
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter, log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"] });
```

### 4.2 认证与会话管理

**文件**: [src/lib/auth.ts](file:///d:/77.me/code/link168-current/src/lib/auth.ts)

核心功能：

| 功能 | 函数 | 说明 |
|------|------|------|
| 创建会话 | `createSession()` | 生成 token，存储到 sessions 表 |
| 设置 Cookie | `setSessionCookie()` | HttpOnly, Secure, SameSite=lax |
| 获取当前用户 | `getCurrentUserFromRequest()` | 从请求 Cookie 解析用户 |
| 权限验证 | `requireUser()`, `requireDashboardUser()`, `requireActiveUser()` | 三级权限验证 |
| 邮箱验证 | `createEmailVerificationToken()`, `consumeEmailVerificationToken()` | 24小时有效期 |
| 密码重置 | `createPasswordResetToken()`, `validatePasswordResetToken()` | 2小时有效期 |
| 用户限制 | `getActiveRestrictions()`, `canUserLogin()`, `canShowPublicProfile()` | 冻结/封禁检查 |

权限层级：

1. **requireUser**: 基础认证，检查 session
2. **requireDashboardUser**: 允许受限用户登录后台（如 EMAIL_UNVERIFIED）
3. **requireActiveUser**: 最严格，要求无任何限制

用户限制类型：
- `EMAIL_UNVERIFIED`: 30天未验证邮箱
- `ADMIN_FREEZE`: 管理员冻结（不阻止登录，只阻止公开主页）
- `SECURITY_RISK`: 安全风险（阻止登录和后台）
- `BANNED`: 封禁（阻止所有操作）

### 4.3 应用配置

**文件**: [src/lib/app-config.ts](file:///d:/77.me/code/link168-current/src/lib/app-config.ts)

- 配置存储在 `app_configs` 表中
- 敏感配置使用 AES-256-GCM 加密存储
- 支持配置定义、序列化/反序列化、脱敏显示
- 包含 AI 开关、助手开关、每日限额等配置

### 4.4 Dashboard 数据处理

**文件**: [src/lib/dashboard-data.ts](file:///d:/77.me/code/link168-current/src/lib/dashboard-data.ts)

核心功能：
- `toProfileDto()`: Profile 数据转换
- `toLinkDto()`: Link 数据转换
- `toLeadDto()`: 线索数据转换
- `toProductDto()`: 产品数据转换
- `toKnowledgeDocDto()`: 知识库文档转换
- `getDashboardData()`: 获取用户 Dashboard 综合数据

---

## 5. 数据库模型

### 5.1 核心模型关系

```
User
├── Profile (1:1)
│   ├── Link (1:N)
│   ├── Lead (1:N)
│   ├── AiConversation (1:N)
│   └── ProfileVisit (1:N)
├── Product (1:N)
├── KnowledgeDoc (1:N)
├── AiCreditAccount (1:1)
│   └── AiCreditLedger (1:N)
├── MembershipSubscription (1:1)
├── Order (1:N)
├── ShortLink (1:N)
├── Session (1:N)
├── FreezeRecord (1:N)
└── WorkspaceMember (1:N)

Workspace
└── WorkspaceMember (1:N)
```

### 5.2 模型详解

| 模型 | 用途 | 关键字段 |
|------|------|----------|
| `User` | 用户主体 | id, email, passwordHash, role, accountStatus |
| `Profile` | 用户公开资料 | username, displayName, bio, avatarUrl, theme, template |
| `Link` | 名片链接组件 | type, title, url, position, payloadJson |
| `Lead` | 客户线索 | name, email, phone, status, sourceComponent |
| `Product` | 产品服务 | name, category, priceText, coverImageUrl |
| `KnowledgeDoc` | 知识库文档 | title, content, allowAiCitation |
| `AiConversation` | AI 对话会话 | profileId, visitorSessionId, status |
| `AiMessage` | AI 对话消息 | role, content, sourceRefs, creditCost |
| `AiCreditAccount` | AI 额度账户 | balance, version (乐观锁) |
| `AiCreditLedger` | AI 额度流水 | entryType, amount, balanceAfter, idempotencyKey |
| `MembershipSubscription` | 会员订阅 | planCode, status, currentPeriodStart/End |
| `Order` | 订单 | orderNo, planCode, status, payableAmount |
| `FreezeRecord` | 用户冻结记录 | type, reason, isActive, expiresAt |
| `Workspace` | 工作空间 | name, slug, workspaceType, ownerId |
| `WorkspaceMember` | 工作空间成员 | role, status, invitedBy |

---

## 6. 路由系统

### 6.1 公开页面

| 路由 | 文件 | 功能 |
|------|------|------|
| `/` | `src/app/page.tsx` | 官网首页 |
| `/[username]` | `src/app/[username]/page.tsx` | 公开经营名片 |
| `/login` | `src/app/login/page.tsx` | 登录页 |
| `/register` | `src/app/register/page.tsx` | 注册页 |
| `/pricing` | `src/app/pricing/page.tsx` | 定价页 |
| `/forgot-password` | `src/app/forgot-password/page.tsx` | 忘记密码 |
| `/reset-password` | `src/app/reset-password/page.tsx` | 重置密码 |
| `/verify-email` | `src/app/verify-email/page.tsx` | 邮箱验证 |
| `/privacy` | `src/app/privacy/page.tsx` | 隐私政策 |
| `/terms` | `src/app/terms/page.tsx` | 服务条款 |

### 6.2 用户后台

| 路由 | 文件 | 功能 |
|------|------|------|
| `/dashboard` | `src/app/dashboard/page.tsx` | 名片编辑器 V1 |
| `/workbench` | `src/app/workbench/page.tsx` | 经营工作台 |
| `/workbench/ai` | `src/app/workbench/ai/page.tsx` | AI 工具箱 |
| `/workbench/card` | `src/app/workbench/card/page.tsx` | 名片装修 |
| `/workbench/leads` | `src/app/workbench/leads/page.tsx` | 线索管理 |
| `/workbench/products` | `src/app/workbench/products/page.tsx` | 产品管理 |
| `/workbench/knowledge` | `src/app/workbench/knowledge/page.tsx` | 知识库 |
| `/workbench/analytics` | `src/app/workbench/analytics/page.tsx` | 数据分析 |
| `/workbench/membership` | `src/app/workbench/membership/page.tsx` | 会员中心 |
| `/console` | `src/app/console/page.tsx` | 统一控制台 V2 |
| `/account/security` | `src/app/account/security/page.tsx` | 账号安全 |
| `/account/sessions` | `src/app/account/sessions/page.tsx` | 会话管理 |

### 6.3 管理后台

| 路由 | 文件 | 功能 |
|------|------|------|
| `/jeepwork` | `src/app/jeepwork/page.tsx` | 管理后台首页 |
| `/jeepwork/users` | `src/app/jeepwork/users/page.tsx` | 用户管理 |
| `/jeepwork/roles` | `src/app/jeepwork/roles/page.tsx` | 角色管理 |
| `/jeepwork/audit` | `src/app/jeepwork/audit/page.tsx` | 审计日志 |
| `/jeepwork/logs` | `src/app/jeepwork/logs/page.tsx` | 系统日志 |
| `/jeepwork/ai-usage` | `src/app/jeepwork/ai-usage/page.tsx` | AI 使用统计 |
| `/jeepwork/ai-safety` | `src/app/jeepwork/ai-safety/page.tsx` | AI 安全管理 |
| `/jeepwork/reports` | `src/app/jeepwork/reports/page.tsx` | 举报管理 |
| `/jeepwork/showcase` | `src/app/jeepwork/showcase/page.tsx` | 展示中心管理 |

### 6.4 API 路由

**认证 API**: `src/app/api/auth/`
- `/login/route.ts`: 登录
- `/logout/route.ts`: 登出
- `/me/route.ts`: 获取当前用户
- `/register/route.ts`: 注册
- `/username/route.ts`: 用户名注册
- `/verify-email/route.ts`: 邮箱验证
- `/reset-password/route.ts`: 密码重置
- `/sessions/route.ts`: 会话管理

**Dashboard API**: `src/app/api/dashboard/`
- `/route.ts`: 获取 Dashboard 数据
- `/links/route.ts`: 链接管理
- `/profile/route.ts`: 资料管理
- `/username/route.ts`: 用户名修改
- `/analytics/route.ts`: 数据分析
- `/products/route.ts`: 产品管理
- `/knowledge/route.ts`: 知识库管理
- `/avatar/route.ts`: 头像管理

**Workbench API**: `src/app/api/workbench/`
- `/ai/chat/route.ts`: AI 聊天
- `/ai/status/route.ts`: AI 状态
- `/ai-config/route.ts`: AI 配置
- `/knowledge/route.ts`: 知识库
- `/leads/route.ts`: 线索管理

**AI API**: `src/app/api/ai/`
- `/customer-service/route.ts`: 客服 AI
- `/sales-agent/route.ts`: 销售 AI
- `/conversion-agent/route.ts`: 转化 AI
- `/reports/route.ts`: AI 报告
- `/risk-events/route.ts`: 风险事件

**计费 API**: `src/app/api/billing/`
- `/config/route.ts`: 计费配置
- `/orders/route.ts`: 订单管理

**支付 API**: `src/app/api/pay/`
- `/create-order/route.ts`: 创建订单
- `/notify/route.ts`: 支付回调

**管理 API**: `src/app/api/jeepwork/`
- `/auth/login/route.ts`: 管理员登录
- `/users/route.ts`: 用户治理
- `/membership/route.ts`: 会员管理
- `/orders/route.ts`: 订单管理
- `/ai-usage/route.ts`: AI 使用统计
- `/ai-safety/route.ts`: AI 安全
- `/audit/route.ts`: 审计日志
- `/profiles/route.ts`: 资料管理

---

## 7. 认证与权限

### 7.1 用户认证

**会话机制**：
- 使用 HttpOnly Cookie 存储 session token
- Token 使用 SHA256 哈希存储到数据库
- Session 有效期 30 天
- 支持多端登录管理

**登录流程**：
1. 用户提交邮箱和密码
2. 检查登录失败次数（邮箱/IP 级限流）
3. 验证密码哈希
4. 检查用户限制状态（BANNED/SECURITY_RISK 阻止登录）
5. 创建会话并设置 Cookie

### 7.2 权限系统

**用户角色**：
- `user`: 普通用户
- `admin`: 管理员
- `super_admin`: 超级管理员

**权限函数**（[src/lib/auth.ts](file:///d:/77.me/code/link168-current/src/lib/auth.ts)）：

| 函数 | 权限级别 | 用途 |
|------|----------|------|
| `requireUser()` | 基础认证 | 所有需要登录的 API |
| `requireDashboardUser()` | 允许受限登录 | 后台页面，EMAIL_UNVERIFIED 可进入 |
| `requireActiveUser()` | 无任何限制 | 发布内容、修改用户名等敏感操作 |

**管理后台权限**（[src/lib/admin-auth.ts](file:///d:/77.me/code/link168-current/src/lib/admin-auth.ts)）：

| 函数 | 权限要求 |
|------|----------|
| `requireAdmin()` | admin 或 super_admin |
| `requireSuperAdmin()` | super_admin |

---

## 8. AI 系统

### 8.1 AI 助手定义

**文件**: [src/lib/ai/assistants.ts](file:///d:/77.me/code/link168-current/src/lib/ai/assistants.ts)

系统定义了 8 个 AI 助手：

| 助手 | 标题 | 类别 | 角色 |
|------|------|------|------|
| `tax` | 财税 AI Agent | 企业经营 | 财税与经营核算助理 |
| `legal` | 法务 AI Agent | 合同与合规 | 合同与基础合规模型助理 |
| `market` | 市场调研 AI Agent | 市场与增长 | 市场调研与目标用户分析助理 |
| `design` | 设计 AI Agent | 品牌与视觉 | 品牌视觉与物料设计建议助理 |
| `social` | 社媒运营 AI Agent | 内容与运营 | 社媒选题与文案助理 |
| `sales` | 销售顾问 AI Agent | 销售与转化 | 销售话术与客户转化助理 |
| `customerService` | 业务客服 AI Agent | 客户服务 | 业务客服助理 |
| `salesAgent` | 产品咨询 AI Agent | 销售与营销 | 销售助理 |

每个助手包含：
- `title`: 内部标识
- `displayTitle`: 显示名称
- `systemPrompt`: 系统提示词
- `outputFormat`: 输出格式要求（JSON: summary/suggestions/content）
- `riskNotice`: 风险提示
- `disclaimer`: 免责声明
- `maxMessageLength`: 最大消息长度
- `defaultTemperature`: 温度参数
- `defaultMaxTokens`: 最大 token 数

### 8.2 AI Gateway（安全调用链）

**文件**: [src/lib/ai/gateway.ts](file:///d:/77.me/code/link168-current/src/lib/ai/gateway.ts)

AI 调用安全链路（8 步）：

```
用户输入
  ↓
1. 输入安全审核（Prompt injection + 敏感内容 + 长度检查）
  ↓
2. AI 全局开关 & 单个助手开关检查
  ↓
3. 用户 AI 冻结/封禁检查
  ↓
4. 权限与额度检查（套餐额度 + Credit）
  ↓
5. Provider 配置检查
  ↓
6. 调用模型
  ↓
7. 输出安全审核
  ↓
8. AI 内容标识（追加免责声明）
  ↓
返回结果
```

### 8.3 AI 权限与额度

**文件**: [src/lib/ai/permissions.ts](file:///d:/77.me/code/link168-current/src/lib/ai/permissions.ts)

**访问级别**：
- `none`: 无访问权限
- `preview`: 仅预览（免费用户）
- `full`: 完整访问（付费会员）

**额度系统**：
1. **套餐月度额度**: 来自 `plans.ts` 的 `aiChatsPerMonth`
2. **Credit 余额**: 用户购买的额外额度
3. **扣减顺序**: 优先使用套餐额度，用完后使用 Credit

**额度操作**：
- `consumeCredit()`: 消耗额度
- `refundCredit()`: 回补额度（调用失败时）
- `grantCredit()`: 发放额度

**AI 冻结**：
- 复用 `FreezeRecord` 模型
- 支持冻结/解冻用户 AI 权限
- 支持暂停单个 AI 助手

### 8.4 AI Provider

**文件**: [src/lib/ai/provider.ts](file:///d:/77.me/code/link168-current/src/lib/ai/provider.ts)

- 支持多种 AI Provider（阿里云百炼等）
- 统一调用接口 `callAssistant()`
- 配置从 `app-config` 读取

---

## 9. 计费与会员

### 9.1 套餐定义

**文件**: [src/lib/billing/plans.ts](file:///d:/77.me/code/link168-current/src/lib/billing/plans.ts)

**套餐列表**：

| 套餐 | 名称 | 年价 | 产品数 | 知识库 | AI Chats/月 | Credit/月 |
|------|------|------|--------|--------|-------------|-----------|
| `free` | 免费版 | ¥0 | 3 | 0 | 0 | 0 |
| `plus` | Plus | ¥188 | 10 | 3 | 300 | 300 |
| `pro` | Pro | ¥388 | 50 | 20 | 2000 | 2000 |
| `enterprise` | 企业版 | ¥1280 | 200 | 100 | 10000 | 10000 |
| `enterprise_pro_plus` | 企业专业 Plus | ¥2680 | 1000 | 500 | 50000 | 50000 |

**AI 接待加油包**：
- 代码：`ai_reception_addon_100`
- 价格：¥9.9
- 额度：100 次会话
- 有效期：90 天

### 9.2 会员订阅

**文件**: [src/lib/billing/membership.ts](file:///d:/77.me/code/link168-current/src/lib/billing/membership.ts)

会员状态：
- `active`: 活跃
- `grace_period`: 宽限期
- `inactive`: 过期

### 9.3 订单系统

**文件**: [src/lib/billing/orders.ts](file:///d:/77.me/code/link168-current/src/lib/billing/orders.ts)

订单状态：
- `pending`: 待支付
- `paid`: 已支付
- `cancelled`: 用户取消
- `closed`: 超时关闭
- `refunded`: 已退款

### 9.4 支付集成

**文件**: [src/lib/billing/payments.ts](file:///d:/77.me/code/link168-current/src/lib/billing/payments.ts)

支持支付宝支付，支付回调路由：`/api/pay/notify`

---

## 10. 内容安全

### 10.1 安全审核

**文件**: [src/lib/content-safety.ts](file:///d:/77.me/code/link168-current/src/lib/content-safety.ts)

**输入审核**：
- `detectPromptInjection()`: Prompt 注入检测
- `hasSensitiveContent()`: 敏感内容检测
- `sanitizeUserMessage()`: 消息清理（移除 HTML 标签、危险协议）

**输出审核**：
- `moderateAiOutput()`: AI 输出安全审核

**敏感词分类**：
- 暴力: 暴力破解、黑产、博彩
- 色情: 色情、裸聊
- 毒品: 冰毒、大麻、枪支
- 诈骗: 刷单刷量、代开发票、假证
- 政治: 法轮

**Prompt 注入模式**：
- 要求复述或改变 system prompt
- 要求切换角色或调试模式
- 要求输出 JSON 或结构化敏感信息
- 要求翻译成英文并逐字复述
- 包含常见 HTML/script 注入

### 10.2 审核记录

**模型**: `ContentModerationRecord`

- 支持文本和图片审核
- 状态：`pending`, `approved`, `rejected`, `pending_manual_review`
- 风险级别：`low`, `medium`, `high`
- 支持申诉流程

---

## 11. 项目运行

### 11.1 环境要求

- Node.js (latest)
- PostgreSQL (14+)
- Redis (可选，用于缓存)

### 11.2 安装与运行

```bash
# 安装依赖
npm install

# 开发运行
npm run dev

# 生产构建
npm run build

# 启动生产服务
npm run start
```

### 11.3 数据库操作

```bash
# 数据库迁移
npm run db:migrate

# 数据库备份
npm run db:backup

# 数据库恢复
npm run db:restore

# 数据库验证
npm run db:verify
```

### 11.4 质量检查

```bash
# ESLint 检查
npm run lint

# TypeScript 类型检查
npm run typecheck

# 完整检查（lint + typecheck + build）
npm run check
```

### 11.5 环境变量

复制 `.env.example` 为 `.env`，配置以下变量：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 |
| `NEXT_PUBLIC_APP_URL` | 应用 URL |
| `COOKIE_SECURE` | Cookie 是否 Secure |
| `CONFIG_ENCRYPTION_KEY` | 配置加密密钥 |
| `AUTH_RATE_LIMIT_BYPASS` | 是否绕过登录限流（开发环境） |

---

## 12. 开发规范

### 12.1 安全红线

- 密钥、API Key、数据库密码绝不写入仓库
- AI 请求必须经由服务端代理，浏览器不接触 API Key
- 支付回调必须验签、校验金额、幂等处理
- 免费用户服务端必须拒绝真实 AI 调用
- 文件上传需校验类型、大小、路径穿越
- 所有管理 API 逐请求鉴权

### 12.2 工程约定

- 所有定价和权益数据必须定义在 `src/lib/billing/plans.ts`
- UI 组件必须动态读取定价数据，禁止硬编码
- 用户侧页面必须应用 `dark-public` 深色主题类
- 使用 CSS 变量代替硬编码颜色
- 数据库操作失败时必须明确抛出异常，禁止静默返回

### 12.3 代码规范

- 使用 TypeScript 严格模式
- 函数必须有返回类型注解
- 禁止 `any` 类型（除非有充分理由）
- 使用 ESLint 检查代码质量
- 保持代码简洁，不添加冗余注释

---

## 附录：权威文档入口

| 文档 | 路径 | 用途 |
|------|------|------|
| 工程规则 | `PROJECT_RULES.md` | 安全与工程红线 |
| 产品需求 | `PRD.md` | V2 生产级产品需求文档 |
| 版本路线 | `ROADMAP.md` | W1-W11 阶段规划 |
| 当前迭代 | `SPRINT.md` | 当前 Sprint 与代码任务拆分 |
| UI 架构 | `docs/UI_ARCHITECTURE.md` | 信息架构与移动端规范 |
| 用户组件 | `docs/USER_COMPONENT_CATALOG.md` | 20 种模块组件目录 |
| 套餐权益 | `docs/PRICING_AND_ENTITLEMENTS.md` | 套餐、价格、权益与 AI 额度 |
| 文档索引 | `docs/DOCUMENT_INDEX.md` | 全部文档清单与状态 |
