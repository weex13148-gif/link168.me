# Link168 问题台账

> 生成时间：2026-07-06
> 生成方式：只读盘点，未修改任何业务代码
> 配套文档：LINK168_CURRENT_BASELINE.md

本台账基于 `LINK168_CURRENT_BASELINE.md` 二·2.4 节"明确缺陷"扩展，按优先级与处理轮次排序，作为两轮多 Agent 开发的唯一缺陷来源。

---

## 一、严重度定义

| 等级 | 含义 | 处理原则 |
|------|------|---------|
| P0 | 阻断商业化或安全/数据泄露 | 第一轮必须修复 |
| 高 | 影响核心业务闭环 | 第一轮修复 |
| 中 | 影响体验或一致性 | 第二轮修复 |
| P1 | 隐私或可见性缺陷 | 第一轮修复（Agent B） |
| P2 | 次要安全或缓存缺陷 | 第一轮修复（Agent B） |
| P3 | 代码整洁度 | 第二轮修复或不修 |

---

## 二、问题清单

### D1 Onboarding 页面无登录守卫
- 严重度：中
- 文件：`src/app/onboarding/page.tsx`
- 现象：导入 `redirect` 和 `getCurrentUserFromCookies` 但未使用，未做登录校验
- 处理轮次：第一轮 / Agent A
- 完成标准：未登录访问 `/onboarding` 重定向到 `/login?next=/onboarding`，已登录但未完成 Onboarding 可正常访问

### D2 密码长度策略不一致
- 严重度：中
- 文件：`src/app/api/auth/register/route.ts`、`src/app/api/auth/reset-password/route.ts`
- 现象：注册 ≥6 位，重置 ≥8 位
- 处理轮次：第一轮 / Agent A
- 完成标准：统一为 ≥8 位（与重置一致），前后端同步

### D3 vCard 错误信息泄露账号状态
- 严重度：P1
- 文件：`src/app/api/public/[username]/vcard/route.ts` 第 48 行
- 现象：`!profile.isPublic` 返回 `"Profile is not public"`，泄露账号存在但未公开
- 处理轮次：第一轮 / Agent B
- 完成标准：统一返回 `"Profile not found"`，与 profile not found 一致

### D4 vCard revalidate=0 与 force-dynamic 叠加
- 严重度：P2
- 文件：`src/app/api/public/[username]/vcard/route.ts` 第 9 行
- 现象：`export const revalidate = 0` 与 `dynamic = "force-dynamic"` 叠加导致重复查询
- 处理轮次：第一轮 / Agent B
- 完成标准：删除 `revalidate = 0`

### D5 vCard username 未 trim()
- 严重度：P3
- 文件：`src/app/api/public/[username]/vcard/route.ts` 第 23 行
- 现象：仅 `toLowerCase()`，未 `trim()`，与公开主页不一致
- 处理轮次：第一轮 / Agent B
- 完成标准：使用 `username.trim().toLowerCase()`，与公开主页 `normalizeUsername` 一致

### D6 vCard contactVisibility=private 不返回 404
- 严重度：P1
- 文件：`src/app/api/public/[username]/vcard/route.ts` 第 61 行
- 现象：private 仅抑制联系方式字段输出，不返回 404，访客可探测账号存在
- 处理轮次：第一轮 / Agent B
- 完成标准：`contactVisibility === "private"` 时直接返回 404 `"Profile not found"`

### D7 链接图标审核状态未持久化（P0）
- 严重度：P0
- 文件：`src/app/api/dashboard/links/icon/[...filename]/route.ts`、`src/components/dashboard-v1/LinksPanel.tsx`
- 现象：新上传图标 moderationStatus 始终为 pending，未写入 DB；公开页读取时未过滤
- 处理轮次：第一轮 / Agent B + Agent C（B 负责写入，C 负责读取过滤）
- 完成标准：上传时持久化 moderationStatus=pending_manual_review；公开页渲染时 approved 才显示，pending/rejected 显示占位

### D8 products CRUD 缺失 revalidatePath
- 严重度：高
- 文件：`src/app/api/dashboard/products/route.ts`、`[id]/route.ts`
- 现象：产品增删改后公开主页缓存不失效
- 处理轮次：第一轮 / Agent C
- 完成标准：所有 products 写操作调用 `revalidatePublicProfileByUser(userId)`

### D9 AI 额度 plans.ts 与 permissions.ts 不一致
- 严重度：P0
- 文件：`src/lib/ai/permissions.ts` 的 `PLAN_AI_LIMITS`、`src/lib/billing/plans.ts` 的 `aiChatsPerMonth`
- 现象：两处定义不同值；`permissions.ts` 缺少 `enterprise_pro_plus` 和 `internal_test` 键，回退到 0
- 处理轮次：第一轮 / Agent C（AI Lead capture 路径）
- 完成标准：`permissions.ts` 从 `plans.ts` 派生 AI 额度，移除硬编码 `PLAN_AI_LIMITS`

### D10 三后台并存无重定向
- 严重度：P0
- 文件：`src/app/console/page.tsx`、`src/app/dashboard/page.tsx`、`src/app/workbench/page.tsx`
- 现象：`/console`、`/dashboard`、`/workbench` 三个后台并存，用户认知混乱
- 处理轮次：第二轮 / Agent D
- 完成标准：`/console` 作为唯一普通用户管理首页；`/dashboard` 作为唯一名片装修器；`/workbench` 根页面跳转或兼容显示，子页面保留

### D11 DashboardFrame 导航未接入共享配置
- 严重度：P1
- 文件：`src/components/dashboard/DashboardFrame.tsx`
- 现象：使用独立 `primaryItems`，未引用 `console-navigation.ts` 的 `SHARED_NAV_ITEMS`
- 处理轮次：第二轮 / Agent D
- 完成标准：DashboardFrame 引用 `SHARED_NAV_ITEMS`，与 Console/Workbench 一致

### D12 WorkbenchShell 移动端无底部导航
- 严重度：P1
- 文件：`src/components/layout/WorkbenchShell.tsx`
- 现象：移动端无底部导航，依赖侧边栏汉堡菜单
- 处理轮次：第二轮 / Agent D
- 完成标准：移动端（< 768px）显示底部 5 项导航，使用 `SHARED_MOBILE_NAV`

### D13 reorder 非事务批量更新
- 严重度：中
- 文件：`src/app/api/dashboard/links/reorder/route.ts`
- 现象：循环 `update`，非 `$transaction`
- 处理轮次：第一轮 / Agent C
- 完成标准：使用 `db.$transaction` 批量更新

### D14 /api/contact 频率限制基于内存 Map
- 严重度：中
- 文件：`src/app/api/contact/route.ts`
- 现象：单进程内存，多实例失效
- 处理轮次：第二轮 / Agent F 或不修（标注已知限制）
- 完成标准：标注已知限制，或迁移到 DB 计数（不改 Redis，避免引入新依赖）

### D15 Offer 有效期仅前端校验
- 严重度：中
- 文件：`src/app/api/dashboard/links/[id]/route.ts` 的 Offer 模块校验
- 现象：服务端不校验 validUntil
- 处理轮次：第一轮 / Agent C
- 完成标准：服务端校验 validUntil > now（如提供）

### D16 短链接不检查 owner 冻结/封禁状态
- 严重度：P2
- 文件：`src/app/s/[slug]/route.ts`
- 现象：仅检查短链接 isActive，不检查 owner restrictions
- 处理轮次：第一轮 / Agent B
- 完成标准：跳转前调用 `getActiveRestrictions(ownerId)` + `canShowPublicProfile`

### D17 /api/avatar/[username] 缺少 nosniff 头
- 严重度：P2
- 文件：`src/app/api/avatar/[username]/route.ts`
- 现象：返回图片但未设 `X-Content-Type-Options: nosniff`
- 处理轮次：第一轮 / Agent B
- 完成标准：响应头增加 `X-Content-Type-Options: nosniff`

### D18 退款未调用支付宝接口
- 严重度：P0（待部署）
- 文件：`src/lib/billing/orders.ts` 的 `processRefund`
- 现象：仅更新本地状态，未调支付宝退款接口
- 处理轮次：本轮不修，标注"待部署后由 Codex 处理"
- 完成标准：标注待办，不在本轮触碰

### D19 无自动到期降级 cron
- 严重度：P0
- 现象：会员到期后不会自动降级到 free
- 处理轮次：本轮不修，标注"待部署后由 Codex 配置 cron"
- 完成标准：标注待办

### D20 /admin 6 个页面全部 404 未清理
- 严重度：P1
- 文件：`src/app/admin/` 下 6 个页面
- 现象：全部 `notFound()`，历史废弃
- 处理轮次：第二轮 / Agent D
- 完成标准：保留目录与页面（不删除历史代码），但在导航中完全隐藏；或评估是否清理（需引用搜索确认无链接）

---

## 三、按轮次分配汇总

### 第一轮（核心链路稳定）

| Agent | 负责问题 |
|-------|---------|
| Agent A | D1（Onboarding 守卫）、D2（密码长度） |
| Agent B | D3（vCard 错误信息）、D4（revalidate=0）、D5（trim）、D6（private 404）、D7 写入侧（图标审核持久化）、D16（短链接 owner 检查）、D17（avatar nosniff） |
| Agent C | D7 读取侧（公开页过滤）、D8（products revalidatePath）、D9（AI 额度统一）、D13（reorder 事务）、D15（Offer 服务端校验） |

### 第二轮（UI 与产品结构）

| Agent | 负责问题 |
|-------|---------|
| Agent D | D10（三后台重定向）、D11（DashboardFrame 导航）、D12（Workbench 移动底部导航）、D20（/admin 隐藏） |
| Agent E | （无独立缺陷，负责状态表达与新用户体验文案） |
| Agent F | D14（频率限制标注） |

### 不在本轮处理（待 Codex 或部署后）

| 问题 | 原因 |
|------|------|
| D18 退款未调支付宝 | 需服务器真实密钥，本轮禁触碰支付接口 |
| D19 自动到期 cron | 需服务器 cron 配置，本轮禁引入外部依赖 |

---

## 四、验收要求

每个问题修复后必须满足：
1. 修改文件列入 Agent 输出清单
2. 完成标准中每条均已实现（不接受"代码存在，所以闭环通过"）
3. 静态检查（TypeScript/ESLint）通过
4. 涉及 API 的需本地 API 路径验证通过
5. 涉及外部 API 的标注"待部署后测试"

---

*台账结束*
