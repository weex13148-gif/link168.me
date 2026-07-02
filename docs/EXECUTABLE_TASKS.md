# Link168 可执行代码任务清单

> 本清单由 `docs/architecture.md` 架构说明书直接拆解而来，按 P0/P1/P2 优先级排列，每个任务包含：
> - 对应架构原则
> - 具体代码位置
> - 修改方案（可直接执行）
> - 验证方式

---

## P0 — 严重不合规（阻塞上线）

### TASK-001：移除旧版 MOCK 支付通道（无签名验证）

**违反原则**：§2.3「支付系统是唯一信任入口」、§6.1「防伪造支付」

**问题描述**：

| 文件 | 行号 | 问题 |
|------|------|------|
| `src/app/api/pay/create-order/route.ts` | 全文件 | 创建独立的 `paymentOrder` 表记录，使用旧版 `lib/pay/alipay.ts`，形成第二条支付通道 |
| `src/app/api/pay/notify/route.ts` | 6-39 | 无任何签名验证的 MOCK notify 端点。携带 `orderId` 即可直接更新 `paymentOrder.status = "paid"` 并 upsert `membershipSubscription = active` |

**风险**：攻击者只需发送 `POST {"orderId":"xxx"}` 即可绕过支付直接开通会员。

**修改方案**：

1. 删除文件：`src/app/api/pay/create-order/route.ts`
2. 删除文件：`src/app/api/pay/notify/route.ts`
3. 标记废弃：`src/lib/pay/alipay.ts`（添加 `@deprecated` JSDoc，提示后续迁移到新 `lib/billing/` 体系）
4. 清理路由引用：检查前端是否有代码调用 `/api/pay/create-order` 或 `/api/pay/notify`，全部迁移到 `/api/billing/orders` 和 `/api/payments/alipay/notify`

**验证方式**：

```bash
# 确认旧路由已不存在
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/pay/create-order
# 期望返回 404

curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/pay/notify
# 期望返回 404
```

---

### TASK-002：沙盒支付增加环境隔离（防止生产环境被利用）

**违反原则**：§2.3「支付系统是唯一信任入口」、§6.1「防伪造支付」

**问题描述**：

| 文件 | 行号 | 问题 |
|------|------|------|
| `src/app/api/payments/sandbox/route.ts` | 78-107 (action="pay") | 任何已登录用户可通过 `POST /api/payments/sandbox?action=pay` 直接触发支付成功回调，无需真实支付。当前没有环境隔离校验。 |

**风险**：部署到生产环境后，普通用户可调用此接口直接开通会员。

**修改方案**：

在 `src/app/api/payments/sandbox/route.ts` 的 GET 和 POST 处理逻辑开头，增加环境隔离校验：

```typescript
// 在 requireDashboardUser 之后立即插入
const isProduction = process.env.NODE_ENV === "production";
const enableSandbox = process.env.ENABLE_SANDBOX_PAYMENT === "true";

if (isProduction && !enableSandbox) {
  return NextResponse.json(
    { success: false, error: "沙盒支付在生产环境已禁用" },
    { status: 403 }
  );
}
```

同时，在 `.env.example` 和部署文档中明确说明：
- 生产环境必须 **不设置** `ENABLE_SANDBOX_PAYMENT=true`
- 沙盒支付仅限测试环境使用

**验证方式**：

```bash
# 模拟生产环境
NODE_ENV=production ENABLE_SANDBOX_PAYMENT= node server.js

# 尝试触发沙盒支付
curl -X POST "http://localhost:3000/api/payments/sandbox?action=pay" \
  -H "Content-Type: application/json" \
  -d '{"tradeNo":"test","payAction":"success"}'
# 期望返回 403
```

---

## P1 — 架构原则违规（必须修复）

### TASK-003：消除前端自行计算权限

**违反原则**：§2.2「subscription 是权限唯一来源」、§2.4「前端只负责展示」

**问题描述**：

| 文件 | 行号 | 问题 |
|------|------|------|
| `src/components/dashboard-v1/AppearancePanel.tsx` | 21-23, 42, 50, 73, 89 | 前端定义 `isPaidPlan(planCode)`，根据 `planCode` 自行判断主题是否锁定，绕过 entitlements 接口 |
| `src/components/dashboard-v1/LinksPanel.tsx` | 43, 60 | 前端定义 `isFreePlan = planCode === "free"`，自行判断免费版状态并展示文案 |
| `src/components/dashboard-v1/AccountPanel.tsx` | 8-12 | 前端根据 `planCode` 计算 `planLabel` 和升级按钮显隐 |

**修改方案**：

前端不再自行计算权限，改为从后端 `entitlements` 接口获取 `features` 字段。后端已提供 `/api/dashboard/entitlements`，返回结构示例：

```json
{
  "planCode": "plus",
  "status": "active",
  "features": {
    "customThemes": ["商务黑", "蓝色科技", "橙色活力", "浅绿清新"],
    "templateSelection": true,
    "linkLimit": null,
    "aiAssistant": true,
    "analytics": false
  }
}
```

具体改造步骤：

1. **AppearancePanel.tsx**：
   - 移除 `isPaidPlan(planCode)` 函数
   - 移除 `paid` 变量
   - `theme.free` 判断改为从 `features.customThemes` 中查询
   - `chooseTheme` 中锁定逻辑改为：`!features.customThemes.includes(item.label)`
   - 升级按钮触发条件改为：`!features.customThemes` 或空数组

2. **LinksPanel.tsx**：
   - 移除 `isFreePlan` 变量
   - 免费版提示文案改为根据 `features.linkLimit` 判断（如果 `linkLimit === null` 则无限，否则显示限制）

3. **AccountPanel.tsx**：
   - `planLabel` 文案和升级按钮显隐改为从 `features` 推导或直接由后端返回 `planLabel` 和 `canUpgrade`

**验证方式**：

```typescript
// 在前端组件中搜索以下反模式，确认已清零
grep -rn "planCode.*===.*\"free\"" src/components/
grep -rn "isPaidPlan\|isFreePlan\|planLabel(" src/components/
```

---

### TASK-004：确认 Entitlements 后端派生链路完整

**违反原则**：§2.1「后端是唯一真相源」、§3.E「subscription 是唯一权限来源，entitlements = subscription 派生结果」

**当前状态**：已合规

| 文件 | 说明 |
|------|------|
| `src/lib/billing/entitlements/index.ts` | `getUserEntitlements()` 直接从 `db.membershipSubscription` 查询，实时计算 feature/limit |
| `src/app/api/dashboard/entitlements/route.ts` | 返回 subscription 的 `planCode` 和派生的 `features` |
| `src/lib/billing/membership.ts` | `getCurrentSubscription()` 直接查 DB，无缓存 |

**行动项**：无需修改，但需加入上线前确认清单：

- [ ] 确认 `entitlements` 接口不返回 `subscription.id` 等敏感字段
- [ ] 确认 `entitlements` 接口缓存策略（如 CDN / Vercel Edge Cache）**不缓存** entitlements 响应
- [ ] 确认 `membershipSubscription` 表有 `updatedAt` 字段用于调试追踪

---

## P2 — 安全增强（建议上线前完成）

### TASK-005：增加 Webhook 防重放攻击保护

**违反原则**：§6.3「防重放攻击」

**问题描述**：

当前 `src/lib/billing/webhooks.ts` 和 `src/app/api/payments/alipay/notify/route.ts` 已做验签，但未实现：
- timestamp window 校验（如 notify 时间戳超过 5 分钟则拒绝）
- nonce 去重（同一 notify_id 只处理一次）

**修改方案**：

1. 在 `processPaymentSuccess` 或 webhook handler 中增加 `notify_id` 幂等锁：

```typescript
// 在更新 order 之前
const lockKey = `webhook:${notifyId}`;
const existing = await db.webhookLog.findUnique({ where: { notifyId } });
if (existing) {
  return { success: true, message: "已处理，跳过重复回调" };
}
// 处理成功后记录
await db.webhookLog.create({ data: { notifyId, orderId, processedAt: new Date() } });
```

2. 时间窗口校验（支付宝 notify 中通常包含 `gmt_payment` 或 `notify_time`）：

```typescript
const notifyTime = new Date(body.notify_time);
const now = new Date();
if (Math.abs(now.getTime() - notifyTime.getTime()) > 5 * 60 * 1000) {
  return { success: false, error: "回调时间超出有效窗口" };
}
```

**验证方式**：

```bash
# 模拟重放攻击（同一 notify_id 第二次请求）
curl -X POST /api/payments/alipay/notify -d "notify_id=same_id&..."
# 第二次返回已处理，不重复更新 subscription
```

---

### TASK-006：清理 `paymentOrder` 表与 Prisma Schema

**违反原则**：§2.1「后端是唯一真相源」—— 双表并存造成数据不一致风险

**问题描述**：

当前存在两个订单表：
- `paymentOrder`（旧版，由 `src/lib/pay/alipay.ts` 和 `/api/pay/create-order` 使用）
- `order`（新版，由 `src/lib/billing/orders.ts` 和 `/api/billing/orders` 使用）

**修改方案**：

1. 在 Prisma schema 中删除 `paymentOrder` model
2. 运行 `npx prisma migrate dev --name drop_payment_order`
3. 删除 `src/lib/pay/alipay.ts` 中所有引用 `db.paymentOrder` 的代码
4. 确认 `src/lib/billing/orders.ts` 中 `processPaymentSuccess` 只操作 `order` 表

**验证方式**：

```bash
grep -rn "paymentOrder" src/
# 期望无任何匹配（除废弃标记注释外）
```

---

### TASK-007：确认 Profile 模块 avatar_url 即时刷新

**违反原则**：§3.A「avatar_url 是唯一字段，上传成功必须立即刷新，不允许前端缓存主状态」

**当前状态**：需确认

**行动项**：

- [ ] 检查 `src/app/api/dashboard/avatar/route.ts` 上传成功后是否立即返回新 URL
- [ ] 检查前端上传组件是否使用返回的新 URL 更新 UI，而非等待页面刷新
- [ ] 检查 `avatar_url` 是否带 `?t=timestamp` 或版本号，防止 CDN 缓存旧头像

---

## 执行顺序建议

| 顺序 | 任务 | 优先级 | 预估工作量 |
|------|------|--------|-----------|
| 1 | TASK-001 移除旧版 MOCK 支付通道 | P0 | 1h |
| 2 | TASK-002 沙盒支付环境隔离 | P0 | 30min |
| 3 | TASK-003 消除前端自行计算权限 | P1 | 2h |
| 4 | TASK-006 清理 paymentOrder 表 | P2 | 1h |
| 5 | TASK-005 增加 Webhook 防重放 | P2 | 1.5h |
| 6 | TASK-004 确认 Entitlements 链路 | P1 | 30min（验证） |
| 7 | TASK-007 确认 avatar 即时刷新 | P2 | 30min（验证） |

---

## 上线前检查清单

基于架构说明书 §2 总体架构原则，上线前必须确认：

- [ ] `subscription` 是权限唯一来源（前端无 localStorage / cookie / planCode 自行判断）
- [ ] 支付系统是唯一信任入口（无 MOCK notify、无沙盒支付暴露、验签完整）
- [ ] 后端是唯一真相源（Profile/Order/Subscription 均以 DB 为准，无前端缓存覆盖）
- [ ] 前端只负责展示（无权限计算、无金额计算、无状态推断）
- [ ] Webhook 具备：signature verify + idempotency lock + timestamp window
- [ ] Order 具备：orderId unique + 幂等创建 + 状态机校验
- [ ] 沙盒支付已隔离（生产环境不可访问）
