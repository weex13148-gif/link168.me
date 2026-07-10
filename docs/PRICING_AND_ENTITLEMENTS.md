# Link168 V2 套餐与权益文档（PRICING_AND_ENTITLEMENTS）

> 文档定位：Link168 V2 文档总控 - 套餐与权益权威基线
> 创建日期：2026-07-05
> 文档版本：v1.0
> 事实核验来源：本地代码只读核验（src/lib/billing/plans.ts、src/lib/ai/permissions.ts、src/lib/billing/entitlements/index.ts、src/lib/billing/orders.ts）

---

## 1. 文档目标与适用范围

### 1.1 文档目标
本文档作为 Link168 V2 套餐与权益体系的**唯一权威基线**，用于：

- 统一记录当前生产环境已上线的套餐代码、价格与权益事实
- 标注 V2 改版目标命名与价格基线
- 如实记录代码层与产品层存在的不一致与 BUG，禁止粉饰
- 定义 AI 双产品线额度分账方案
- 定义到期降级、退款回收、增购包等运营机制

### 1.2 适用范围
- 适用对象：产品、研发、运营、客服、财务
- 适用系统：Link168 主站、AI 助手、支付与会员系统、控制台
- 不适用：纯前端文案 A/B 实验、临时营销活动定价

### 1.3 状态标签说明
| 标签 | 含义 |
|------|------|
| 【已实现】 | 当前生产代码已实现并可用 |
| 【部分实现】 | 已有部分代码但功能不完整或有缺陷 |
| 【本次改版】 | V2 改版目标，需在本次迭代落地 |
| 【未来预留】 | 暂不实现，留作未来规划 |
| 【历史废弃】 | 旧版遗留，仅供兼容，禁止新业务依赖 |
| 【待核验】 | 事实尚未核验，需后续补充 |

---

## 2. 当前套餐代码与价格事实基线

### 2.1 套餐清单（7 个，依 `src/lib/billing/plans.ts` PRICES 表与 PLAN_DEFINITIONS）

| # | PlanCode | 对外名称 | 月付（分） | 年付（分） | 年付（元） | aiChatsPerMonth | 标签 |
|---|----------|----------|------------|------------|------------|-----------------|------|
| 1 | `free` | 免费版 | 0 | 0 | 0 | 0 | 【已实现】 |
| 2 | `member_basic` | Plus（旧版兼容） | null | 18800 | 188 | 300 | 【历史废弃】`legacy: true` |
| 3 | `member_plus` | Plus 会员 | null | 18800 | 188 | 300 | 【历史废弃】`legacy: true` |
| 4 | `pro` | Pro 年付 | null | 38800 | 388 | 2000 | 【已实现】`highlight: true` |
| 5 | `enterprise` | 企业版 | null | null（contactSales） | 联系销售 | 10000 | 【已实现】`contactSales: true` |
| 6 | `enterprise_pro_plus` | 企业专业 Plus | null | 398800 | 3988 | 50000 | 【历史废弃】`legacy: true` |
| 7 | `internal_test` | 内部测试 | 1 | 1 | 0.01 | -1（无限） | 【历史废弃】`legacy: true`，仅 super_admin |

### 2.2 公开销售顺序（`PUBLIC_PLAN_ORDER`）
当前公开销售仅展示 3 档：
```
free → pro → enterprise
```

### 2.3 完整套餐顺序（`PLAN_ORDER`）
```
free → member_plus → pro → enterprise → enterprise_pro_plus
```
注意：`PLAN_ORDER` 不包含 `member_basic` 与 `internal_test`。

### 2.4 价格显示规则（`formatPriceDisplay`）
- `contactSales: true` → 显示「联系销售」
- 价格为 null → 显示「暂未开放」
- 价格为 0 → 显示「免费」
- 其他 → `${元} 元/年` 或 `${元} 元/月`

---

## 3. V2 目标套餐统一命名【本次改版】

### 3.1 V2 套餐命名映射

| V2 目标名（代码） | 对外中文 | 当前 PlanCode | 备注 |
|------------------|----------|---------------|------|
| `free` | 免费版 | `free` | 维持 |
| `plus` | 会员 Plus | `member_plus`（合并 `member_basic`） | 统一为 Plus，旧 `member_basic` 兼容映射至 `plus` |
| `pro` | 会员 Pro | `pro` | 维持命名 |
| `enterprise` | 企业版 | `enterprise` | 维持 |
| `enterprise_advanced` | 企业高级版 | `enterprise_pro_plus` | 重命名，价格调整为 4980 元 |
| `enterprise_solution` | 行业方案 | — | 新增，按项目报价 16800 元起 |
| `internal_test` | 内部测试 | `internal_test` | 维持，仅内部使用 |

### 3.2 命名变更理由
- `member_basic` 与 `member_plus` 当前价格、权益完全一致（年付 188 元 / aiChatsPerMonth=300），保留两个 PlanCode 仅增加维护负担，V2 合并为 `plus`
- `enterprise_pro_plus` 名称过长，V2 改为 `enterprise_advanced`，对外称「企业高级版」

---

## 4. 价格不一致清单（当前代码 vs V2 目标）

### 4.1 价格对照表（如实记录）

| 套餐 | 当前代码价格（年付） | V2 目标正式价 | V2 目标创始价 | 不一致情况 |
|------|---------------------|---------------|---------------|-----------|
| 免费版 | 0 元 | 0 元 | 0 元 | 一致 |
| 会员 Plus | 188 元 | 288 元 | 188 元 | 当前价格 = V2 创始价，低于 V2 正式价 288 元 |
| 会员 Pro | 388 元 | 688 元 | 388 元 | 当前价格 = V2 创始价，低于 V2 正式价 688 元 |
| 企业版 | 联系销售 | 1980 元 | 1280 元 | 当前为 contactSales，未在线销售 |
| 企业高级版 | 3988 元 | 4980 元 | 2680 元 | 当前 3988 元 介于 V2 创始价与正式价之间，需重新定价 |
| 行业方案 | — | 16800 元起 | 按项目 | 新增档位，暂未在代码中定义 |
| 内部测试 | 0.01 元 | 不公开 | 不公开 | 仅内部 |

### 4.2 不一致处理建议【本次改版】
1. V2 上线后立即将 `member_plus`（→ `plus`）年付价格从 18800 分改为 28800 分（正式价）或保持 18800 分作为创始价
2. `pro` 年付从 38800 分改为 68800 分（正式价）或保持 38800 分作为创始价
3. `enterprise` 从 `contactSales: true` 改为 `priceYearly: 198000` 分（正式价 1980 元）
4. `enterprise_pro_plus`（→ `enterprise_advanced`）年付从 398800 分改为 498000 分（正式价 4980 元）
5. 新增 `enterprise_solution` 行业方案档位：正式价 16800 元起，按项目报价，不进入自助购买流程
6. 是否启用「创始价」机制需由产品与财务共同确认；当前代码无价格版本字段，建议引入 `priceTier: "founding" | "regular"` 字段

### 4.3 月付支持缺口
当前除 `free` 与 `internal_test` 外，所有套餐 `priceMonthly: null`，仅支持年付。V2 是否开放月付【待核验】。

---

## 5. AI 额度不一致 BUG 记录【部分实现】

### 5.1 事实陈述

Link168 当前存在 **AI 额度在两处独立定义、数值不一致** 的 BUG，必须如实记录，**禁止假装已统一**。

#### 来源一：`src/lib/billing/plans.ts` PLAN_DEFINITIONS.limits.aiChatsPerMonth

| PlanCode | aiChatsPerMonth |
|----------|-----------------|
| `free` | 0 |
| `member_basic` | 300 |
| `member_plus` | 300 |
| `pro` | 2000 |
| `enterprise` | 10000 |
| `enterprise_pro_plus` | 50000 |
| `internal_test` | -1 |

#### 来源二：`src/lib/ai/permissions.ts` PLAN_AI_LIMITS

| PlanCode | 月度额度 |
|----------|----------|
| `free` | 0 |
| `starter`（旧兼容） | 200 |
| `member_basic` | 200 |
| `member_plus` | 2000 |
| `pro`（旧兼容） | 2000 |
| `enterprise` | -1（无限） |

### 5.2 不一致明细

| PlanCode | plans.ts | permissions.ts | 一致性 |
|----------|----------|----------------|--------|
| `free` | 0 | 0 | ✅ 一致 |
| `member_basic` | 300 | 200 | ❌ 不一致（差 100） |
| `member_plus` | 300 | 2000 | ❌ 不一致（差 1700） |
| `pro` | 2000 | 2000 | ✅ 一致 |
| `enterprise` | 10000 | -1（无限） | ❌ 不一致（有限 vs 无限） |
| `enterprise_pro_plus` | 50000 | （未定义，fallback 0） | ❌ 不一致（缺键） |
| `internal_test` | -1 | （未定义，fallback 0） | ❌ 不一致（缺键） |

### 5.3 缺键记录
`src/lib/ai/permissions.ts` 的 `PLAN_AI_LIMITS` **缺少以下键**：
- `enterprise_pro_plus`
- `internal_test`

未定义时 `PLAN_AI_LIMITS[planCode] ?? 0` fallback 为 0，会导致这两个套餐在 AI 调用链路上**被错误判定为 0 额度**。

### 5.4 调用链影响
- `entitlements/index.ts` 的 `aiChatsPerMonth.remaining` 使用 `plans.ts` 的值（50000 / -1）
- `permissions.ts` 的 `getMonthlyPlanUsage` / `getAiQuota` 使用 `PLAN_AI_LIMITS` 的值（fallback 0）
- 两套额度查询返回不同结果，前端展示与后端鉴权可能不一致

### 5.5 V2 修复要求【本次改版】
1. **统一额度来源**：仅保留 `plans.ts` 作为唯一权威，`permissions.ts` 改为引用 `getPlanDefinition(planCode).limits.aiChatsPerMonth`
2. **补全缺键**：`enterprise_pro_plus` = 50000，`internal_test` = -1
3. **解决 enterprise 差异**：`enterprise` 在 `plans.ts` 为 10000（有限），在 `permissions.ts` 为 -1（无限），需产品确认目标值后统一
4. **删除 `starter` 旧兼容**：V2 不再保留 `starter` PlanCode

---

## 6. 权益六类矩阵表（Plan × Entitlement）

### 6.1 权益六类定义

| 类别 | 包含项 |
|------|--------|
| 名片与品牌 | 公开主页、自定义域名、去品牌标识、品牌主题 |
| 内容与产品 | 产品数量、知识库文档数、文件交付 |
| AI | AI 接待助手、AI 工具箱、高级模型、文件上传、企业记忆 |
| 客户与数据 | 客户线索、访问数据天数、数据导出、高级统计 |
| 团队 | 团队席位、成员权限 |
| 集成与服务 | 优先客服、专属客户经理、操作日志 |

### 6.2 当前权益矩阵（基于 `plans.ts` PLAN_DEFINITIONS）

| 权益项 | 免费版 | Plus（member_plus） | Pro | 企业版 | 企业专业 Plus | 内部测试 |
|--------|--------|---------------------|-----|--------|---------------|----------|
| **名片与品牌** | | | | | | |
| 公开主页 | 1 个 | 1 个 | 1 个 | 1 个 | 1 个 | 1 个 |
| 自定义域名 | ❌ | ❌ | ❌ | ✅（未实现） | ✅（未实现） | ✅（未实现） |
| 去品牌标识 | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 品牌主题 | 基础 | 高级 | 高级 | 定制 | 定制 | 全部 |
| **内容与产品** | | | | | | |
| 产品数量 | 3 | 10 | 50 | 200 | 1000 | 无限 |
| 知识库文档数 | 0 | 3 | 20 | 100 | 500 | 无限 |
| 文件交付 | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **AI** | | | | | | |
| AI 接待助手 | 预览 | ✅ | ✅ | ✅ | ✅ | ✅ |
| AI 工具箱点数（月） | 0 | 300 | 2000 | 10000 | 50000 | 无限 |
| 高级模型 | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 文件上传 | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 企业记忆 | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **客户与数据** | | | | | | |
| 访问数据 | 基础 | 90 天 | 高级 | 高级 | 高级 | 全部 |
| 高级统计 | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| 数据导出 | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **团队** | | | | | | |
| 团队席位 | 1 | 1 | 1 | 3 | 10 | 无限 |
| **集成与服务** | | | | | | |
| 优先客服 | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| 专属客户经理 | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| 操作日志 | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

### 6.3 V2 目标权益矩阵【本次改版】

| 权益项 | 免费版 | 会员 Plus | 会员 Pro | 企业版 | 企业高级版 |
|--------|--------|-----------|----------|--------|------------|
| 公开主页 | 1 个 | 1 个 | 1 个 | 1 个 | 1 个 |
| 自定义域名 | ❌ | ❌ | ❌ | ✅ | ✅（3 个） |
| 去品牌标识 | ❌ | ✅ | ✅ | ✅ | ✅ |
| 产品数量 | 3 | 10 | 50 | 200 | 1000 |
| 知识库文档数 | 0 | 3 | 20 | 100 | 500 |
| AI 接待助手会话 | 预览 | 300 | 2000 | 10000 | 50000 |
| AI 工具箱点数 | 0 | 300 | 2000 | 10000 | 50000 |
| 团队席位 | 1 | 1 | 1 | 3 | 10 |
| 优先客服 | ❌ | ❌ | ✅ | ✅ | ✅ |

---

## 7. AI 双产品线额度分账方案【本次改版】

### 7.1 双产品线定义

Link168 AI 能力分为两条独立产品线，**必须权限分离、入口分离、前台文案分离、额度分离、用量账本分离**：

| 产品线 | 面向对象 | 用途 | 示例 |
|--------|----------|------|------|
| AI 接待助手 | 访客侧 | 访客访问名片主页时由 AI 接待、答疑、引导留资 | 名片主页右下角聊天窗、访客问答 |
| 经营 AI 工具箱 | 用户侧 | 会员登录后使用的内容生成、客户分析、知识库问答等经营工具 | 文案生成、客户线索分析、知识库问答 |

### 7.2 分账原则（强制要求）

1. **权限分离**：访客侧 AI 鉴权依据「名片主人套餐」，用户侧 AI 鉴权依据「当前登录用户套餐」
2. **入口分离**：访客侧入口在公开主页，用户侧入口在控制台
3. **前台文案分离**：前台展示「访客接待会话额度」与「经营工具点数」两个独立计数器
4. **额度分离**：两条产品线各自拥有独立月度额度池，互不挪用
5. **用量账本分离**：`UsageLedger` 必须区分 `productLine: "visitor_ai" | "workspace_ai"`
6. **成本统计可合并**：底层调用同一 AI 基础设施，成本统计可合并，但用量分账必须清晰
7. **不得相互误扣**：访客调用不得扣用户工具箱点数，反之亦然

### 7.3 数据模型增量【本次改版】

在 `UsageLedger` 或 `aiCreditLedger` 上增加分账字段：

```typescript
type AiProductLine = "visitor_ai" | "workspace_ai";

interface UsageLedgerEntry {
  // 既有字段
  userId: string;          // 既有：套餐归属人
  amount: number;          // 既有：消耗量
  entryType: "consume" | "grant" | "refund";
  // 新增分账字段
  productLine: AiProductLine;
  visitorSessionId?: string;  // 仅 visitor_ai 时填写
  workspaceToolId?: string;   // 仅 workspace_ai 时填写
}
```

### 7.4 额度池设计【本次改版】

V2 目标：每个套餐的 `aiChatsPerMonth` 拆分为两个字段：

```typescript
limits: {
  visitorAiSessionsPerMonth: number;  // 访客接待会话额度
  workspaceAiCreditsPerMonth: number; // 经营工具点数额度
}
```

当前代码只有单一 `aiChatsPerMonth`，V2 改版需迁移历史数据并按 50/50 或产品确认比例拆分。

---

## 8. 免费用户 AI 调用约束

### 8.1 当前实现【已实现】

`src/lib/ai/permissions.ts` 的 `getAiAccessLevel`：
- `free` 套餐返回 `access: "preview"`，reason 提示「升级会员即可使用全部 AI 能力」
- 会员过期返回 `access: "preview"`，reason 提示「请续费后继续使用」
- `consumeCredit` 在 `canCall === false` 时拒绝调用

### 8.2 V2 强制约束【本次改版】

1. **可见性**：免费用户可以看到 AI 能力介绍和升级入口
2. **零真实调用**：免费用户不得产生真实 AI 调用
3. **服务端拒绝**：服务端必须拒绝绕过前端的真实调用，包括但不限于：
   - 直接调用 `/api/ai/*` 接口
   - 伪造 `preview` 参数调用真实模型
   - 利用会员身份过期窗口期调用
4. **预览模式**：免费用户仅可查看 AI 助手介绍页、Demo 演示，不消耗任何真实额度

### 8.3 当前缺口【部分实现】
- 当前 `getAiAccessLevel` 返回 `preview`，但缺少对真实调用接口的服务端硬拒绝中间件
- 需在所有 `/api/ai/*` 路由前置中间件，强制校验 `access === "full"`

---

## 9. 目标权益结构【本次改版】

### 9.1 数据模型层次

```
Plan (套餐定义)
  └── EntitlementDefinition (权益定义，按套餐 + 类别)
        └── PlanEntitlement (套餐-权益关联)
              └── WorkspaceSubscription (工作空间订阅)
                    └── UsageLedger (用量账本)
                          └── AddonPurchase (增购包)
```

### 9.2 实体说明

| 实体 | 职责 | 关键字段 |
|------|------|----------|
| `Plan` | 套餐定义 | code, name, priceYearly, currency |
| `EntitlementDefinition` | 权益项定义 | code, category（六类之一）, type（feature/limit） |
| `PlanEntitlement` | 套餐与权益关联 | planCode, entitlementCode, value, max |
| `WorkspaceSubscription` | 工作空间订阅 | workspaceId, planCode, currentPeriodStart/End, status |
| `UsageLedger` | 用量账本 | workspaceId, entitlementCode, productLine, used, period |
| `AddonPurchase` | 增购包 | workspaceId, addonCode, quantity, purchasedAt, expiresAt |

### 9.3 与当前代码的差异

当前代码仅有 `PLAN_DEFINITIONS`（硬编码常量）与 `MembershipSubscription`（按 userId 维度），缺少：
- `WorkspaceSubscription`（按工作空间维度，多成员支持）
- `EntitlementDefinition` / `PlanEntitlement`（权益项独立建模）
- `UsageLedger` 的 `productLine` 字段
- `AddonPurchase`

V2 改版需完成上述实体建模与数据迁移。

---

## 10. 到期降级与权益回收

### 10.1 当前实现【部分实现】

`src/lib/billing/entitlements/index.ts`：
- 常量 `GRACE_PERIOD_DAYS = 3`
- 会员到期后 3 天内仍保留权益（`isGracePeriod: true`）
- 3 天后 `effectivePlanCode` 回退到 `free`
- **惰性降级**：仅在用户下次访问时计算，无定时任务主动扫描

### 10.2 当前缺口
- 无定时任务（cron / queue）主动扫描到期会员
- 无到期前提醒推送
- 无到期后即时降级（最坏情况：3 天后才被下次访问触发降级）
- 会员过期后 `MembershipSubscription.status` 未及时更新为 `expired`

### 10.3 V2 目标【本次改版】

1. 引入定时任务（每日凌晨执行）：
   - 扫描 `currentPeriodEnd < now` 且 `status = active` 的订阅
   - 推送到期前 7/3/1 天提醒
   - 到期即时将 `status` 改为 `expired`
   - 到期后超过宽限期立即降级 `planCode` 为 `free`
2. 权益回收：降级时同步收回 AI 额度、自定义域名、团队席位等
3. 用量账本归档：保留历史用量数据用于审计

---

## 11. 退款与权益回收

### 11.1 当前实现【部分实现】

`src/lib/billing/orders.ts` 的 `processRefund`：
- 仅更新本地订单状态（`PAID` → `REFUNDED` 或 `PARTIALLY_REFUNDED`）
- 全额退款时将 `MembershipSubscription.planCode` 改为 `free`，`status` 改为 `cancelled`
- **不调用支付宝退款接口**
- **不调用微信支付退款接口**（微信支付仅占位，未实现）

### 11.2 当前缺口
- 退款资金未真实退回用户支付账户（支付宝/微信）
- 缺少支付平台退款单号回写
- 缺少退款失败重试机制
- 部分退款未触发权益降级（仅全额退款才降级）

### 11.3 V2 目标【本次改版】

1. 调用支付宝 `alipay.trade.refund` 接口完成真实退款
2. 回写支付平台退款单号到本地订单 `metadata`
3. 部分退款按比例回收权益（如退 50% 则回收 50% AI 额度）
4. 退款失败重试机制（最多 3 次，间隔指数退避）
5. 微信支付退款接口对接（待微信支付整体接入后）

---

## 12. 增购包（AddonPurchase）【未来预留】

### 12.1 预留场景

| 增购包 | 适用套餐 | 用途 |
|--------|----------|------|
| AI 额度包 | Plus 及以上 | 补充 AI 接待会话或工具箱点数 |
| 团队席位包 | Pro 及以上 | 增加团队成员席位 |
| 知识库扩容包 | Pro 及以上 | 增加知识库文档数量 |
| 自定义域名包 | Enterprise | 增加独立域名名额 |

### 12.2 数据模型（预留）

```typescript
interface AddonPurchase {
  id: string;
  workspaceId: string;
  addonCode: string;        // "ai_credits_pack_1000"
  quantity: number;
  unitPrice: number;
  purchasedAt: Date;
  expiresAt: Date | null;   // null 表示永久
  sourceOrderId: string;    // 关联订单
}
```

### 12.3 实现状态
当前代码无 `AddonPurchase` 实体，V2 仅做预留，不实现购买流程。

---

## 13. 套餐迁移与升降级规则【待核验】

### 13.1 当前实现【部分实现】

`src/lib/billing/entitlements/index.ts` 的 `canUpgradeFromCurrentPlan`：
- 仅判断目标套餐 `PLAN_RANK` 是否高于当前
- 不支持降级判断
- 不计算差价
- 不处理周期剩余天数

### 13.2 待核验项

| 项 | 状态 |
|----|------|
| 升级差价计算 | 【待核验】 |
| 升级后周期重置 vs 顺延 | 【待核验】 |
| 降级生效时机（立即 vs 周期末） | 【待核验】 |
| 降级后权益回收时机 | 【待核验】 |
| 跨支付周期迁移（年付 → 年付） | 【待核验】 |
| 月付 → 年付合并规则 | 【待核验】 |

### 13.3 V2 目标【本次改版】
1. 明确升级差价计算公式
2. 升级立即生效，周期顺延（按剩余天数折算）
3. 降级在当前周期末生效，期间保留原权益
4. 提供迁移历史记录表

---

## 14. 验收标准

### 14.1 文档验收
- [x] 包含全部 14 个章节
- [x] 如实记录 AI 额度不一致 BUG（第 5 章）
- [x] 如实记录价格不一致清单（第 4 章）
- [x] 标注 V2 目标命名与状态标签
- [x] 区分当前实现与 V2 目标

### 14.2 代码修复验收（V2 改版后）
- [ ] `permissions.ts` 的 `PLAN_AI_LIMITS` 删除，改为引用 `plans.ts`
- [ ] `enterprise_pro_plus`、`internal_test` 在 AI 鉴权链路有正确额度
- [ ] `enterprise` 额度在 `plans.ts` 与 `permissions.ts` 一致
- [ ] 免费用户调用 `/api/ai/*` 返回 403
- [ ] `UsageLedger` 增加 `productLine` 字段
- [ ] 到期降级定时任务上线
- [ ] `processRefund` 调用支付宝退款接口
- [ ] V2 套餐命名替换完成（`member_basic`/`member_plus` → `plus`，`enterprise_pro_plus` → `enterprise_advanced`）

### 14.3 数据一致性验收
- [ ] 前端展示额度 = 后端鉴权额度 = 用量账本累计
- [ ] 套餐迁移后权益即时生效
- [ ] 退款后权益即时回收

---

## 附录 A：关键代码位置索引

| 模块 | 文件路径 | 关键符号 |
|------|----------|----------|
| 套餐定义 | `src/lib/billing/plans.ts` | `PRICES`, `PLAN_DEFINITIONS`, `PLAN_CODES`, `PLAN_ORDER` |
| AI 鉴权 | `src/lib/ai/permissions.ts` | `PLAN_AI_LIMITS`, `DAILY_LIMITS`, `getAiAccessLevel`, `consumeCredit` |
| 权益查询 | `src/lib/billing/entitlements/index.ts` | `getUserEntitlements`, `GRACE_PERIOD_DAYS`, `checkAiQuota` |
| 订单与退款 | `src/lib/billing/orders.ts` | `processRefund`, `updateOrderStatus` |

## 附录 B：状态标签汇总

| 章节 | 主要标签 |
|------|----------|
| 第 2 章 当前套餐事实基线 | 【已实现】【历史废弃】 |
| 第 3 章 V2 目标命名 | 【本次改版】 |
| 第 4 章 价格不一致清单 | 【本次改版】 |
| 第 5 章 AI 额度 BUG | 【部分实现】 |
| 第 7 章 AI 双产品线分账 | 【本次改版】 |
| 第 8 章 免费用户约束 | 【已实现】【部分实现】 |
| 第 9 章 目标权益结构 | 【本次改版】 |
| 第 10 章 到期降级 | 【部分实现】【本次改版】 |
| 第 11 章 退款回收 | 【部分实现】【本次改版】 |
| 第 12 章 增购包 | 【未来预留】 |
| 第 13 章 套餐迁移 | 【待核验】 |
