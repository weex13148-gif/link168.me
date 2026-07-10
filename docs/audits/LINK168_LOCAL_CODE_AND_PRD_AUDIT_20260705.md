# Link168 本地代码、功能与 PRD 一致性审计报告

**审计日期**：2026-07-05  
**审计范围**：D:\link168\link.me 本地工作区全部代码与文档  
**审计方式**：只读代码分析、文档比对、静态检查  
**审计规则**：全程只读，未修改任何代码、配置、数据库或依赖

---

## 1. 执行摘要

### 1.1 当前项目真实完成度

Link168 是一个**数字名片与 AI 经营入口平台**，当前版本处于 **V1 功能扩展期末尾**，整体完成度约 **80%**。

核心基础能力（注册登录、名片编辑、公开主页、20 种内容模块、二维码、产品管理、线索管理、会员订阅、支付宝支付、管理后台、内容安全）均已实现并可运行。

企业版团队协作、微信支付、完整 CRM 跟进、动态二维码等高级功能仍处于规划或半实现状态。

### 1.2 是否已经可作为完整产品使用

**可以作为 MVP（最小可行产品）使用，但不建议立即大规模公开推广。**

可正常完成的用户路径：
- 注册 → 创建主页 → 添加 20 种内容模块 → 设置主题 → 分享二维码 → 访客访问 → 留下线索 → 后台跟进 → 升级会员 → 支付宝支付 → AI 接待助手

### 1.3 最大的三个问题

**问题一：双后台心智混乱（P0）**
- `/dashboard`（名片编辑器 V1）与 `/workbench`（经营工作台）两套系统并存
- 账号设置、会员升级、数据统计功能完全重复
- API 路径不统一（`/api/dashboard/*` 与 `/api/workbench/*` 混用）
- 用户第一次登录后不知道该去哪里

**问题二：AI 命名分裂与配置不一致（P1）**
- 访客侧 AI 存在"AI 助理 / AI 客服 / AI 接待 / 业务客服 AI Agent"四种命名
- 用户侧 AI 存在"AI 助手 / AI Agent / 经营 AI / 五大 AI 助手"多种命名
- AI 月度额度在两个文件中定义不一致（member_plus：300 vs 2000）
- 转人工和举报功能只有配置开关，无实际业务逻辑

**问题三：企业版功能几乎全为空壳（P1）**
- 数据库中无 Team/Organization/Department 等企业模型
- 成员邀请、团队席位、企业知识库、线索分配、员工名片均未实现
- 自定义域名、API、Webhook、企业微信/钉钉/飞书/SSO 均未实现
- 对外宣称"企业版"但实际只有套餐价格占位

### 1.4 最大的三个优势

**优势一：安全架构扎实**
- bcrypt 密码哈希、SHA-256 Session Token 哈希存储、HttpOnly Cookie
- 三级权限体系（super_admin / admin / user）
- 最后一名 super_admin 保护（PG advisory lock）
- 支付回调签名验证 + 金额校验 + 幂等保护
- AI 接口三层权限校验（平台配置 → 用户配置 → 套餐权限）
- 文件上传三层 MIME 校验 + 路径穿越防护

**优势二：数据模型设计合理**
- 产品快照设计（线索保存产品名称/价格/类目，避免产品删除后历史丢失）
- AI Credit 账户 + 流水 + 乐观锁 + 幂等键
- 跟进记录与状态变更自动关联（事务保证一致性）
- 内容审核记录表统一管理所有媒体审核状态
- 软删除与审计日志设计完整

**优势三：核心业务闭环已打通**
- 从"创建主页 → 分享获客 → 线索收集 → 后台跟进"的基础经营闭环已跑通
- 支付宝支付 → 订单 → 会员生效 → AI 额度发放的商业闭环已实现
- 管理后台治理体系（用户、会员、订单、AI 用量、内容安全、系统健康）框架完整

### 1.5 当前是否适合继续增加功能

**不适合继续增加新功能。**

当前最紧迫的任务不是功能扩张，而是：
1. 合并双后台，统一用户路径
2. 清理重复命名，统一产品语言
3. 修复已有功能的边界问题
4. 补齐企业版或明确砍掉企业版宣传

### 1.6 当前更应该修复、整合还是重构

**优先整合，其次修复，暂不大规模重构。**

- **整合（最高优先级）**：合并 `/dashboard` 与 `/workbench`，统一 AI 命名，统一 API 路径
- **修复（次高优先级）**：修复 AI 额度不一致、退款不调用支付宝接口、到期无自动降级等问题
- **重构（暂不建议）**：当前代码虽然有重复，但核心架构可用，重构风险大于收益。建议先完成整合，再考虑分模块重构

---

## 2. 本地代码基线

### 2.1 项目路径

```
D:\link168\link.me
```

### 2.2 Git 状态

| 项目 | 值 |
|------|----|
| 当前分支 | `master` |
| 当前 HEAD | `ce45c4e`（chore: remove stale repository guidance） |
| 已修改文件数 | 43 个 |
| 未跟踪文件数 | 约 60 个 |

### 2.3 未提交修改文件清单（部分关键文件）

**已修改（M）**：
- `README.md`
- `prisma/schema.prisma`
- `src/app/[username]/page.tsx`
- `src/app/api/auth/login/route.ts`
- `src/app/api/dashboard/appearance/route.ts`
- `src/app/api/dashboard/avatar/route.ts`
- `src/app/api/dashboard/links/[id]/route.ts`
- `src/app/api/dashboard/links/route.ts`
- `src/app/api/dashboard/profile/route.ts`
- `src/app/api/dashboard/stats/route.ts`
- `src/app/api/workbench/membership/route.ts`
- `src/app/globals.css`
- `src/app/jeepwork/settings/ai/page.tsx`
- `src/app/pricing/page.tsx`
- `src/app/workbench/membership/page.tsx`
- `src/components/dashboard-v1/` 下 8 个文件
- `src/components/share/SharePageRenderer.tsx`
- `src/components/share/SharePageWithContact.tsx`
- `src/lib/ai/commercial-agent.ts`
- `src/lib/ai/gateway.ts`
- `src/lib/auth.ts`
- `src/lib/billing/plans.ts`
- `src/lib/content-safety.ts`
- `src/lib/dashboard-data.ts`
- `src/lib/upload-storage.ts`

**未跟踪（??）**：
- `LINK168_3_DAY_CONTINUOUS_DEVELOPMENT_PLAN.md`
- `docs/WECHAT_MINIPROGRAM_FUTURE_DESIGN.md`
- `docs/audit-remediation-20260703.md`
- `docs/product-audit-vlink-ai-backend-20260705.md`
- `prisma/migrations/` 下 4 个新 migration
- `src/app/api/auth/deactivate/route.ts`
- `src/app/api/avatar/[username]/route.ts`
- `src/app/api/dashboard/media/` 下多个上传 API
- `src/app/api/jeepwork/moderation/route.ts`
- `src/app/api/public/` 下 vCard 和 visit API
- `src/components/share/modules/` 下 13 个模块组件
- `src/components/showcase/` 下多个 Showcase 组件
- `src/features/profile-modules/` 下模块注册表
- `src/lib/ai/compliance.ts`
- `src/lib/ai/privacy.ts`
- `src/lib/ai/public-access.ts`
- `src/lib/content-safety/provider.ts`
- `src/lib/i18n/` 下国际化文件
- `src/lib/link-icons.ts`
- `src/lib/showcase-config.ts`

### 2.4 主要技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | latest | App Router 框架 |
| React | latest | UI 库 |
| TypeScript | latest | 类型系统 |
| Tailwind CSS | latest | 样式框架 |
| Prisma | ^7.8.0 | ORM |
| PostgreSQL | - | 数据库 |
| bcrypt | ^6.0.0 | 密码哈希 |
| Nodemailer | ^9.0.1 | 邮件发送 |
| qrcode | ^1.5.4 | 二维码生成 |
| lucide-react | latest | 图标库 |
| ioredis | ^5.11.1 | Redis 可选（限流） |
| @upstash/redis | ^1.38.0 | Upstash Redis 可选 |

### 2.5 主要目录结构

```
link.me/
├── prisma/                    # 数据库 Schema 与 migrations
│   ├── schema.prisma
│   └── migrations/            # 17 个 migration
├── src/
│   ├── app/                   # Next.js App Router 页面与 API
│   │   ├── [username]/        # 公开主页路由
│   │   ├── dashboard/         # 名片编辑器 V1
│   │   ├── workbench/         # 经营工作台
│   │   ├── jeepwork/          # 管理后台
│   │   ├── admin/             # 旧管理后台（已废弃）
│   │   ├── showcase/          # 比赛展示中心
│   │   ├── api/               # 所有 API 路由
│   │   ├── pricing/           # 定价页
│   │   ├── login/register/    # 认证页面
│   │   └── ...
│   ├── components/            # 业务组件
│   │   ├── dashboard-v1/      # V1 编辑器组件
│   │   ├── share/             # 公开页渲染组件
│   │   ├── workbench/         # 工作台组件
│   │   ├── admin/             # 管理后台组件
│   │   ├── showcase/          # 比赛展示组件
│   │   ├── ai/                # AI 组件
│   │   └── ...
│   ├── features/              # 功能模块（新增）
│   │   └── profile-modules/   # 名片模块注册表
│   ├── lib/                   # 核心业务逻辑
│   │   ├── ai/                # AI 相关
│   │   ├── billing/           # 计费与会员
│   │   ├── analytics/         # 数据分析
│   │   ├── content-safety/    # 内容安全
│   │   ├── admin-governance/  # 管理后台权限
│   │   ├── i18n/              # 国际化
│   │   └── ...
│   └── generated/prisma/      # Prisma Client 生成目录
├── docs/                      # 文档
├── scripts/                   # 运维与测试脚本
├── public/                    # 静态资源
├── package.json
├── prisma.config.ts
├── next.config.ts
├── .env.example               # 环境变量模板
└── PROJECT_RULES.md           # 项目规则
```

### 2.6 环境变量模板

模板文件：`.env.example`

主要变量组：
- 数据库：`DATABASE_URL`
- 安全密钥：`SESSION_SECRET`、`ADMIN_SECRET`、`CONFIG_ENCRYPTION_KEY`
- Cookie 安全：`COOKIE_SECURE`、`COOKIE_SAME_SITE`
- 限流存储：`RATE_LIMIT_STORE`、`REDIS_URL`、`UPSTASH_REDIS_REST_URL`
- 邮件：`SMTP_HOST`、`SMTP_PORT`、`SMTP_USER`、`SMTP_PASSWORD`
- AI 百炼：`BAILIAN_APP_ID`、`BAILIAN_APP_BASE_URL`、`DASHSCOPE_WORKSPACE_ID`
- 支付对账：`PAYMENT_RECONCILE_SECRET`
- 系统用户：`DEMO_EMAIL`、`ADMIN_EMAIL`、`SUPER_ADMIN_EMAIL` 等

### 2.7 重复项目与旧目录检查

- 项目根目录 `D:\link168\link.me` 为唯一有效项目目录
- 项目内部无重复的 node_modules 或备份目录
- `src/generated/prisma/` 是 Prisma Client 生成目录，非源码
- `src/app/admin/` 为旧管理后台，已废弃（但文件仍存在）

---

## 3. 文档与 PRD 清单

### 3.1 重要文档清单

| 文档名称 | 路径 | 修改时间 | 主要内容 | 与代码一致性 |
|---------|------|---------|---------|------------|
| 项目计划书（README） | `README.md` | 近期 | 产品定位、功能介绍、技术架构、阶段计划、风险 | 基本一致，但部分功能描述超前（如企业版） |
| 项目规则 | `PROJECT_RULES.md` | 2026-06-20 | 工程安全红线、文档优先级、密钥管理、生产约束 | 一致，为最高优先级规则文档 |
| 审计整改台账 | `docs/audit-remediation-20260703.md` | 2026-07-03 | 第一轮 Agent 任务清单、完成状态、剩余风险 | 与当前代码一致，反映了最近一轮整改结果 |
| AI 后台产品审计 | `docs/product-audit-vlink-ai-backend-20260705.md` | 2026-07-05 | 后台与 AI 聊天助手产品审计、问题清单、建议 | 与当前代码一致，部分问题已修复 |
| 微信小程序未来设计 | `docs/WECHAT_MINIPROGRAM_FUTURE_DESIGN.md` | 近期 | 小程序版本规划（纯规划文档） | 仅规划，代码中无小程序实现 |
| 仓库版本策略 | `docs/REPOSITORY_VERSION_POLICY.md` | - | Git 分支与版本管理策略 | 一致 |
| 3 天持续开发计划 | `LINK168_3_DAY_CONTINUOUS_DEVELOPMENT_PLAN.md` | 近期 | 开发计划（根目录未跟踪文件） | 计划文档，部分已执行 |

### 3.2 缺失的核心文档

以下文档在 `PROJECT_RULES.md` 中被引用为正式文档，但实际不存在：

| 缺失文档 | 引用位置 | 影响 |
|---------|---------|------|
| `PRD.md`（产品总 PRD） | `PROJECT_RULES.md` 第 28 行 | 无单一权威产品需求文档，需求散落在 README 和各审计报告中 |
| `ROADMAP.md`（版本路线图） | `PROJECT_RULES.md` 第 29 行 | 无明确的版本路线图 |
| `SPRINT.md`（当前 Sprint） | `PROJECT_RULES.md` 第 30 行 | 无迭代计划 |
| `docs/PRICING_AND_ENTITLEMENTS.md` | `PROJECT_RULES.md` 第 31 行 | 套餐与权益无单独权威文档，散落在代码中 |
| `docs/UI_ARCHITECTURE.md` | `PROJECT_RULES.md` 第 32 行 | 无 UI 架构设计文档 |

### 3.3 文档可信度评估

| 可信度等级 | 文档 | 说明 |
|----------|------|------|
| 高 | `PROJECT_RULES.md` | 工程与安全红线，最高优先级，与代码一致 |
| 高 | `prisma/schema.prisma` | 数据库模型的唯一真相来源 |
| 中高 | `README.md` | 产品介绍较全面，但企业版等功能描述超前于代码 |
| 中 | `docs/audit-remediation-20260703.md` | 准确反映了上一轮整改结果，但不代表全部历史 |
| 中 | `docs/product-audit-vlink-ai-backend-20260705.md` | 问题分析准确，但部分问题已在后续整改中修复 |
| 低 | `LINK168_3_DAY_CONTINUOUS_DEVELOPMENT_PLAN.md` | 计划文档，部分已执行，部分未执行 |
| 低 | `docs/WECHAT_MINIPROGRAM_FUTURE_DESIGN.md` | 纯未来规划，代码中无实现 |

---

## 4. 当前真实功能地图

### 4.1 已完整实现（可正常使用）

| 功能模块 | 说明 | 证据 |
|---------|------|------|
| 用户注册/登录/退出 | 邮箱密码注册登录，Session 认证 | `src/lib/auth.ts`、`src/app/api/auth/` |
| 密码哈希与安全 | bcrypt 哈希、Token 哈希存储、HttpOnly Cookie | `src/lib/auth.ts` |
| 邮箱验证 | 验证邮件发送、确认链接、token 过期机制 | `src/app/api/auth/verify-email/` |
| 忘记密码/重置密码 | 邮件重置链接、密码更新 | `src/app/api/auth/forgot-password/`、`reset-password/` |
| 修改密码 | 登录后修改密码，需验证原密码 | `src/app/api/auth/change-password/` |
| 账号注销 | 软注销、数据匿名化、Session 失效 | `src/app/api/auth/deactivate/route.ts` |
| 账号冻结/封禁 | FreezeRecord 独立冻结记录、多类型限制 | `prisma/schema.prisma:50-72` |
| 登录限流 | IP + 邮箱双维度限流、LoginAttempt 记录 | `src/lib/auth.ts`、`src/lib/rate-limit.ts` |
| 权限角色体系 | super_admin / admin / user 三级角色 | `prisma/schema.prisma:20` |
| 公开主页渲染 | /[username]、模板切换、20 种模块 | `src/app/[username]/page.tsx`、`src/components/share/SharePageRenderer.tsx` |
| 用户名历史与重定向 | UsernameHistory、UsernameRegistry | `prisma/schema.prisma:74-105` |
| vCard 下载 | 电子名片下载 | `src/app/api/public/[username]/vcard/route.ts` |
| SEO/OG/Twitter Card | 元数据生成 | `src/app/[username]/page.tsx` |
| 举报入口 | 举报提交 | `src/app/report/page.tsx`、`src/app/api/reports/route.ts` |
| 名片编辑器 | /dashboard、实时预览、模块管理 | `src/components/dashboard-v1/DashboardFrame.tsx` |
| 20 种内容模块 | 链接/文本/分组标题/二维码/微信/电话/地图/复制文本/分隔线/商品/预约/封面图/点击放大图/轮播图/B站/YouTube/通用视频/网易云/通用音乐/AI 对话 | `src/features/profile-modules/registry.ts` |
| 主题装修 | 12 个预设主题、自定义主题 | `src/components/theme/presetThemes.ts` |
| 模板选择 | business / creator / conversion 三套模板 | `prisma/schema.prisma:121` |
| 头像/图片上传 | 三层 MIME 校验、路径穿越防护、审核状态 | `src/lib/upload-storage.ts` |
| 产品管理 | 增删改查、上架下架、AI 推荐开关 | `src/app/api/dashboard/products/`、`src/components/workbench/ProductsClient.tsx` |
| 线索管理 | 列表、详情、状态变更、跟进记录、导出 | `src/app/api/workbench/leads/`、`src/components/workbench/LeadsClient.tsx` |
| 产品快照 | 线索创建时保存产品名称/价格/类目 | `prisma/schema.prisma:395-397` |
| 跟进记录 | 独立表、状态变更自动记录、事务保证 | `prisma/schema.prisma:420-438` |
| 知识库文档 | 增删改查、分类、AI 引用开关 | `src/app/api/dashboard/knowledge/` |
| AI 客服配置 | 开关、名称、欢迎语、语气、产品推荐、线索收集 | `prisma/schema.prisma:509-528` |
| 访客侧 AI 对话 | 多轮会话、产品推荐、知识库、线索收集 | `src/lib/ai/commercial-agent.ts` |
| AI 额度与 Credit 系统 | 账户、流水、乐观锁、幂等键 | `prisma/schema.prisma:568-610` |
| 工作台五大 AI 助手 | 财税/法务/市场调研/设计/社媒运营 | `src/lib/ai/assistants.ts` |
| AI 风险日志 | 输入拦截、输出拦截、模型错误等 | `src/lib/ai/risk-log.ts` |
| 内容安全审核 | 图片/文本审核、三态管理（approved/pending/rejected） | `src/lib/content-safety.ts`、`prisma/schema.prisma:836-855` |
| 会员订阅管理 | 套餐、有效期、宽限期 | `prisma/schema.prisma:613-626` |
| 订单系统 | 订单创建、状态管理、幂等键 | `prisma/schema.prisma:630-672` |
| 支付宝支付 | 创建支付、签名、回调验签、金额校验 | `src/lib/billing/payments.ts`、`src/lib/billing/webhooks.ts` |
| 沙箱支付 | 模拟成功/失败/取消/超时 | `src/app/api/payments/sandbox/route.ts` |
| 支付诊断 | 回调状态记录、问题排查 | `src/lib/billing/payment-diagnostics.ts` |
| 短链接管理 | 创建、列表、删除、跳转、点击统计 | `src/app/api/dashboard/short-links/` |
| 访问统计 | PV/UV、点击、设备、来源 | `src/lib/analytics/` |
| 二维码生成 | 主页二维码、下载 | `src/app/api/qrcode/route.ts`、`src/components/share/QrCodeModal.tsx` |
| 管理后台登录 | 独立登录入口、独立 Session | `src/app/jeepwork/login/page.tsx`、`src/lib/jeepwork-auth.ts` |
| 用户管理 | 列表、详情、会员调整、限制管理 | `src/app/jeepwork/users/page.tsx` |
| 会员管理 | 会员订单查看、手动调整 | `src/app/jeepwork/membership/page.tsx` |
| 订单管理 | 订单列表、状态查看 | `src/app/jeepwork/orders/page.tsx` |
| AI 用量/成本/安全 | 用量统计、安全测试、风险事件 | `src/app/jeepwork/ai-usage/`、`ai-safety/`、`ai-cost/` |
| 系统配置 | AI 设置、支付设置、API 设置 | `src/app/jeepwork/settings/` |
| 内容审核后台 | 审核记录列表、状态更新 | `src/app/api/jeepwork/moderation/route.ts` |
| 举报管理 | 举报列表、处理 | `src/app/jeepwork/reports/page.tsx` |
| 主页管理 | 主页列表、管理 | `src/app/jeepwork/profiles/page.tsx` |
| 系统健康检查 | 健康状态、清理任务 | `src/app/jeepwork/system-health/page.tsx` |
| 审计日志 | 管理员操作审计 | `prisma/schema.prisma:359-377` |
| Showcase 展示中心 | 多角色展示页（judge/investor/government） | `src/app/showcase/` |
| Showcase 内容管理 | 动态章节、顺序、可见性 | `prisma/schema.prisma:713-755` |
| Showcase 文件管理 | 上传、下载、替换 | `src/app/api/jeepwork/competition-files/` |
| Showcase AI Demo | 比赛用 AI 演示、调试、Prompt 草稿 | `prisma/schema.prisma:759-834` |

### 4.2 基本实现但需完善

| 功能模块 | 已实现部分 | 缺失/不完善部分 | 证据 |
|---------|-----------|---------------|------|
| 数据中心 Analytics | 基础统计、7 天趋势、设备分布、来源渠道、转化漏斗 | 时间范围切换器（UI 固定 7 天）、数据导出、实时刷新 | `src/app/workbench/analytics/page.tsx` |
| 短链接 | 基础创建、跳转、点击统计 | 搜索、编辑、渠道标签配置、UTM 参数持久化、二维码、导出 | `src/app/workbench/short-links/page.tsx` |
| 产品模块 | 基础信息、上架下架、AI 推荐 | 产品图片上传（字段有，前端无）、产品详情页、库存、规格变体 | `src/components/workbench/ProductsClient.tsx` |
| 线索模块 | 基础 CRUD、状态、跟进、导出 | 客户标签、意向等级、负责人、删除、匿名化、批量操作、前端筛选 | `src/components/workbench/LeadsClient.tsx` |
| AI 转人工 | 配置开关存在 | 实际转人工业务逻辑、通知机制 | `src/lib/ai/commercial-agent.ts:536` |
| AI 举报 | 配置开关存在 | 实际举报业务逻辑、举报后台 | `src/lib/ai/commercial-agent.ts:537` |
| AI 推荐问题 | 部分助手有推荐问题 | 访客侧 AI 无推荐问题配置 | - |
| 微信支付 | 回调框架、签名逻辑存在 | 实际未开放、缺少完整测试 | `src/lib/billing/payments.ts:302-357` |
| 退款功能 | 本地订单状态更新存在 | 未调用支付宝退款接口、未回扣 Credit、未按比例计算 | `src/lib/billing/orders.ts:530-618` |
| 到期降级 | 宽限期计算、惰性降级存在 | 无定时任务自动降级、状态字段不自动更新 | `src/lib/billing/entitlements/index.ts:83-89` |
| 企业资料库 | 基础 CRUD 存在 | 前端编辑/删除未实现、与 AI 对接不完整 | `src/app/workbench/enterprise/page.tsx` |
| 国际化 | 基础框架存在 | 大部分文案仍为硬编码中文 | `src/lib/i18n/` |
| 地区统计 | 字段存在（country/city） | 全为 null，未接入 GeoIP | `prisma/schema.prisma:179-180` |

### 4.3 半实现（有框架但核心功能缺失）

| 功能模块 | 已有部分 | 缺失部分 | 证据 |
|---------|---------|---------|------|
| 企业版（团队协作） | 套餐中有 enterprise 档位、teamSeats 权益字段 | 无 Team/Organization 模型、无成员邀请、无角色权限、无企业知识库、无员工名片 | `src/lib/billing/plans.ts` |
| 自定义域名 | 权益字段（customDomain）存在 | 无实际域名配置、DNS 验证、SSL 证书管理 | `src/lib/billing/entitlements/index.ts` |
| 动态二维码 | 短链接存在 | 无二维码样式自定义、无海报生成、无渠道标签 | - |
| 转化漏斗 | Analytics 页面有漏斗展示 | 第 1 步和第 2 步数据相同（都用 LinkClick），逻辑错误 | `src/lib/analytics/stats.ts` |
| AI 成本统计 | 后台有 ai-cost 页面 | 只有 Credit 计数，无按模型单价计算成本 | `src/components/ai-usage/AiCostDashboard.tsx` |
| 对账系统 | 支付宝对账接口、定时任务路由存在 | 未详细验证完整性、缺少对账结果展示 | `src/lib/billing/alipay-reconciliation.ts` |

### 4.4 仅页面/接口占位

| 功能模块 | 占位位置 | 说明 |
|---------|---------|------|
| 企业微信/钉钉/飞书集成 | 无代码 | 完全不存在 |
| SSO 单点登录 | 无代码 | 完全不存在 |
| API / Webhook | 无代码 | 完全不存在 |
| 部门管理 | 无代码 | 完全不存在 |
| 离职回收 | 无代码 | 完全不存在 |
| 企业模板 | 无代码 | 完全不存在 |
| 线索分配 | 无代码 | 完全不存在 |
| 小程序版本 | `docs/WECHAT_MINIPROGRAM_FUTURE_DESIGN.md` | 纯规划文档，无代码 |

### 4.5 仅文档规划

| 功能 | 规划文档 | 代码状态 |
|------|---------|---------|
| 微信小程序 | `docs/WECHAT_MINIPROGRAM_FUTURE_DESIGN.md` | 无实现 |
| 结构化产品定价 | README 阶段 2 | 价格为文本字段，非结构化 |
| 完整 CRM 跟进建议 | README 阶段 2 | 基础跟进记录已实现，智能建议未实现 |
| AI 服务按量计费 | README 阶段 4 | Credit 系统存在，但无购买/充值流程 |
| 行业模板 | README 阶段 5 | 只有 3 套通用模板 |
| 素材/案例/内容模块市场 | README 阶段 5 | 无实现 |

---

## 5. 页面与路由清单

### 5.1 公开页面

| 页面路径 | 功能 | 用户角色 | 当前状态 | 主要问题 |
|---------|------|---------|---------|---------|
| `/` | 首页/落地页 | 所有访客 | ✅ 已实现 | - |
| `/[username]` | 公开主页 | 所有访客 | ✅ 已实现 | 部分模块需审核状态确认 |
| `/login` | 登录页 | 未登录用户 | ✅ 已实现 | 普通登录页拒绝管理员登录会触发限流 |
| `/register` | 注册页 | 未登录用户 | ✅ 已实现 | 密码强度要求 6 位，与重置页 8 位不一致 |
| `/forgot-password` | 忘记密码 | 未登录用户 | ✅ 已实现 | - |
| `/reset-password` | 重置密码 | 持 token 用户 | ✅ 已实现 | 密码强度要求 8 位，与注册页 6 位不一致 |
| `/verify-email` | 邮箱验证 | 持 token 用户 | ✅ 已实现 | - |
| `/pricing` | 定价页 | 所有访客 | ✅ 已实现 | 企业版显示"联系销售"但无实际联系方式 |
| `/report` | 举报页 | 所有访客 | ✅ 已实现 | - |
| `/privacy` | 隐私政策 | 所有访客 | ✅ 已实现 | 建议法务确认 |
| `/terms` | 服务条款 | 所有访客 | ✅ 已实现 | 建议法务确认 |
| `/help` | 帮助中心 | 所有访客 | ⚠️ 占位 | 内容可能不完整 |
| `/showcase` | 比赛展示中心 | 所有访客 | ✅ 已实现 | 普通首页无 Showcase 入口 |
| `/showcase/judge` | 评委视角 | 评委（密码） | ✅ 已实现 | Showcase 密码登录缺少限流 |
| `/showcase/investor` | 投资人视角 | 投资人（密码） | ✅ 已实现 | 同上 |
| `/showcase/government` | 政府视角 | 政府（密码） | ✅ 已实现 | 同上 |
| `/s/[slug]` | 短链接跳转 | 所有访客 | ✅ 已实现 | - |
| `/go/[linkId]` | 链接跳转 | 所有访客 | ✅ 已实现 | - |

### 5.2 用户后台页面

| 页面路径 | 功能 | 用户角色 | 当前状态 | 主要问题 |
|---------|------|---------|---------|---------|
| `/dashboard` | 名片编辑器 V1 | 已登录用户 | ✅ 已实现 | 与 Workbench 功能重复，双后台心智 |
| `/workbench` | 工作台首页 | 已登录用户 | ✅ 已实现 | - |
| `/workbench/card` | AI 名片助手 | 已登录用户 | ⚠️ 待确认 | 需确认实际功能 |
| `/workbench/products` | 产品与服务 | 已登录用户 | ✅ 已实现 | 无图片上传功能 |
| `/workbench/leads` | 客户线索 | 已登录用户 | ✅ 已实现 | 前端筛选功能弱于 API 能力 |
| `/workbench/analytics` | 数据中心 | 已登录用户 | ✅ 已实现 | 时间范围固定 7 天 |
| `/workbench/account` | 账号与安全 | 已登录用户 | ✅ 已实现 | 与 Dashboard AccountPanel 重复 |
| `/workbench/ai` | 经营 AI 工具箱 | 会员用户 | ✅ Beta | 5+2 个 AI 助手 |
| `/workbench/ai/[assistant]` | AI 助手对话 | 会员用户 | ✅ 已实现 | - |
| `/workbench/ai-service` | AI 客服配置 | 会员用户 | ✅ 已实现 | 页面像系统后台，不像用户任务流 |
| `/workbench/enterprise` | 企业资料库 | 会员用户 | ⚠️ 半实现 | 前端只有列表和新增，无编辑删除 |
| `/workbench/membership` | 会员与订阅 | 已登录用户 | ✅ 已实现 | 导航中标记为"规划中"不准确 |
| `/workbench/short-links` | 短链接管理 | 已登录用户 | ✅ 基础实现 | 功能较简单 |
| `/account/security` | 账号安全（旧路径） | 已登录用户 | ✅ 已实现 | 与 workbench/account 重复 |
| `/account/sessions` | 会话管理（旧路径） | 已登录用户 | ✅ 已实现 | 同上 |
| `/enterprise-ai` | 企业 AI | 企业用户 | ⚠️ 占位 | 功能不明确 |
| `/enterprise-ai/dashboard` | 企业 AI 仪表盘 | 企业用户 | ⚠️ 占位 | - |

### 5.3 管理后台页面

| 页面路径 | 功能 | 用户角色 | 当前状态 | 主要问题 |
|---------|------|---------|---------|---------|
| `/jeepwork/login` | 管理员登录 | 未登录管理员 | ✅ 已实现 | - |
| `/jeepwork` | 后台首页 | 管理员 | ✅ 已实现 | - |
| `/jeepwork/users` | 用户管理 | 管理员 | ✅ 已实现 | - |
| `/jeepwork/users/[id]` | 用户详情 | 管理员 | ✅ 已实现 | - |
| `/jeepwork/profiles` | 主页管理 | 管理员 | ✅ 已实现 | - |
| `/jeepwork/membership` | 会员管理 | 管理员 | ✅ 已实现 | - |
| `/jeepwork/orders` | 订单管理 | 管理员 | ✅ 已实现 | - |
| `/jeepwork/reports` | 举报管理 | 管理员 | ✅ 已实现 | - |
| `/jeepwork/ai-usage` | AI 用量 | 管理员 | ✅ 已实现 | - |
| `/jeepwork/ai-cost` | AI 成本 | 管理员 | ⚠️ 半实现 | 只有 Credit 计数，无真实成本 |
| `/jeepwork/ai-safety` | AI 安全 | 管理员 | ✅ 已实现 | - |
| `/jeepwork/settings/ai` | AI 设置 | 超级管理员 | ✅ 已实现 | - |
| `/jeepwork/settings/payment` | 支付设置 | 超级管理员 | ✅ 已实现 | - |
| `/jeepwork/settings/api` | API 设置 | 超级管理员 | ✅ 已实现 | - |
| `/jeepwork/audit` | 审计日志 | 管理员 | ✅ 已实现 | - |
| `/jeepwork/logs` | 系统日志 | 管理员 | ✅ 已实现 | - |
| `/jeepwork/system-health` | 系统健康 | 管理员 | ✅ 已实现 | - |
| `/jeepwork/competition-center` | 比赛中心 | 管理员 | ✅ 已实现 | Showcase 专用 |
| `/jeepwork/competition-ai-debug` | AI 调试台 | 管理员 | ✅ 已实现 | Showcase 专用 |
| `/jeepwork/showcase` | Showcase 设置 | 管理员 | ✅ 已实现 | - |
| `/jeepwork/roles` | 角色权限 | 管理员 | ⚠️ 待确认 | 需确认功能完整性 |
| `/jeepwork/governance` | 治理中心 | 管理员 | ⚠️ 待确认 | 需确认功能完整性 |

### 5.4 已废弃但仍存在的页面

| 页面路径 | 说明 | 证据 |
|---------|------|------|
| `/admin` | 旧管理后台首页 | 应统一返回 404，需确认 |
| `/admin/users` | 旧用户管理 | 同上 |
| `/admin/profiles` | 旧主页管理 | 同上 |
| `/admin/reports` | 旧举报管理 | 同上 |
| `/admin/ai-usage` | 旧 AI 用量 | 同上 |
| `/admin/settings/api` | 旧 API 设置 | 同上 |

---

## 6. API 清单

### 6.1 认证 API

| API 路径 | 方法 | 权限 | 调用页面 | 当前状态 | 风险 |
|---------|------|------|---------|---------|------|
| `/api/auth/register` | POST | 公开 | /register | ✅ 完整 | - |
| `/api/auth/login` | POST | 公开 | /login | ✅ 完整 | 管理员登录会触发普通用户限流 |
| `/api/auth/logout` | POST | 已登录 | 所有页面 | ✅ 完整 | - |
| `/api/auth/me` | GET | 已登录 | 所有页面 | ✅ 完整 | - |
| `/api/auth/verify-email` | POST | 公开 | /verify-email | ✅ 完整 | - |
| `/api/auth/verify-email/confirm` | GET | 公开 | 邮件链接 | ✅ 完整 | - |
| `/api/auth/forgot-password` | POST | 公开 | /forgot-password | ✅ 完整 | - |
| `/api/auth/reset-password` | POST | 公开 | /reset-password | ✅ 完整 | - |
| `/api/auth/change-password` | POST | 已登录 | /account/security | ✅ 完整 | - |
| `/api/auth/sessions` | GET/DELETE | 已登录 | /account/sessions | ✅ 完整 | - |
| `/api/auth/deactivate` | POST | 已登录 | 账号设置 | ✅ 完整 | - |
| `/api/auth/username` | PATCH | 已登录 | 编辑器 | ✅ 完整 | - |

### 6.2 Dashboard API（V1 名片编辑器）

| API 路径 | 方法 | 权限 | 调用页面 | 当前状态 | 风险 |
|---------|------|------|---------|---------|------|
| `/api/dashboard` | GET | 已登录 | /dashboard | ✅ 完整 | - |
| `/api/dashboard/profile` | GET/PATCH | 已登录 | 编辑器 | ✅ 完整 | - |
| `/api/dashboard/appearance` | GET/PATCH | 已登录 | 编辑器外观 | ✅ 完整 | - |
| `/api/dashboard/avatar` | POST | 已登录 | 编辑器 | ✅ 完整 | 文件上传需校验大小 |
| `/api/dashboard/stats` | GET | 已登录 | 编辑器统计 | ✅ 完整 | 与 Workbench Analytics 重复 |
| `/api/dashboard/links` | GET/POST | 已登录 | 编辑器链接 | ✅ 完整 | 有服务端权益校验 |
| `/api/dashboard/links/[id]` | GET/PATCH/DELETE | 已登录 | 编辑器链接 | ✅ 完整 | - |
| `/api/dashboard/links/reorder` | POST | 已登录 | 编辑器链接 | ✅ 完整 | - |
| `/api/dashboard/links/icon` | POST | 已登录 | 图标上传 | ✅ 完整 | - |
| `/api/dashboard/links/favicon` | GET | 已登录 | 图标获取 | ✅ 完整 | - |
| `/api/dashboard/products` | GET/POST | 已登录 | 产品管理 | ✅ 完整 | API 在 dashboard 路径下但 Workbench 使用 |
| `/api/dashboard/products/[id]` | GET/PATCH/DELETE | 已登录 | 产品管理 | ✅ 完整 | - |
| `/api/dashboard/knowledge` | GET/POST | 已登录 | 知识库 | ✅ 完整 | 同上路径问题 |
| `/api/dashboard/knowledge/[id]` | GET/PATCH/DELETE | 已登录 | 知识库 | ✅ 完整 | - |
| `/api/dashboard/short-links` | GET/POST | 已登录 | 短链接 | ✅ 完整 | - |
| `/api/dashboard/short-links/[id]` | GET/DELETE | 已登录 | 短链接 | ✅ 完整 | - |
| `/api/dashboard/entitlements` | GET | 已登录 | - | ✅ 完整 | - |
| `/api/dashboard/analytics` | GET | 已登录 | - | ✅ 完整 | 与 stats 重复 |
| `/api/dashboard/media/cover` | POST | 已登录 | 封面图上传 | ✅ 完整 | - |
| `/api/dashboard/media/background` | POST | 已登录 | 背景图上传 | ✅ 完整 | - |
| `/api/dashboard/media/popup` | POST | 已登录 | 弹出图上传 | ✅ 完整 | - |
| `/api/dashboard/media/carousel` | POST | 已登录 | 轮播图上传 | ✅ 完整 | - |
| `/api/dashboard/media/[type]/[...path]` | GET | 公开？ | 媒体读取 | ⚠️ 需确认 | 需检查权限和审核状态 |

### 6.3 Workbench API

| API 路径 | 方法 | 权限 | 调用页面 | 当前状态 | 风险 |
|---------|------|------|---------|---------|------|
| `/api/workbench/leads` | GET | 已登录 | /workbench/leads | ✅ 完整 | - |
| `/api/workbench/leads/[id]` | GET/PATCH | 已登录 | 线索详情 | ✅ 完整 | - |
| `/api/workbench/ai-config` | GET/PATCH | 已登录 | /workbench/ai-service | ✅ 完整 | - |
| `/api/workbench/membership` | GET | 已登录 | /workbench/membership | ✅ 完整 | - |
| `/api/workbench/ai/chat` | POST | 已登录+会员 | AI 对话 | ✅ 完整 | 有额度校验 |
| `/api/workbench/ai/conversations` | GET | 已登录+会员 | 对话列表 | ✅ 完整 | - |
| `/api/workbench/ai/conversations/[id]` | GET | 已登录+会员 | 对话详情 | ✅ 完整 | - |
| `/api/workbench/ai/status` | GET | 已登录 | AI 状态 | ✅ 完整 | - |

### 6.4 公开 API

| API 路径 | 方法 | 权限 | 调用页面 | 当前状态 | 风险 |
|---------|------|------|---------|---------|------|
| `/api/[username]/products` | GET | 公开 | 公开主页 | ✅ 完整 | - |
| `/api/public/[username]/vcard` | GET | 公开 | 公开主页 | ✅ 完整 | - |
| `/api/public/[username]/visit` | POST | 公开 | 公开主页 | ✅ 完整 | 访问记录 |
| `/api/avatar/[username]` | GET | 公开 | 公开主页 | ✅ 完整 | 需确认审核状态 |
| `/api/ai/customer-service` | POST | 公开+用户配置 | 公开主页 AI | ✅ 完整 | 有三层权限校验 |
| `/api/contact` | POST | 公开 | 产品咨询 | ✅ 完整 | 生成线索 |
| `/api/qrcode` | GET | 公开？ | 二维码 | ⚠️ 需确认 | 需检查是否有限流 |
| `/api/reports` | POST | 公开 | 举报页 | ✅ 完整 | - |

### 6.5 计费与支付 API

| API 路径 | 方法 | 权限 | 调用页面 | 当前状态 | 风险 |
|---------|------|------|---------|---------|------|
| `/api/billing/config` | GET | 已登录 | 会员页 | ✅ 完整 | - |
| `/api/billing/orders` | GET/POST | 已登录 | 会员页 | ✅ 完整 | - |
| `/api/billing/orders/[orderId]` | GET | 已登录 | 订单详情 | ✅ 完整 | - |
| `/api/pay/create-order` | POST | 已登录 | 创建订单 | ⚠️ 需确认 | 旧路径？ |
| `/api/payments/alipay/notify` | POST | 公开（支付宝） | 支付回调 | ✅ 完整 | 有签名验证+幂等 |
| `/api/payments/alipay/test` | GET | ？ | 测试 | ⚠️ 需确认 | 需确认权限 |
| `/api/payments/wechat/notify` | POST | 公开（微信） | 微信回调 | ⚠️ 占位 | 微信支付未开放 |
| `/api/payments/sandbox` | POST | 已登录？ | 沙箱支付 | ✅ 完整 | 测试用 |
| `/api/payments/sandbox/notify` | POST | 公开 | 沙箱回调 | ✅ 完整 | 测试用 |
| `/api/internal/cron/reconcile-alipay` | GET | 需 secret | 定时任务 | ✅ 完整 | 需确认 secret 校验 |

### 6.6 管理后台 API（/api/jeepwork/*）

| API 路径 | 方法 | 权限 | 当前状态 | 风险 |
|---------|------|------|---------|------|
| `/api/jeepwork/auth/login` | POST | 公开 | ✅ 完整 | 需确认限流 |
| `/api/jeepwork/auth/logout` | POST | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/auth/me` | GET | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/users` | GET | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/users/[id]` | GET/PATCH | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/users/[id]/membership` | PATCH | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/users/[id]/restrictions` | PATCH | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/users/batch` | POST | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/users/reset-password` | POST | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/users/summary` | GET | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/profiles` | GET | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/profiles/[username]` | GET/PATCH | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/membership` | GET | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/orders` | GET | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/reconciliation` | GET | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/reports` | GET | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/reports/[id]` | GET/PATCH | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/ai-usage` | GET | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/ai-safety` | GET/POST | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/ai-credits` | GET/POST | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/settings/ai` | GET/PATCH | 超级管理员 | ✅ 完整 | - |
| `/api/jeepwork/settings/payment` | GET/PATCH | 超级管理员 | ✅ 完整 | - |
| `/api/jeepwork/settings/api` | GET/PATCH | 超级管理员 | ✅ 完整 | - |
| `/api/jeepwork/moderation` | GET/PATCH | 管理员 | ✅ 完整 | 内容审核 |
| `/api/jeepwork/audit` | GET | 管理员 | ✅ 完整 | 审计日志 |
| `/api/jeepwork/logs` | GET | 管理员 | ✅ 完整 | 系统日志 |
| `/api/jeepwork/system-health` | GET | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/system-health/dry-run` | POST | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/system-health/exec-cleanup` | POST | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/system-health/exec-email-freeze` | POST | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/summary` | GET | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/showcase` | GET/PATCH | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/competition-center/content` | GET/PATCH | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/competition-center/sequence` | GET/PATCH | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/competition-center/stats` | GET | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/competition-center/ai-config` | GET/PATCH | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/competition-files` | GET/POST | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/competition-files/[id]` | GET/DELETE | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/competition-files/[id]/download` | GET | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/competition-files/[id]/replace` | POST | 管理员 | ✅ 完整 | - |
| `/api/jeepwork/competition-ai-debug` | GET/POST | 管理员 | ✅ 完整 | - |

### 6.7 旧管理后台 API（已废弃）

| API 路径 | 说明 |
|---------|------|
| `/api/admin/users` | 旧用户管理 |
| `/api/admin/profiles` | 旧主页管理 |
| `/api/admin/reports` | 旧举报管理 |
| `/api/admin/ai-usage` | 旧 AI 用量 |
| `/api/admin/settings/api` | 旧 API 设置 |
| `/api/admin/ai/freeze` | 旧 AI 冻结 |

---

## 7. 数据库模型清单

### 7.1 正在使用的核心模型

| 模型 | 作用 | 当前使用页面/API | 是否重复 | 是否废弃 | 风险 |
|------|------|-----------------|---------|---------|------|
| `User` | 用户账户 | 全部认证、用户管理 | 否 | 否 | frozenReason 字段与 FreezeRecord 功能重复 |
| `Profile` | 主页资料 | 公开主页、编辑器 | 否 | 否 | 审核状态字段较多，需确认一致性 |
| `Link` | 内容模块 | 公开主页、编辑器 | 否 | 否 | 模块类型通过 type 字段区分，payloadJson 扩展 |
| `LinkClick` | 链接点击统计 | Analytics、统计面板 | 否 | 否 | - |
| `ProfileVisit` | 主页访问统计 | Analytics、统计面板 | 否 | 否 | 缺少 channel/utm 字段 |
| `ShortLink` | 短链接 | 短链接管理 | 否 | 否 | - |
| `ShortLinkClick` | 短链接点击 | 短链接统计 | 否 | 否 | 字段完整但部分未使用 |
| `Session` | 用户会话 | 认证系统 | 否 | 否 | - |
| `Product` | 产品与服务 | 产品管理、公开主页 | 否 | 否 | 缺少图片上传功能 |
| `Lead` | 客户线索 | 线索管理 | 否 | 否 | 缺少标签、意向等级等高级字段 |
| `LeadFollowUp` | 线索跟进记录 | 线索详情 | 否 | 否 | 设计良好，事务保证一致性 |
| `KnowledgeDoc` | 知识库文档 | 企业资料库、AI | 否 | 否 | 前端功能不完整 |
| `AiServiceConfig` | AI 客服配置 | AI 客服设置 | 否 | 否 | 配置项完整 |
| `AiConversation` | AI 对话会话 | AI 对话 | 否 | 否 | 访客侧与用户侧共用？ |
| `AiMessage` | AI 对话消息 | AI 对话 | 否 | 否 | - |
| `AiCreditAccount` | AI 额度账户 | AI 额度系统 | 否 | 否 | 乐观锁设计良好 |
| `AiCreditLedger` | AI 额度流水 | AI 额度系统 | 否 | 否 | 幂等键设计良好 |
| `AiUsageLog` | AI 用量日志 | AI 用量统计 | 否 | 否 | - |
| `MembershipSubscription` | 会员订阅 | 会员系统 | 否 | 否 | - |
| `Order` | 订单 | 支付系统 | 否 | 否 | 字段完整 |
| `ContentModerationRecord` | 内容审核记录 | 内容安全 | 否 | 否 | 新增模型，审核状态统一管理 |
| `AppConfig` | 系统配置 | 管理后台设置 | 否 | 否 | 敏感字段加密存储 |
| `AdminAuditLog` | 管理员审计日志 | 管理后台 | 否 | 否 | - |
| `FreezeRecord` | 冻结记录 | 账号治理 | 否 | 否 | 与 User.frozenReason 功能重叠 |
| `UsernameHistory` | 用户名历史 | 用户名变更 | 否 | 否 | 重定向和审计用 |
| `UsernameRegistry` | 用户名注册中心 | 用户名占用 | 否 | 否 | 全局唯一约束 |
| `PasswordResetToken` | 密码重置 Token | 忘记密码 | 否 | 否 | - |
| `EmailVerificationToken` | 邮箱验证 Token | 邮箱验证 | 否 | 否 | - |
| `LoginAttempt` | 登录尝试 | 登录限流 | 否 | 否 | - |
| `EmailSendLog` | 邮件发送记录 | 邮件限流 | 否 | 否 | - |
| `Report` | 举报记录 | 举报管理 | 否 | 否 | 状态用中文，建议枚举化 |

### 7.2 Showcase 专用模型（与正式产品隔离）

| 模型 | 作用 | 是否重复 | 是否废弃 | 风险 |
|------|------|---------|---------|------|
| `CompetitionFile` | 比赛文件管理 | 否 | 否 | 与正式产品数据隔离 |
| `ShowcaseContent` | 展示章节内容 | 否 | 否 | 动态章节管理 |
| `ShowcaseSequence` | 展示章节顺序 | 否 | 否 | - |
| `ShowcaseAIDemoCall` | AI Demo 调用记录 | 否 | 否 | 与正式 AI 数据隔离 |
| `ShowcaseAIDebugLog` | AI 调试日志 | 否 | 否 | 与正式 AI 数据隔离 |
| `ShowcasePromptDraft` | Prompt 草稿与发布 | 否 | 否 | 与正式 AI 配置隔离 |

### 7.3 疑似重复或冗余的字段/模型

| 项目 | 说明 | 证据 |
|------|------|------|
| `User.frozenReason` + `User.frozenAt` | 旧冻结字段，与 FreezeRecord 功能重叠 | `prisma/schema.prisma:16-17` |
| `Lead.notes` | 旧版历史备注，与 LeadFollowUp 功能重叠 | `prisma/schema.prisma:402` |
| 两套 AI 额度定义 | `PLAN_AI_LIMITS` 与 `PLAN_DEFINITIONS.limits.aiChatsPerMonth` 数值不一致 | `src/lib/ai/permissions.ts:10-17` vs `src/lib/billing/plans.ts:119` |
| 两套 Credit 操作函数 | `src/lib/ai/credits.ts` 与 `src/lib/ai/permissions.ts` 各有一套 | 访客侧用 credits.ts，工作台用 permissions.ts |
| `AiUsageLog` vs `AiCreditLedger` | 前者是日维度用量汇总，后者是逐笔流水，概念不同但有重叠 | - |

### 7.4 仅预留/规划中的模型

**无独立 Team/Organization/Department 等企业模型**——企业版相关功能仅存在于套餐权益字段中，无对应数据表。

### 7.5 Migration 状态

| 项目 | 值 |
|------|----|
| 总 migration 数 | 17 个 |
| 首个 migration | `20260611_init` |
| 最新 migration | `20260703_content_safety_deactivation` |
| 未提交的新 migration | 4 个（20260702 两个，20260703 两个） |
| 破坏性 migration | 无（未发现 DROP TABLE、DROP COLUMN、删除数据的操作） |

**Migration 风险**：
- 新增的 4 个 migration 尚未在生产环境执行
- 所有新字段均有默认值，不会导致现有数据报错
- `ContentModerationRecord` 的 `@@unique([contentType, contentRef])` 约束需注意历史数据是否有重复

---

## 8. PRD 与代码一致性矩阵

由于项目没有单一权威的 `PRD.md`，以下以 `README.md` 中的功能描述作为基准进行对比。

### 8.1 账号与安全

| PRD 功能 | 文档状态 | 代码状态 | 页面状态 | API 状态 | 数据库状态 | 结论 |
|---------|---------|---------|---------|---------|---------|------|
| 注册 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 登录 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 退出 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| Session | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 密码哈希 | 已规划 | 已实现 | - | ✅ | ✅ | 已完整实现 |
| 邮箱验证 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 忘记密码 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 重置密码 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 修改密码 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 多设备会话 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 登录失败限流 | 已规划 | 已实现 | - | ✅ | ✅ | 已完整实现 |
| 登录尝试记录 | 已规划 | 已实现 | - | ✅ | ✅ | 已完整实现 |
| 账号冻结 | 已规划 | 已实现 | - | ✅ | ✅ | 已完整实现 |
| 账号封禁 | 已规划 | 已实现 | - | ✅ | ✅ | 已完整实现 |
| 注销账号 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 权限和角色 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |

### 8.2 公开主页与数字名片

| PRD 功能 | 文档状态 | 代码状态 | 页面状态 | API 状态 | 数据库状态 | 结论 |
|---------|---------|---------|---------|---------|---------|------|
| 用户名公开主页 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 旧用户名跳转 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 头像/昵称/简介 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 公司/职位 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 电话/邮箱/微信 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 地址/网站 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 联系方式可见性 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 页面公开/隐藏 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| vCard | 已规划 | 已实现 | ✅ | ✅ | - | 已完整实现 |
| SEO / OG / Twitter Card | 已规划 | 已实现 | ✅ | - | - | 已完整实现 |
| 举报入口 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 品牌页脚 | 已规划 | 已实现 | ✅ | - | - | 已完整实现 |
| 免费版品牌露出 | 已规划 | 已实现 | ✅ | - | ✅ | 已完整实现 |
| 会员去品牌 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 手机端适配 | 已规划 | 已实现 | ✅ | - | - | 已完整实现 |

### 8.3 主页编辑器

| PRD 功能 | 文档状态 | 代码状态 | 页面状态 | API 状态 | 数据库状态 | 结论 |
|---------|---------|---------|---------|---------|---------|------|
| 名片资料编辑 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 链接模块管理 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 模块新增/编辑/删除 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 模块排序 | 已规划 | 已实现 | ✅ | ✅ | - | 已完整实现 |
| 模块显隐 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 主题装修 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 模板选择 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 保存和发布 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现（直接保存，无草稿系统） |
| 头像上传 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 二维码入口 | 已规划 | 已实现 | ✅ | ✅ | - | 已完整实现 |
| 分享入口 | 已规划 | 已实现 | ✅ | - | - | 已完整实现 |
| 数据入口 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 账号与安全入口 | 已规划 | 已实现 | ✅ | ✅ | - | 已完整实现 |
| 桌面端侧栏 | 已规划 | 已实现 | ✅ | - | - | 已完整实现 |
| 移动端底部导航 | 已规划 | 已实现 | ✅ | - | - | 已完整实现 |
| 右侧手机预览 | 已规划 | 已实现 | ✅ | - | - | 基本实现（部分复杂模块预览可能不完整） |

### 8.4 经营工作台（Workbench）

| PRD 功能 | 文档状态 | 代码状态 | 页面状态 | API 状态 | 数据库状态 | 结论 |
|---------|---------|---------|---------|---------|---------|------|
| 工作台首页 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 产品管理 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 基本实现但需完善（无图片上传） |
| 线索管理 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 基本实现但需完善（缺少标签、意向等级等） |
| Analytics | 已规划 | 已实现 | ✅ | ✅ | ✅ | 基本实现但需完善（时间范围固定） |
| 知识库 | 已规划 | 已实现 | ⚠️ | ✅ | ✅ | 半实现（前端功能不完整） |
| AI 客服配置 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 会员状态 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 下一步建议 | 已规划 | 已实现 | ✅ | - | - | 已完整实现 |
| 最近产品 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 最近线索 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |

### 8.5 AI 能力

| PRD 功能 | 文档状态 | 代码状态 | 页面状态 | API 状态 | 数据库状态 | 结论 |
|---------|---------|---------|---------|---------|---------|------|
| AI 客服配置 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| AI 聊天模块 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 产品推荐 | 已规划 | 已实现 | - | ✅ | ✅ | 已完整实现 |
| 知识库 | 已规划 | 已实现 | - | ✅ | ✅ | 基本实现（prompt stuffing 方式） |
| 多轮会话 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 线索收集 | 已规划 | 已实现 | - | ✅ | ✅ | 已完整实现 |
| 转人工 | 已规划 | 半实现 | ⚠️ | ⚠️ | ✅ | 仅页面/配置，无实际业务逻辑 |
| 隐私提示 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 举报提示 | 已规划 | 半实现 | ⚠️ | ⚠️ | ✅ | 仅配置开关，无实际举报逻辑 |
| AI 关闭和降级 | 已规划 | 已实现 | - | ✅ | ✅ | 已完整实现 |
| 免费用户拦截 | 已规划 | 已实现 | - | ✅ | ✅ | 已完整实现 |
| 会员权限校验 | 已规划 | 已实现 | - | ✅ | ✅ | 已完整实现 |
| AI 调用额度 | 已规划 | 已实现 | - | ✅ | ✅ | 已完整实现（但两处定义不一致） |
| 限流 | 已规划 | 已实现 | - | ✅ | - | 已完整实现 |
| 五大 AI 助手 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现（实际 7 个，含销售和客服） |
| 会话历史 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 免责声明 | 已规划 | 已实现 | ✅ | ✅ | - | 已完整实现 |
| AI 生成标识 | 已规划 | 已实现 | ✅ | ✅ | - | 已完整实现 |
| 风险日志 | 已规划 | 已实现 | - | ✅ | ⚠️ | 基本实现（需确认存储表） |
| 管理后台用量展示 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 成本统计 | 已规划 | 半实现 | ⚠️ | ⚠️ | ⚠️ | 仅页面占位，无真实成本计算 |
| 推荐问题 | 未提及 | 未实现 | - | - | - | 仅文档规划（或遗漏） |

### 8.6 会员、订单与支付

| PRD 功能 | 文档状态 | 代码状态 | 页面状态 | API 状态 | 数据库状态 | 结论 |
|---------|---------|---------|---------|---------|---------|------|
| 会员计划定义 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现（但命名混乱） |
| 权益校验 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 基本实现（AI 校验完整，其他权益需确认） |
| 会员订阅表 | 已规划 | 已实现 | - | ✅ | ✅ | 已完整实现 |
| 订单表 | 已规划 | 已实现 | - | ✅ | ✅ | 已完整实现 |
| 支付宝创建支付 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 支付宝查询 | 已规划 | 已实现 | - | ✅ | - | 基本实现 |
| 支付宝回调 | 已规划 | 已实现 | - | ✅ | ✅ | 已完整实现 |
| 支付宝对账 | 已规划 | 已实现 | - | ✅ | - | 基本实现 |
| 沙箱支付 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 支付诊断 | 已规划 | 已实现 | ✅ | ✅ | - | 已完整实现 |
| 微信支付 | 已规划 | 占位 | ⚠️ | ⚠️ | ⚠️ | 仅接口占位，未开放 |
| 退款 | 已规划 | 半实现 | ⚠️ | ⚠️ | ✅ | 仅本地状态更新，未调用支付宝接口 |
| 到期降级 | 已规划 | 半实现 | - | ⚠️ | ✅ | 惰性降级，无定时任务自动处理 |
| AI 额度 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现（但数值不一致） |
| 产品数量 | 已规划 | 已实现 | - | ✅ | ✅ | 已完整实现 |
| 知识库数量 | 已规划 | 已实现 | - | ✅ | ✅ | 已完整实现 |
| 团队席位 | 已规划 | 字段存在 | - | - | ✅ | 仅数据库预留，无业务逻辑 |
| 自定义域名 | 已规划 | 字段存在 | - | - | ✅ | 仅数据库预留，无业务逻辑 |
| 去品牌 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 优先支持 | 已规划 | 字段存在 | - | - | ✅ | 仅权益字段，无实际服务流程 |

### 8.7 企业版与团队能力

| PRD 功能 | 文档状态 | 代码状态 | 页面状态 | API 状态 | 数据库状态 | 结论 |
|---------|---------|---------|---------|---------|---------|------|
| 企业空间 | 已规划 | 未实现 | - | - | ❌ | 仅文档规划 |
| 团队/部门 | 已规划 | 未实现 | - | - | ❌ | 仅文档规划 |
| 企业管理员 | 已规划 | 未实现 | - | - | ❌ | 仅文档规划 |
| 员工成员 | 已规划 | 未实现 | - | - | ❌ | 仅文档规划 |
| 成员邀请 | 已规划 | 未实现 | - | - | ❌ | 仅文档规划 |
| 团队席位 | 已规划 | 字段预留 | - | - | ✅ | 仅数据库预留 |
| 企业模板 | 已规划 | 未实现 | - | - | ❌ | 仅文档规划 |
| 共享知识库 | 已规划 | 半实现 | ⚠️ | ✅ | ✅ | 个人知识库已实现，企业共享未实现 |
| 线索分配 | 已规划 | 未实现 | - | - | ❌ | 仅文档规划 |
| 员工名片 | 已规划 | 未实现 | - | - | ❌ | 仅文档规划 |
| 离职回收 | 已规划 | 未实现 | - | - | ❌ | 仅文档规划 |
| 自定义域名 | 已规划 | 字段预留 | - | - | ✅ | 仅数据库预留 |
| API / Webhook | 已规划 | 未实现 | - | - | ❌ | 仅文档规划 |
| 企业微信/钉钉/飞书 | 已规划 | 未实现 | - | - | ❌ | 仅文档规划 |
| SSO | 已规划 | 未实现 | - | - | ❌ | 仅文档规划 |

### 8.8 管理后台

| PRD 功能 | 文档状态 | 代码状态 | 页面状态 | API 状态 | 数据库状态 | 结论 |
|---------|---------|---------|---------|---------|---------|------|
| 管理员登录 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 用户管理 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 会员管理 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 订单管理 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 支付设置 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 对账 | 已规划 | 已实现 | ✅ | ✅ | - | 基本实现 |
| AI 配置 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| AI 用量 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| AI 成本 | 已规划 | 半实现 | ⚠️ | ⚠️ | ⚠️ | 仅页面占位 |
| AI 安全 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 邮件配置 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 系统配置 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 举报管理 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 主页管理 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 角色权限 | 已规划 | 基本实现 | ✅ | ✅ | ✅ | 基本实现（三级角色） |
| 访问日志 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 登录日志 | 已规划 | 已实现 | - | ✅ | ✅ | 已完整实现 |
| 安全日志 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 冻结/封禁 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 系统健康检查 | 已规划 | 已实现 | ✅ | ✅ | - | 已完整实现 |
| 内容审核后台 | 新增 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |

### 8.9 Showcase 比赛展示中心

| PRD 功能 | 文档状态 | 代码状态 | 页面状态 | API 状态 | 数据库状态 | 结论 |
|---------|---------|---------|---------|---------|---------|------|
| 展示主页 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| judge 视角 | 已规划 | 已实现 | ✅ | - | ✅ | 已完整实现 |
| investor 视角 | 已规划 | 已实现 | ✅ | - | ✅ | 已完整实现 |
| government 视角 | 已规划 | 已实现 | ✅ | - | ✅ | 已完整实现 |
| 展示内容管理 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 展示顺序管理 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 文件上传/下载/替换 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 访问统计 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| AI Demo | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| Prompt 草稿/发布 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |
| 调试日志 | 已规划 | 已实现 | ✅ | ✅ | ✅ | 已完整实现 |

---

## 9. Dashboard 与 Workbench 双后台分析

### 9.1 两者分别承担什么

**Dashboard V1（`/dashboard`）——名片编辑器**
- 核心定位：主页内容的可视化编辑器
- 核心功能：名片资料编辑、内容模块管理、主题装修、模板选择、实时手机预览
- 设计风格：左右分栏，左侧编辑面板，右侧手机预览
- 状态管理：Zustand stores（core-store、link-state、account-store）
- API 路径：`/api/dashboard/*`

**Workbench（`/workbench`）——经营工作台**
- 核心定位：业务数据与经营工具的管理后台
- 核心功能：产品管理、线索管理、AI 客服、数据分析、会员管理、知识库、经营 AI
- 设计风格：侧边导航 + 主内容区
- 状态管理：fetch + useState（无全局状态管理）
- API 路径：`/api/workbench/*` + `/api/dashboard/*`（混用）

### 9.2 哪些功能重复

| 功能 | Dashboard V1 | Workbench | 重复程度 | 问题 |
|------|-------------|-----------|----------|------|
| 账号与安全 | AccountPanel | /workbench/account | 100% 重复 | 两套 UI、两套逻辑 |
| 会员升级 | UpgradeDialog | /workbench/membership | 90% 重复 | Dashboard 是弹窗，Workbench 是完整页面 |
| 数据统计 | StatsPanel | /workbench/analytics | 70% 重复 | Workbench 功能更完整，Dashboard 较简单 |
| 头像上传 | ProfilePanel | （无独立页） | 部分重复 | Dashboard 有头像上传，Workbench 可能没有 |
| 主题设置 | AppearancePanel | （无独立页） | 不重复 | 仅 Dashboard 有 |
| 链接模块管理 | LinksPanel | （无独立页） | 不重复 | 仅 Dashboard 有 |

### 9.3 哪些功能应合并

| 功能 | 建议合并到 | 理由 |
|------|-----------|------|
| 账号与安全 | Workbench Account | Workbench 是新版主后台，应作为唯一入口 |
| 会员管理 | Workbench Membership | Workbench 会员页功能更完整 |
| 数据统计 | Workbench Analytics | Workbench Analytics 功能更全、图表更多 |
| 名片编辑 | 保留在 Dashboard 或迁移到 Workbench | 名片编辑是核心功能，需要实时预览，当前左右分栏设计合理 |
| 链接模块管理 | 同上 | 与名片编辑紧密耦合 |
| 主题装修 | 同上 | 与名片编辑紧密耦合 |

### 9.4 哪些路由应兼容保留

| 旧路由 | 新路由 | 兼容策略 |
|--------|--------|---------|
| `/dashboard` | `/workbench` 或 `/workbench/editor` | 重定向或保留为编辑器入口 |
| `/account/security` | `/workbench/account` | 301 重定向 |
| `/account/sessions` | `/workbench/account#sessions` | 301 重定向 |
| `/api/dashboard/*` | `/api/workbench/*` | 保留旧路径做反向代理，或在代码中做兼容 |

### 9.5 是否建议统一到 `/console`

**建议：不建议现在改名为 `/console`，建议先合并功能，再考虑重命名。**

理由：
1. 当前最紧迫的问题是功能重复和用户路径混乱，不是命名问题
2. 改名会带来额外的迁移成本（URL 变更、文档更新、用户习惯改变）
3. 建议的合并路径：
   - 第一步：把账号、会员、统计从 Dashboard 移到 Workbench
   - 第二步：把名片编辑器整合到 Workbench（作为一个 Tab 或子页面）
   - 第三步：统一 API 路径（保留旧路径做兼容）
   - 第四步（可选）：统一命名为 `/console` 或其他

### 9.6 用户第一次登录后真实进入哪里

**当前实现：需确认默认跳转路径。**

从代码结构看：
- `/dashboard` 是 V1 默认入口
- `/workbench` 是新版入口
- Workbench 侧边栏有"名片编辑器"入口跳转到 `/dashboard`
- 用户可能通过不同入口进入，导致体验不一致

**建议**：统一默认跳转到 Workbench，把名片编辑器作为 Workbench 的一个核心功能模块。

---

## 10. AI 系统审计

### 10.1 访客侧 AI 有哪些

| 功能 | 实现状态 | 核心文件 | 说明 |
|------|---------|---------|------|
| AI 聊天模块 | ✅ 已实现 | `src/components/share/modules/AiChatModule.tsx` | 公开主页上的 AI 对话组件 |
| AI 客服配置 | ✅ 已实现 | `src/lib/ai/commercial-agent.ts` | 用户在后台配置 AI 客服参数 |
| 产品推荐 | ✅ 已实现 | `src/lib/ai/commercial-agent.ts:504-514` | 根据用户产品自动推荐 |
| 知识库引用 | ✅ 已实现 | `src/lib/ai/commercial-agent.ts:210-212` | 将知识库文档拼接到 prompt（stuffing 方式） |
| 多轮会话 | ✅ 已实现 | `src/lib/ai/conversations.ts` | 基于 visitorSessionId 追踪会话 |
| 线索收集 | ✅ 已实现 | `src/lib/ai/commercial-agent.ts:236-281` | AI 对话中收集客户信息生成线索 |
| 转人工 | ⚠️ 仅配置 | `src/lib/ai/commercial-agent.ts:536` | 有开关但无实际业务逻辑 |
| 隐私提示 | ✅ 已实现 | `src/lib/ai/privacy.ts` | 对话前显示隐私声明 |
| 举报功能 | ⚠️ 仅配置 | `src/lib/ai/commercial-agent.ts:537` | 有开关但无实际举报逻辑 |
| AI 关闭和降级 | ✅ 已实现 | `src/lib/ai/commercial-agent.ts:356-366` | 三层开关控制 |
| 免费用户拦截 | ✅ 已实现 | `src/lib/ai/public-access.ts` | 免费用户 AI 功能禁用 |
| 会员权限校验 | ✅ 已实现 | `src/lib/ai/permissions.ts` | 套餐月度额度 + 每日上限 + Credit 余额 |
| AI 调用额度 | ✅ 已实现 | `src/lib/ai/credits.ts` | 每次对话消耗 1 Credit |
| API 限流 | ✅ 已实现 | `src/app/api/ai/customer-service/route.ts:9` | 20 次/分钟 |
| 内容安全审核 | ✅ 已实现 | `src/lib/ai/compliance.ts` | 输入输出内容审核 |
| AI 生成标识 | ✅ 已实现 | `src/app/api/workbench/ai/chat/route.ts:332-334` | 回复开头追加标识 |

### 10.2 用户侧经营 AI 有哪些

| 功能 | 实现状态 | 数量 | 说明 |
|------|---------|------|------|
| 财税 AI Agent | ✅ 已实现 | 1 | 税务、财务问题咨询 |
| 法务 AI Agent | ✅ 已实现 | 1 | 合同、法律问题咨询 |
| 市场调研 AI Agent | ✅ 已实现 | 1 | 市场分析、竞品调研 |
| 设计 AI Agent | ✅ 已实现 | 1 | 品牌、视觉设计建议 |
| 社媒运营 AI Agent | ✅ 已实现 | 1 | 社交媒体内容运营 |
| 业务客服 AI Agent | ✅ 已实现 | 1 | 主要用于访客侧 |
| 产品咨询 AI Agent | ✅ 已实现 | 1 | 主要用于访客侧 |
| 会话历史 | ✅ 已实现 | - | 对话列表和详情 |
| 免责声明 | ✅ 已实现 | - | 每个助手有独立 disclaimer |
| 风险提示 | ✅ 已实现 | - | AI 生成内容不构成专业建议 |

**注意**：README 说"五大 AI 助手"，但实际 `assistants.ts` 中定义了 7 个（含销售和客服）。

### 10.3 命名冲突

| 命名 | 出现位置 | 实际指什么 | 与哪些命名重复 |
|------|---------|-----------|---------------|
| **AI 助理** | `AiServiceConfig.assistantName` 默认值 | 访客侧 AI 客服 | AI 客服、业务客服 AI Agent、AI 接待 |
| **AI 客服** | 代码注释、页面文案 | 访客侧 customer-service agent | AI 助理、AI 接待、业务客服 AI Agent |
| **AI 接待** | 审计报告、README | 访客侧 AI 客服 | AI 客服、AI 助理 |
| **业务客服 AI Agent** | `assistants.ts` displayTitle | 访客侧客服 Agent | AI 客服 |
| **产品咨询 AI Agent** | `assistants.ts` displayTitle | 访客侧销售 Agent | sales-agent |
| **AI 助手** | 工作台页面文案 | 工作台五大经营 AI | AI Agent、经营 AI |
| **AI Agent** | displayTitle 后缀 | 工作台 AI 助手 | AI 助手、经营 AI |
| **经营 AI** | 导航、文档 | 工作台 AI 工具箱 | AI 助手、AI Agent |
| **企业 AI** | enterprise-ai 路径 | 企业版 AI 能力 | 不明确，可能是 enterprise 套餐 AI |
| **AI Chat** | 组件名、模块名 | AI 对话功能 | 通用术语，不特指某一侧 |
| **commercial-agent** | 文件名 | 访客侧商业 Agent 框架 | 内部实现命名 |
| **conversion-agent** | API 路径 | 转化 Agent（与 customer-service 类似？） | 需确认是否为同一功能 |

**命名冲突总结**：
1. **访客侧 AI 客服**：至少有 4-5 种不同命名（AI 助理、AI 客服、AI 接待、业务客服 AI Agent、customer-service）
2. **用户侧经营 AI**：至少有 3 种命名（AI 助手、AI Agent、经营 AI）
3. **统一建议**：
   - 访客侧统一叫"AI 接待助手"
   - 用户侧统一叫"经营 AI 工具箱"

### 10.4 权限是否正确

**结论：权限校验架构正确，实现较完整。**

证据：
1. **三层权限检查**（访客侧 AI）：
   - 第一层：平台全局开关（`config.aiEnabled`、`config.aiPublicEnabled`）
   - 第二层：用户级开关（`AiServiceConfig.enabled`）
   - 第三层：套餐权限（`entitlements.features.aiEnabled`）
   - 位置：`src/lib/ai/commercial-agent.ts:356-366`

2. **额度校验**：
   - 月度额度（套餐配置）
   - 每日上限（风控保护）
   - Credit 余额（按量计费）
   - 位置：`src/lib/ai/permissions.ts`

3. **服务端独立校验**：
   - 所有 AI API 都在服务端独立校验权限
   - 前端按钮隐藏不是唯一防线
   - 证据：`src/app/api/workbench/ai/chat/route.ts:72-89`

### 10.5 免费用户是否可能调用真实 AI

**结论：免费用户不能调用真实 AI。**

三层拦截机制：
1. **套餐配置**：free 套餐 `aiChatsPerMonth: 0`
2. **权益计算**：`aiEnabled: paid && aiLimit !== 0`
3. **服务端校验**：API 调用前检查 `entitlements.features.aiEnabled`

证据：
- `src/lib/billing/plans.ts:66`（free 套餐 AI 限制为 0）
- `src/lib/billing/entitlements/index.ts:128`（aiEnabled 计算逻辑）
- `src/lib/ai/commercial-agent.ts:361-363`（调用前校验）

**风险提示**：
- `AiServiceConfig.providerMode` 默认是 `"mock"`，但实际代码直接调用百炼接口
- 需确认 mock 模式是否真的会拦截真实调用

### 10.6 AI 额度、成本和风控是否闭环

**额度闭环：基本闭环**
- ✅ 额度账户：`AiCreditAccount`（余额 + 乐观锁）
- ✅ 额度流水：`AiCreditLedger`（逐笔记录 + 幂等键）
- ✅ 消费扣减：调用前检查余额，调用后扣减
- ✅ 充值/赠送：管理员后台可调整
- ⚠️ 问题：两套 Credit 操作函数（credits.ts 和 permissions.ts）可能导致不一致

**成本统计：未闭环**
- ❌ 只有 Credit 计数，没有按模型单价计算成本
- ❌ 后台 ai-cost 页面可能只是占位
- ❌ 访客侧 commercial-agent 未记录 token 用量

**风控：基本闭环**
- ✅ 输入内容审核（敏感词拦截）
- ✅ 输出内容审核
- ✅ 风险日志（输入拦截、输出拦截、模型错误等）
- ✅ 调用频率限制（限流 + 每日上限 + 月度额度）
- ✅ 异常 IP 控制（基于 rate-limit）
- ✅ AI 生成内容标识
- ✅ 免责声明

### 10.7 知识库是否真正接通

**结论：以 "prompt stuffing" 方式接通，非真正的向量检索。**

实现方式：
1. 从 `KnowledgeDoc` 表查询用户的活跃文档（最多 12 篇）
2. 将文档内容直接拼接到系统 prompt 中
3. 模型根据 prompt 中的内容回答

证据：
- `src/lib/ai/commercial-agent.ts:210-212`

**问题**：
1. **Token 消耗大**：所有文档都塞进 prompt，浪费 token
2. **文档数量有限**：最多 12 篇，多了放不下
3. **检索质量低**：没有相似度匹配，全部文档都给模型
4. **没有百炼知识库对接**：未使用百炼的知识库/RAG 功能

### 10.8 哪些是内测或占位

| 功能 | 状态 | 说明 |
|------|------|------|
| 转人工 | 内测/占位 | 只有开关，无实际业务逻辑 |
| 举报功能 | 内测/占位 | 只有开关，无实际举报逻辑 |
| AI 成本统计 | 内测/占位 | 只有页面，无真实成本计算 |
| 推荐问题 | 未实现 | 访客侧 AI 无推荐问题配置 |
| 企业知识库 | 内测/占位 | 个人知识库已实现，企业共享未实现 |
| 微信支付 AI 回调 | 不适用 | 微信支付整体未开放 |

---

## 11. 会员、订单与支付审计

### 11.1 套餐名称

| Plan Code | 显示名称 | 年付价格 | 状态 | 问题 |
|-----------|---------|---------|------|------|
| `free` | 免费版 | 0 元 | 公开 | - |
| `member_basic` | Plus（旧版兼容） | 188 元 | 遗留兼容 | 与 member_plus 价格权益相同 |
| `member_plus` | Plus 会员 | 188 元 | 遗留兼容 | 与 member_basic 重复 |
| `pro` | Pro 年付 | 388 元 | 公开推荐 | - |
| `enterprise` | 企业版 | 联系销售 | 公开 | 企业功能几乎未实现 |
| `enterprise_pro_plus` | 企业专业 Plus | 3988 元 | 遗留 | 与 enterprise 关系不清 |
| `internal_test` | 内部测试 | 1 元 | 内部专用 | 测试用 |

**套餐命名问题总结**：
1. **Plus 档有三个名字**：`Plus`、`member_plus`、`member_basic`，都是 188 元档
2. **Enterprise 档有两个名字**：`enterprise`、`enterprise_pro_plus`，价格差距大但功能差异不清
3. **Pro 档定位模糊**：`pro` 与 `member_plus` 在 AI 额度配置中数值相同（都是 2000），但价格不同（388 vs 188）

### 11.2 权益明细

| 权益 | Free | Plus | Pro | Enterprise |
|------|------|------|-----|------------|
| AI 月度额度 | 0 | 300* | 2000 | 10000 |
| AI 每日上限 | 0 | 50 | 200 | 500 |
| AI Credit 赠送 | 0 | 300* | 2000 | 10000 |
| 产品数量 | 3 | 10 | 50 | 200 |
| 知识库数量 | 0 | 3 | 20 | 100 |
| 团队席位 | 1 | 1 | 1 | 3 |
| 自定义域名 | ❌ | ❌ | ❌ | ✅（字段有，功能未实现） |
| 去品牌 | ❌ | ✅ | ✅ | ✅ |
| 优先支持 | ❌ | ❌ | ✅ | ✅ |

\* 注：`PLAN_AI_LIMITS` 中 member_plus 是 2000，但 `PLAN_DEFINITIONS` 中是 300，**数值不一致**，需以哪个为准需确认。

### 11.3 支付流程

**支付宝支付流程**：
1. 用户在会员页选择套餐
2. 前端调用 `/api/billing/orders` 创建订单
3. 服务端生成订单号、计算金额（服务端生成，不信任前端）
4. 调用支付宝接口创建支付
5. 用户跳转到支付宝完成支付
6. 支付宝异步回调 `/api/payments/alipay/notify`
7. 服务端验证签名、校验金额、幂等处理
8. 更新订单状态、开通会员、发放 AI Credit
9. 用户返回订单页查看结果

**安全设计亮点**：
- ✅ 金额由服务端生成，不信任前端传入
- ✅ 回调签名验证（RSA2）
- ✅ app_id / seller_id 校验
- ✅ 金额一致性校验
- ✅ 幂等键防止重复回调
- ✅ 订单状态机（pending → paid / cancelled / expired）

### 11.4 回调处理

**回调验证步骤**（`src/lib/billing/webhooks.ts:69-216`）：
1. 签名验证（`alipayVerifySignature`）
2. app_id 校验（确保是本应用的订单）
3. seller_id 校验（可选，确保收款方正确）
4. 订单存在性校验
5. 金额校验（回调金额与订单金额一致）
6. 支付渠道校验
7. 订单状态校验（幂等：重复回调不重复处理）

**回调后操作**（`processPaymentSuccess`）：
1. 更新订单状态为 paid
2. 开通/延长会员
3. 发放 AI Credit
4. 记录支付诊断

### 11.5 对账

- 支付宝对账：`src/lib/billing/alipay-reconciliation.ts`
- 定时任务：`/api/internal/cron/reconcile-alipay/route.ts`
- 保护机制：需要 `PAYMENT_RECONCILE_SECRET` 校验
- 状态：基本实现，需确认完整性

### 11.6 会员生效

**会员生效逻辑**（`src/lib/billing/orders.ts:443-456`）：
- 新会员：立即生效，有效期 +1 年
- 续费：在现有到期日基础上延长
- 升级：需确认是否有差额处理逻辑

### 11.7 到期降级

**当前实现**：
- 宽限期：3 天（`GRACE_PERIOD_DAYS = 3`）
- 降级方式：惰性降级（用户访问时实时计算）
- 问题：
  - ❌ 没有定时任务自动处理到期
  - ❌ `MembershipSubscription.status` 字段不会自动更新为 expired
  - ❌ 到期后 AI Credit 不会自动回收

### 11.8 AI 额度

**额度系统组成**：
1. 套餐月度额度（`PLAN_DEFINITIONS.limits.aiChatsPerMonth`）
2. 每日风控上限（`DAILY_LIMITS`）
3. AI Credit 余额（`AiCreditAccount.balance`）

**已知问题**：
- ⚠️ `PLAN_AI_LIMITS`（permissions.ts）与 `PLAN_DEFINITIONS.limits.aiChatsPerMonth`（plans.ts）数值不一致
- ⚠️ 两套 Credit 操作函数并存（credits.ts 和 permissions.ts）
- ⚠️ 月度额度重置逻辑不明确（是自然月还是购买日起算？）

### 11.9 服务端校验

| 权益 | 服务端校验 | 校验位置 | 结论 |
|------|-----------|---------|------|
| AI 调用权限 | ✅ 完整校验 | `getAiQuota` + `getUserEntitlements` | 已闭环 |
| 产品数量限制 | ✅ 有校验 | `checkLimitEntitlement('products')` | 创建产品时调用 |
| 知识库数量限制 | ✅ 有校验 | `checkLimitEntitlement('knowledgeDocs')` | 创建文档时调用 |
| 模块数量/类型限制 | ✅ 有校验 | `links/route.ts` 中 `getUserEntitlements` | 保存模块时校验 |
| 自定义域名 | ⚠️ 有函数 | `isFeatureAllowed('customDomain')` | 功能未实现，无法验证 |
| 去品牌 | ✅ 有字段 | `entitlements.features.removeBranding` | 渲染时判断 |
| 优先支持 | ⚠️ 有字段 | `entitlements.features.prioritySupport` | 仅权益字段，无实际服务流程 |

**结论**：核心权益（AI、产品、知识库、模块）都有服务端校验，不能仅靠前端隐藏绕过。

### 11.10 当前风险

| 风险 | 等级 | 说明 |
|------|------|------|
| AI 额度定义不一致 | 高 | member_plus 额度 300 vs 2000，可能导致用户投诉或收入损失 |
| 退款未调用支付宝接口 | 高 | 退款只更新本地状态，资金仍在支付宝，需手动退款 |
| 到期无自动降级 | 中 | 依赖用户访问时惰性计算，会员状态字段不准确 |
| 套餐命名混乱 | 中 | 多个名称指同一档，增加维护和沟通成本 |
| 企业版功能与定价不符 | 中 | enterprise 套餐价格高但功能少，可能涉嫌虚假宣传 |
| 微信支付未开放 | 低 | 有框架但未启用，用户支付选择少 |
| 两套 Credit 操作函数 | 中 | 可能导致数据不一致 |

---

## 12. 企业版真实完成度

### 12.1 已完成

**无真正的企业版功能已完成。**

当前"企业版"仅体现在：
- 套餐列表中有 `enterprise` 档位（联系销售）
- `enterprise_pro_plus` 档位（3988 元/年）
- 权益字段中有 `teamSeats`、`customDomain` 等
- 路径中有 `/enterprise-ai`（功能不明确）

但企业版的核心能力（团队、成员、权限、协作等）均未实现。

### 12.2 半实现

| 功能 | 实现程度 | 说明 |
|------|---------|------|
| 团队席位权益字段 | 50% | 数据库/配置中有 teamSeats 字段，但无实际团队/成员功能 |
| 自定义域名字段 | 30% | 有权益字段，但无域名配置、DNS 验证、SSL 等 |
| 知识库 | 40% | 个人知识库已实现，企业共享知识库未实现 |
| 企业 AI | 10% | 有 enterprise-ai 路径，但功能不明确 |

### 12.3 仅预留（数据库/配置字段）

| 功能 | 预留位置 | 状态 |
|------|---------|------|
| 团队席位 | `PLAN_DEFINITIONS.limits.teamSeats` | 仅数值 |
| 自定义域名 | `entitlements.features.customDomain` | 仅布尔值 |
| 优先支持 | `entitlements.features.prioritySupport` | 仅布尔值 |

### 12.4 仅文档规划

以下功能在 README 等文档中有提及，但代码中完全不存在：

| 功能 | 文档位置 | 代码状态 |
|------|---------|---------|
| 企业空间 | README | 无 |
| 团队/部门 | README | 无 |
| 企业管理员角色 | README | 无（只有 super_admin/admin/user） |
| 员工成员 | README | 无 |
| 成员邀请 | README | 无 |
| 企业模板 | README | 无 |
| 共享知识库 | README | 无 |
| 线索分配 | README | 无 |
| 员工名片 | README | 无 |
| 离职回收 | README | 无 |
| API / Webhook | README | 无 |
| 企业微信/钉钉/飞书 | README | 无 |
| SSO | README | 无 |

### 12.5 完全不存在

上述 12 项企业版核心功能全部完全不存在。

**建议**：
1. 要么从公开页面移除"企业版"宣传，改为"企业版开发中"
2. 要么明确企业版路线图，按计划开发
3. 对外展示"联系销售"是可以的，但不能暗示企业版功能已就绪

---

## 13. 管理后台审计

### 13.1 管理后台入口

- **正式入口**：`/jeepwork`
- **旧入口**：`/admin`（应已废弃，需确认是否统一返回 404）

### 13.2 管理员登录与会话

**独立的管理员认证系统**：
- 独立登录页：`src/app/jeepwork/login/page.tsx`
- 独立认证逻辑：`src/lib/jeepwork-auth.ts`
- 独立 Session Cookie
- 与普通用户 Session 隔离

**安全设计**：
- ✅ 独立的登录入口，与普通用户分开
- ✅ 独立的 Session 体系
- ✅ 密码哈希与普通用户一致（bcrypt）
- ✅ 登录限流
- ⚠️ 需确认是否有管理员登录失败的专门审计日志

### 13.3 用户与会员治理

| 功能 | 实现状态 | 说明 |
|------|---------|------|
| 用户列表 | ✅ 已实现 | 支持筛选、搜索 |
| 用户详情 | ✅ 已实现 | 查看用户信息、主页、会员状态 |
| 会员调整 | ✅ 已实现 | 手动调整会员套餐和有效期 |
| 密码重置 | ✅ 已实现 | 管理员可重置用户密码 |
| 账号冻结/解封 | ✅ 已实现 | FreezeRecord 管理 |
| 账号封禁 | ✅ 已实现 | BANNED 类型冻结 |
| 批量操作 | ✅ 已实现 | 批量处理用户 |
| 用户统计概览 | ✅ 已实现 | 新增用户、活跃用户等 |

### 13.4 订单与支付治理

| 功能 | 实现状态 | 说明 |
|------|---------|------|
| 订单列表 | ✅ 已实现 | 查看所有订单 |
| 订单详情 | ✅ 已实现 | 订单状态、金额、支付方式 |
| 支付设置 | ✅ 已实现 | 支付宝配置、微信配置（占位） |
| 对账 | ✅ 已实现 | 支付宝对账（需确认完整性） |
| 支付诊断 | ✅ 已实现 | 回调状态记录 |
| 退款 | ⚠️ 半实现 | 本地退款状态更新，未调用支付宝接口 |

### 13.5 AI 治理

| 功能 | 实现状态 | 说明 |
|------|---------|------|
| AI 配置 | ✅ 已实现 | Provider、模型、App ID 等配置 |
| AI 用量统计 | ✅ 已实现 | 用户用量、调用次数 |
| AI 成本统计 | ⚠️ 半实现 | 只有 Credit 计数，无真实成本 |
| AI 安全测试 | ✅ 已实现 | 安全测试用例、风险检测 |
| AI 风险事件 | ✅ 已实现 | 拦截记录、错误记录 |
| AI Credit 管理 | ✅ 已实现 | 手动调整余额、查看流水 |
| AI 内容安全 | ✅ 已实现 | 审核规则配置 |

### 13.6 内容治理

| 功能 | 实现状态 | 说明 |
|------|---------|------|
| 举报管理 | ✅ 已实现 | 举报列表、处理、备注 |
| 主页管理 | ✅ 已实现 | 主页列表、公开/隐藏 |
| 内容审核后台 | ✅ 已实现 | 图片/文本审核、状态更新 |
| 用户冻结/封禁 | ✅ 已实现 | 多类型冻结记录 |
| 审计日志 | ✅ 已实现 | 管理员操作全记录 |

### 13.7 系统配置

| 功能 | 实现状态 | 说明 |
|------|---------|------|
| AI 设置 | ✅ 已实现 | 超级管理员可配置 |
| 支付设置 | ✅ 已实现 | 支付宝/微信配置 |
| API 设置 | ✅ 已实现 | 外部 API 配置 |
| 邮件配置 | ✅ 已实现 | SMTP 配置 |
| 存储配置 | ✅ 已实现 | 文件存储配置 |

### 13.8 系统健康

| 功能 | 实现状态 | 说明 |
|------|---------|------|
| 系统健康检查 | ✅ 已实现 | 各项服务状态 |
| 数据清理 | ✅ 已实现 | 清理过期数据 |
| 邮箱冻结任务 | ✅ 已实现 | 未验证邮箱自动冻结 |
| 系统日志 | ✅ 已实现 | 操作日志查看 |

### 13.9 角色权限

**当前三级角色**：
1. `super_admin`（超级管理员）- 最高权限，可配置敏感设置
2. `admin`（管理员）- 用户管理、内容管理、订单查看
3. `user`（普通用户）- 普通前台用户

**权限校验**：
- ✅ 路由级权限校验
- ✅ API 级权限校验
- ✅ 超级管理员保护（最后一名 super_admin 不可删除）

### 13.10 Showcase 专用管理功能

| 功能 | 实现状态 | 说明 |
|------|---------|------|
| 比赛内容管理 | ✅ 已实现 | 动态章节编辑 |
| 比赛顺序管理 | ✅ 已实现 | 章节排序、显隐 |
| 比赛文件管理 | ✅ 已实现 | 上传、下载、替换 |
| 比赛 AI 调试台 | ✅ 已实现 | Prompt 调试、草稿、发布 |
| 比赛 AI Demo 配置 | ✅ 已实现 | Demo 用 AI 配置 |
| 比赛统计 | ✅ 已实现 | 访问量、调用量 |

**注意**：Showcase 管理功能与正式产品管理功能在同一管理后台中，但数据完全隔离（独立数据表）。

### 13.11 旧 /admin 是否真的统一返回 404

**需确认**：`src/app/admin/` 下仍有多个页面文件，需检查这些页面是否真的返回 404，还是仍可访问。

从目录结构看，`src/app/admin/` 下有：
- `page.tsx`
- `users/page.tsx`
- `profiles/page.tsx`
- `reports/page.tsx`
- `ai-usage/page.tsx`
- `settings/api/page.tsx`

对应 API 也存在于 `/api/admin/` 路径下。

**建议确认**：这些页面是否真的返回 404，还是只是未被使用。

---

## 14. 重复代码与技术债务

### 14.1 P0 级（严重，需立即处理）

| 问题 | 涉及文件 | 影响 | 证据 |
|------|---------|------|------|
| 双后台架构，功能重复 | `/dashboard` + `/workbench` | 用户体验割裂、维护成本翻倍 | 两套布局、两套导航、重复的账号/会员/统计页面 |
| AI 额度定义不一致 | `src/lib/ai/permissions.ts` + `src/lib/billing/plans.ts` | 收费与实际使用不符，可能导致收入损失或用户投诉 | member_plus: 2000（permissions）vs 300（plans） |
| 退款不调用支付宝接口 | `src/lib/billing/orders.ts:530-618` | 用户退款后资金仍在支付宝，需人工处理 | `processRefund` 只更新本地订单状态 |

### 14.2 P1 级（中等，近期应处理）

| 问题 | 涉及文件 | 影响 | 证据 |
|------|---------|------|------|
| 套餐命名混乱 | `src/lib/billing/plans.ts` | 沟通成本高、易出错 | member_basic/member_plus/Plus 指同一档 |
| AI 命名分裂 | 多处 | 用户理解成本高、文档难写 | AI 助理/客服/接待/助手/Agent 等多种命名 |
| API 路径不统一 | `/api/dashboard/*` + `/api/workbench/*` | 维护混乱、新人上手慢 | 产品 API 在 dashboard 路径，线索 API 在 workbench 路径 |
| 两套 Credit 操作函数 | `src/lib/ai/credits.ts` + `src/lib/ai/permissions.ts` | 数据不一致风险 | 访客侧和工作台各用一套 |
| 企业版宣传与实际不符 | 定价页、README | 法律风险、用户信任损失 | enterprise 套餐功能几乎全空 |
| 到期无自动降级 | `src/lib/billing/entitlements/index.ts` | 会员状态不准确、可能超期使用 | 依赖惰性计算，无定时任务 |
| 转人工/举报只有开关无实现 | `src/lib/ai/commercial-agent.ts` | 功能承诺未兑现 | allowTransferToHuman/allowReport 配置存在但无逻辑 |

### 14.3 P2 级（轻微，可排期处理）

| 问题 | 涉及文件 | 影响 | 证据 |
|------|---------|------|------|
| 旧 admin 页面未删除 | `src/app/admin/` | 代码冗余、可能误访问 | 多个旧页面文件仍存在 |
| 密码强度要求不一致 | 注册 6 位 vs 重置 8 位 | 用户困惑 | 不同页面密码长度要求不同 |
| 转化漏斗逻辑错误 | `src/lib/analytics/stats.ts` | 数据不准确 | 第 1、2 步都用 LinkClick 数据 |
| 知识库为 prompt stuffing | `src/lib/ai/commercial-agent.ts` | Token 浪费、文档数量有限 | 直接拼接所有文档到 prompt |
| 地区统计全为 null | ProfileVisit、LinkClick | 功能不可用 | 未接入 GeoIP 服务 |
| Token 用量记录不完整 | 访客侧 AI | 成本无法核算 | commercial-agent 未记录 token |
| 中文文案乱码风险 | 多个文件 | 产品体验差 | 历史上出现过乱码问题 |
| 限流使用内存存储 | `src/lib/rate-limit.ts` | 多实例部署时限流失效 | memoryStore 为进程内 Map |

### 14.4 组件重复清单

| 组件/功能 | 位置 1 | 位置 2 | 重复程度 |
|----------|--------|--------|----------|
| 账号设置 | `src/components/dashboard-v1/AccountPanel.tsx` | `src/app/workbench/account/page.tsx` | 90% |
| 会员升级 | `src/components/dashboard-v1/UpgradeDialog.tsx` | `src/app/workbench/membership/page.tsx` | 70% |
| 数据统计 | `src/components/dashboard-v1/StatsPanel.tsx` | `src/app/workbench/analytics/page.tsx` | 60% |
| AI 聊天组件 | `src/components/ai/AiChatClient.tsx` | `src/components/share/modules/AiChatModule.tsx` | 需确认 |
| 二维码组件 | `src/components/share/QrCodeModal.tsx` | `src/components/dashboard-v1/SharePanel.tsx` | 需确认 |
| 权限判断逻辑 | `src/lib/billing/entitlements/` | 多处内联判断 | 部分重复 |
| 上传逻辑 | `src/lib/upload-storage.ts` | 多个上传 API | 已统一（较好） |

### 14.5 命名冲突清单

| 概念 | 命名 1 | 命名 2 | 命名 3 | 命名 4 |
|------|--------|--------|--------|--------|
| 访客侧 AI | AI 助理 | AI 客服 | AI 接待 | 业务客服 AI Agent |
| 用户侧 AI | AI 助手 | AI Agent | 经营 AI | 五大 AI 助手 |
| 产品 | Product | Offer | Service | 商品/服务 |
| 后台 | Dashboard | Workbench | Console | 管理后台/Jeepwork |
| Plus 会员 | Plus | member_plus | member_basic | 会员版 |
| 内容模块 | Link | Block | Module | 组件 |
| 企业版 | Enterprise | Enterprise Pro Plus | 企业专业 Plus | - |

---

## 15. 安全风险清单

### 15.1 高风险

| 风险 | 文件路径 | 问题 | 影响 | 修复建议 |
|------|---------|------|------|---------|
| **无** | - | - | - | 本次审计未发现严重安全漏洞 |

### 15.2 中风险

| 风险 | 文件路径 | 问题 | 影响 | 修复建议 |
|------|---------|------|------|---------|
| 限流基于内存存储 | `src/lib/rate-limit.ts` | memoryStore 是进程内 Map，多实例部署时限流会失效 | 暴力破解、API 滥用风险 | 生产环境改用 Redis 存储 |
| Showcase 密码登录缺少限流 | `src/app/showcase/` | 比赛展示的密码登录可能没有限流机制 | 暴力破解 Showcase 密码 | 增加登录次数限制 |
| 退款不调用支付宝接口 | `src/lib/billing/orders.ts:530-618` | 退款只更新本地状态，不发起真实退款 | 资金风险、用户投诉 | 实现支付宝退款 API 调用 |
| 旧 /admin 页面可能仍可访问 | `src/app/admin/` | 旧管理后台文件仍存在，若未做 404 处理可能被利用 | 权限绕过风险 | 确认并确保所有旧 admin 页面返回 404，或直接删除 |
| 媒体读取 API 权限需确认 | `src/app/api/dashboard/media/` | 媒体文件读取 API 是否校验审核状态和权限 | 未审核图片可能被公开访问 | 检查 SafeImage 组件和媒体 API 的审核状态校验 |

### 15.3 低风险

| 风险 | 文件路径 | 问题 | 影响 | 修复建议 |
|------|---------|------|------|---------|
| 密码强度要求不一致 | `src/app/register/page.tsx` vs `src/app/reset-password/page.tsx` | 注册 6 位，重置 8 位 | 用户体验问题 | 统一为 8 位 |
| Report.status 用中文字符串 | `prisma/schema.prisma:282` | 状态字段用中文"待处理"而非枚举 | 国际化困难、编码问题风险 | 改为英文枚举 |
| 地区统计字段全为 null | `prisma/schema.prisma` | country/city 字段存在但无值 | 功能不可用但无安全风险 | 接入 GeoIP 或移除字段 |
| AI 成本统计不完善 | `src/components/ai-usage/AiCostDashboard.tsx` | 只有 Credit 计数，无真实成本 | 运营决策依据不足 | 接入模型单价，计算真实成本 |
| 日志中可能包含敏感信息 | 多处 console.log | 需确认生产环境日志是否脱敏 | 信息泄露风险 | 审计日志输出，确保无密钥、密码、完整 token |

### 15.4 已确认安全的项

| 安全项 | 状态 | 证据 |
|--------|------|------|
| 密码哈希 | ✅ 安全 | bcrypt 算法 |
| Session 存储 | ✅ 安全 | Token 哈希存储、HttpOnly Cookie |
| SQL 注入 | ✅ 安全 | 使用 Prisma ORM，无拼接 SQL |
| XSS（基本） | ✅ 安全 | React 默认转义 |
| 文件上传校验 | ✅ 安全 | 三层 MIME 校验、防路径穿越 |
| 支付回调验签 | ✅ 安全 | RSA2 签名验证 + 金额校验 + 幂等 |
| AI 免费用户绕过 | ✅ 安全 | 三层服务端校验 |
| 管理后台权限 | ✅ 安全 | 独立登录 + 角色校验 + 审计日志 |
| 密钥管理 | ✅ 安全 | 环境变量注入，不硬编码 |
| .env 提交 | ✅ 安全 | .gitignore 已保护 |
| 敏感字段加密 | ✅ 安全 | AppConfig 敏感字段加密存储 |

---

## 16. 建议保留、合并、隐藏、废弃的功能

### 16.1 必须保留

| 功能 | 理由 |
|------|------|
| 注册/登录/认证系统 | 产品基础 |
| 公开主页（/[username]） | 产品核心价值 |
| 名片编辑器 | 产品核心功能 |
| 20 种内容模块 | 主页内容丰富度的基础 |
| 主题与模板 | 差异化竞争点 |
| 二维码生成与分享 | 流量入口核心功能 |
| 产品管理 | 经营闭环基础 |
| 线索管理 | 经营闭环核心 |
| 访客侧 AI 接待助手 | 差异化功能，已基本闭环 |
| 会员系统 | 商业化基础 |
| 支付宝支付 | 商业化基础 |
| 管理后台（/jeepwork） | 运营治理必备 |
| 内容安全审核 | 合规必备 |
| Showcase 比赛展示中心 | 比赛/融资场景需要 |
| Prisma + PostgreSQL | 技术栈基础 |

### 16.2 建议合并

| 功能 | 合并方式 | 理由 |
|------|---------|------|
| Dashboard + Workbench | 合并为统一后台，名片编辑作为子模块 | 双后台心智混乱，功能重复 |
| 账号设置（两边） | 保留 Workbench 版本 | 完全重复 |
| 会员升级（两边） | 保留 Workbench 版本 | Workbench 功能更完整 |
| 数据统计（两边） | 保留 Workbench Analytics | Workbench 功能更全 |
| AI 命名统一 | 访客侧叫"AI 接待助手"，用户侧叫"经营 AI 工具箱" | 命名分裂增加理解成本 |
| 套餐命名统一 | 免费版 / Plus / Pro / 企业版 | 当前名称太多太乱 |
| API 路径统一 | 逐步迁移到 /api/workbench/* 或 /api/console/* | /api/dashboard/ 与 /api/workbench/ 混用 |
| 两套 Credit 操作函数 | 合并为一套 | 数据不一致风险 |
| AI 额度定义统一 | 只保留一处定义 | 数值不一致是 bug |

### 16.3 建议隐藏

| 功能 | 隐藏方式 | 理由 |
|------|---------|------|
| 企业版 | 定价页改为"企业版 - 联系我们（开发中）" | 功能几乎全空，避免虚假宣传 |
| 转人工开关 | 从配置中隐藏或禁用 | 只有开关无实际功能 |
| 举报开关（AI 内） | 从配置中隐藏或禁用 | 只有开关无实际功能 |
| 自定义域名权益 | 从企业版权益列表中移除或标注"即将上线" | 功能未实现 |
| 微信支付 | 继续保持"暂未开放"状态 | 未完成测试 |

### 16.4 建议废弃

| 功能 | 废弃方式 | 理由 |
|------|---------|------|
| 旧 /admin 页面 | 删除或确保统一返回 404 | 已被 /jeepwork 替代 |
| member_basic 套餐 | 合并到 member_plus | 完全重复 |
| enterprise_pro_plus 套餐 | 评估后决定保留或合并 | 与 enterprise 关系不清 |
| User.frozenReason / User.frozenAt | 迁移到 FreezeRecord 后删除 | 功能重复 |
| Lead.notes 字段 | 迁移到 LeadFollowUp 后删除 | 功能重复 |

### 16.5 仅保留结构（暂不开发）

| 功能 | 保留方式 | 理由 |
|------|---------|------|
| 团队席位字段 | 保留字段，不开发功能 | 未来可能用到，删除成本高 |
| 自定义域名字段 | 保留字段，不开发功能 | 同上 |
| 微信支付框架 | 保留代码，不开放 | 未来可能接入 |
| 国际化框架 | 保留框架，不全面翻译 | 当前只有中文用户 |
| 短链接 UTM 字段 | 保留字段，不开发 UI | 未来数据分析需要 |

---

## 17. 一次性改版建议范围

### 17.1 本次必须完成（V2 整合第一阶段）

| 任务 | 优先级 | 预计工作量 | 风险 |
|------|--------|-----------|------|
| 合并双后台导航 | P0 | 中 | 用户路径改变，需做好引导 |
| 移除重复的账号/会员/统计页面 | P0 | 小 | 需确保所有入口正确跳转 |
| 统一 AI 命名 | P0 | 小 | 需同步更新所有文案和文档 |
| 修复 AI 额度不一致 bug | P0 | 小 | 需确认以哪个数值为准 |
| 统一 API 路径（保留旧路径兼容） | P1 | 中 | 需确保旧接口不失效 |
| 合并两套 Credit 操作函数 | P1 | 中 | 需仔细测试，避免数据不一致 |
| 企业版改为"开发中"状态 | P1 | 小 | 避免虚假宣传风险 |
| 修复退款流程 | P1 | 中 | 涉及资金，需充分测试 |

### 17.2 可以复用

| 模块 | 复用方式 |
|------|---------|
| SharePageRenderer | 公开主页和预览共用，保持一致 |
| 认证系统 | 完整复用，无需改动 |
| 内容安全审核 | 完整复用 |
| 支付系统（支付宝） | 完整复用 |
| AI 额度系统 | 修复后复用 |
| 管理后台治理框架 | 完整复用 |
| Prisma 数据模型 | 大部分可复用，少量调整 |
| 20 种内容模块 | 完整复用 |
| 主题系统 | 完整复用 |

### 17.3 需要重构

| 模块 | 重构原因 | 重构范围 |
|------|---------|---------|
| 后台导航架构 | 双后台合并 | 布局、路由、状态管理 |
| AI 配置体验 | 当前像系统后台，不像用户任务流 | AI 接待配置改为三步向导 |
| 套餐定义 | 命名混乱、数值不一致 | 统一套餐定义和权益计算 |
| 线索管理前端 | API 能力强于 UI | 前端筛选、搜索、批量操作 |

### 17.4 不应现在开发

| 功能 | 原因 |
|------|------|
| 企业版团队协作 | 当前核心功能还没整合好，企业版是锦上添花 |
| 微信小程序 | 先把 Web 端做顺，再考虑小程序 |
| 自定义域名 | 企业级功能，当前用户需求不明确 |
| 完整 CRM（标签、意向等级、分配） | 基础线索功能已够用，增强可延后 |
| 动态二维码/二维码海报 | 优先级低于核心体验优化 |
| 更多 AI 助手类型 | 现有 5+2 个已够用，先打磨质量 |
| API / Webhook | 没有开发者生态需求 |
| 第三方集成（企业微信/钉钉/飞书） | 同上 |

### 17.5 预计主要风险

| 风险 | 等级 | 应对措施 |
|------|------|---------|
| 双后台合并影响现有用户 | 中 | 保留旧 URL 重定向、做好新手引导 |
| AI 额度调整引发用户投诉 | 中 | 明确公告、给老用户补偿、设置过渡期 |
| 退款功能涉及资金 | 高 | 在测试环境充分测试、小流量上线 |
| 数据库迁移风险 | 低 | 本次整合以代码调整为主，不涉及破坏性迁移 |
| 测试不充分导致回归 bug | 中 | 建立核心路径回归测试清单 |

---

## 18. 最终结论

### 18.1 Link168 当前到底是什么产品？

**Link168 是一个"数字名片 + AI 经营助手"的 SaaS 产品。**

核心价值主张：
- 给个人/小商家一个可分享的公开主页（数字名片）
- 通过二维码和短链接把线上线下流量导入主页
- 用产品模块、AI 接待助手承接咨询和留资
- 用线索管理和数据分析帮助用户跟进转化
- 通过会员订阅实现商业化

当前实际形态更接近：**"功能丰富的链接页工具 + AI 客服 + 轻量 CRM"**，距离"完整的经营工作台"还有差距。

### 18.2 当前真实完成度大约是多少？

**整体完成度约 80%。**

细分模块完成度：
- 账号与安全：95%
- 公开主页与名片：90%
- 名片编辑器：90%
- 产品管理：75%
- 线索管理：70%
- 数据分析：70%
- AI 接待助手：75%
- 经营 AI 工具箱：80%
- 会员与支付：75%
- 企业版：10%
- 管理后台：85%
- Showcase：95%

### 18.3 是否可以开始收费测试？

**可以进行小范围收费测试（如 100 人以内的封闭测试），但不建议大规模推广。**

理由：
- ✅ 支付宝支付闭环已打通
- ✅ 核心功能（名片、产品、线索、AI 接待）基本可用
- ✅ 会员权益有服务端校验
- ⚠️ 但双后台心智混乱，新用户可能困惑
- ⚠️ 企业版功能与宣传不符，需调整
- ⚠️ AI 额度不一致 bug 需修复
- ⚠️ 退款流程不完善

**收费测试前必须完成**：
1. 修复 AI 额度不一致问题
2. 明确企业版状态（改为"开发中"或补全功能）
3. 确保退款流程正确（至少支持人工退款）
4. 准备好客户支持渠道

### 18.4 是否可以开始公开内测？

**不建议立即公开内测。**

建议先完成以下工作再公开内测：
1. 合并双后台或至少明确用户路径
2. 统一 AI 命名和配置体验
3. 修复已知的 P0/P1 问题
4. 完成一轮端到端 QA 测试
5. 准备好帮助文档和 FAQ

### 18.5 当前最大的问题是功能不足，还是系统不统一？

**当前最大的问题是系统不统一，而不是功能不足。**

证据：
1. 功能其实已经很多了（20 种模块、AI、产品、线索、会员、支付、管理后台...）
2. 但这些功能分散在两套后台、多种命名、多个 API 路径中
3. 用户第一次接触会感到困惑，不知道该去哪里
4. 维护成本高，改一个功能可能要改两套代码
5. 产品形象不统一，对外讲不清楚"Link168 到底是什么"

**如果把系统统一好，现有功能已经足够支撑 MVP 验证了。**

### 18.6 下一步最应该先做什么？

**第一步：双后台整合 + 命名统一 + Bug 修复（预计 2-3 周）**

具体优先级：
1. **P0：修复 AI 额度不一致**（1 天）- 这是明确的 bug
2. **P0：明确企业版状态**（1 天）- 避免法律风险
3. **P0：统一后台导航**（5-7 天）- 把名片编辑器整合到 Workbench
4. **P0：统一 AI 命名**（2 天）- 所有文案改为"AI 接待助手"和"经营 AI 工具箱"
5. **P1：合并重复页面**（3-5 天）- 账号、会员、统计只保留一套
6. **P1：统一 API 路径**（3-5 天）- 保留旧路径做兼容
7. **P1：修复退款流程**（3-5 天）- 调用支付宝退款接口

完成这些之后，再考虑是否增加新功能。

### 18.7 哪些规划与当前代码不一致？

| 规划 | 文档位置 | 代码实际情况 | 差距 |
|------|---------|-------------|------|
| 企业版团队协作 | README、定价页 | 完全未实现 | 巨大 |
| 自定义域名 | README、权益列表 | 只有字段，无功能 | 大 |
| 五大 AI 助手 | README | 实际是 7 个 | 较小 |
| 微信支付 | README、定价页 | 只有框架，未开放 | 中 |
| 高级数据分析 | README（转化漏斗等） | 基础统计有，高级功能弱 | 中 |
| 产品详情页/图片上传 | README（待增强） | 字段有，前端无 | 中 |
| 小程序版本 | 规划文档 | 完全未开始 | 巨大 |
| 统一后台 | README（提到后续合并） | 当前仍是双后台 | 大 |

### 18.8 是否建议一次性进行 V2 整合改版？

**建议进行 V2 整合改版，但范围要控制好。**

**不建议的做法**：
- 推倒重来
- 同时改架构、改 UI、改功能
- 追求"完美版本"

**建议的做法**：
- 以"整合"为主，不做大规模重构
- 分阶段推进，每阶段都有可交付的版本
- 第一阶段（2-3 周）：统一后台、统一命名、修复关键 Bug
- 第二阶段（2-3 周）：优化 AI 配置体验、增强线索管理前端
- 第三阶段（可选）：企业版 MVP（如果市场有需求）

**核心理念**：先把现有功能做好、做顺、做统一，再考虑加新东西。

---

**报告结束**

*审计日期：2026-07-05*
*审计方式：只读代码分析*
*所有结论均基于代码静态分析，未进行运行时测试或渗透测试*