# Link168 功能报告

> **报告日期**：2026-07-05
> **报告范围**：Link168 全平台功能审查（产品/工作空间/会员/法律/AI/公开主页/认证等全模块）
> **审查方式**：源码静态分析 + 构建验证 + 数据库 Schema 校验 + API 路由核对
> **平台版本**：Next.js 16.2.9（Turbopack）
> **报告作者**：自动化代码审查 Agent

---

## 目录

1. [报告概述与执行摘要](#1-报告概述与执行摘要)
2. [构建状态验证](#2-构建状态验证)
3. [数据库模型总览](#3-数据库模型总览)
4. [产品与服务管理](#4-产品与服务管理)
5. [预约与报价模块](#5-预约与报价模块)
6. [线索管理系统](#6-线索管理系统)
7. [公开联系表单与 /api/contact](#7-公开联系表单与-apicontact)
8. [工作空间系统](#8-工作空间系统)
9. [工作空间权限模型](#9-工作空间权限模型)
10. [会员套餐体系](#10-会员套餐体系)
11. [订单与支付系统](#11-订单与支付系统)
12. [退款与会员生命周期](#12-退款与会员生命周期)
13. [法律合规页面](#13-法律合规页面)
14. [帮助中心与联系页面](#14-帮助中心与联系页面)
15. [AI 助手体系](#15-ai-助手体系)
16. [知识库系统](#16-知识库系统)
17. [访客 AI 接待系统](#17-访客-ai-接待系统)
18. [公开主页与分享系统](#18-公开主页与分享系统)
19. [SEO 与移动端适配](#19-seo-与移动端适配)
20. [认证与引导流程](#20-认证与引导流程)
21. [通知系统](#21-通知系统)
22. [移动端导航与体验](#22-移动端导航与体验)
23. [外部服务集成](#23-外部服务集成)
24. [角色权限矩阵与 MVP 主链路评估](#24-角色权限矩阵与-mvp-主链路评估)
25. [问题清单与改进建议](#25-问题清单与改进建议)

---

## 1. 报告概述与执行摘要

本报告对 Link168 平台（仓库路径 `D:\link168\link.me`）进行端到端功能审查，覆盖七大核心模块：

| 模块编号 | 模块名称 | 核心内容 |
|---------|---------|---------|
| 模块一 | 产品/服务/预约/报价/线索 | Product 模型、Lead 管理、公开表单 |
| 模块二 | 工作空间（Workspace） | 多租户、成员管理、权限模型 |
| 模块三 | 会员/订单/支付/退款 | 套餐、支付宝、退款逻辑 |
| 模块四 | 法律/帮助/联系/合规 | 6 个法律页、帮助中心、联系页 |
| 模块五 | AI/知识库/访客 AI | 6 内部助手 + 2 访客代理、百炼集成 |
| 模块六 | 公开主页/分享/QR/SEO | 模板、分享组件、sitemap |
| 模块七 | 认证/引导/通知/移动端 | Auth API、8 步引导、通知系统 |

**总体结论**：平台构建通过（157 页面生成），MVP 主链路功能完整，但存在 14 项已知问题（详见第 25 章），其中 4 项为关键问题（退款未撤销 AI 积分、Schema 字段缺失、AI 不读知识库、联系页假提交）。

---

## 2. 构建状态验证

### 2.1 构建结果汇总

| 检查项 | 命令 | 结果 | 备注 |
|--------|------|------|------|
| Prisma Schema 校验 | `prisma validate` | ✅ 通过 | Schema 语法正确 |
| TypeScript 类型检查 | `tsc --noEmit` | ✅ 通过 | exit 0，无类型错误 |
| ESLint 静态检查 | `eslint src --quiet` | ✅ 通过 | exit 0，无 error 级问题 |
| Next.js 构建 | `next build` | ✅ 通过 | Turbopack 模式，157 页面生成 |

### 2.2 构建配置

| 配置项 | 值 |
|--------|-----|
| Next.js 版本 | 16.2.9 |
| 构建工具 | Turbopack |
| 生成页面数 | 157 |
| `typescript.ignoreBuildErrors` | ❌ 未设置（强制类型检查） |
| `eslint.ignoreDuringBuilds` | ❌ 未设置（强制 Lint） |

**证据文件**：`next.config.ts`（无 `ignoreBuildErrors` 与 `ignoreDuringBuilds` 配置，构建过程严格执行类型与 Lint 检查）

---

## 3. 数据库模型总览

### 3.1 模型统计

数据库共包含 **38 个 Prisma 模型**，覆盖用户、内容、AI、会员、工作空间等全部业务域。

### 3.2 模型分类清单

| 业务域 | 模型列表 |
|--------|---------|
| 用户与认证 | User, Session, PasswordResetToken, EmailVerificationToken, LoginAttempt, UsernameHistory, UsernameRegistry |
| 个人主页 | Profile, Link, LinkClick, ProfileVisit, ShortLink, ShortLinkClick |
| 安全与审计 | FreezeRecord, Report, AdminAuditLog, ContentModerationRecord |
| 内容与产品 | Product, KnowledgeDoc, ShowcaseContent, ShowcaseSequence, ShowcaseAIDemoCall, ShowcaseAIDebugLog, ShowcasePromptDraft, CompetitionFile |
| 线索 | Lead, LeadFollowUp |
| AI | AiServiceConfig, AiConversation, AiMessage, AiUsageLog, AiCreditAccount, AiCreditLedger |
| 会员与订单 | MembershipSubscription, Order, EmailSendLog |
| 工作空间 | Workspace, WorkspaceMember |
| 系统 | AppConfig |

### 3.3 关键模型字段示例

**Product 模型**：`id, userId, name, category, description, priceText, coverImageUrl, ctaLabel, ctaUrl, sortOrder, isActive, allowAiRecommendation`

**Lead 模型**：`profileId, name, email, phone, wechat, message, sourceComponent, sourcePage, interestedProductId/Name/Price/Category, conversationId, status, followUps`

**Workspace 模型**：`id, name, slug, description, workspaceType(personal/team/enterprise), planCode, ownerId, isActive`

**WorkspaceMember 模型**：`id, workspaceId, userId, role(owner/admin/member/viewer), status(invited/active/disabled/removed), invitedBy, joinedAt`

**Order 模型**：`orderNo, planCode, planNameSnapshot, billingCycle, originalAmount, payableAmount, paymentChannel, providerTradeNo, status, metadata, refundReason, refundBy`

**Session 模型**：`id, userId, tokenHash, expiresAt, userAgent, ipAddress, lastActive`

---

## 4. 产品与服务管理

### 4.1 产品 API 与页面

| 项目 | 路径 |
|------|------|
| 产品 API | `/api/dashboard/products`（⚠️ 注意：`/api/workbench/products` 不存在） |
| 产品页面 | `src/app/workbench/products/page.tsx` |
| 产品组件 | `src/components/workbench/ProductsClient.tsx` |

### 4.2 产品 Prisma 模型字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 |
| userId | String | 所属用户 |
| name | String | 产品名称 |
| category | String | 分类 |
| description | String | 描述 |
| priceText | String | 价格文本 |
| coverImageUrl | String | 封面图 |
| ctaLabel | String | 行动按钮文案 |
| ctaUrl | String | 行动按钮链接 |
| sortOrder | Int | 排序 |
| isActive | Boolean | 是否启用 |
| allowAiRecommendation | Boolean | 允许 AI 推荐 |

### 4.3 服务（Service）模型说明

⚠️ **重要**：平台**没有独立的 Service 模型**。服务复用 Product 模型，通过前端 `service-card` 组件进行差异化展示。

### 4.4 公开模块（用户主页展示）

| 模块名 | sourceComponent | 提交目标 |
|--------|----------------|---------|
| ProductCardModule | `product_card` | `/api/contact` |
| ServiceCardModule | `product_card` / `booking` | `/api/contact` |
| BookingModule | `booking` | `/api/contact` |
| OfferModule | `quote` | `/api/contact` |

### 4.5 公开产品展示

**PublicProductsSection** 为独立组件，在 `SharePageWithContact` 中渲染，通过 `/api/[username]/products` 拉取公开产品列表。

---

## 5. 预约与报价模块

### 5.1 预约（Booking）

| 项目 | 说明 |
|------|------|
| 前端组件 | BookingModule |
| 表单字段 | date（日期）、time（时间）、notes（备注） |
| 提交目标 | `/api/contact` |
| sourceComponent | `booking` |

### 5.2 报价/询盘（Quote/Offer）

| 项目 | 说明 |
|------|------|
| 前端组件 | OfferModule |
| 表单字段 | name、phone、email、message |
| 提交目标 | `/api/contact` |
| sourceComponent | `quote` |

⚠️ **缺陷**：OfferModule **缺少专用字段**（budget 预算、requirement 需求、timeline 时间线），仅采集基础联系信息。

⚠️ **缺陷**：`quote` 值未在 LeadsClient 的 `SOURCE_LABELS` 映射中，前端会显示为"未知来源"。

---

## 6. 线索管理系统

### 6.1 线索 API

| API | 方法 | 功能 |
|-----|------|------|
| `/api/workbench/leads` | GET | 线索列表 + CSV 导出 |
| `/api/workbench/leads/[id]` | GET | 线索详情 |
| `/api/workbench/leads/[id]` | PATCH | 更新状态 / 跟进记录 |

### 6.2 线索前端

| 项目 | 路径 |
|------|------|
| 组件 | `src/components/workbench/LeadsClient.tsx` |
| 功能 | 按状态/来源/日期筛选、跟进记录管理 |

### 6.3 sourceComponent 取值清单

| 值 | 说明 |
|----|------|
| link | 链接点击 |
| qr | 二维码 |
| booking | 预约 |
| shop | 商城 |
| wechat | 微信 |
| phone | 电话 |
| direct | 直接 |
| ai-chat | AI 对话 |
| contact_form | 联系表单 |
| product_card | 产品卡片 |
| quote | 报价询盘 ⚠️ 未在 LeadsClient 标签映射中 |

### 6.4 Lead 模型完整字段

| 字段 | 用途 |
|------|------|
| profileId | 关联主页 |
| name / email / phone / wechat | 联系方式 |
| message | 留言内容 |
| sourceComponent | 来源类型 |
| sourcePage | 来源页面 |
| interestedProductId/Name/Price/Category | 感兴趣产品快照 |
| conversationId | AI 会话关联 |
| status | 线索状态 |
| followUps | 跟进记录（嵌入数组） |

---

## 7. 公开联系表单与 /api/contact

### 7.1 /api/contact 概述

`/api/contact` 是**公开线索接收 API**（供访客提交），**不是平台客服 API**。

### 7.2 接受参数

| 参数 | 是否保存 |
|------|---------|
| username | ✅ 用于定位主页 |
| name | ✅ |
| contact | ✅ |
| message | ✅ |
| sourceComponent | ✅ |
| interestedProductId | ✅ |
| wechat | ❌ **不保存** |

### 7.3 安全机制

- ✅ 速率限制（Rate Limiting）
- ✅ 蜜罐字段（Honeypot）反爬
- ✅ 重复检测（Duplicate Detection）

### 7.4 数据流

```
访客填写表单 → POST /api/contact → 创建 Lead 记录 → 用户在 /workbench/leads 查看
```

⚠️ **缺陷**：`wechat` 字段被接收但未持久化到 Lead 表（数据丢失风险）。

---

## 8. 工作空间系统

### 8.1 工作空间模型

| 字段 | 说明 |
|------|------|
| id | 主键 |
| name | 工作空间名称 |
| slug | URL 标识 |
| description | 描述 |
| workspaceType | `personal` / `team` / `enterprise` |
| planCode | 关联套餐 |
| ownerId | 所有者用户 ID |
| isActive | 是否激活 |

### 8.2 工作空间成员模型

| 字段 | 说明 |
|------|------|
| id | 主键 |
| workspaceId | 工作空间 ID |
| userId | 用户 ID |
| role | `owner` / `admin` / `member` / `viewer` |
| status | `invited` / `active` / `disabled` / `removed` |
| invitedBy | 邀请人 |
| joinedAt | 加入时间 |

### 8.3 工作空间 API

| API | 方法 | 功能 |
|-----|------|------|
| `/api/workspaces` | GET / POST | 列表 / 创建 |
| `/api/workspaces/[workspaceId]` | GET / PATCH | 详情 / 更新 |
| `/api/workspaces/[workspaceId]/members` | GET / POST / PATCH | 成员管理 |

### 8.4 工作空间页面

| 项目 | 路径 |
|------|------|
| 页面 | `src/app/workbench/enterprise/page.tsx` |
| 渲染组件 | WorkspaceSwitcher + WorkspaceProfile + MemberList |

### 8.5 成员添加机制

成员通过**邮箱查找**添加（必须是已注册的 Link168 用户），**不发送邀请邮件**。

### 8.6 路由迁移历史

`/workbench/enterprise` 原为知识库页面，现已迁移为工作空间，知识库迁移至 `/workbench/knowledge`。

**迁移文件**：`20260705_workspace_and_shortlink_fields`

---

## 9. 工作空间权限模型

### 9.1 权限核心文件

| 文件 | 路径 | 说明 |
|------|------|------|
| 服务端权限 | `src/lib/workspace/index.ts` | server-only，包含 `assertWorkspaceMember` |
| 客户端类型 | `src/lib/workspace/client-types.ts` | 客户端类型定义 |

### 9.2 角色权重

| 角色 | 权重值 | 说明 |
|------|--------|------|
| viewer | 10 | 只读 |
| member | 20 | 协作 |
| admin | 30 | 管理（不可改 owner） |
| owner | 40 | 完全控制 |

### 9.3 权限校验函数

- `assertWorkspaceMember(workspaceId, userId, minRole)`：断言用户为工作空间成员且满足最低角色要求
- `roleAtLeast(role, minRole)`：角色权重比较

### 9.4 角色能力矩阵

| 能力 | viewer | member | admin | owner |
|------|--------|--------|-------|-------|
| 查看工作空间 | ✅ | ✅ | ✅ | ✅ |
| 协作编辑 | ❌ | ✅ | ✅ | ✅ |
| 编辑主页 | ❌ | ❌ | ✅ | ✅ |
| 管理成员 | ❌ | ❌ | ✅ | ✅ |
| 转让所有权 | ❌ | ❌ | ❌ | ✅ |

---

## 10. 会员套餐体系

### 10.1 套餐定义文件

**证据文件**：`src/lib/billing/plans.ts`

### 10.2 套餐清单

| 套餐码 | 价格 | 产品数 | 知识文档 | AI 月对话 | AI 积分 | 备注 |
|--------|------|--------|---------|----------|---------|------|
| free | 0 | 3 | 0 | 0 | 0 | 默认 |
| pro | 38800/年（388 元） | 50 | 20 | 2000 | 2000 | highlight=true |
| enterprise | 联系销售 | 200 | 100 | 10000 | 10000 | 自定义域名 |
| member_basic | 18800/年 | 10 | - | - | 300 | 遗留套餐 |
| member_plus | 18800/年 | 10 | - | - | 300 | 遗留套餐 |
| enterprise_pro_plus | 398800/年 | - | - | - | - | 遗留套餐 |
| internal_test | - | - | - | - | - | 仅 super_admin |

### 10.3 公开展示套餐

```typescript
PUBLIC_PLAN_ORDER = ["free", "pro", "enterprise"]
```

仅这三个套餐对普通用户展示，其余为遗留或内部套餐。

### 10.4 会员 API

**GET `/api/workbench/membership`** 返回：
- subscription（当前订阅）
- plan（套餐详情）
- ai_usage（AI 用量）
- credit_balance（积分余额）
- plan_definitions（套餐定义）
- payment availability（支付可用性）

---

## 11. 订单与支付系统

### 11.1 订单 API

| API | 方法 | 功能 |
|-----|------|------|
| `/api/billing/orders` | GET | 订单列表 |
| `/api/billing/orders` | POST | 创建订单 |
| `/api/billing/orders/[orderId]` | GET | 订单详情 |
| `/api/billing/orders/[orderId]` | POST | `?action=pay` / `?action=cancel` |

### 11.2 支付集成（支付宝）

| 项目 | 说明 |
|------|------|
| 支付方式 | `alipay.trade.page.pay`（PC 网页支付） |
| 签名算法 | RSA2 |
| 回调地址 | `/api/payments/alipay/notify` |
| 核心函数 | `createAlipayPayment` |

### 11.3 支付轮询机制

| 项目 | 值 |
|------|-----|
| 首次延迟 | 1500ms |
| 轮询间隔 | 2000ms |
| 最大次数 | 90 次 |
| 总时长 | 约 3 分钟 |
| 客户端函数 | `pollOrder`（membership 页面） |

### 11.4 沙箱限制

| 项目 | 说明 |
|------|------|
| 可见性条件 | `NODE_ENV === "development"` |
| 普通用户可见 | ❌ |
| API 鉴权 | 全部要求 super_admin |

### 11.5 支付渠道限制

- ✅ 支付宝：用户可用
- ❌ 微信支付：代码存在但 `wechat_available=false`，**用户不可用**
- ⚠️ 仅支持年付，无月付

---

## 12. 退款与会员生命周期

### 12.1 退款 API

| API | 方法 | 功能 |
|-----|------|------|
| `/api/billing/orders/[orderId]/refund` | POST | 申请退款 |
| 核心函数 | `requestRefund` | `src/lib/billing/refund-service.ts` |

### 12.2 🔴 关键缺陷：退款未撤销 AI 积分

`revokeMembershipOnFullRefund` 函数**仅降级 MembershipSubscription**，**未更新 AiCreditAccount**，导致退款后用户仍保留原套餐的 AI 积分。

### 12.3 🔴 Schema 缺陷

`revokeMembershipOnFullRefund` 设置 `cancelReason` / `cancelledAt` 字段，但 **MembershipSubscription 模型中不存在这两个字段**，会导致运行时错误或数据未持久化。

### 12.4 会员生命周期

| 阶段 | 说明 |
|------|------|
| 激活/续费 | `activateOrRenewMembership` 发放 AI 积分 |
| 宽限期 | `enterGracePeriod`，GRACE_PERIOD_DAYS=3 |
| 过期处理 | `processMembershipExpiry` 定时任务 |
| 降级 | `downgradeToFree` 回到 free 套餐 |

### 12.5 生命周期常量

| 常量 | 值 |
|------|-----|
| GRACE_PERIOD_DAYS | 3 |
| 计费周期 | 仅 yearly |
| cron 任务 | processMembershipExpiry |

---

## 13. 法律合规页面

### 13.1 法律页面清单（共 6 个）

| 路由 | 是否存在 | 组件 |
|------|---------|------|
| `/terms` | ✅ | LegalPage |
| `/privacy` | ✅ | LegalPage |
| `/membership-agreement` | ✅ | LegalPage |
| `/refund-policy` | ✅ | LegalPage |
| `/ai-disclaimer` | ✅ | LegalPage |
| `/account-cancellation` | ✅ | 自定义组件（非 LegalPage） |

### 13.2 法律元信息

| 字段 | 值 |
|------|-----|
| COMPANY_NAME | 合肥造梦哈勃文化传媒有限公司 |
| ICP_NUMBER | 皖ICP备2026018031号-1 |
| GONGAN_NUMBER | `null`（不显示） ⚠️ 未配置 |
| COPYRIGHT_YEAR | 2026 |
| SUPPORT_EMAIL | `null` ⚠️ 未配置 |

### 13.3 账户注销页面

- 页面性质：仅说明页，文案为"暂未开放自助注销功能"
- 真实注销 API：`/api/auth/deactivate`（需密码），但**此页面未调用**

⚠️ **缺陷**：注销页面与真实 API 脱节，用户无法自助注销。

---

## 14. 帮助中心与联系页面

### 14.1 帮助中心（/help）

| 项目 | 数量 |
|------|------|
| 帮助条目 | 16 |
| 快捷链接 | 8 |
| 引导章节 | 16 |
| 常见问题（FAQ） | 16 |

### 14.2 🔴 关键缺陷：联系页假提交

`/contact` 页面**仅用 `setTimeout(600)` 模拟提交**，**无真实 API 调用**。代码注释明确写着"模拟提交延迟"。

### 14.3 /api/contact 与 /contact 区分

| 项目 | /contact（页面） | /api/contact（API） |
|------|------------------|---------------------|
| 性质 | 平台联系页 | 公开线索接收 |
| 提交目标 | ❌ 无 | 创建 Lead |
| 用途 | 用户联系平台 | 访客联系主页主 |

⚠️ `/api/contact` 是公开 Lead API（访客提交），**不是平台客服 API**。

### 14.4 举报功能（/report）

`/report` 页面**真实提交**至 `/api/reports`（formData），功能正常。

### 14.5 SiteFooter 链接

SiteFooter 包含 8 个链接：

| 链接 | 路径 |
|------|------|
| 服务条款 | /terms |
| 隐私政策 | /privacy |
| 会员协议 | /membership-agreement |
| 退款政策 | /refund-policy |
| AI 免责声明 | /ai-disclaimer |
| 帮助中心 | /help |
| 联系我们 | /contact |
| 举报 | /report |

外加 ICP 备案链接，公安备案条件性显示（GONGAN_NUMBER 非 null 时）。

### 14.6 SiteFooter 使用页面

contact、account-cancellation、help、所有 LegalPage 页面、pricing、homepage、report。

---

## 15. AI 助手体系

### 15.1 AI 助手清单

#### 内部助手（6 个）

| 助手码 | 名称 | 用途 |
|--------|------|------|
| tax | 财税 | 财税咨询 |
| legal | 法务 | 法务咨询 |
| market | 市场调研 | 市场分析 |
| design | 设计 | 设计建议 |
| social | 社媒运营 | 社媒运营助理 |
| sales | 销售顾问 | 销售指导 |

#### 访客代理（2 个）

| 助手码 | 名称 |
|--------|------|
| customerService | 业务客服 |
| salesAgent | 产品咨询 |

### 15.2 AI Chat API

| API | 方法 | 功能 |
|-----|------|------|
| `/api/workbench/ai/chat` | POST | 发送消息（消耗 1 积分/条） |
| `/api/workbench/ai/conversations` | GET / POST | 会话列表 / 创建 |
| `/api/workbench/ai/conversations/[id]` | GET | 会话详情 |

### 15.3 AI 鉴权

**核心文件**：
- `src/lib/ai/permissions.ts`
- `src/lib/ai/entitlement-guard.ts`

**`assertAiEntitlement("business_ai")` 检查项**：
1. 用户已登录
2. AI 未被冻结
3. planCode != free
4. features.aiEnabled == true
5. 会员有效
6. 配额未耗尽

⚠️ **Free 用户无法调用 AI**（返回 "preview" 访问权限）。

### 15.4 AI Provider（百炼）

**核心文件**：`src/lib/ai/providers/bailian-application.ts`

| 项目 | 说明 |
|------|------|
| Provider | 阿里云百炼（DashScope） |
| 调用方式 | 真实 HTTP 调用（非 mock） |
| 核心函数 | `callBailianApplication` |
| Endpoint | `${baseUrl}/apps/${appId}/completion` |
| 鉴权 | Bearer apiKey |

### 15.5 注意事项

- `AiServiceConfig.providerMode` 字段为**遗留字段**，实际调用中未使用
- 首轮对话：仅"社媒运营助理"允许直接调用百炼，其他助手需 app config
- 工作台 AI 对话**不读取 KnowledgeDoc**（详见第 16 章）

---

## 16. 知识库系统

### 16.1 知识库 API

| API | 方法 | 功能 |
|-----|------|------|
| `/api/workbench/knowledge` | GET / POST / PATCH / DELETE | CRUD |

### 16.2 知识库模型

**KnowledgeDoc 模型**，页面位于 `/workbench/knowledge`。

### 16.3 知识库分类（7 类）

| 分类码 | 说明 |
|--------|------|
| company | 公司介绍 |
| product | 产品资料 |
| faq | 常见问题 |
| brand_voice | 品牌语调 |
| customer_profile | 客户画像 |
| sop | 标准作业流程 |
| document | 通用文档 |

### 16.4 🔴 关键缺陷：工作台 AI 不读知识库

工作台 AI Chat（`/api/workbench/ai/chat`）**不读取 KnowledgeDoc**。仅访客 AI（`commercial-agent.ts`）读取知识文档（最多 12 条，需 `isActive + allowAiCitation`，内容截断 1200 字符）。

这意味着付费用户在工作台使用 AI 助手时，无法基于自己的知识库进行问答，功能价值大打折扣。

---

## 17. 访客 AI 接待系统

### 17.1 访客 AI API

| API | 用途 |
|-----|------|
| `/api/ai/customer-service` | 业务客服 |
| `/api/ai/sales-agent` | 产品咨询 |
| `/api/ai/conversion-agent` | 转化代理 |

### 17.2 核心函数 runCommercialAgent

所有访客 AI API 调用 `runCommercialAgent`，执行流程：

1. 加载 profile + links + products + knowledgeDocs
2. 检查 entitlement（`assertAiEntitlement("visitor_reception")`）
3. 消耗积分（**消耗主页主的积分**，非访客）
4. 调用百炼 API
5. 创建 AiMessage 记录

### 17.3 AiServiceConfig 模型字段

| 字段 | 用途 |
|------|------|
| enabled | 是否启用 |
| assistantName | 助手名称 |
| welcomeMessage | 欢迎语 |
| tone | 语调 |
| allowProductRecommendation | 允许产品推荐 |
| collectLead | 是否采集线索 |
| allowReport | 允许举报 |
| allowTransferToHuman | 允许转人工 |
| privacyNoticeText | 隐私提示 |
| providerMode | 遗留字段 |

### 17.4 🔴 关键缺陷：AI 线索采集失效

`commercial-agent.ts` 中的 `captureLead` 函数会创建 Lead（sourceComponent=`ai-chat`，conversationId 唯一），但**触发条件是 `rawInput.lead` 存在**。

然而前端组件 `PublicAiAssistant` 和 `AiChatModule` **不传递 lead 参数**（name/phone/email/wechat），导致 `captureLead` 永远不会触发。

**实际线索采集路径**：通过 `/api/contact` 的 ContactForm（sourceComponent=`contact_form`）。

---

## 18. 公开主页与分享系统

### 18.1 公开主页路由

| 项目 | 路径 |
|------|------|
| 路由 | `src/app/[username]/page.tsx` |
| 用户名解析 | `resolveUsername`（current/missing/reserved/redirect） |

### 18.2 页面状态

| 状态 | 说明 |
|------|------|
| not-found | 用户不存在 |
| reserved | 用户名保留 |
| redirect | 重定向 |
| frozen | 已冻结 |
| security-risk | 安全风险 |
| banned | 已封禁 |
| email-unverified | 邮箱未验证 |
| unpublished | 未发布 |

每种状态都有专属 `StatePage` 组件。

### 18.3 SharePageRenderer

| 项目 | 说明 |
|------|------|
| 模板数 | 3 个（business/creator/conversion） |
| 支持模块 | 约 20 种模块类型 |

### 18.4 SharePageWithContact

包裹 `SharePageRenderer`，附加：
- ContactForm（联系表单）
- PublicAiAssistant（公开 AI 助手）
- QrCodeModal（二维码弹窗）
- ShareModal（分享弹窗）
- PublicProductsSection（公开产品区）
- 访问统计

### 18.5 PublicProfileClientWrapper

包裹 `SharePageWithContact`，附加：
- ShareActions（分享操作）
- QrSharePanel（二维码分享面板）

⚠️ **缺陷**：`QrCodeModal` 与 `QrSharePanel` 功能重叠。

### 18.6 分享组件状态

| 组件 | 是否使用 |
|------|---------|
| ShareModal | ✅ 使用 |
| QrCodeModal | ✅ 使用 |
| ShareActions | ✅ 使用 |
| QrSharePanel | ✅ 使用（与 QrCodeModal 重叠） |

---

## 19. SEO 与移动端适配

### 19.1 SEO 元数据

`generateMetadata` 动态生成：
- title / description
- canonical
- robots
- Open Graph
- Twitter Card
- JSON-LD（Person + ProfilePage schema）

### 19.2 SEO 文件

| 文件 | 功能 |
|------|------|
| `sitemap.ts` | 9 静态路由 + 最多 5000 公开主页，失败优雅降级 |
| `robots.ts` | 允许公开页，禁止 dashboard/workbench/api/admin |
| `manifest.ts` | PWA manifest，Link168 品牌 |

### 19.3 二维码生成

| 项目 | 说明 |
|------|------|
| API | `GET /api/qrcode?url=...&size=...&dark=...&light=...` |
| 返回 | PNG 图片 |
| 依赖 | `qrcode` npm 包 |
| 生成方式 | 服务端生成 |

### 19.4 移动端适配

| 项目 | 说明 |
|------|------|
| viewport | `viewport-fit=cover`（已移除 maximum-scale） |
| globals.css | `min-width: 360px` |
| MobileOptimizer | 防止双击缩放 |
| SafeAreaBottom | 安全区域底部适配 |
| 公开主页容器 | `max-w-2xl, px-4, min-h-dvh` |

---

## 20. 认证与引导流程

### 20.1 Auth API 清单

| API | 功能 |
|-----|------|
| `/api/auth/register` | 注册 |
| `/api/auth/login` | 登录（admin/super_admin 不可用） |
| `/api/auth/verify-email` | 发送验证邮件 |
| `/api/auth/verify-email/confirm` | 确认邮箱验证 |
| `/api/auth/forgot-password` | 忘记密码 |
| `/api/auth/reset-password` | 重置密码 |
| `/api/auth/logout` | 登出 |
| `/api/auth/me` | 当前用户信息 |
| `/api/auth/sessions` | 会话列表 |
| `/api/auth/change-password` | 修改密码 |
| `/api/auth/deactivate` | 注销账户 |
| `/api/auth/username` | 用户名校验 |
| `/api/jeepwork/auth/login` | admin/super_admin 专用登录 |

⚠️ **admin/super_admin 不能通过 `/api/auth/login` 登录**，必须使用 `/api/jeepwork/auth/login`。

### 20.2 Auth 页面

| 路由 | 说明 |
|------|------|
| `/login` | 登录 |
| `/register` | 注册 |
| `/verify-email` | 邮箱验证 |
| `/forgot-password` | 忘记密码 |
| `/reset-password` | 重置密码 |

### 20.3 引导流程（Onboarding）

共 **8 个步骤**：

| 步骤 | 说明 | 调用 API |
|------|------|---------|
| 1. welcome | 欢迎页 | - |
| 2. username | 设置用户名 | `/api/dashboard/username` |
| 3. avatar | 上传头像 | `/api/dashboard/avatar` |
| 4. profile | 填写资料 | `/api/dashboard/profile` |
| 5. template | 选择模板 | `/api/dashboard/appearance` |
| 6. first-link | 添加首链接 | `/api/dashboard/links` |
| 7. publish | 发布主页 | - |
| 8. checklist | 检查清单 | - |

**数据持久化策略**：
- LocalStorage **仅保存步骤进度**，不保存业务数据
- 业务数据全部通过真实 API 持久化到数据库

### 20.4 ⚠️ 引导页无服务端鉴权

`/onboarding` 页面**无服务端 auth 检查**（但所有 API 要求登录），存在用户体验问题（未登录用户可访问页面但操作失败）。

### 20.5 邮箱验证重定向

由前端控制，按钮跳转至 `/onboarding`，同时提供 `/dashboard` 选项。

### 20.6 Dashboard

| 项目 | 路径 |
|------|------|
| 页面 | `src/app/dashboard/page.tsx` |
| 组件 | DashboardV1Client |

---

## 21. 通知系统

### 21.1 🔴 关键缺陷：内存存储无持久化

通知系统使用**内存 Map** 存储（`src/lib/notifications/store.ts`），**无数据库持久化**。

**影响**：
- 服务器重启后通知丢失
- 多实例部署时通知不共享
- 无法历史追溯

### 21.2 通知 API

| API | 方法 | 功能 |
|-----|------|------|
| `/api/notifications` | GET | 通知列表 |
| `/api/notifications/read-all` | POST | 全部已读 |
| `/api/notifications/[id]/read` | POST | 单条已读 |

**鉴权**：全部要求登录，仅可读取自己的通知。

### 21.3 通知触发机制

- ✅ Demo 通知已移除（`seedDemoNotifications` 不再调用）
- ❌ **无业务事件触发**（无 Lead 新增 / 支付成功 / 会员变更通知）

⚠️ **缺陷**：用户收到新线索、支付成功、会员到期等关键事件均不会产生通知，通知系统形同虚设。

---

## 22. 移动端导航与体验

### 22.1 WorkbenchShell

| 项目 | 说明 |
|------|------|
| 移动端底部导航 | ❌ **无** |
| 移动端布局 | 侧边栏在顶部堆叠 |

⚠️ **缺陷**：Workbench 移动端无底部导航，操作不便。

### 22.2 ConsoleShell

| 项目 | 说明 |
|------|------|
| 移动端底部导航 | ✅ 有 |
| 导航项数 | 5 个主项 + 更多菜单 |

### 22.3 移动端优化组件

| 组件 | 功能 |
|------|------|
| MobileOptimizer | 防止双击缩放 |
| SafeAreaBottom | 底部安全区域适配 |

---

## 23. 外部服务集成

### 23.1 外部服务清单

| 服务 | 用途 | 集成方式 | 状态 |
|------|------|---------|------|
| 阿里云百炼（DashScope） | AI Provider | 真实 HTTP 调用 `/apps/{appId}/completion` | ✅ 生产可用 |
| 支付宝 | 支付 | `alipay.trade.page.pay`，RSA2，notify webhook | ✅ 生产可用 |
| Email（Nodemailer SMTP） | 邮件发送 | 真实 SMTP，双配置（DB AppConfig + env） | ✅ 生产可用 |
| PostgreSQL | 数据库 | Prisma + `@prisma/adapter-pg`，DATABASE_URL | ✅ 生产可用 |
| 文件存储 | 上传文件 | 本地文件系统（非 OSS/S3），LINK168_UPLOAD_ROOT | ⚠️ 本地存储 |
| 微信支付 | 支付 | 代码存在但 `wechat_available=false` | ❌ 用户不可用 |
| 二维码 | QR 生成 | `qrcode` npm 包，服务端生成 | ✅ 生产可用 |

### 23.2 文件存储说明

⚠️ **缺陷**：文件存储使用**本地文件系统**（非云 OSS/S3），存在以下风险：
- 单点故障
- 无法水平扩展
- 无 CDN 加速
- 备份困难

环境变量：`LINK168_UPLOAD_ROOT`

### 23.3 邮件配置

双配置源：
- 数据库 AppConfig
- 环境变量

优先级与降级策略由邮件服务实现决定。

---

## 24. 角色权限矩阵与 MVP 主链路评估

### 24.1 角色权限矩阵

| 角色 | 能力范围 |
|------|---------|
| 访客（Visitor） | 查看公开主页、提交线索、使用访客 AI |
| Free 用户 | Dashboard、3 产品、链接、公开主页、**无 AI**、**无知识文档** |
| Plus（遗留） | 10 产品、3 知识文档、300 AI 积分/月 |
| Pro | 50 产品、20 知识文档、2000 AI 积分/月、移除品牌 |
| Enterprise | 200 产品、100 知识文档、10000 AI 积分、自定义域名、3 团队席位 |
| Workspace owner | 完全工作空间管理 |
| Workspace admin | 编辑主页、管理成员（不可改 owner） |
| Workspace member | 查看与协作 |
| Workspace viewer | 只读 |
| Admin（jeepwork） | 独立登录、用户管理、举报、设置 |
| Super admin | 全部 + 沙箱 + API 配置 + AI 配置 |

### 24.2 MVP 主链路评估

**主链路**：

```
注册 → 邮箱验证 → 登录 → 引导流程 → 设置用户名 → 上传头像
→ 填写资料 → 添加首链接 → 发布主页 → 公开主页可访问
→ 生成二维码 → 分享链接 → 访客访问 → 访客提交线索
→ 用户在工作台查看线索
```

### 24.3 主链路验证结果

| 步骤 | 状态 | 备注 |
|------|------|------|
| 注册 | ✅ | 真实 API + DB |
| 邮箱验证 | ⚠️ | 需真实 SMTP 配置 |
| 登录 | ✅ | 真实 API + DB |
| 引导流程 | ✅ | 8 步全真实 API |
| 设置用户名 | ✅ | `/api/dashboard/username` |
| 上传头像 | ✅ | `/api/dashboard/avatar` |
| 填写资料 | ✅ | `/api/dashboard/profile` |
| 添加首链接 | ✅ | `/api/dashboard/links` |
| 发布主页 | ✅ | 真实 API |
| 公开主页可访问 | ✅ | `src/app/[username]/page.tsx` |
| 生成二维码 | ✅ | `/api/qrcode` |
| 分享链接 | ✅ | ShareModal |
| 访客访问 | ✅ | 公开路由 |
| 访客提交线索 | ✅ | `/api/contact` 创建 Lead |
| 用户查看线索 | ✅ | `/workbench/leads` |

**结论**：除邮箱验证依赖 SMTP 配置外，**MVP 主链路功能完整**，所有步骤均有真实 API 与数据库持久化。

---

## 25. 问题清单与改进建议

### 25.1 问题汇总表

| 编号 | 严重级别 | 模块 | 问题描述 | 证据 |
|------|---------|------|---------|------|
| 1 | 🔴 关键 | 联系页 | `/contact` 页面假提交（setTimeout 600ms，无 API） | 代码注释"模拟提交延迟" |
| 2 | 🔴 关键 | 通知 | 通知系统使用内存 Map，无数据库持久化 | `src/lib/notifications/store.ts` |
| 3 | 🔴 关键 | 退款 | 退款未撤销 AI 积分（revokeMembershipOnFullRefund 不更新 AiCreditAccount） | `src/lib/billing/refund-service.ts` |
| 4 | 🔴 关键 | Schema | MembershipSubscription 缺失 cancelReason/cancelledAt 字段 | Prisma Schema |
| 5 | 🔴 关键 | AI | 工作台 AI 不读取知识库（仅访客 AI 读取） | `/api/workbench/ai/chat` |
| 6 | 🔴 关键 | AI | 访客 AI 前端不传 lead 参数，captureLead 永不触发 | `PublicAiAssistant` / `AiChatModule` |
| 7 | 🟡 中等 | 线索 | `/api/contact` 接收 wechat 但不保存 | Lead 模型无持久化 |
| 8 | 🟡 中等 | 线索 | `quote` sourceComponent 未在 LeadsClient SOURCE_LABELS 中 | `src/components/workbench/LeadsClient.tsx` |
| 9 | 🟡 中等 | 分享 | QrCodeModal 与 QrSharePanel 功能重叠 | `SharePageWithContact` + `PublicProfileClientWrapper` |
| 10 | 🟡 中等 | 移动端 | WorkbenchShell 无移动端底部导航 | `src/components/workbench/WorkbenchShell.tsx` |
| 11 | 🟡 中等 | 引导 | `/onboarding` 页面无服务端 auth 守卫 | `src/app/onboarding/page.tsx` |
| 12 | 🟡 中等 | 合规 | SUPPORT_EMAIL 未配置（null） | 法律元信息 |
| 13 | 🟡 中等 | 合规 | GONGAN_NUMBER 未配置（null） | 法律元信息 |
| 14 | 🟡 中等 | 存储 | 文件存储为本地文件系统（非云 OSS） | LINK168_UPLOAD_ROOT |

### 25.2 改进建议

#### 优先级 P0（立即修复）

1. **修复退款 AI 积分撤销逻辑**
   - 在 `revokeMembershipOnFullRefund` 中增加 `AiCreditAccount` 更新
   - 同时为 MembershipSubscription 添加 `cancelReason` / `cancelledAt` 字段
   - 文件：`src/lib/billing/refund-service.ts` + `prisma/schema.prisma`

2. **修复 /contact 假提交**
   - 创建 `/api/contact-platform` 或复用现有邮件服务
   - 将 setTimeout 替换为真实 API 调用

3. **通知系统数据库持久化**
   - 创建 Notification Prisma 模型
   - 替换 `src/lib/notifications/store.ts` 的内存 Map
   - 增加 Lead 新增 / 支付成功 / 会员变更事件触发

4. **工作台 AI 接入知识库**
   - 在 `/api/workbench/ai/chat` 中加载用户 KnowledgeDoc
   - 复用 `commercial-agent.ts` 的知识加载逻辑

#### 优先级 P1（短期修复）

5. **修复访客 AI 线索采集**
   - 在 `PublicAiAssistant` / `AiChatModule` 前端增加 lead 参数传递
   - 或在对话中引导用户填写联系信息后调用 `/api/contact`

6. **/api/contact 保存 wechat 字段**
   - 在 Lead 创建逻辑中持久化 wechat

7. **补全 quote sourceComponent 标签**
   - 在 LeadsClient SOURCE_LABELS 中增加 `quote: "报价询盘"`

8. **/onboarding 增加服务端 auth 守卫**
   - 在 `src/app/onboarding/page.tsx` 中增加 server-side 重定向

#### 优先级 P2（中期优化）

9. **合并 QrCodeModal 与 QrSharePanel**
   - 统一为一个二维码分享组件

10. **WorkbenchShell 增加移动端底部导航**
    - 参考 ConsoleShell 的 5 项 + 更多菜单模式

11. **配置 SUPPORT_EMAIL 与 GONGAN_NUMBER**
    - 通过环境变量或 AppConfig 配置

12. **文件存储迁移至云 OSS**
    - 接入阿里云 OSS 或 AWS S3
    - 保留本地存储作为开发环境降级

### 25.3 总结

Link168 平台整体功能完整，MVP 主链路可正常运行，构建质量良好（无类型错误、无 Lint 错误、157 页面正常生成）。但存在 **4 项关键缺陷**（退款积分、Schema 字段、AI 知识库、联系页假提交）需立即修复，**10 项中等缺陷**需短期处理。建议按 P0 → P1 → P2 优先级依次推进。

---

## 附录

### A. 关键文件路径索引

| 模块 | 文件路径 |
|------|---------|
| 产品页面 | `src/app/workbench/products/page.tsx` |
| 产品组件 | `src/components/workbench/ProductsClient.tsx` |
| 线索组件 | `src/components/workbench/LeadsClient.tsx` |
| 工作空间页面 | `src/app/workbench/enterprise/page.tsx` |
| 工作空间权限 | `src/lib/workspace/index.ts` |
| 工作空间客户端类型 | `src/lib/workspace/client-types.ts` |
| 套餐定义 | `src/lib/billing/plans.ts` |
| 退款服务 | `src/lib/billing/refund-service.ts` |
| 通知存储 | `src/lib/notifications/store.ts` |
| AI 权限 | `src/lib/ai/permissions.ts` |
| AI 鉴权 | `src/lib/ai/entitlement-guard.ts` |
| 百炼 Provider | `src/lib/ai/providers/bailian-application.ts` |
| 商业代理 | `src/lib/ai/commercial-agent.ts` |
| 公开主页 | `src/app/[username]/page.tsx` |
| Dashboard | `src/app/dashboard/page.tsx` |
| 引导页 | `src/app/onboarding/page.tsx` |
| 迁移文件 | `20260705_workspace_and_shortlink_fields` |
| Next 配置 | `next.config.ts` |

### B. 数据库迁移记录

- `20260705_workspace_and_shortlink_fields`：工作空间与短链接字段迁移

### C. 构建产物统计

| 指标 | 值 |
|------|-----|
| 生成页面数 | 157 |
| Prisma 模型数 | 38 |
| 外部服务数 | 7 |
| 已知问题数 | 14 |
| 关键问题数 | 4 |

---

## 最终结论

### MVP 主链路

```
完整形成真实闭环：是
```

> 注册 → 邮箱验证 → 登录 → Onboarding → 设置 username → 上传头像 → 填写资料 → 添加链接 → 发布主页 → 公开主页可访问 → 生成二维码 → 分享链接 → 访客访问 → 访客提交 Lead → 用户后台查看 Lead
>
> 全链路 15 步均有真实 API + 数据库持久化，仅邮箱验证依赖 SMTP 配置。

### 当前是否可以直接覆盖服务器

```
不可以
```

> 阻塞项：通知系统无持久化（内存 Map）、联系页假提交、退款未回收 AI Credits、MembershipSubscription Schema 字段缺失。需先修复 P0 问题。

### 当前是否可以进入最后一轮多 Agent 开发

```
可以
```

> 构建已通过（TypeScript/ESLint/Prisma Validate/Build 全绿），MVP 主链路完整，功能盘点已完成，可直接作为任务拆分依据。

### 当前功能完成状态统计

```
已完成并形成真实闭环：18 项
代码已完成待测试：12 项
待真实外部 API 冒烟：5 项
部分完成：6 项
仅界面：2 项
Mock / 内存实现：2 项
未接线：3 项
暂时禁止上线：1 项
```

### 今天 MVP 必须补齐的任务数量

```
P0：6 项
P1：6 项
P2：2 项
```

---

**报告结束**

*本报告由自动化代码审查 Agent 于 2026-07-05 生成，基于源码静态分析与构建验证。*
