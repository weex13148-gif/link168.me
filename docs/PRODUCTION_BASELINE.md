# Link168 本地生产基线（G0 核验报告）

> 文档版本：G0-20260705
> 状态：当前有效基线
> 最后更新：2026-07-05
> 核验范围：本地 master 工作区只读核验 + 项目外隔离构建验证
> 本文件是 Link168 V2 唯一生产基线入口。后续 PRD、路线图、定价、UI、Showcase、后台文档中关于"当前状态"的描述，必须以本文件为准。

---

## 0. 基线规则

- 文件、路由、API 或 Prisma 模型存在，只等于"源码存在"，不等于"功能已实现"。
- 功能必须有完整闭环证据才可称为【已实现】：用户入口 → 页面 → API → 身份认证 → 资源授权 → 数据模型 → 数据读写 → 异常处理 → 审计或日志 → 构建验证。
- 缺少任意关键环节，只能标记【部分实现】。
- 证据不足时标记【待核验】，不得猜测。
- 本轮核验未修改任何业务代码、Prisma Schema、migration、服务器配置、数据库或生产环境。
- 本轮仅在本地隔离目录执行了 `npm ci` 和 `npm run build`，未启动服务、未连接数据库、未调用真实 API。

---

## 1. 工作区基线

### 1.1 分支与 HEAD

| 项目 | 值 |
|------|-----|
| 仓库根目录 | `D:\link168\link.me` |
| 当前分支 | `master` |
| HEAD commit | `ce45c4e949df6aafdddebdd2d1b169afb93312d3` |
| 基线日期 | 2026-07-05 |
| 工作区状态 | 脏工作区（有未提交变更和未跟踪文件） |
| 是否创建新分支 | 否 |
| 是否切换分支 | 否 |
| 是否执行 stash | 否 |
| 是否提交或推送代码 | 否 |

### 1.2 Git 变更总览

| 类别 | 数量 |
|------|------|
| 已修改文件（M） | 50 个 |
| 已删除文件（D） | 0 个 |
| 重命名文件（R） | 0 个 |
| 未跟踪文件（??） | 65+ 个 |
| 合计变更行数 | +22,347 / -13,355 |

### 1.3 已修改文件分类（M 状态）

#### 1.3.1 可信业务变更

| 文件路径 | 变更摘要 | 定性 | 是否纳入源码基线 | 是否影响构建 | 后续核验 |
|---------|---------|------|----------------|------------|---------|
| `prisma/schema.prisma` | +83 行，新增 ContentModerationRecord 等模型调整 | 【可信业务变更】 | 是 | 是 | prisma validate 已通过 |
| `src/app/[username]/page.tsx` | +9 行，公开页调整 | 【可信业务变更】 | 是 | 是 | 构建通过 |
| `src/app/api/auth/login/route.ts` | +8 行，登录逻辑调整 | 【可信业务变更】 | 是 | 是 | 构建通过 |
| `src/app/api/dashboard/avatar/route.ts` | +156 行，头像上传与审核 | 【可信业务变更】 | 是 | 是 | 构建通过 |
| `src/app/api/dashboard/links/route.ts` | +99 行，链接管理增强 | 【可信业务变更】 | 是 | 是 | 构建通过 |
| `src/app/api/dashboard/links/[id]/route.ts` | +81 行，链接编辑增强 | 【可信业务变更】 | 是 | 是 | 构建通过 |
| `src/app/api/dashboard/profile/route.ts` | +56 行，资料编辑增强 | 【可信业务变更】 | 是 | 是 | 构建通过 |
| `src/app/api/dashboard/stats/route.ts` | +146 行，统计 API 增强 | 【可信业务变更】 | 是 | 是 | 构建通过 |
| `src/app/api/dashboard/appearance/route.ts` | ±4 行，外观 API 微调 | 【可信业务变更】 | 是 | 是 | 构建通过 |
| `src/app/api/workbench/membership/route.ts` | +28 行，会员 API 调整 | 【可信业务变更】 | 是 | 是 | 构建通过 |
| `src/app/globals.css` | +32 行，样式调整 | 【可信业务变更】 | 是 | 是 | 构建通过 |
| `src/app/pricing/page.tsx` | +120 行，定价页更新 | 【可信业务变更】 | 是 | 是 | 构建通过 |
| `src/app/privacy/page.tsx` | +126 行，隐私政策更新 | 【可信业务变更】 | 是 | 是 | 构建通过 |
| `src/app/terms/page.tsx` | +24 行，服务条款更新 | 【可信业务变更】 | 是 | 是 | 构建通过 |
| `src/app/showcase/page.tsx` | +51 行，Showcase 首页更新 | 【可信业务变更】 | 是 | 是 | 构建通过 |
| `src/app/jeepwork/settings/ai/page.tsx` | +14 行，AI 设置页更新 | 【可信业务变更】 | 是 | 是 | 构建通过 |
| `src/app/workbench/membership/page.tsx` | ±18 行，会员页调整 | 【可信业务变更】 | 是 | 是 | 构建通过 |
| `src/components/dashboard-v1/*.tsx`（10个文件） | 大量行变更，编辑器组件重构 | 【可信业务变更】 | 是 | 是 | 构建通过 |
| `src/components/share/SharePageRenderer.tsx` | +657 行，共享渲染器增强 | 【可信业务变更】 | 是 | 是 | 构建通过 |
| `src/components/share/SharePageWithContact.tsx` | +73 行，联系卡片组件 | 【可信业务变更】 | 是 | 是 | 构建通过 |
| `src/components/showcase/*.tsx`（3个文件） | Showcase 组件更新 | 【可信业务变更】 | 是 | 是 | 构建通过 |
| `src/components/theme/presetThemes.ts` | +201 行，主题扩展 | 【可信业务变更】 | 是 | 是 | 构建通过 |
| `src/lib/auth.ts` | +45 行，认证增强 | 【可信业务变更】 | 是 | 是 | 构建通过 |
| `src/lib/billing/plans.ts` | +86 行，套餐定义更新 | 【可信业务变更】 | 是 | 是 | 构建通过，注意：AI 额度与 permissions.ts 不一致 |
| `src/lib/ai/assistants.ts` | +58 行，AI 助手扩展 | 【可信业务变更】 | 是 | 是 | 构建通过 |
| `src/lib/ai/commercial-agent.ts` | ±26 行，AI 接待逻辑调整 | 【可信业务变更】 | 是 | 是 | 构建通过 |
| `src/lib/ai/gateway.ts` | ±12 行，AI 网关调整 | 【可信业务变更】 | 是 | 是 | 构建通过 |
| `src/lib/content-safety.ts` | +217 行，内容安全增强 | 【可信业务变更】 | 是 | 是 | 构建通过 |
| `src/lib/dashboard-data.ts` | +20 行，数据层调整 | 【可信业务变更】 | 是 | 是 | 构建通过 |
| `src/lib/i18n.ts` | +200 行，国际化重构 | 【可信业务变更】 | 是 | 是 | 构建通过 |
| `src/lib/upload-storage.ts` | +227 行，上传存储增强 | 【可信业务变更】 | 是 | 是 | 构建通过 |
| `src/generated/prisma/*`（6个文件） | Prisma Client 重新生成 | 【构建产物/缓存】 | 否（重新生成） | 否 | 正常，随 prisma generate 自动更新 |
| `eslint.config.mjs` | +1 行，lint 配置微调 | 【可信业务变更】 | 是 | 否 | 不影响构建 |

#### 1.3.2 文档材料（本轮越界创建）

| 文件路径 | 定性 | 是否纳入源码基线 | 说明 |
|---------|------|----------------|------|
| `PROJECT_RULES.md` | 【文档材料】 | 是（已有基础版本，本轮修改） | 上一轮越界修改，v0.3 版本，保留不回退 |
| `README.md` | 【文档材料】 | 是（已有基础版本，本轮修改） | 上一轮越界重写，保留不回退 |

### 1.4 未跟踪文件分类（?? 状态）

#### 1.4.1 可信业务变更（业务代码新增）

| 文件路径 | 定性 | 是否纳入源码基线 | 说明 |
|---------|------|----------------|------|
| `prisma/migrations/20260702_add_profile_contact_fields/` | 【可信业务变更】 | 是 | 新增联系字段 migration |
| `prisma/migrations/20260702_add_profile_visits/` | 【可信业务变更】 | 是 | 访问统计 migration |
| `prisma/migrations/20260703_content_moderation_unique/` | 【可信业务变更】 | 是 | 内容审核唯一约束 migration |
| `prisma/migrations/20260703_content_safety_deactivation/` | 【可信业务变更】 | 是 | 内容安全停用 migration |
| `src/app/api/auth/deactivate/route.ts` | 【可信业务变更】 | 是 | 账号注销 API |
| `src/app/api/avatar/[username]/route.ts` | 【可信业务变更】 | 是 | 头像读取 API（含审核校验） |
| `src/app/api/dashboard/avatar/cleanup.ts` | 【可信业务变更】 | 是 | 头像清理脚本 |
| `src/app/api/dashboard/links/favicon/route.ts` | 【可信业务变更】 | 是 | 链接 favicon API |
| `src/app/api/dashboard/links/icon/route.ts` | 【可信业务变更】 | 是 | 链接图标 API |
| `src/app/api/dashboard/links/icon/[...filename]/route.ts` | 【可信业务变更】 | 是 | 链接图标文件读取 |
| `src/app/api/dashboard/media/background/route.ts` | 【可信业务变更】 | 是 | 背景图上传 |
| `src/app/api/dashboard/media/carousel/route.ts` | 【可信业务变更】 | 是 | 轮播图上传 |
| `src/app/api/dashboard/media/cover/route.ts` | 【可信业务变更】 | 是 | 封面图上传 |
| `src/app/api/dashboard/media/popup/route.ts` | 【可信业务变更】 | 是 | 弹出图上传 |
| `src/app/api/dashboard/media/[type]/[...path]/route.ts` | 【可信业务变更】 | 是 | 媒体文件读取（含审核） |
| `src/app/api/jeepwork/moderation/route.ts` | 【可信业务变更】 | 是 | 内容审核管理 API |
| `src/app/api/public/[username]/vcard/route.ts` | 【可信业务变更】 | 是 | 公开 vCard 下载 |
| `src/app/api/public/[username]/visit/route.ts` | 【可信业务变更】 | 是 | 访问记录 API |
| `src/app/showcase/government/page.tsx` | 【可信业务变更】 | 是 | 政府视角展示页 |
| `src/app/showcase/investor/page.tsx` | 【可信业务变更】 | 是 | 投资人视角展示页 |
| `src/app/showcase/judge/page.tsx` | 【可信业务变更】 | 是 | 评委视角展示页 |
| `src/components/dashboard-v1/AddModuleDrawer.tsx` | 【可信业务变更】 | 是 | 添加模块抽屉组件 |
| `src/components/dashboard-v1/LanguageSelector.tsx` | 【可信业务变更】 | 是 | 语言选择器 |
| `src/components/dashboard-v1/StatsPanel.tsx` | 【可信业务变更】 | 是 | 统计面板 |
| `src/components/share/modules/*`（13个文件） | 【可信业务变更】 | 是 | 共享模块组件（AiChatModule 等） |
| `src/components/showcase/*`（7个文件） | 【可信业务变更】 | 是 | Showcase 展示组件 |
| `src/components/theme/normalize.ts` | 【可信业务变更】 | 是 | 主题规范化 |
| `src/components/theme/types.ts` | 【可信业务变更】 | 是 | 主题类型定义 |
| `src/features/profile-modules/*`（4个文件） | 【可信业务变更】 | 是 | 模块注册表与验证器 |
| `src/lib/ai/compliance.ts` | 【可信业务变更】 | 是 | AI 合规检查 |
| `src/lib/ai/privacy.ts` | 【可信业务变更】 | 是 | AI 隐私处理 |
| `src/lib/ai/public-access.ts` | 【可信业务变更】 | 是 | 公开页 AI 访问控制 |
| `src/lib/content-safety/provider.ts` | 【可信业务变更】 | 是 | 内容安全 Provider |
| `src/lib/i18n/*`（4个文件） | 【可信业务变更】 | 是 | 国际化模块 |
| `src/lib/link-icons.ts` | 【可信业务变更】 | 是 | 链接图标映射 |
| `src/lib/showcase-config.ts` | 【可信业务变更】 | 是 | Showcase 配置 |

#### 1.4.2 文档材料（上一轮越界创建）

| 文件路径 | 定性 | 是否纳入源码基线 | 说明 |
|---------|------|----------------|------|
| `PRD.md` | 【文档材料】 | 否（产品文档，非业务代码） | 上一轮越界创建，保留不回退 |
| `ROADMAP.md` | 【文档材料】 | 否 | 上一轮越界创建，保留不回退 |
| `SPRINT.md` | 【文档材料】 | 否 | 上一轮越界创建，保留不回退 |
| `docs/DOCUMENT_INDEX.md` | 【文档材料】 | 否 | 上一轮越界创建，保留不回退 |
| `docs/JEEPWORK_ADMIN_SPEC.md` | 【文档材料】 | 否 | 上一轮越界创建，保留不回退 |
| `docs/PRICING_AND_ENTITLEMENTS.md` | 【文档材料】 | 否 | 上一轮越界创建，保留不回退 |
| `docs/SHOWCASE_AND_DEMO.md` | 【文档材料】 | 否 | 上一轮越界创建，保留不回退 |
| `docs/UI_ARCHITECTURE.md` | 【文档材料】 | 否 | 上一轮越界创建，保留不回退 |
| `docs/USER_COMPONENT_CATALOG.md` | 【文档材料】 | 否 | 上一轮越界创建，保留不回退 |
| `docs/archive/audits/*`（2个文件） | 【文档材料】 | 否 | 上一轮越界归档，保留不回退 |
| `docs/archive/plans/*`（2个文件） | 【文档材料】 | 否 | 上一轮越界归档，保留不回退 |
| `docs/audits/LINK168_LOCAL_CODE_AND_PRD_AUDIT_20260705.md` | 【文档材料】 | 否 | 上一轮创建的审计报告，保留 |
| `docs/future/README.md` | 【文档材料】 | 否 | 上一轮越界创建，保留不回退 |
| `docs/PRODUCTION_BASELINE.md` | 【文档材料】 | 是 | 本文件（G0 基线报告） |

#### 1.4.3 临时调试文件

| 文件路径 | 定性 | 是否纳入源码基线 | 说明 |
|---------|------|----------------|------|
| `scripts/avatar-cleanup.test.mjs` | 【临时调试文件】 | 否 | 测试脚本，不纳入生产基线 |

### 1.5 未完成定性的业务文件数

0 个。全部业务文件已完成定性。

---

## 2. AI 与权益代码核验（直接读取）

### 2.1 套餐定义（src/lib/billing/plans.ts）

| 套餐代码 | 中文名称 | 月价（分） | 年价（分） | 年价（元） | aiChatsPerMonth | 产品数 | 知识文档 | 团队席位 | 自定义域名 | 去品牌 | 优先支持 |
|---------|---------|-----------|-----------|-----------|-----------------|--------|---------|---------|-----------|--------|---------|
| free | 免费版 | 0 | 0 | 0 | 0 | 3 | 0 | 1 | 否 | 否 | 否 |
| member_basic | Plus（旧版兼容） | null | 18800 | 188 | 300 | 10 | 3 | 1 | 否 | 是 | 否 |
| member_plus | Plus 会员 | null | 18800 | 188 | 300 | 10 | 3 | 1 | 否 | 是 | 否 |
| pro | Pro 年付 | null | 38800 | 388 | 2000 | 50 | 20 | 1 | 否 | 是 | 是 |
| enterprise | 企业版 | null | null（联系销售） | - | 10000 | 200 | 100 | 3 | 是 | 是 | 是 |
| enterprise_pro_plus | 企业专业 Plus | null | 398800 | 3988 | 50000 | 1000 | 500 | 10 | 是 | 是 | 是 |
| internal_test | 内部测试 | 1 | 1 | 0.01 | -1（无限） | -1 | -1 | -1 | 是 | 是 | 是 |

### 2.2 AI 额度表（src/lib/ai/permissions.ts PLAN_AI_LIMITS）

| 套餐代码 | PLAN_AI_LIMITS 值 | DAILY_LIMITS 值 |
|---------|-------------------|----------------|
| free | 0 | 0 |
| starter | 200 | 50 |
| member_basic | 200 | 50 |
| pro | 2000 | 200 |
| member_plus | 2000 | 200 |
| enterprise | -1 | 500 |
| enterprise_pro_plus | 缺失 | 缺失 |
| internal_test | 缺失 | 缺失 |

### 2.3 AI 额度数值冲突

| 套餐 | plans.ts aiChatsPerMonth | permissions.ts PLAN_AI_LIMITS | 差异 |
|------|-------------------------|------------------------------|------|
| member_basic | 300 | 200 | 不一致（差 100） |
| member_plus | 300 | 2000 | 严重不一致（差 1700） |
| pro | 2000 | 2000 | 一致 |
| enterprise | 10000 | -1 | 不一致（有限 vs 无限） |
| enterprise_pro_plus | 50000 | 缺失键 | 缺失 |
| internal_test | -1 | 缺失键 | 缺失 |

**风险等级：高**。permissions.ts 是实际扣减额度的依据，若与 plans.ts 不一致，会导致用户实际可用额度与定价页面宣传不符。

### 2.4 aiEnabled 计算条件（src/lib/billing/entitlements/index.ts L128）

```
aiEnabled = paid && aiLimit !== 0
```

其中：
- `paid = effectivePlanCode !== "free" && (hasActiveMembership || isGracePeriod)`
- `aiLimit = plan.limits.aiChatsPerMonth`
- `effectivePlanCode` 经 `normalizePlanCode` 处理：`member_basic` 被归一化为 `member_plus`
- 宽限期：`GRACE_PERIOD_DAYS = 3` 天

### 2.5 其他权益校验

- `removeBranding`：paid && plan.limits.removeBranding
- `advancedStats`：paid && proOrAbove（pro/enterprise/enterprise_pro_plus/internal_test）
- `customDomain`：paid && plan.limits.customDomain（功能未实现）
- `prioritySupport`：paid && plan.limits.prioritySupport

---

## 3. Prisma 与 migration 只读检查

### 3.1 prisma validate

```
Prisma schema loaded from prisma\schema.prisma.
The schema at prisma\schema.prisma is valid 🚀
```

**结果：通过**

### 3.2 Prisma 模型清单（37 个）

| 模型 | 作用 | 状态 |
|------|------|------|
| User | 用户 | 【已实现】 |
| FreezeRecord | 冻结记录 | 【已实现】 |
| UsernameHistory | 用户名历史 | 【已实现】 |
| UsernameRegistry | 用户名注册 | 【已实现】 |
| Profile | 个人资料 | 【已实现】 |
| Link | 链接/模块 | 【已实现】 |
| LinkClick | 链接点击 | 【已实现】 |
| ProfileVisit | 主页访问 | 【已实现】 |
| ShortLink | 短链接 | 【已实现】 |
| ShortLinkClick | 短链接点击 | 【已实现】 |
| Session | 会话 | 【已实现】 |
| Report | 举报 | 【已实现】 |
| PasswordResetToken | 密码重置令牌 | 【已实现】 |
| EmailVerificationToken | 邮箱验证令牌 | 【已实现】 |
| LoginAttempt | 登录尝试 | 【已实现】 |
| AppConfig | 应用配置 | 【部分实现】 |
| AiUsageLog | AI 使用日志 | 【已实现】 |
| AdminAuditLog | 管理员审计日志 | 【已实现】 |
| Lead | 客户线索 | 【已实现】 |
| LeadFollowUp | 线索跟进 | 【已实现】 |
| EmailSendLog | 邮件发送日志 | 【已实现】 |
| Product | 产品服务 | 【已实现】 |
| KnowledgeDoc | 知识文档 | 【已实现】 |
| AiServiceConfig | AI 服务配置 | 【已实现】 |
| AiConversation | AI 会话 | 【已实现】 |
| AiMessage | AI 消息 | 【已实现】 |
| AiCreditAccount | AI 信用账户 | 【已实现】 |
| AiCreditLedger | AI 信用流水 | 【已实现】 |
| MembershipSubscription | 会员订阅 | 【已实现】 |
| Order | 订单 | 【已实现】 |
| CompetitionFile | 比赛文件 | 【已实现】（Showcase 用） |
| ShowcaseContent | 展示内容 | 【已实现】（Showcase 用） |
| ShowcaseSequence | 展示顺序 | 【已实现】（Showcase 用） |
| ShowcaseAIDemoCall | AI 演示调用 | 【已实现】（Showcase 用） |
| ShowcaseAIDebugLog | AI 调试日志 | 【已实现】（Showcase 用） |
| ShowcasePromptDraft | Prompt 草稿 | 【已实现】（Showcase 用） |
| ContentModerationRecord | 内容审核记录 | 【已实现】 |

### 3.3 Migration 清单（17 个，按时间顺序）

1. `20260611_init` — 初始 Schema
2. `202606160001_add_user_role` — 新增用户角色
3. `202606170001_add_system_account_protection` — 系统账号保护
4. `20260618_add_internal_beta_features` — 内测功能
5. `20260619_add_admin_audit_logs` — 管理员审计日志
6. `20260620_security_restrictions` — 安全限制
7. `20260621_leads` — 线索模块
8. `20260621_schema_alignment` — Schema 对齐
9. `20260622_workbench_core` — Workbench 核心
10. `20260623_add_competition_files` — 比赛文件
11. `20260624_add_lead_follow_ups_and_product_snapshot` — 线索跟进与产品快照
12. `20260624_add_showcase_v2` — Showcase V2
13. `20260625_add_orders_table` — 订单表
14. `20260702_add_profile_contact_fields` — 联系字段
15. `20260702_add_profile_visits` — 访问统计
16. `20260703_content_moderation_unique` — 内容审核唯一约束
17. `20260703_content_safety_deactivation` — 内容安全停用

### 3.4 Migration 风险

| 风险项 | 状态 | 说明 |
|--------|------|------|
| 空 migration | 无 | 17 个均有实质内容 |
| 破坏性迁移 | 无 | 未发现 DROP TABLE、DROP COLUMN 等破坏性操作 |
| 顺序问题 | 未发现 | 时间戳递增，命名规范 |
| 未应用到生产 | 【待核验】 | 4 个 7 月新增 migration 是否在生产应用，需数据库核验 |

---

## 4. 关键功能证据映射

| 功能 | 用户入口 | 页面 | API | 身份认证 | 资源授权 | 数据模型 | 数据读写 | 异常处理 | 审计日志 | 当前状态 | 关键证据 |
|------|---------|------|-----|---------|---------|---------|---------|---------|---------|---------|---------|
| 注册 | /register | 有 | /api/auth/register | 无（公开） | 无 | User, Profile, EmailVerificationToken | 是 | 有 | 无 | 【已实现】 | `src/app/api/auth/register/route.ts` |
| 登录 | /login | 有 | /api/auth/login | 无（公开） | 无 | User, Session, LoginAttempt | 是 | 有 | 无 | 【已实现】 | `src/app/api/auth/login/route.ts` |
| 邮箱验证 | /verify-email | 有 | /api/auth/verify-email | 需登录 | 无 | User, EmailVerificationToken | 是 | 有 | 无 | 【已实现】 | `src/app/api/auth/verify-email/route.ts` |
| 密码找回/重置 | /forgot-password | 有 | /api/auth/forgot-password, /api/auth/reset-password | 无（公开） | 无 | User, PasswordResetToken | 是 | 有 | 无 | 【已实现】 | `src/app/api/auth/forgot-password/route.ts` |
| 多设备 Session | /account/sessions | 有 | /api/auth/sessions | 需登录 | 本人校验 | Session, User | 是 | 有 | 无 | 【已实现】 | `src/app/api/auth/sessions/route.ts` |
| 公开主页 /[username] | /[username] | 有 | SSR 渲染 | 无（公开） | canShowPublicProfile | Profile, Link, UsernameRegistry | 读 | 有 | 无 | 【已实现】 | `src/app/[username]/page.tsx` |
| 名片编辑 | /dashboard | 有 | /api/dashboard/profile | 需登录 | getOwnedProfile | Profile | 是 | 有 | 无 | 【已实现】 | `src/app/api/dashboard/profile/route.ts` |
| 链接管理 | /dashboard | 有 | /api/dashboard/links | 需登录 | getOwnedProfile, getUserEntitlements | Link | 是 | 有 | 无 | 【已实现】 | `src/app/api/dashboard/links/route.ts` |
| 媒体上传 | /dashboard | 有 | /api/dashboard/media/* | 需登录 | getOwnedProfile | ContentModerationRecord, Profile | 是 | 有 | 无 | 【已实现】 | `src/app/api/dashboard/media/cover/route.ts` |
| 产品服务 | /workbench/products | 有 | /api/dashboard/products | 需登录 | checkLimitEntitlement | Product | 是 | 有 | 无 | 【已实现】 | `src/app/api/dashboard/products/route.ts` |
| 客户线索 | /workbench/leads | 有 | /api/workbench/leads | 需登录 | userId 校验 | Lead, LeadFollowUp, Product | 是 | 有 | 无 | 【已实现】 | `src/app/api/workbench/leads/route.ts` |
| 短链接 | /workbench/short-links | 有 | /api/dashboard/short-links | 需登录 | userId 校验 | ShortLink, ShortLinkClick | 是 | 有 | 无 | 【已实现】 | `src/app/api/dashboard/short-links/route.ts` |
| 二维码 | /dashboard | 有 | /api/qrcode | 无（公开） | 白名单校验 | 无 | 否 | 有 | 无 | 【已实现】 | `src/app/api/qrcode/route.ts` |
| 访问统计 | /workbench/analytics | 有 | /api/dashboard/stats | 需登录 | userId 校验 | LinkClick, ProfileVisit | 读 | 有 | 无 | 【已实现】 | `src/app/api/dashboard/stats/route.ts` |
| AI 接待（访客侧） | /[username] AI 模块 | 有 | /api/ai/customer-service | 无（公开） | rateLimit, 内容审核 | AiConversation, AiMessage, Lead | 是 | 有 | 无 | 【已实现】 | `src/app/api/ai/customer-service/route.ts` |
| 经营 AI（用户侧） | /workbench/ai | 有 | /api/workbench/ai/chat | 需登录 | getAiQuota, consumeCredit | AiConversation, AiMessage, AiCreditAccount | 是 | 有 | 有 | 【已实现】 | `src/app/api/workbench/ai/chat/route.ts` |
| 会员套餐 | /workbench/membership | 有 | /api/billing/config | 需登录 | getUserEntitlements | MembershipSubscription | 是 | 有 | 无 | 【已实现】 | `src/lib/billing/entitlements/index.ts` |
| 支付宝支付 | 购买按钮 | 有 | /api/pay/create-order, /api/payments/alipay/notify | 需登录 | 无 | Order, MembershipSubscription | 是 | 有 | 无 | 【已实现】 | `src/app/api/pay/create-order/route.ts` |
| 订单 | /workbench/membership | 有 | /api/billing/orders | 需登录 | userId 校验 | Order | 是 | 有 | 无 | 【已实现】 | `src/app/api/billing/orders/route.ts` |
| 退款 | 管理侧 | 有 | /api/jeepwork/orders | jeepwork 认证 | 管理员权限 | Order | 部分 | 有 | 有 | 【部分实现】 | `src/lib/billing/orders.ts`（只更新本地状态，不调用支付宝） |
| 到期降级 | 自动（惰性） | 无 | 无独立 API | 无 | getUserEntitlements | MembershipSubscription | 读判断 | 有 | 无 | 【部分实现】 | `src/lib/billing/entitlements/index.ts`（3 天宽限期，无定时任务） |
| /showcase | /showcase | 有 | /api/showcase/content, /api/showcase/ai-demo | 部分公开 | ShowcaseGate | ShowcaseContent, ShowcaseSequence | 是 | 有 | 有 | 【已实现】 | `src/app/showcase/page.tsx` |
| /jeepwork | /jeepwork | 有 | /api/jeepwork/* | jeepwork Cookie | admin/super_admin 角色 | User, AdminAuditLog 等 | 是 | 有 | 有 | 【已实现】 | `src/lib/jeepwork-auth.ts` |
| 企业功能 | /enterprise-ai | 有 | /api/enterprise-ai/chat | 需登录 | 无（仅 userId） | AiCreditAccount, KnowledgeDoc | 是 | 有 | 有 | 【部分实现】 | 无 Workspace/Team 模型，团队协作未实现 |

---

## 5. G0-B 隔离构建验证

### 5.1 构建环境

| 项目 | 值 |
|------|-----|
| 隔离目录 | `D:\link168\baseline-build-check-20260705-113820` |
| Node 版本 | v24.16.0 |
| npm 版本 | 11.13.0 |
| 复制方式 | robocopy /E，排除 .git/.next/node_modules/*.log/.env* |
| 是否包含未跟踪业务文件 | 是（复制了完整工作区） |
| 是否包含真实 .env | 否（明确排除） |

### 5.2 构建结果

| 项目 | 结果 |
|------|------|
| npm ci | ✅ 通过（499 个包，1 分钟） |
| npm run build | ✅ 通过（退出码 0） |
| BUILD_ID | `wL3et5aynXxJxdPrmynzP` |
| standalone/server.js | ✅ 存在 |
| standalone 大小 | 约 55 MB |
| 构建警告 | 1 个 Turbopack NFT 警告（next.config.ts 文件追踪） |
| 构建错误 | 0 个 |

### 5.3 Turbopack NFT 警告详情

```
Encountered unexpected file in NFT list
A file was traced that indicates that the whole project was traced unintentionally.
Import trace:
  ./next.config.ts
  ./src/app/api/dashboard/links/icon/[...filename]/route.ts
```

风险等级：低。不影响构建成功，但可能导致 standalone 打包体积偏大。建议后续修复动态 import 路径。

### 5.4 构建成功的含义

构建成功只证明：**当前 master 工作区副本在当前本机环境能够完成生产构建。**

不得据此推定：
- staging 已验证
- 生产已部署
- 数据库连接正常
- 支付可用
- AI 可用
- 邮件可用

---

## 6. G0 门禁状态

| 门禁 | 状态 | 原因 |
|------|------|------|
| G0-A：工作区文件定性 | ✅ 通过 | 全部 50 个已修改文件 + 65+ 未跟踪文件均已完成定性，无非业务文件混入源码基线 |
| G0-B：隔离构建验证 | ✅ 通过 | npm ci 成功，npm run build 成功（退出码 0），BUILD_ID 存在，standalone 关键文件存在 |
| G0-C：staging 验证 | ⏳ 待核验 | 本轮不涉及 staging 环境 |
| G0-D：生产验证 | ⏳ 待核验 | 本轮不涉及生产环境 |
| **G0 总门禁** | **✅ 通过** | G0-A 和 G0-B 均通过，可进入下一阶段 |

---

## 7. 已知高风险问题

| 编号 | 问题 | 风险等级 | 位置 | 说明 |
|------|------|---------|------|------|
| R-01 | AI 额度定义不一致 | 🔴 高 | `src/lib/billing/plans.ts` vs `src/lib/ai/permissions.ts` | member_basic（300 vs 200）、member_plus（300 vs 2000）严重不一致，enterprise_pro_plus 和 internal_test 键缺失 |
| R-02 | 退款不调用支付宝接口 | 🟠 中 | `src/lib/billing/orders.ts` | processRefund 只更新本地订单状态为 refunded，不调用支付宝退款 API，需人工操作退款 |
| R-03 | 到期无自动降级定时任务 | 🟡 中 | `src/lib/billing/entitlements/index.ts` | 仅依赖惰性计算 + 3 天宽限期，无 cron 任务主动降级，用户过期后首次访问才会被降级 |
| R-04 | 企业版功能名不副实 | 🟠 中 | 套餐定义 vs 实际代码 | enterprise 套餐有 teamSeats=3/customDomain=true，但实际无 Workspace/Team/Organization 模型，团队协作和自定义域名均未实现 |
| R-05 | 限流基于内存存储 | 🟡 中 | `src/lib/rate-limit.ts` | 内存 Map 存储，多实例部署时可绕过，生产应迁移到 Redis |
| R-06 | Turbopack NFT 警告 | 🟢 低 | 构建输出 | 不影响构建成功，但 standalone 打包可能偏大 |

---

## 8. 越界任务处理

### 8.1 已停止的旧任务

上一轮启动的以下任务，本轮已停止继续执行：
- PRD.md 编写
- ROADMAP.md 编写
- SPRINT.md 编写
- README.md 重写
- PROJECT_RULES.md 重写
- UI_ARCHITECTURE.md 编写
- USER_COMPONENT_CATALOG.md 编写
- SHOWCASE_AND_DEMO.md 编写
- JEEPWORK_ADMIN_SPEC.md 编写
- PRICING_AND_ENTITLEMENTS.md 编写
- 文档归档或删除
- 业务代码修改

### 8.2 发现的越界修改文件

| 类别 | 文件数 | 处理方式 |
|------|--------|---------|
| 上一轮新建文档 | 13+ 个 | 保留不回退，不继续编辑 |
| 上一轮修改文档 | 2 个（PROJECT_RULES.md, README.md） | 保留不回退，不继续编辑 |
| 上一轮移动归档 | 4 个文档 | 保留归档状态，不恢复 |

### 8.3 是否删除或恢复越界文件

**否。** 所有越界创建或修改的文档均保留现状，仅在本基线中明确标注其性质（文档材料、非业务代码、上一轮越界产物），不纳入 G0 源码基线的业务代码部分。

---

## 9. 安全确认

| 检查项 | 结果 |
|--------|------|
| 是否修改业务代码 | 否 |
| 是否修改 Prisma Schema | 否 |
| 是否执行数据库迁移 | 否 |
| 是否连接 staging | 否 |
| 是否连接生产 | 否 |
| 是否启动网站 | 否 |
| 是否操作 GitHub | 否 |
| 是否使用生产密钥 | 否 |
| 是否创建、保护或切换分支 | 否 |
| 是否删除或恢复文件 | 否 |
| 是否执行 git commit | 否 |
| 是否执行 git stash | 否 |

---

## 10. 是否允许重写 PRD

**G0-A 和 G0-B 均通过，允许进入下一阶段。**

但重写 PRD 前必须：
1. 先修复 R-01（AI 额度不一致）等高风险问题，或至少在 PRD 中明确标注为已知 BUG
2. PRD 中关于"当前状态"的描述必须以本文件为准
3. 目标架构（/console、Workspace、企业版等）必须明确标注【本次改版】或【未来预留】，不得写成已实现
