# Link168 产品结构与页面需求观察报告

生成日期：2026-07-07
观察范围：`D:\link168\link.me`
观察方式：只读分析本地代码、Prisma Schema、当前 PRD/ROADMAP/SPRINT、页面路由与 API 路由。

## 1. 一句话结论

Link168 真正想要的产品结构，不应再继续围绕多个后台入口扩张，而应收敛为：

1. 公开获客页：`/[username]`
2. 用户经营控制台：`/console`
3. 平台管理后台：`/jeepwork`
4. 受控对外展示中心：`/showcase`
5. 公共官网与转化页：`/`、`/pricing`、认证与法务页面

当前代码已经具备大量能力，但能力分散在 `/dashboard`、`/workbench`、`/console`、`/admin`、`/jeepwork`、`/showcase`。这会造成产品心智混乱，也会让后续开发不断在旧入口、新入口和半迁移入口之间重复实现。

## 2. 当前代码事实

### 2.1 页面现状

当前 `src/app` 下实际存在的主要页面入口：

| 页面区域 | 当前状态 | 判断 |
| --- | --- | --- |
| `/[username]` | 已存在 | 公开经营名片，是核心产品资产，必须保留 |
| `/console` | 已存在 | 目前是统一控制台首页和导航壳，但功能仍跳转到 `/dashboard` 与 `/workbench/*` |
| `/dashboard` | 已存在 | V1 名片装修器，应迁移进 `/console/card` 或 `/console/profile` |
| `/workbench/*` | 已存在，约 15 个页面 | 用户经营工作台，应逐步迁移进 `/console/*` |
| `/jeepwork/*` | 已存在，约 20 个页面 | 平台管理后台，应保留为内部运营入口 |
| `/showcase/*` | 已存在，4 个页面 | 受控展示入口，应保留，但不应定义为产品主流程 |
| `/admin/*` | 6 个页面全部 `notFound()` | 历史遗留入口，应废弃或跳转到 `/jeepwork` |
| `/enterprise-ai/*` | 已存在 | 与企业工作空间、AI 能力有重叠，应重新定位 |
| `/account/*` | 已存在 | 与 `/workbench/account` 重叠，应收敛 |

### 2.2 API 现状

当前 `src/app/api` 中有约 143 个 route。主要分布：

| API 区域 | 作用 | 判断 |
| --- | --- | --- |
| `/api/dashboard/*` | 名片、链接、外观、产品、短链、知识库等 | 用户侧核心能力，但命名仍是旧入口 |
| `/api/workbench/*` | AI、知识库、线索、会员等 | 用户经营能力，与 dashboard API 有交叉 |
| `/api/workspaces/*` | 工作空间与成员管理 | 企业/团队能力已经部分实现 |
| `/api/jeepwork/*` | 平台后台管理 | 内部运营核心，应保留 |
| `/api/admin/*` | 旧管理 API | 与 `/api/jeepwork/*` 重叠，应逐步下线或兼容转发 |
| `/api/showcase/*` | 展示中心内容、访问、文件、AI demo | 展示专用，不应混入主产品闭环 |
| `/api/billing/*`、`/api/payments/*`、`/api/pay/*` | 计费、支付、回调 | 需要统一命名和资金流边界 |
| `/api/ai/*`、`/api/workbench/ai/*`、`/api/enterprise-ai/*` | 多条 AI 能力线 | 需要统一命名与职责 |

### 2.3 数据模型现状

Prisma Schema 中已经存在 39 个模型。核心模型可分为：

| 产品域 | 主要模型 | 判断 |
| --- | --- | --- |
| 账号与安全 | `User`、`Session`、`FreezeRecord`、`LoginAttempt` | 基础完整 |
| 公开名片 | `Profile`、`Link`、`ProfileVisit`、`LinkClick` | 核心完整 |
| 增长与转化 | `Lead`、`LeadFollowUp`、`ShortLink`、`ShortLinkClick` | 基础完整 |
| 产品与知识库 | `Product`、`KnowledgeDoc` | 已具备经营数据基础 |
| AI | `AiServiceConfig`、`AiConversation`、`AiMessage`、`AiUsageLog`、`AiCreditAccount`、`AiCreditLedger` | 能力完整但命名和额度口径需要统一 |
| 计费 | `MembershipSubscription`、`Order` | 已有闭环基础，但退款、到期降级仍需收敛 |
| 展示中心 | `CompetitionFile`、`ShowcaseContent`、`ShowcaseSequence`、`ShowcaseAIDemoCall`、`ShowcaseAIDebugLog`、`ShowcasePromptDraft` | 展示专用模型较完整 |
| 企业空间 | `Workspace`、`WorkspaceMember` | 已部分实现，不是完全空白 |

关键修正：旧文档中有“Workspace 不存在”的判断，但当前 schema 已经存在 `Workspace` 和 `WorkspaceMember`，并且 `/workbench/enterprise` 与 `/api/workspaces/*` 已经使用它们。因此企业空间应标为“部分实现”，不是“未实现”。

## 3. 推荐产品结构

### 3.1 产品主线

推荐把 Link168 定义为：

面向个人经营者、小团队和销售型组织的 AI 经营名片平台。

核心闭环：

1. 创建公开名片
2. 展示身份、产品、服务、联系方式
3. 用二维码、短链和渠道引流
4. 用 AI 接待访客
5. 收集线索
6. 跟进客户
7. 查看数据
8. 通过会员、AI 额度和企业空间变现

这个闭环已经能解释现有大部分代码，也能避免继续膨胀成“什么都做”的平台。

### 3.2 顶层信息架构

建议保留 5 类入口：

| 入口 | 用户 | 定位 | 处理建议 |
| --- | --- | --- | --- |
| `/` | 未登录访客 | 官网转化首页 | 保留 |
| `/[username]` | 访客 | 公开经营名片 | 保留，核心资产 |
| `/console` | 登录用户 | 用户唯一工作台 | 作为未来主入口 |
| `/jeepwork` | 平台管理员 | 内部运营和治理后台 | 保留，严控权限 |
| `/showcase` | 评委、投资人、政府、外部展示对象 | 受控展示中心 | 保留，但与主产品隔离 |

其他入口应逐步归并：

| 当前入口 | 建议归宿 |
| --- | --- |
| `/dashboard` | `/console/card` 或 `/console/profile` |
| `/workbench/products` | `/console/products` |
| `/workbench/leads` | `/console/leads` |
| `/workbench/short-links` | `/console/channels` 或 `/console/short-links` |
| `/workbench/analytics` | `/console/analytics` |
| `/workbench/ai` | `/console/ai-tools` |
| `/workbench/ai-service` | `/console/ai-reception` |
| `/workbench/membership` | `/console/billing` |
| `/workbench/account` | `/console/settings/account` |
| `/workbench/enterprise` | `/console/workspaces` |
| `/admin/*` | 下线或跳转 `/jeepwork/*` |
| `/enterprise-ai/*` | 并入 `/console/workspaces` 或 `/console/ai-tools` |

## 4. 用户侧需要的页面

### 4.1 MVP 必须页面

这些页面构成 Link168 的最小完整产品。

| 目标页面 | 当前来源 | 必要性 | 需求说明 |
| --- | --- | --- | --- |
| `/console` | 已存在 | 必须 | 用户登录后的唯一首页，展示经营概览、待办、关键数据 |
| `/console/card` | `/dashboard` | 必须 | 编辑公开名片、主题、头像、封面、模块、联系方式 |
| `/console/products` | `/workbench/products` | 必须 | 管理产品和服务，用于公开页展示与 AI 推荐 |
| `/console/leads` | `/workbench/leads` | 必须 | 查看、筛选、跟进客户线索 |
| `/console/channels` | `/workbench/short-links` | 必须 | 管理短链、二维码、渠道归因 |
| `/console/analytics` | `/workbench/analytics` | 必须 | 展示访问、点击、线索、渠道效果 |
| `/console/ai-reception` | `/workbench/ai-service`、`/workbench/ai/reception` | 必须 | 配置访客侧 AI 接待助手 |
| `/console/billing` | `/workbench/membership` | 必须 | 套餐、订单、AI 额度、支付状态 |
| `/console/settings` | `/workbench/account`、`/account/*` | 必须 | 账号、安全、会话、注销 |

### 4.2 第二阶段页面

| 目标页面 | 当前来源 | 需求说明 |
| --- | --- | --- |
| `/console/knowledge` | `/workbench/knowledge` | 管理 AI 接待可引用的知识内容 |
| `/console/ai-tools` | `/workbench/ai`、`/workbench/ai/[assistant]` | 用户侧经营 AI 工具箱 |
| `/console/workspaces` | `/workbench/enterprise`、`/api/workspaces/*` | 企业/团队空间、成员、角色 |
| `/console/notifications` | `/workbench/notifications` | 系统消息、线索提醒、支付提醒 |

### 4.3 暂缓或降级页面

| 页面 | 原因 | 建议 |
| --- | --- | --- |
| `/enterprise-ai` | 与企业空间和 AI 工具箱重叠 | 暂缓，改为介绍页或跳转 |
| `/enterprise-ai/dashboard` | 与 `/console/workspaces` 重叠 | 暂缓 |
| `/workbench/card` | 与 `/dashboard` 重叠 | 合并到 `/console/card` |
| `/account/security`、`/account/sessions` | 与 `/workbench/account` 重叠 | 合并到 `/console/settings/security` |

## 5. 平台后台需要的页面

`/jeepwork` 应作为内部平台控制台，不参与普通用户路径。

### 5.1 必须保留

| 页面 | 需求 |
| --- | --- |
| `/jeepwork` | 平台总览 |
| `/jeepwork/users`、`/jeepwork/users/[id]` | 用户管理、冻结、会员、限制 |
| `/jeepwork/profiles` | 公开名片巡检与治理 |
| `/jeepwork/reports` | 用户举报处理 |
| `/jeepwork/audit`、`/jeepwork/logs` | 操作审计与系统日志 |
| `/jeepwork/ai-usage`、`/jeepwork/ai-cost`、`/jeepwork/ai-safety` | AI 用量、成本、安全 |
| `/jeepwork/settings/api`、`/jeepwork/settings/ai`、`/jeepwork/settings/payment` | 平台配置 |
| `/jeepwork/system-health` | 系统健康、只读检查、维护操作 |

### 5.2 可合并或后置

| 页面 | 建议 |
| --- | --- |
| `/jeepwork/competition-center`、`/jeepwork/competition-ai-debug`、`/jeepwork/showcase` | 归入“展示中心管理”，避免和主后台并列太多入口 |
| `/jeepwork/governance`、`/jeepwork/roles` | 合并到权限与治理模块 |

### 5.3 应废弃的旧入口

`/admin/*` 目前全部返回 `notFound()`，说明它已经不是有效后台。建议：

1. 对外不可见。
2. 内部文档标为历史废弃。
3. 如果仍有人访问，统一跳转到 `/jeepwork` 或对应新页面。
4. 后续删除前先确认没有外链、脚本或测试依赖。

## 6. 展示中心需要的页面

`/showcase` 不是主产品，而是受控展示中心。它应只服务评委、投资人、政府或演示场景。

建议结构：

| 页面 | 需求 |
| --- | --- |
| `/showcase` | 默认展示总览 |
| `/showcase/judge` | 评委视角：能力、完成度、证据 |
| `/showcase/investor` | 投资人视角：商业模式、增长、壁垒 |
| `/showcase/government` | 政府视角：合规、就业、产业价值 |

边界要求：

1. 不混用真实用户隐私数据。
2. 不把 showcase 能力当作主产品验收标准。
3. 后台管理入口统一放到 `/jeepwork/showcase` 或展示中心管理模块。

## 7. 公共页面需要保留的范围

| 页面 | 建议 |
| --- | --- |
| `/` | 保留，官网首页 |
| `/pricing` | 保留，但套餐口径必须和代码一致 |
| `/login`、`/register` | 保留 |
| `/forgot-password`、`/reset-password`、`/verify-email` | 保留 |
| `/privacy`、`/terms`、`/refund-policy`、`/membership-agreement`、`/account-cancellation`、`/ai-disclaimer` | 保留，法务与合规 |
| `/help`、`/contact`、`/report` | 保留，但可简化 |
| `/s/[slug]`、`/go/[linkId]` | 保留，短链和跳转核心 |

## 8. 需求优先级

### P0：先停止混乱

1. 明确 `/console` 是普通用户唯一主入口。
2. 明确 `/jeepwork` 是平台内部唯一后台。
3. 标记 `/admin/*` 为历史废弃。
4. 停止新增新的顶层后台入口。
5. 开发任务默认只读 `PROJECT_RULES.md`、当前代码、当前 Sprint，不再把所有 PRD/报告都塞进上下文。

### P1：用户侧收敛

1. 把 `/dashboard` 的名片装修能力迁移为 `/console/card`。
2. 把 `/workbench/*` 的经营能力迁移为 `/console/*`。
3. 保留旧路由兼容跳转，避免影响用户书签。
4. 统一用户侧导航来源，继续使用 `src/components/layout/console-navigation.ts` 作为单一导航配置。

### P2：业务口径收敛

1. 统一 AI 命名：访客侧叫“AI 接待助手”，用户侧叫“经营 AI 工具箱”。
2. 统一套餐、权益、AI 额度来源。
3. 统一支付、退款、订单状态和到期降级。
4. 统一 `dashboard`、`workbench`、`console` API 命名，先内部复用，再逐步迁移路径。

### P3：企业能力

1. 保留 `Workspace`、`WorkspaceMember`。
2. `/console/workspaces` 只做团队空间、成员、角色、企业资料。
3. 暂缓复杂企业功能：SSO、企业微信/钉钉/飞书、Webhook、私有化、复杂审批。
4. `/enterprise-ai/*` 不再单独扩张，避免形成第二套企业产品。

## 9. 推荐开发顺序

### 第一步：文档和入口冻结

输出一个短文件，明确：

1. 当前唯一产品结构。
2. 当前允许开发的页面清单。
3. 当前废弃页面清单。
4. 日常开发默认读取哪些文档。

目标：减少 AI 和开发者每次读取过多 PRD 带来的上下文浪费。

### 第二步：建立 `/console` 路由映射

新增目标路由，但先复用旧组件：

| 新路由 | 初期实现 |
| --- | --- |
| `/console/card` | 包装或跳转 `/dashboard` |
| `/console/products` | 复用 `/workbench/products` 组件 |
| `/console/leads` | 复用 `/workbench/leads` 组件 |
| `/console/channels` | 复用 `/workbench/short-links` 组件 |
| `/console/analytics` | 复用 `/workbench/analytics` 组件 |
| `/console/ai-reception` | 复用 AI service 配置 |
| `/console/billing` | 复用 membership |
| `/console/settings` | 复用 account |

目标：先统一用户路径，不急着重写功能。

### 第三步：服务层收敛

优先抽出这些服务：

1. `profile-modules` 服务层：模块定义、payload、权益、校验。
2. `console` 数据聚合层：首页统计、待办、入口卡片。
3. `billing` 口径层：套餐、AI 额度、订单、退款。
4. `workspace` 服务层：空间、成员、权限。

目标：减少 API route 和大组件中的重复逻辑。

### 第四步：大文件拆分

优先拆：

1. `src/components/dashboard-v1/LinksPanel.tsx`
2. `src/components/workbench/ShortLinksClient.tsx`
3. `src/components/workbench/LeadsClient.tsx`
4. `src/components/showcase/CompetitionCenterClient.tsx`
5. `src/lib/showcase-v2.ts`

目标：降低单文件复杂度，不改变业务行为。

## 10. 最终建议

Link168 的产品不要再定义为“很多后台 + 很多 AI + 很多展示页”。它应该被压缩成一个清晰结构：

```text
访客
  -> /[username] 公开名片
  -> AI 接待
  -> 留资/点击/短链

用户
  -> /console
  -> 名片、产品、线索、渠道、数据、AI、会员、设置、空间

平台管理员
  -> /jeepwork
  -> 用户、内容、安全、AI、订单、系统健康、展示中心

外部展示对象
  -> /showcase
  -> 受控演示与证据展示
```

如果按这个结构收敛，现有代码大部分都能保留，只需要迁移入口、统一命名、减少重复实现。真正应该避免的是继续新增顶层产品线和新的 PRD 分支。

## 11. 建议立即执行的三件事

1. 冻结新增顶层路由：除 `/console/*` 外，不再新增用户后台入口。
2. 把 `/admin/*` 标记为历史废弃，并规划跳转或删除。
3. 新建 `/console/*` 目标页面映射表，先复用旧功能，再逐步重构内部实现。

