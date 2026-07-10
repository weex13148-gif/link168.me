# Link168 Agent 文件所有权

> 生成时间：2026-07-06
> 生成方式：只读盘点，未修改任何业务代码
> 配套文档：LINK168_CURRENT_BASELINE.md、LINK168_ISSUE_LEDGER.md

本表规定两轮多 Agent 开发的文件所有权边界。所有 Agent 必须严格遵守：
- 只修改归属自己的文件
- 不覆盖其他 Agent 的修改
- 不扩大范围
- 共享文件需在总 Agent 合并阶段处理
- 任何越界修改需在 Agent 输出中明确说明并等待总 Agent 裁决

---

## 一、第一轮：核心业务链路稳定

### Agent A：认证与 Onboarding

**独占可修改文件**：
- `src/app/onboarding/page.tsx`
- `src/app/onboarding/**`（如有子组件）
- `src/components/onboarding/**`
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/verify-email/route.ts`
- `src/app/api/auth/resend-verification/route.ts`
- `src/app/api/auth/forgot-password/route.ts`
- `src/app/api/auth/reset-password/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/app/login/page.tsx`
- `src/app/register/page.tsx`
- `src/app/verify-email/page.tsx`
- `src/app/forgot-password/page.tsx`
- `src/app/reset-password/page.tsx`

**禁止修改**：
- 邮件相关：`src/lib/mail.ts`、`src/lib/email-verification.ts` 的密钥与发送逻辑
- 会员与支付：`src/lib/billing/**`
- Onboarding 以外的页面与 API
- 任何 Prisma schema

**职责**：D1（Onboarding 守卫）、D2（密码长度统一 ≥8）

**完成标准**：
1. 未登录访问 `/onboarding` → 重定向 `/login?next=/onboarding`
2. 已登录但未完成 Onboarding 可正常访问
3. 注册与重置密码前后端均 ≥8 位
4. 不调用真实邮件 API，未配置时返回安全失败
5. 30 天未验证提醒文案保留（不取消宽限逻辑）

---

### Agent B：公开页、上传与隐私

**独占可修改文件**：
- `src/app/api/public/[username]/vcard/route.ts`
- `src/app/api/avatar/[username]/route.ts`
- `src/app/s/[slug]/route.ts`
- `src/app/api/dashboard/links/icon/[...filename]/route.ts`
- `src/app/api/dashboard/avatar/route.ts`
- `src/app/api/dashboard/media/[type]/[...path]/route.ts`
- `src/components/share/SafeImage.tsx`
- `src/lib/public-url-security.ts`（仅在必要时扩展）

**禁止修改**：
- Prisma schema
- 大规模缓存重构（仅可在 vCard 单点删除 `revalidate=0`）
- 产品导航
- 会员权益
- 外部内容审核 API 调用

**职责**：D3（vCard 错误信息统一）、D4（删除 revalidate=0）、D5（trim）、D6（private 404）、D7 写入侧（图标审核持久化）、D16（短链接 owner 检查）、D17（avatar nosniff）

**完成标准**：
1. vCard 三个缺陷全部修复，错误信息统一为 `"Profile not found"`
2. 图标上传时持久化 `moderationStatus = "pending_manual_review"` 到 DB
3. 短链接跳转前检查 owner restrictions，冻结/封禁返回 404
4. avatar 接口响应头含 `X-Content-Type-Options: nosniff`
5. 不调用外部内容审核 API
6. 不修改 Prisma schema

---

### Agent C：组件与 Lead 数据

**独占可修改文件**：
- `src/app/api/dashboard/links/route.ts`（POST/PUT 校验部分）
- `src/app/api/dashboard/links/[id]/route.ts`
- `src/app/api/dashboard/links/reorder/route.ts`
- `src/app/api/dashboard/products/route.ts`
- `src/app/api/dashboard/products/[id]/route.ts`
- `src/app/api/contact/route.ts`（仅 Lead 字段部分）
- `src/app/api/workbench/leads/**`（仅 source 字段补全）
- `src/lib/ai/permissions.ts`（AI 额度派生自 plans.ts）
- `src/features/profile-modules/registry.ts`（仅 validateModulePayload 校验增强）
- `src/components/share/modules/**`（仅 D7 读取侧过滤）

**禁止修改**：
- 真实百炼调用：`src/lib/ai/gateway.ts`、`src/lib/ai/commercial-agent.ts` 的请求逻辑
- 组件 UI 重做（仅可加审核状态过滤）
- 组件会员权限
- 支付逻辑
- Prisma schema

**职责**：D7 读取侧（公开页过滤 pending/rejected 图标）、D8（products revalidatePath）、D9（AI 额度统一）、D13（reorder 事务）、D15（Offer 服务端校验）

**完成标准**：
1. 公开页渲染链接时，图标 `moderationStatus !== "approved"` 显示占位（不显示原图）
2. products 所有写操作调用 `revalidatePublicProfileByUser(userId)`
3. `permissions.ts` 的 AI 额度从 `plans.ts` 派生，移除 `PLAN_AI_LIMITS` 硬编码
4. reorder 使用 `db.$transaction`
5. Offer 模块服务端校验 `validUntil > now`
6. Lead source/sourcePage/sourceComponent 在所有 5 个入口完整写入

---

## 二、第一轮共享文件

以下文件如多个 Agent 都需修改，必须在总 Agent 合并阶段处理：

| 文件 | 涉及 Agent | 处理方式 |
|------|-----------|---------|
| `src/lib/auth.ts` | A（密码策略）、B（restrictions 调用） | 总 Agent 协调 |
| `src/lib/cache/public-profile.ts` | C（products 接入） | C 独占 |
| `src/lib/billing/plans.ts` | C（AI 额度派生读取） | C 仅读取，不修改 |

---

## 三、第二轮：UI 与产品结构收口

### Agent D：后台入口和导航

**独占可修改文件**：
- `src/app/console/page.tsx`
- `src/app/workbench/page.tsx`（根页面，仅跳转逻辑）
- `src/components/dashboard/DashboardFrame.tsx`
- `src/components/layout/WorkbenchShell.tsx`
- `src/components/layout/console-navigation.ts`（仅扩展，不破坏现有导出）
- `src/components/layout/ConsoleShell.tsx`（如有）
- `src/app/admin/**`（仅隐藏导航，不删除页面）

**禁止修改**：
- `/dashboard` 名片装修器内部逻辑
- API
- Prisma
- Jeepwork
- Showcase
- Workbench 子页面（leads/products/analytics/short-links/membership/account 等）

**职责**：D10（三后台重定向）、D11（DashboardFrame 接入共享导航）、D12（Workbench 移动底部导航）、D20（/admin 隐藏）

**完成标准**：
1. `/console` 作为唯一普通用户管理首页
2. `/dashboard` 作为唯一名片装修器，与装修器内部解耦
3. `/workbench` 根页面跳转 `/console` 或兼容显示
4. Workbench 子页面保留可访问
5. 桌面侧边导航三端一致，使用 `SHARED_NAV_ITEMS`
6. 移动端底部导航使用 `SHARED_MOBILE_NAV`
7. /admin 在所有导航中完全隐藏

---

### Agent E：Dashboard 状态和新用户体验

**独占可修改文件**：
- `src/components/dashboard-v1/DashboardV1Client.tsx`（仅状态展示与文案部分）
- `src/components/dashboard-v1/Header.tsx`（仅状态展示）
- `src/components/dashboard-v1/AppearancePanel.tsx`（仅"主页公开中/已下线"表达）
- `src/components/onboarding/OnboardingWizard.tsx`（仅文案与提示）
- `src/components/dashboard-v1/MobilePreview.tsx`（仅手机预览入口表达）

**禁止修改**：
- 自动保存和实时公开规则
- 缓存逻辑
- 数据库
- 邮件 API
- 会员权限
- Dashboard 装修器内部组件逻辑

**职责**：状态文案统一（保存中/已保存/保存失败/主页公开中/已下线/查看公开页/复制公开地址/二维码入口/Onboarding 文案/验证提醒文案/手机预览入口）

**完成标准**：
1. 所有状态有明确中文表达，无英文/undefined
2. "保存中""已保存""保存失败"三态可见
3. "主页公开中""主页已下线"在 AppearancePanel 清晰展示
4. "查看公开页""复制公开地址""二维码"入口在 Header 可达
5. Onboarding 文案完成 8 步流程的中文化
6. 验证提醒文案保留 30 天宽限说明

---

### Agent F：首页、套餐和组件入口

**独占可修改文件**：
- `src/app/page.tsx`（首页）
- `src/app/pricing/page.tsx`
- `src/app/workbench/membership/page.tsx`（仅展示统一，不改价格）
- `src/components/home/**`
- `src/components/dashboard-v1/LinksPanel.tsx`（仅组件分类中文化与上传/外链区分文案）
- `src/components/dashboard-v1/AddModulePanel.tsx`（仅组件分类文案）

**禁止修改**：
- 支付接口
- 订单
- 退款
- AI 接口
- 邮件接口
- 删除未来能力

**职责**：首页突出四大能力、套餐展示数据统一、组件分类中文化、上传本地与外链明确区分、空状态/错误状态统一中文、D14（频率限制标注）

**完成标准**：
1. 首页突出"智能名片 + AI 接待 + 线索收集 + 数据分析"四大能力
2. `/`、`/pricing`、`/workbench/membership` 三处套餐数据来源 `plans.ts`，价格与权益一致
3. 组件分类中文化（如"产品""服务""优惠""预约""报价""联系表单"）
4. 上传本地文件 vs 填写外部链接在 UI 上明确区分
5. 空状态与错误状态统一中文表达
6. 不删除任何组件
7. 不修改实际价格

---

## 四、第二轮共享文件

| 文件 | 涉及 Agent | 处理方式 |
|------|-----------|---------|
| `src/lib/billing/plans.ts` | F（读取） | F 仅读取，不修改 |
| `src/components/dashboard-v1/AppearancePanel.tsx` | D（导航）、E（状态表达） | 总 Agent 协调 |
| `src/components/dashboard-v1/DashboardV1Client.tsx` | D（导航）、E（状态）、F（组件入口） | 总 Agent 协调 |

---

## 五、全局禁止修改清单（所有 Agent）

以下文件本轮**任何 Agent 都不得修改**：

- `prisma/**`
- `src/lib/mail.ts`
- `src/lib/ai/gateway.ts`
- `src/lib/ai/commercial-agent.ts`（请求逻辑）
- `src/lib/billing/payments.ts`
- `src/lib/billing/orders.ts`
- `src/lib/billing/plans.ts`（仅可读取，不可修改）
- `src/app/api/jeepwork/**`
- `src/app/jeepwork/**`
- `src/app/showcase/**`
- `src/app/api/showcase/**`
- 任何 `.env`、`.env.local`、`.env.production`
- 任何密钥文件
- `next.config.ts`（除非总 Agent 批准）
- `package.json`、`package-lock.json`、`pnpm-lock.yaml`（除非总 Agent 批准）

---

## 六、所有权冲突仲裁

- Agent 完成后输出"修改文件清单"
- 总 Agent 检查清单与所有权表一致性
- 越界修改由总 Agent 裁决：保留/回退/重做
- 共享文件冲突由总 Agent 在合并阶段统一处理
- 任何 Agent 不得自行宣布整轮验收通过

---

*所有权表结束*
