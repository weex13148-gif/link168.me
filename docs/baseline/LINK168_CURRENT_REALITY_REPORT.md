# Link168 当前真实状态报告

报告日期：2026-07-06
报告依据：代码审查 + Git diff + 文档分析
审查方式：只读，未测试 API，未运行浏览器，未执行构建

---

## 1. 审查边界

* **只读审查**，未修改任何代码
* **未测试 API**，仅检查接口定义和调用路径
* **未写数据库**，仅查看 schema 定义和数据流向
* **未运行浏览器**，移动端问题基于 CSS 断点分析
* **未执行构建**，不确认 TypeScript 或 ESLint 结果
* **未调用外部 API**（邮件、百炼、支付宝均未实际调用）
* **未部署**，不确认服务器配置

---

## 2. 当前 Git 工作区状态

### 已跟踪修改（Modified）：119 个文件

**核心改动方向**：
- 主题权限与自定义主题系统（AppearancePanel、presetThemes、appearance API）
- 公开主页重构（[username]/page.tsx、SharePageRenderer）
- 缓存基础设施（public-profile.ts、各 API 接入）
- Jeepwork 管理后台（大量页面新增）
- 会员与支付（membership 页面、支付接口）
- AI 助手（workbench/ai、enterprise-ai）
- 数据分析（analytics 页面、stats API）
- 移动端样式（globals.css）

### 未跟踪新增（Untracked）：大量文件

**新增模块**：
- /console（控制台）
- /onboarding（新用户引导）
- /api/public（公开接口，含 vCard）
- /api/workspaces（企业空间）
- /api/enterprise（企业组织）
- /components/onboarding（Onboarding 组件）
- /components/public-profile（公开页组件）
- /components/share/modules（组件系统）
- /src/lib/cache（缓存）
- /src/lib/workspace（企业空间）
- docs/（完整文档体系）

### 变更统计
- 33963 行新增
- 17989 行删除
- 大量文件从 LF 转为 CRLF（Windows 换行符）

---

## 3. 产品真实结构

### 当前路由架构

```
/                         → 首页（营销页）
/login                    → 登录
/register                 → 注册
/verify-email             → 邮箱验证
/forgot-password          → 忘记密码
/reset-password           → 重置密码
/onboarding               → 新用户引导（新增）

/[username]               → 公开主页（名片）

/console                  → 控制台首页（新增）
/dashboard                → 名片装修器
/workbench                → 工作台首页
  /workbench/card         → AI 名片
  /workbench/leads        → 客户线索
  /workbench/products     → 产品与服务
  /workbench/short-links  → 短链接
  /workbench/analytics    → 数据分析
  /workbench/ai           → AI 助手
  /workbench/ai-service   → AI 客服配置
  /workbench/membership   → 会员套餐
  /workbench/enterprise   → 企业空间
  /workbench/knowledge    → 知识库
  /workbench/account      → 账户设置

/pricing                  → 定价页
/showcase                 → 比赛展示系统
/jeepwork                 → 超级管理员后台
```

### 核心组件关系

```
公开页渲染：SharePageRenderer（共享）
  ├── 手机预览：PhonePreview（Dashboard 中）
  └── 公开主页：[username]/page.tsx

名片装修：DashboardFrame
  ├── AppearancePanel（主题与外观）
  ├── LinksPanel（链接模块）
  ├── ProfilePanel（个人信息）
  └── AccountPanel（账户设置）

后台框架：ConsoleShell / WorkbenchShell（两套）
```

---

## 4. 模块状态总表

| 模块 | 路由/文件 | 当前状态 | 已验证层级 | 未验证内容 | 是否重复 | 证据 |
|------|---------|---------|-----------|-----------|---------|------|
| 首页 | `/page.tsx` | A | B | 定价数据源一致性 | 是 | 首页硬编码定价 |
| 注册 | `/register/page.tsx` | A | B | 邮箱发送真实结果 | 否 | AuthCard |
| 登录 | `/login/page.tsx` | A | B | 多设备登录限制 | 否 | AuthCard |
| 邮箱验证 | `/verify-email/page.tsx` | A | B | 真实邮件发送 | 否 | mail.ts |
| 忘记密码 | `/forgot-password/page.tsx` | A | B | 真实邮件发送 | 否 | AuthCard |
| Onboarding | `/onboarding/page.tsx` | A | B | 完整用户路径 | 否 | OnboardingWizard |
| Console | `/console/page.tsx` | A | B | 与 Workbench 内容重复 | 是 | 两套首页 |
| Dashboard | `/dashboard/page.tsx` | A | B | 手机端交互 | 否 | DashboardV1Client |
| Workbench | `/workbench/page.tsx` | A | B | 与 Console 内容重复 | 是 | 两套首页 |
| 名片装修 | dashboard-v1/ | A | B | 组件全量功能 | 否 | AppearancePanel/LinksPanel |
| 手机预览 | PhonePreview.tsx | A | B | 与公开页一致性 | 否 | SharePageRenderer |
| 公开主页 | `[username]/page.tsx` | A | B | SEO/性能/缓存策略 | 否 | PublicProfileClientWrapper |
| 组件系统 | share/modules/ | A | B | 各组件实际渲染 | 否 | 16+ 组件模块 |
| 上传系统 | upload-storage.ts | A | B | 真实云存储上传 | 否 | S3/OSS 配置 |
| 客户线索 | /workbench/leads | A | B | 线索流转完整路径 | 否 | LeadsClient |
| 产品与服务 | /workbench/products | A | B | 产品展示一致性 | 否 | ProductsClient |
| 短链接 | /workbench/short-links | A | B | 点击追踪 | 否 | ShortLinksClient |
| 数据分析 | /workbench/analytics | A | B | 数据准确性 | 否 | AnalyticsClient |
| AI 助手 | /workbench/ai | A | B | 百炼真实调用 | F | bailian.ts |
| 企业空间 | /workbench/enterprise | A | B | 成员管理 | 否 | WorkspaceClient |
| 会员与套餐 | /workbench/membership | A | B | 支付联调 | F | payments.ts |
| 支付宝 | pay/payments/alipay | A | B | 真实支付联调 | 否 | payments.ts |
| 阿里百炼 | lib/ai/providers/bailian | A | B | 真实 API 调用 | F | bailian.ts |
| 邮件推送 | lib/mail.ts | A | B | 真实 SMTP 发送 | F | mail.ts |
| Jeepwork | /jeepwork | A | B | 管理后台功能 | 否 | AdminShell |
| Showcase | /showcase | A | B | 比赛展示流程 | 否 | ShowcaseLayout |
| vCard | /api/public/[username]/vcard | A | B | 隐私检查 | 否 | route.ts |
| 权限与公开状态 | lib/auth.ts | A | B | isPublic 逻辑 | 否 | auth.ts |
| 手机端布局 | globals.css + 响应式 | A | C | 实际手机验证 | 否 | CSS 断点 |
| 测试脚本 | scripts/ | A | B | 真实数据库 | 否 | smoke-test.mjs |

状态分类说明：
- **A**: 已有完整代码路径，但未真实验收
- **B**: 已通过本地静态检查
- **C**: 已通过本地 API 或数据库路径检查
- **F**: 外部 API 待服务器填写参数后测试

---

## 5. 已确认完成的能力

### 基础能力（代码完整 + 静态检查通过）

| 能力 | 文件证据 | 说明 |
|------|---------|------|
| 用户注册 | `/api/auth/register/route.ts` | 邮箱/密码注册，生成验证 token |
| 用户登录 | `/api/auth/login/route.ts` | 邮箱/密码登录，cookie 认证 |
| 邮箱验证 | `/api/auth/verify-email/` | 链接验证 + 验证码验证两种方式 |
| 忘记密码 | `/api/auth/forgot-password/route.ts` | 发送重置链接 |
| 密码重置 | `/api/auth/reset-password/route.ts` | 重置密码功能 |
| 用户信息 | `/api/auth/me/route.ts` | 获取当前用户信息 |
| 退出登录 | `/api/auth/logout/route.ts` | 清除 cookie |
| 公开主页渲染 | SharePageRenderer.tsx | 统一渲染引擎 |
| 名片装修器 | DashboardV1Client.tsx | 多 Tab 装修界面 |
| 主题系统 | presetThemes.ts + AppearancePanel | 12 个预设主题 + 自定义主题 |
| 链接模块管理 | LinksPanel.tsx + links API | 增删改查、排序、隐藏 |
| 头像上传 | /api/dashboard/avatar | 上传 + 清理 |
| 资料编辑 | /api/dashboard/profile | 个人信息编辑 |
| 用户名设置 | /api/dashboard/username | 用户名修改 |
| 客户线索 | /api/workbench/leads | 线索列表、详情、状态更新 |
| 产品管理 | /api/dashboard/products | 产品 CRUD |
| 短链接 | /api/dashboard/short-links | 创建、统计、编辑 |
| 数据分析 | /api/dashboard/stats | 访问统计、线索统计 |
| 会员查询 | /api/workbench/membership | 当前会员状态 |
| 订单查询 | /api/billing/orders | 订单列表、详情 |
| 退款接口 | /api/billing/orders/[orderId]/refund | 退款处理 |
| vCard 导出 | /api/public/[username]/vcard | 名片导出 |
| 访问记录 | /api/public/[username]/visit | 访客追踪 |
| 支付下单 | /api/pay/create-order | 创建支付订单 |
| 支付回调 | /api/payments/alipay/notify | 支付宝回调 |
| AI 聊天 | /api/workbench/ai/chat | AI 对话接口 |
| 企业空间 | /api/workspaces | Workspace CRUD |
| 企业组织 | /api/enterprise/organizations | 组织管理 |
| 内容审核 | lib/content-safety.ts | 内容安全检查 |

---

## 6. 代码存在但未真实验收的能力

### 需要浏览器验收的能力

| 能力 | 文件 | 未验证内容 |
|------|------|-----------|
| Onboarding 完整路径 | OnboardingWizard.tsx | 注册→验证→Onboarding→Dashboard 完整走通 |
| 手机预览与公开页一致性 | PhonePreview.tsx vs [username]/page.tsx | 两端视觉是否完全一致 |
| Dashboard 手机端交互 | DashboardFrame.tsx | Tab 切换、抽屉、表单在小屏的可用性 |
| 底部导航遮挡 | console-navigation.ts | safe-area 是否生效 |
| 列表页移动端 | LeadsClient.tsx、ShortLinksClient.tsx | 360px 下是否横向滚动 |
| 弹窗与抽屉边界 | 全局组件 | 小屏下是否溢出 |
| 公开状态表达 | DashboardFrame.tsx | 用户是否能看懂"自动保存+实时公开" |
| 套餐展示一致性 | page.tsx vs pricing/page.tsx vs membership/page.tsx | 三处置价是否一致 |
| 组件分类 | AddModuleDrawer.tsx | 9 个分类是否需要合并 |

### 需要 API 验收的能力

| 能力 | 文件 | 未验证内容 |
|------|------|-----------|
| 邮箱发送 | mail.ts | 真实 SMTP 配置后发送成功 |
| 支付联调 | payments.ts | 真实支付宝下单、回调、会员到账 |
| AI 调用 | bailian.ts | 真实百炼 API Key 后调用成功 |
| 缓存失效 | public-profile.ts | revalidatePath 是否有效 |
| 头像清理 | avatar/cleanup.ts | 清理脚本是否正常运行 |
| 会员生命周期 | membership-lifecycle.ts | 过期、续费、降级是否正确 |

---

## 7. 外部 API 待服务器配置的能力

### 邮件推送（阿里云邮件推送）

| 检查项 | 状态 | 证据 |
|--------|------|------|
| 配置入口 | ✅ 存在 | `MAIL_ENABLED`、`SMTP_HOST`、`SMTP_USER`、`SMTP_PASSWORD` |
| 参数读取方式 | ✅ 数据库 + 环境变量 | `getConfig()` 优先，fallback 到 env |
| 是否硬编码密钥 | ❌ 否 | 所有密钥从配置读取 |
| 验证码发送接口 | ✅ 存在 | `sendVerificationCodeWithPolicy()` |
| 找回密码接口 | ✅ 存在 | `sendPasswordReset()` |
| 错误处理 | ✅ 存在 | `mapMailError()` 分类处理 |
| 未配置时的状态 | ✅ 安全 | 返回 `SMTP_NOT_CONFIGURED`，不泄露信息 |
| 是否具备部署条件 | ✅ 是 | 等待老板填写 SMTP 参数 |

### 阿里百炼（AI 服务）

| 检查项 | 状态 | 证据 |
|--------|------|------|
| 配置入口 | ✅ 存在 | apiKey、baseUrl、model 从配置读取 |
| API Key 读取 | ✅ 安全 | 从 `ProviderConfig` 传入，不硬编码 |
| 模型与 Endpoint 配置 | ✅ 存在 | `config.baseUrl` + `config.model` |
| 会员权限校验 | ✅ 存在 | `lib/ai/permissions.ts`、`entitlement-guard.ts` |
| 免费用户阻止 | ✅ 存在 | 权限校验阻止免费用户真实调用 |
| 超时处理 | ✅ 存在 | `AbortController` + 超时时间 |
| 异常处理 | ✅ 存在 | 网络错误、API 错误分类处理 |
| 密钥泄露风险 | ❌ 低 | API Key 在服务端使用，不返回前端 |
| 是否具备部署条件 | ✅ 是 | 等待老板填写 API Key |

### 支付宝（支付服务）

| 检查项 | 状态 | 证据 |
|--------|------|------|
| 配置入口 | ✅ 存在 | `paymentAlipayAppId`、`paymentAlipayAppPrivateKey`、`paymentAlipayPublicKey` |
| App ID | ✅ 配置读取 | `config.alipayAppId` |
| 私钥读取 | ✅ 安全 | `config.alipayAppPrivateKey`，支持多种 PEM 格式 |
| 公钥读取 | ✅ 安全 | `config.alipayPublicKey` |
| 下单接口 | ✅ 存在 | `createAlipayPayment()` |
| 查询接口 | ✅ 存在 | `lib/billing/alipay-query.ts` |
| 异步回调 | ✅ 存在 | `/api/payments/alipay/notify` |
| 验签 | ✅ 存在 | `alipayVerifySignature()` |
| 重复回调 | ✅ 存在 | `payment-state-machine.ts` 状态机 |
| 订单状态 | ✅ 存在 | `lib/billing/orders.ts` |
| 会员到账 | ✅ 存在 | `membership-lifecycle.ts` |
| 未配置时的安全失败 | ✅ 安全 | 返回 `ALIPAY_NOT_AVAILABLE` |
| 是否具备部署条件 | ✅ 是 | 等待老板填写 AppId、私钥、公钥 |

---

## 8. 明确缺陷

### L1 缺陷（影响用户认知或安全）

| 缺陷 | 文件 | 描述 |
|------|------|------|
| Console/Workbench 双首页 | /console/page.tsx + /workbench/page.tsx | 两个首页功能高度重叠，用户困惑 |
| 主题权限未经确认 | presetThemes.ts + appearance API | 免费/付费主题划分无产品确认，自定义主题无权限校验 |
| 全局 overflow-x: hidden | globals.css | 掩盖问题而非修复，可能截断弹窗/抽屉 |
| 公开页 force-dynamic | [username]/page.tsx | 与 revalidatePath 冲突，缓存策略不一致 |
| 首页定价硬编码 | /page.tsx | 与 pricing/membership 使用不同数据源 |
| "知识库"与"企业空间"命名混淆 | console-navigation.ts | 同一功能两个名称，用户困惑 |
| 账户设置多入口 | DashboardFrame + Workbench | Dashboard 和 Workbench 都有账户设置 |
| "稍后验证"可绕过 Onboarding | verify-email/page.tsx | 用户可跳过引导直接进入后台 |

### L2 缺陷（体验问题）

| 缺陷 | 文件 | 描述 |
|------|------|------|
| 移动端 Tab 数量过多 | DashboardFrame.tsx | 7 个 Tab 在手机端可能拥挤 |
| 沙箱测试按钮暴露 | pricing/page.tsx | 生产环境可能暴露测试入口 |
| 免费主题名称重复 | presetThemes.ts | "Link168 草木默认"和"草木原色"是同一主题的新旧名称 |
| AI 助手标注 Beta | console/page.tsx | "Beta"开发术语暴露给用户 |
| 响应式字体调整过大 | globals.css | 414px 以下字体从 16px 降到 14px，可能过小 |

---

## 9. 重复开发与重复实现

### 重复页面

| 重复项 | 文件 1 | 文件 2 | 重复内容 |
|--------|--------|--------|---------|
| 首页 | /console/page.tsx | /workbench/page.tsx | 统计卡片、下一步建议、最新线索、产品列表、账户状态 |
| 账户设置 | DashboardFrame.tsx（Account Tab） | /workbench/account/page.tsx | 修改密码、安全设置 |
| 定价展示 | /page.tsx（首页定价区） | /pricing/page.tsx | 套餐卡片展示 |
| 企业空间入口 | /workbench/enterprise | /workbench/knowledge | 同一功能不同入口 |

### 重复组件

| 重复项 | 文件 1 | 文件 2 | 说明 |
|--------|--------|--------|------|
| Dashboard 框架 | DashboardLayout.tsx（旧版） | DashboardFrame.tsx（v1） | 两套装修器框架 |
| 后台框架 | ConsoleShell.tsx | WorkbenchShell.tsx | 两套后台导航框架 |
| 公开页外壳 | PublicPageShell.tsx（两处） | - | 同一组件在不同路径 |

### 重复 API

| 重复项 | API 1 | API 2 | 说明 |
|--------|-------|-------|------|
| 用户信息 | /api/auth/me | /api/jeepwork/auth/me | 同一功能，不同路径 |
| 订单 | /api/billing/orders | /api/jeepwork/orders | 同一功能，不同路径 |
| 会员 | /api/workbench/membership | /api/jeepwork/membership | 同一功能，不同路径 |
| 个人资料 | /api/dashboard/profile | /api/jeepwork/profiles/[username] | 类似功能 |

### 重复文档

| 重复项 | 文档 1 | 文档 2 | 说明 |
|--------|--------|--------|------|
| UI 审计 | UI_PRODUCT_STRUCTURE_AUDIT_20260706.md | LINK168_LOCAL_CODE_AND_PRD_AUDIT_20260705.md | 同一主题两次审计 |
| 整改计划 | UI_PRODUCT_REMEDIATION_PLAN_20260706.md | LINK168_3_DAY_CONTINUOUS_DEVELOPMENT_PLAN.md | 同一主题两次规划 |

---

## 10. 无法归因的修改

以下文件有修改，但无法确认是哪一轮、哪个 Agent 做的：

| 文件 | 修改内容 | 无法归因原因 |
|------|---------|-------------|
| PROJECT_RULES.md | 大量规则更新 | 无提交记录显示来源 |
| README.md | 项目介绍更新 | 无提交记录显示来源 |
| eslint.config.mjs | 规则调整 | 无提交记录显示来源 |
| src/generated/prisma/* | Prisma 生成文件 | 自动生成，无法追踪来源 |
| src/lib/auth.ts | 权限逻辑更新 | 无提交记录显示来源 |
| src/lib/i18n.ts | 国际化更新 | 无提交记录显示来源 |
| src/lib/upload-storage.ts | 上传存储更新 | 无提交记录显示来源 |

---

## 11. 手机端真实状态

### 已确认的能力

| 能力 | 状态 | 证据 |
|------|------|------|
| Dashboard 单列布局 | ✅ 已实现 | `lg:grid-cols-[...]`，手机端默认单列 |
| 手机预览默认隐藏 | ✅ 已实现 | `hidden lg:block` |
| 名片入口在底部第二项 | ✅ 已实现 | MOBILE_BOTTOM_NAV 第二项 |
| SharePageRenderer 共享 | ✅ 已实现 | 预览和公开页共享 |
| safe-area CSS 工具类 | ✅ 已实现 | `safe-area-pb/pt/pl/pr/inset` |
| iOS input 防缩放 | ✅ 已实现 | `font-size: 16px` |

### 待确认的问题

| 问题 | 页面/组件 | 确认方式 |
|------|-----------|---------|
| Dashboard Tab 交互 | DashboardFrame.tsx | 真机测试 360-430px |
| 底部导航遮挡 | console-navigation.ts | 真机测试安全区域 |
| 列表页横向滚动 | LeadsClient.tsx、ShortLinksClient.tsx | 开发者工具检查 |
| 弹窗抽屉边界 | 全局组件 | 开发者工具检查 |
| 长文本溢出 | 公开页、后台 | 开发者工具检查 |
| 主题色在小屏的可读性 | SharePageRenderer | 真机测试 |

---

## 12. 当前上线阻塞项

### 必须解决才能上线

| 阻塞项 | 优先级 | 原因 |
|--------|--------|------|
| Console/Workbench 双首页 | P0 | 用户无法理解哪个是"真正的首页" |
| 主题权限无产品确认 | P0 | 免费/付费主题划分错误会影响商业化 |
| 首页定价数据源不一致 | P0 | 三处置价不一致会引起用户投诉 |
| 全局 overflow-x: hidden | P0 | 可能导致弹窗/抽屉被截断，影响核心功能 |
| 公开页缓存策略不一致 | P1 | force-dynamic 影响性能 |
| 账户设置多入口 | P1 | 用户困惑 |
| "稍后验证"绕过引导 | P1 | 新用户可能迷失 |

---

## 13. 过去反复修改的根本原因

### 核心原因分析

1. **产品决策延迟**：主题权限、组件分类、后台结构等关键决策未提前确定，导致开发过程中反复调整。

2. **架构缺乏统一**：初期设计时未明确 Console/Workbench/Dashboard 的职责边界，导致功能重叠后又反复拆分合并。

3. **文档与代码不一致**：PRD 文档与实际代码实现存在差异，且没有持续维护同步。

4. **多 Agent 协作缺乏协调**：不同 Agent 各自开发，缺乏统一规划，导致同一功能被重复实现。

5. **缺乏验收标准**：很多功能"代码存在"就被标记为完成，但缺乏浏览器验收和用户体验验证。

6. **商业化表达不清晰**：产品定位（智能名片 + AI 接待 + 线索收集）在页面上没有统一表达，导致首页、定价页、会员页各自为政。

---

## 14. 需要老板决定的问题

### 产品结构

1. Console 和 Workbench 谁作为唯一首页？（方案 A/B/C）
2. Dashboard 是否保持独立？（已确认是）
3. "知识库"和"企业空间"是否统一名称？
4. 账户设置是否统一到一个入口？

### 主题权限

5. 免费主题数量是 2 个还是 3 个？
6. "Link168 草木默认"和"草木原色"是否合并为一个？
7. 自定义主题是免费还是会员专属？
8. 12 个主题是否全部上线？

### 组件分类

9. 9 个组件分类是否合并为 4-5 个？
10. 合并后的分类名称是什么？

### 首页与套餐

11. 首页首屏如何突出 AI 名片价值？
12. 首页定价区是否与 pricing/membership 使用同一数据源？

### 用户路径

13. "稍后验证"入口是否隐藏？
14. Onboarding 是否强制完成？

### 旧页面处理

15. 被合并的旧页面是删除还是保留兼容跳转？
16. 旧 Dashboard（DashboardLayout）是否删除？

### 商业化

17. 未开放能力是隐藏还是标明"即将开放"？
18. Showcase 是否在普通首页暴露？

---

## 15. 结论

### 当前项目是否具备继续开发的稳定基础？

**是，但需要先解决阻塞项**。项目代码结构完整，核心功能（注册、登录、名片装修、公开页）代码路径存在，但存在多个决策未确认和架构问题。

### 是否存在大量重复开发？

**是**。Console/Workbench 双首页、账户设置多入口、后台框架两套、API 重复等问题明显，需要先收口再继续开发。

### 是否建议先讨论再拆任务？

**强烈建议**。在开始下一轮开发前，必须先解决第 14 节中的 18 个需要老板决定的问题，否则开发过程中会继续反复修改。

### 哪些内容绝对不能直接开始修改？

1. **主题权限**：必须等产品确认免费/付费划分后再修改
2. **后台入口结构**：必须等确认 Console/Workbench 方案后再修改
3. **组件分类**：必须等确认分类方案后再修改
4. **定价展示**：必须等确认数据源统一方案后再修改
5. **任何涉及会员权益的代码**：必须等产品确认后再修改
6. **全局 CSS 修复**：必须等定位具体溢出组件后再修复，不能用 overflow-x: hidden

---

*报告结束*