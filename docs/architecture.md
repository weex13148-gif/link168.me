# Link168 架构说明书（Production SaaS v1）

> 本文档是 Link168 生产级 SaaS 系统的总设计约束，可直接指导开发 / Agent 执行 / 上线。
> 所有后续代码任务、上线检查、白屏验证均须以本文档为准。

---

## 1. 系统定位

Link168 是一个：

🟢 **个人数字身份 SaaS + 会员订阅系统 + AI 增强工具平台**

核心目标：

- 用户创建个人主页
- 聚合链接 / 名片 / 内容
- 支持会员订阅收费
- 支持 AI 自动生成与营销
- 支持增长与裂变传播

---

## 2. 总体架构原则（必须遵守）

🟢 **1. 后端是唯一真相源**

所有数据必须以数据库为准：

- `subscription`
- `order`
- `profile`

🟢 **2. subscription 是权限唯一来源**

禁止：

- 前端判断权限
- localStorage 控制权限
- 多系统并行判断

🟢 **3. 支付系统是唯一信任入口**

只有：

```
payment webhook → subscription update
```

才可信。

🟢 **4. 前端只负责展示**

不允许：

- 权限计算
- 金额计算
- 状态推断

---

## 3. 模块结构（核心系统拆分）

### 🟢 A - Profile 模块（用户身份层）

功能：

- 用户名
- 头像 `avatar_url`
- `bio`
- public page `/[username]`

规则：

- `avatar_url` 是唯一字段
- 上传成功必须立即刷新
- 不允许前端缓存主状态

### 💰 B - Billing 模块（订单系统）

功能：

- `create-order`
- `paymentOrder` 表
- order status 管理

规则：

- `orderId` 必须唯一
- 一个用户只能有一个 pending order
- 创建订单必须幂等

### 💳 C - Payment 模块（支付网关）

功能：

- 支付接口（支付宝 / mock）
- webhook notify

规则：

- 只信支付平台回调
- 不允许前端触发支付成功

### 🔐 D - Security 模块（支付安全层）

功能：

- webhook signature verify
- replay attack protection
- idempotency lock

规则：

- notify 必须验签
- 必须防重复回调
- 必须限制时间窗口

### 📊 E - Subscription 模块（权限系统）

功能：

- `membershipSubscription`
- entitlements API
- `planCode` 控制

规则：

- subscription 是唯一权限来源
- entitlements = subscription 派生结果

生命周期：

```
pending → active → expired → canceled → refunded
```

### 🚀 F - Growth 模块（增长系统）

功能：

- SEO landing pages
- referral link system
- share tracking

规则：

- 不影响主业务
- 必须非阻塞
- 数据仅用于分析

### 🤖 G - AI 模块（智能系统）

功能：

- sales agent
- customer service agent
- conversion agent

规则：

- AI 不能修改支付逻辑
- AI 只能增强交互
- AI 不能直接开通权限

---

## 4. 核心业务流程（必须严格一致）

### 💰 支付闭环流程

```
User click upgrade
  ↓
create-order (pending)
  ↓
payment gateway
  ↓
webhook notify
  ↓
verify signature
  ↓
idempotency check
  ↓
update order = paid
  ↓
update subscription = active
  ↓
entitlements updated
  ↓
frontend unlock features
```

---

## 5. 数据流原则

✔ **唯一数据链路：**

- Profile → DB
- Order → DB
- Subscription → DB
- Entitlements → Derived

❌ **禁止：**

- 前端计算权限
- 本地缓存会员状态
- 多数据源判断权限

---

## 6. 安全模型（生产必须）

✔ **必须具备：**

### 1. 防伪造支付

- signature verify
- webhook validation

### 2. 防重复支付

- orderId unique
- idempotency lock

### 3. 防重放攻击

- timestamp window
- nonce

### 4. 接口安全

- auth required for create-order
- rate limiting (future)

---

## 7. 商业模型（SaaS 核心）

会员体系：

| Plan          | 权限               |
| ------------- | ------------------ |
| free          | 基础主页           |
| plus          | AI 基础            |
| pro           | AI + 分析          |
| enterprise    | 全功能             |

收入来源：

- 会员订阅
- 企业服务
- AI 增强功能

---

## 8. 未来扩展结构

可扩展模块：

- analytics（行为分析）
- crm（用户管理）
- ai-agent marketplace
- api 开放平台

---

## 9. 系统目标（最终形态）

Link168 最终形态：

🟢 **"AI 驱动的个人商业化 SaaS 平台"**

能力：

- 可以建主页
- 可以收会员费
- 可以做 AI 助手
- 可以做增长裂变
- 可以做企业服务

---

## 10. 一句话总结

> **Link168 = Identity + Billing + AI + Growth 的统一 SaaS 系统**
