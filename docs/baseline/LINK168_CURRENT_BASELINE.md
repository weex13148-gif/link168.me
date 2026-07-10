# Link168 当前基线报告

> 生成时间：2026-07-06
> 生成方式：只读盘点，未修改任何业务代码
> Git HEAD：`ce45c4e`，分支 `master`

---

## 一、项目定位

Link168 = 可装修的智能名片 + AI 接待 + 客户线索收集 + 访问数据分析。

技术栈：Next.js 16.2.9 (Turbopack) + React 19 + TypeScript + Prisma + PostgreSQL + Tailwind CSS v4。

外部 API 状态：
- 阿里云邮件推送：代码结构完整（`src/lib/mail.ts`），未配置 SMTP 时不伪造成功。
- 阿里百炼 AI：代码结构完整（`src/lib/ai/gateway.ts`），未配置时安全失败。
- 支付宝收款：代码结构完整（`src/lib/billing/`），沙箱测试可用，真实支付待部署。

---

## 二、模块盘点

### 2.1 已完成模块

| 模块 | 关键文件 | 状态 |
|------|---------|------|
| 注册/登录/邮箱验证 | `src/app/api/auth/*`、`src/lib/auth.ts`、`src/lib/mail.ts` | 功能完整，依赖 SMTP 配置 |
| 密码重置 | `src/app/api/auth/forgot-password`、`reset-password` | 功能完整 |
| 会话管理 | `src/lib/auth.ts`（DB Session + cookie） | 功能完整，30天有效期 |
| Onboarding 向导 | `src/app/onboarding/page.tsx`、`src/components/onboarding/` | 8步流程完整 |
| 名片装修器 | `src/app/dashboard/page.tsx`、`src/components/dashboard-v1/` | 7面板完整 |
| 组件 CRUD | `src/app/api/dashboard/links/*` | 23种模块，创建/编辑/删除/排序/隐藏闭环 |
| 组件渲染 | `src/components/share/SharePageRenderer.tsx` | 手机预览与公开页共用 |
| 公开主页 | `src/app/[username]/page.tsx` | isPublic+冻结+封禁三层检查 |
| 文件上传 | `src/app/api/dashboard/avatar/`、`media/` | MIME三层校验+路径穿越防护 |
| vCard 下载 | `src/app/api/public/[username]/vcard/route.ts` | 基本可用，有缺陷 |
| 短链接 | `src/app/s/[slug]/route.ts` | 基础功能完整 |
| Lead 数据流 | `src/app/api/contact/`、`src/app/api/workbench/leads/` | 5种sourceComponent闭环 |
| 产品 CRUD | `src/app/api/dashboard/products/` | 完整 |
| 会员套餐 | `src/lib/billing/plans.ts` | 单一数据源 |
| 定价页 | `src/app/pricing/page.tsx` | 统一数据源 |
| 管理后台 | `src/app/jeepwork/` | 21个页面，独立鉴权 |
| 展示页 | `src/app/showcase/` | 3种视角 |
| 缓存失效 | `src/lib/cache/public-profile.ts` | revalidatePath 精准失效 |

### 2.2 代码路径存在但未真实验收

| 模块 | 说明 |
|------|------|
| AI 接待 | `src/lib/ai/commercial-agent.ts` 调用百炼，未真实联调 |
| 支付宝支付 | `src/lib/billing/payments.ts` 创建订单，未真实联调 |
| 退款 | `src/lib/billing/orders.ts` processRefund 仅更新本地状态，未调支付宝退款接口 |
| 邮件发送 | `src/lib/mail.ts` nodemailer SMTP，未配置时不发送 |
| 内容审核 | `src/lib/content-safety.ts` LocalHeuristicProvider 对图片返回 pending_manual_review |

### 2.3 半完成

| 模块 | 缺失部分 |
|------|---------|
| `/console` V2 控制台 | 仅有首页，PRD规划的13个子路由未实现 |
| `/workbench/enterprise` | 企业工作空间几乎全为空壳 |
| `/jeepwork/membership`、`/jeepwork/orders` | API存在但前端page.tsx缺失 |
| 30天未验证提醒 | 实为"冻结"非"提醒"，无自动cron |
| `contacts_only` 可见性 | 前后端等同于 private，无认证白名单机制 |
| 短链接地理位置 | country/city 始终为 null |

### 2.4 明确缺陷

| 编号 | 缺陷 | 严重度 |
|------|------|--------|
| D1 | Onboarding 页面无登录守卫 | 中 |
| D2 | 密码长度策略不一致（注册≥6 vs 重置≥8） | 中 |
| D3 | vCard "Profile is not public" 泄露账号状态 | P1 |
| D4 | vCard revalidate=0 与 force-dynamic 叠加 | P2 |
| D5 | vCard username 未 trim() | P3 |
| D6 | vCard contactVisibility=private 不返回404 | P1 |
| D7 | 链接图标审核状态未持久化（P0） | P0 |
| D8 | products DELETE/POST/PUT 缺失 revalidatePath | 高 |
| D9 | AI额度 plans.ts 与 permissions.ts 不一致 | P0 |
| D10 | 三后台并存，无重定向 | P0 |
| D11 | DashboardFrame 导航未接入共享配置 | P1 |
| D12 | WorkbenchShell 移动端无底部导航 | P1 |
| D13 | reorder 非事务批量更新 | 中 |
| D14 | /api/contact 频率限制基于内存Map | 中 |
| D15 | Offer有效期仅前端校验 | 中 |
| D16 | 短链接不检查owner冻结/封禁状态 | P2 |
| D17 | /api/avatar/[username] 缺少 nosniff 头 | P2 |
| D18 | 退款未调用支付宝接口 | P0（待部署） |
| D19 | 无自动到期降级cron | P0 |
| D20 | /admin 6个页面全部404未清理 | P1 |

### 2.5 外部 API 待服务器配置

| API | 配置入口 | 本地行为 |
|-----|---------|---------|
| 阿里云邮件推送 | `src/lib/mail.ts` 双源（DB app-config + 环境变量） | 未配置返回 SMTP_NOT_CONFIGURED |
| 阿里百炼 | `src/lib/ai/gateway.ts` 环境变量 BAILIAN_* | 未配置安全失败 |
| 支付宝收款 | `src/lib/billing/payments.ts` 环境变量 ALIPAY_* | 沙箱测试可用 |

### 2.6 重复实现

| 重复项 | 位置 | 说明 |
|--------|------|------|
| 套餐展示逻辑 | `/pricing` 与 `/workbench/membership` | 未抽取共享组件 |
| AI额度定义 | `plans.ts` vs `permissions.ts` | 应以 plans.ts 为唯一源 |
| shop vs product-card | registry.ts | 概念重叠 |
| PublicProductsSection vs ProductCardModule | share/ | 可能重复展示同一产品 |

### 2.7 历史兼容实现

| 项 | 说明 |
|----|------|
| `/admin` 6个页面 | 全部 notFound()，历史废弃 |
| `sendVerificationEmailWithPolicy` | 孤儿代码，链接式验证邮件策略无路由调用 |
| `member_basic` 套餐 | legacy 标记 |
| `internal_test` 套餐 | 仅 super_admin |
| 旧版 notes 追加文本 | LeadsClient parseLegacyNotes 兼容 |

---

## 三、路由结构总览

### 公开页面（无需登录）
- `/` 首页
- `/[username]` 公开名片
- `/login`、`/register`、`/forgot-password`、`/reset-password`、`/verify-email`
- `/pricing`、`/contact`、`/help`、`/report`
- `/privacy`、`/terms`、`/refund-policy`、`/membership-agreement`、`/ai-disclaimer`
- `/onboarding`、`/account-cancellation`

### 用户后台
- `/console` V2控制台（仅首页）
- `/dashboard` V1名片编辑器
- `/workbench` V1工作台（13个子页面）
- `/workbench/{leads,products,analytics,short-links,membership,account,ai,knowledge,notifications,enterprise,ai-service,card}`

### 管理后台
- `/jeepwork` 独立鉴权（21个页面）

### 展示
- `/showcase` 3种视角（judge/investor/government）

### next.config 关键配置
- `output: "standalone"`
- `cacheComponents: 未启用`
- `images: 未配置`
- `redirects: 未配置`
- 安全头：nosniff / SAMEORIGIN / strict-referrer

---

## 四、缓存策略

- 公开主页：`dynamic = "force-dynamic"`（保留），已删除 `revalidate=0`
- 缓存失效：`src/lib/cache/public-profile.ts` 提供 revalidatePath 精准失效
- 已接入失效的接口：profile保存、appearance保存、avatar保存、links CRUD、links排序、username变更
- **未接入失效的接口：products CRUD**

---

## 五、主题权限

- 免费主题（3个）：Link168 草木默认、草木原色、简约白
- 会员主题（10个）：商务黑、蓝色科技、橙色活力、浅绿清新、夜樱粉、日落橙、海洋蓝、森林绿、极简灰、暖茶棕
- 统一来源：`src/components/theme/presetThemes.ts` 的 `FREE_THEME_NAMES_V2` + `isFreeThemeV2`
- 后端：`src/app/api/dashboard/appearance/route.ts` 的 `FREE_THEMES` Set

---

## 六、结论

Link168 核心业务链路（注册→Onboarding→名片装修→公开主页→Lead收集→Workbench跟进）主体闭环完整。当前主要问题集中在：

1. vCard 隐私仍有缺陷（错误信息泄露 + private 不返回404 + revalidate=0 残留）
2. products 缓存失效未接入
3. 链接图标审核状态未持久化
4. 三后台并存无重定向
5. 导航不一致
6. AI额度数据源不一致
7. 外部 API（邮件/AI/支付）待部署后联调

以上问题不阻塞本地开发，但需在两轮开发中逐项处理。
