# Link168 UI 与产品结构审计报告（证据复核版）

审计日期：2026-07-06
审计范围：UI、产品结构、页面布局、用户路径、手机端体验
审计方式：只读代码审查（不运行、不创建数据、不调用外部 API）

---

## 1. 老板结论

**当前最大结构问题**：Console 和 Workbench 两套后台并存，功能大量重叠（首页概览、线索、产品、数据、会员、账户设置），但 Dashboard 作为独立装修器与前两者有明确职责区分，移动端底部导航已将"名片"放在第二位置，用户可见。

**当前最大手机端问题**：Dashboard 装修器在手机端已实现单列布局（预览默认隐藏），但底部导航固定在底部可能遮挡页面内容；线索、数据分析等页面的移动端适配待人工确认。

**当前最大转化问题**：首页定价硬编码与 API 返回不一致，会员套餐价值表达笼统；保存状态与公开状态表达不清，用户不确定修改后访客是否立即看到。

**是否需要整体重构**：不需要整体重构，但需要合并 Console/Workbench 后台入口，统一用户认知。

**是否可以直接拆任务开发**：部分问题（如保存状态表达、定价统一）可直接拆任务，移动端适配需先做人工页面确认。

---

## 2. 审计边界

* **仅静态代码审查**，未运行页面
* **未测试 API**，仅检查接口调用路径
* **未写数据库**，仅查看 schema 定义
* **未做浏览器验收**，移动端问题基于 CSS 断点分析
* **以下结论需要后续人工页面确认**：
  - 移动端页面实际渲染效果
  - 预览与公开页视觉一致性
  - 沙箱测试按钮在生产环境的显示逻辑
  - Jeepwork 的实际访问控制效果

---

## 3. 当前真实入口结构

### 普通用户可进入的导航结构

```
登录后默认进入：/dashboard

底部导航（手机端，5 个入口）
├── 首页 → /console
├── 名片 → /dashboard
├── 客户 → /workbench/leads
├── 数据 → /workbench/analytics
└── 我的 → /workbench/account

桌面端侧边导航（ConsoleShell）
├── 经营核心
│   ├── 首页概览 → /console
│   ├── 名片装修 → /dashboard （推荐）
│   └── 产品与服务 → /workbench/products
├── 增长与数据
│   ├── 客户线索 → /workbench/leads
│   ├── 短链接 → /workbench/short-links
│   └── 数据分析 → /workbench/analytics
├── AI 与企业
│   ├── AI 助手 → /workbench/ai （Beta）
│   └── 企业工作空间 → /workbench/enterprise
└── 账户与设置
    ├── 会员与套餐 → /workbench/membership
    └── 账户设置 → /workbench/account
```

### 其他路由分类

| 路由类型 | 路由示例 | 是否对普通用户可见 | 说明 |
|---------|---------|------------------|------|
| 公开页面 | /, /pricing, /help, /contact | 是 | 无需登录 |
| 认证页面 | /register, /login, /verify-email | 是 | 登录/注册流程 |
| Onboarding | /onboarding | 条件可见 | 注册后首次进入 |
| 公开主页 | /[username] | 是 | 访客可访问 |
| 历史兼容 | /dashboard（旧装修器） | 是 | 独立入口，已确认 |
| 管理员路由 | /jeepwork/* | 否 | 角色守卫 |
| 隐藏路由 | /showcase/* | 否 | 无导航入口 |

---

## 4. 三后台事实核查

### 入口与职责矩阵

| 路由 | 用户从哪里进入 | 普通用户是否可见 | 实际职责 | 是否重复 | 证据文件 |
|------|--------------|------------------|---------|---------|---------|
| /console | 底部导航"首页"、桌面端侧边栏"首页概览" | **是**（L1） | 经营概览：统计卡片、下一步建议、功能快捷入口 | 与 Workbench 首页重复（L1） | [console-navigation.ts](file:///D:/link168/link.me/src/components/layout/console-navigation.ts#L43) |
| /dashboard | 底部导航"名片"、桌面端侧边栏"名片装修" | **是**（L1） | 名片装修器：资料编辑、链接管理、主题设置、预览 | 独立职责，不重复（L1） | [console-navigation.ts](file:///D:/link168/link.me/src/components/layout/console-navigation.ts#L44) |
| /workbench | 桌面端侧边栏"工作台"（仅 WorkbenchShell） | **是**（L1） | 工作台首页：统计卡片、下一步建议、线索/产品/账号 | 与 Console 首页重复（L1） | [console-navigation.ts](file:///D:/link168/link.me/src/components/layout/console-navigation.ts#L71) |
| /workbench/card | Workbench 首页"AI 名片"入口 | **仅付费/管理员**（L1） | AI 名片只读展示页，编辑跳回 Dashboard | 与 Dashboard 功能割裂（L1） | [workbench/card/page.tsx](file:///D:/link168/link.me/src/app/workbench/card/page.tsx#L18) |

### 功能重复分析

| 功能模块 | Console | Dashboard | Workbench | 重复情况 |
|---------|---------|-----------|-----------|---------|
| 首页概览 | ✅ 经营概览 | ✅ 我的主页 | ✅ 工作台首页 | **三首页重复**（L1） |
| 名片装修 | ❌ | ✅ 完整装修器 | ⚠️ AI 名片只读页 | Dashboard 独立（L1） |
| 产品管理 | ❌ | ❌ | ✅ | 无重复（L1） |
| 客户线索 | ⚠️ 最新3条 | ❌ | ✅ 完整列表 | Console 概览 vs Workbench 详情（L1） |
| 短链接 | ⚠️ 统计数字 | ❌ | ✅ 完整列表 | Console 概览 vs Workbench 详情（L1） |
| 数据分析 | ⚠️ 概览卡片 | ⚠️ 数据中心 Tab | ✅ 完整页面 | 三个数据入口（L1） |
| 会员状态 | ✅ | ✅ | ✅ | 状态展示重复（L1） |
| 账户设置 | ❌ | ✅ | ✅ | Dashboard vs Workbench（L1） |

### 结论

**已确认双后台问题**（L1）：Console 和 Workbench 首页功能高度重叠，都提供经营概览、统计卡片、下一步建议。Dashboard 作为独立装修器职责清晰，不与前两者重复。

---

## 5. 四条核心用户路径

### 路径 A：新用户第一次使用

**当前步骤**（L1 已确认）：
```
注册 → 邮箱验证 → 点击"开始创建我的名片" → Onboarding（4步）→ 完成后跳转到 /dashboard
```

**代码证据**：
- 注册成功后跳转到 `/verify-email`（[AuthCard.tsx](file:///D:/link168/link.me/src/components/AuthCard.tsx#L65)）
- 验证成功后按钮跳转到 `/onboarding`（[verify-email/page.tsx](file:///D:/link168/link.me/src/app/verify-email/page.tsx#L98)）
- Onboarding 完成后跳转到 `/dashboard`（[OnboardingWizard.tsx](file:///D:/link168/link.me/src/components/onboarding/OnboardingWizard.tsx#L122)）

**中断点**：
| 环节 | 当前跳转 | 代码证据 | 是否明确 | 主要问题 | 证据等级 |
|------|---------|----------|---------|---------|---------|
| 注册成功 | /verify-email | AuthCard.tsx:L65 | **明确**（L1） | 无 | L1 |
| 邮箱验证成功 | /onboarding（按钮） | verify-email/page.tsx:L98 | **明确**（L1） | 无 | L1 |
| Onboarding 完成 | /dashboard | OnboardingWizard.tsx:L122 | **明确**（L1） | 无 | L1 |
| 用户可跳过验证 | /dashboard（链接） | verify-email/page.tsx:L143 | **明确**（L1） | 跳过验证后无引导 | L1 |
| 用户可跳过 Onboarding | 无明确跳过按钮 | OnboardingWizard.tsx | **待确认**（L3） | 是否有跳过机制 | L3 |
| 进度保存 | localStorage | onboarding-store | **明确**（L1） | localStorage 存储 | L1 |

**关键问题**：验证页面有"稍后验证，先进入后台"链接，用户可能跳过 Onboarding 直接进入 Dashboard，导致新用户引导失效（L1）。

---

### 路径 B：老用户编辑名片

**当前步骤**（L1 已确认）：
```
登录 → /dashboard → 修改内容 → 自动保存 → 查看实时预览
```

**代码证据**：
- 登录成功后跳转到 `/dashboard`（[AuthCard.tsx](file:///D:/link168/link.me/src/components/AuthCard.tsx#L69)）
- Dashboard 使用自动保存机制（[core-store.ts](file:///D:/link168/link.me/src/components/dashboard-v1/core-store.ts)）
- 实时预览只显示已保存内容（[DashboardFrame.tsx](file:///D:/link168/link.me/src/components/dashboard-v1/DashboardFrame.tsx#L190)）

**中断点**：
| 环节 | 问题 | 证据等级 |
|------|------|---------|
| 保存后是否公开 | 无明确提示，用户不确定 | L1 |
| 查看公开页入口 | 无明显按钮 | L1 |
| 预览与公开页一致性 | PhonePreview 仅展示已保存数据 | L1 |

**关键问题**：用户保存后不知道修改是否已对访客生效，缺少"查看公开页"入口（L1）。

---

### 路径 C：访客访问名片

**当前步骤**（L1 已确认）：
```
打开 /[username] → 查看身份和链接 → AI 客服入口 → 线索提交
```

**代码证据**：
- 公开主页路由 `/[username]`（[page.tsx](file:///D:/link168/link.me/src/app/[username]/page.tsx)）
- 使用 SharePageRenderer 渲染（[SharePageRenderer.tsx](file:///D:/link168/link.me/src/components/share/SharePageRenderer.tsx)）
- AI 客服模块 AiChatModule（[AiChatModule.tsx](file:///D:/link168/link.me/src/components/share/modules/AiChatModule.tsx)）

**中断点**：
| 环节 | 问题 | 证据等级 |
|------|------|---------|
| AI 客服入口可见性 | 待人工确认 | L3 |
| 线索提交反馈 | 待人工确认 | L3 |
| 页面加载速度 | 待人工确认 | L3 |

---

### 路径 D：用户升级会员

**当前步骤**（L1 已确认）：
```
遇到付费功能 → 弹出 UpgradeDialog → 跳转到 /workbench/membership → 选择套餐 → 支付
```

**代码证据**：
- UpgradeDialog 组件（[UpgradeDialog.tsx](file:///D:/link168/link.me/src/components/dashboard-v1/UpgradeDialog.tsx)）
- 会员页面 `/workbench/membership`（[membership/page.tsx](file:///D:/link168/link.me/src/app/workbench/membership/page.tsx)）
- 定价页 `/pricing`（[pricing/page.tsx](file:///D:/link168/link.me/src/app/pricing/page.tsx)）

**中断点**：
| 环节 | 问题 | 证据等级 |
|------|------|---------|
| 首页定价 vs API 定价 | 可能不一致 | L1 |
| 套餐差异表达 | 功能描述笼统 | L1 |
| 沙箱测试按钮 | 环境控制，待确认 | L2 |

---

## 6. 手机端代码风险

### 6.1 Dashboard 装修器

| 文件 | 组件 | 代码或 className | 影响宽度 | 风险等级 | 是否已确认 | 证据等级 |
|------|------|-----------------|---------|---------|-----------|---------|
| DashboardFrame.tsx | 页面容器 | `lg:grid-cols-[224px_minmax(0,1fr)_auto]` | 360-991px | **低** | 手机端单列（<lg 无三栏） | L1 |
| DashboardFrame.tsx | 预览区域 | `hidden lg:block` | 360-991px | **低** | 手机端默认隐藏预览 | L1 |
| DashboardFrame.tsx | 侧边导航 | `hidden lg:block` | 360-991px | **低** | 手机端无侧边导航 | L1 |
| DashboardFrame.tsx | 页面底部 | `pb-24 lg:pb-0` | 360-991px | **中** | 有底部 padding，但需确认是否足够 | L1 |
| DashboardV1Client.tsx | Tab 切换 | `primaryItems` 7 项 | 360-991px | **待确认** | 手机端 Tab 展示方式待确认 | L3 |

**结论**：Dashboard 在手机端已有单列布局，预览默认隐藏（L1）。但 Tab 切换方式和底部 padding 是否足够需要人工确认（L3）。

### 6.2 底部导航

| 文件 | 组件 | 代码或 className | 影响宽度 | 风险等级 | 是否已确认 | 证据等级 |
|------|------|-----------------|---------|---------|-----------|---------|
| ConsoleShell.tsx | 底部导航 | `fixed inset-x-0 bottom-0 z-40` | 全部 | **中** | fixed 定位，可能遮挡内容 | L1 |
| ConsoleShell.tsx | 安全区域 | `safe-area-pb` | 390-430px | **待确认** | safe-area-pb 实现待确认 | L3 |
| ConsoleShell.tsx | 导航项 | `MOBILE_BOTTOM_NAV` 5 项 | 全部 | **低** | 5 个入口合理 | L1 |
| ConsoleShell.tsx | 名片位置 | `/dashboard` 在第二项 | 全部 | **低** | 名片装修可见，不在"更多" | L1 |
| ConsoleShell.tsx | 更多菜单 | `max-h-[85vh] overflow-y-auto` | 全部 | **中** | 可能需要滚动 | L1 |

**结论**：底部导航名片装修在第二项（L1），但 fixed 定位可能遮挡内容（L1），安全区域实现待确认（L3）。

### 6.3 列表页移动端

| 页面 | 文件 | 组件 | 移动端适配 | 风险等级 | 证据等级 |
|------|------|------|-----------|---------|---------|
| 线索 | [LeadsClient.tsx](file:///D:/link168/link.me/src/components/workbench/LeadsClient.tsx) | 卡片式列表 | **待确认** | L3 |
| 数据分析 | [analytics/page.tsx](file:///D:/link168/link.me/src/app/workbench/analytics/page.tsx) | 图表 + 统计 | **待确认** | L3 |
| 短链接 | [ShortLinksClient.tsx](file:///D:/link168/link.me/src/components/workbench/ShortLinksClient.tsx) | 卡片式列表 | **待确认** | L3 |
| 产品 | [ProductsClient.tsx](file:///D:/link168/link.me/src/components/workbench/ProductsClient.tsx) | 卡片式列表 | **待确认** | L3 |

**结论**：列表页均使用卡片式布局，但具体移动端样式需人工确认（L3）。

### 6.4 弹窗与抽屉

| 文件 | 组件 | 代码或 className | 影响宽度 | 风险等级 | 证据等级 |
|------|------|-----------------|---------|---------|---------|
| pricing/page.tsx | 支付弹窗 | `max-w-md` | 360px | **中** | 接近全屏，关闭按钮难点 | L1 |
| pricing/page.tsx | 沙箱弹窗 | 条件显示 | 全部 | **待确认** | sandboxAvailable 控制 | L2 |

---

## 7. 名片装修与公开页一致性

### 7.1 数据保存规则

| 规则 | 代码证据 | 证据等级 |
|------|----------|---------|
| 自动保存 | core-store.ts 中的 saveProfileRequest、saveAppearanceRequest | L1 |
| 保存状态反馈 | SaveStatus 组件（已保存/未保存/保存中/保存失败） | L1 |
| Profile.isPublic 默认 true | schema.prisma:L125 `@default(true)` | L1 |
| 保存后立即公开 | 无发布按钮，保存即生效 | L1 |

**结论**：A. 产品采用自动保存、实时公开，但状态表达不清（L1）

### 7.2 手机预览与公开页一致性

| 能力 | 手机预览实现 | 公开页实现 | 是否共享 | 差异风险 | 证据等级 |
|------|-------------|-----------|---------|---------|---------|
| 页面渲染器 | PhonePreview → SharePageRenderer | [username]/page → SharePageRenderer | **共享** | 无 | L1 |
| 模块渲染器 | SharePageRenderer 内部渲染 | SharePageRenderer 内部渲染 | **共享** | 无 | L1 |
| 主题样式 | getThemeClasses | getThemeClasses | **共享** | 无 | L1 |
| 数据来源 | 已保存数据（`仅显示已经保存的公开内容`） | 已保存数据 | **一致** | 无 | L1 |

**结论**：手机预览与公开页使用同一套渲染组件（L1），差异风险低。

### 7.3 组件体系

| 组件分类 | 数量 | 用户用途 | 证据等级 |
|---------|------|---------|---------|
| 身份与品牌 | 基础信息 | 展示身份 | L1 |
| 联系与快捷操作 | 多个 | 联系用户 | L1 |
| 内容展示 | 多个 | 展示内容 | L1 |
| 产品与转化 | 多个 | 转化客户 | L1 |
| 图片与媒体 | 多个 | 视觉展示 | L1 |
| 视频模块 | 多个 | 视频展示 | L1 |
| 音频模块 | 多个 | 音频展示 | L1 |
| AI 与互动 | AI 客服 | AI 接待 | L1 |
| 信任与合规 | 待确认 | 信任背书 | L3 |

**问题**：9 个分类太多，新用户选择困难（L1）。

---

## 8. 商业化与会员表达

### 8.1 定价数据源对比

| 页面 | 数据来源 | 套餐名称 | 价格来源 | 是否硬编码 | 证据等级 |
|------|---------|---------|---------|-----------|---------|
| 首页定价区 | 硬编码 `plans` 数组 | 免费版/Plus/Pro/企业/企业专业 Plus | 硬编码 | **是** | L1 |
| /pricing | API `/api/workbench/membership` | 动态获取 | 动态获取 | **否** | L1 |
| /workbench/membership | API `/api/workbench/membership` | 动态获取 | 动态获取 | **否** | L1 |

**问题**：首页定价硬编码与 API 返回可能不一致（L1）。

### 8.2 套餐价值表达

| 问题 | 代码证据 | 证据等级 |
|------|----------|---------|
| 功能描述笼统 | plans.ts 中"基础访客 AI 助理"、"更多 AI 与文件额度" | L1 |
| 免费版限制不明确 | free 套餐 features 仅 5 项 | L1 |
| Plus/Pro 差异不清晰 | 价格差 200 元，但功能列表区分度低 | L1 |

### 8.3 沙箱测试按钮

| 条件 | 代码证据 | 证据等级 |
|------|----------|---------|
| 显示控制 | `sandboxAvailable` 从 API 获取 | L1 |
| 环境控制 | payment.sandbox_available 由后端决定 | L2 |
| 普通用户可见性 | 待人工确认 | L3 |

**结论**：沙箱按钮有环境控制（L1），但普通生产环境是否可见待确认（L3）。

---

## 9. 老板决策清单

| 编号 | 优先级 | 问题 | 证据等级 | 用户影响 | 建议决策 |
|------|--------|------|---------|---------|---------|
| 1 | **P0** | Console 和 Workbench 双首页重复，用户不知道该进哪个 | L1 | 结构混乱，入口困惑 | 合并为统一后台首页 |
| 2 | **P0** | 保存后无"已公开"状态表达，用户不确定修改是否生效 | L1 | 用户不敢分享名片 | 添加公开状态指示 |
| 3 | **P0** | Dashboard 缺少"查看公开页"入口 | L1 | 用户无法确认最终效果 | 添加公开页跳转按钮 |
| 4 | **P0** | 验证页面有跳过入口，新用户可能绕过 Onboarding | L1 | 新用户引导失效 | 移除或弱化跳过链接 |
| 5 | **P1** | 首页定价硬编码与 API 不一致 | L1 | 价格混乱，不信任感 | 统一从 API 获取定价 |
| 6 | **P1** | 套餐功能描述笼统，用户难以判断价值 | L1 | 付费转化率低 | 重写套餐价值文案 |
| 7 | **P1** | 组件分类 9 个太多，新用户选择困难 | L1 | 添加模块时焦虑 | 合并为 4-5 个大类 |
| 8 | **P1** | 底部导航 fixed 定位可能遮挡页面内容 | L1 | 页面最下方内容不可见 | 添加安全区域 padding |
| 9 | **P1** | Dashboard 和 Workbench 都有账户设置，入口重复 | L1 | 用户困惑该用哪个 | 统一入口 |
| 10 | **P2** | 首页首屏未突出 AI 差异化价值 | L1 | 被当成普通链接工具 | 重写首屏文案 |
| 11 | **P2** | 手机端 Tab 切换方式待确认 | L3 | 可能操作不便 | 人工确认后优化 |
| 12 | **P2** | 列表页移动端适配待确认 | L3 | 可能横向滚动 | 人工确认后优化 |
| 13 | **P2** | 沙箱测试按钮生产环境可见性待确认 | L3 | 可能影响专业感 | 人工确认后处理 |
| 14 | **P2** | 企业空间命名混乱（"知识库"vs"企业工作空间"） | L1 | 用户困惑 | 统一命名 |
| 15 | **P2** | AI 名片页与 Dashboard 功能割裂 | L1 | 来回跳转 | 合并编辑入口 |

---

## 10. 可直接开发任务（L1 已确认）

| 任务编号 | 模块 | 修改目标 | 文件范围 | 禁止触碰 | 验收标准 | 建议 Agent |
|----------|------|---------|---------|---------|---------|-----------|
| T1 | 后台架构 | 合并 Console 和 Workbench 首页，统一为"管理中心" | console-navigation.ts, ConsoleShell.tsx, workbench/page.tsx | Dashboard 装修器 | 登录后只有一个首页入口 | Agent A |
| T2 | 名片装修 | 添加"公开状态"指示，区分保存和公开 | DashboardFrame.tsx, core-store.ts | 业务逻辑 | 保存后显示"已公开"状态 | Agent C |
| T3 | 名片装修 | 添加"查看公开页"按钮 | DashboardFrame.tsx | 公开页渲染 | 每个 Tab 都有公开页跳转入口 | Agent C |
| T4 | 新用户引导 | 移除验证页面的"跳过"链接，强制进入 Onboarding | verify-email/page.tsx | 其他验证逻辑 | 验证成功后只能进入 Onboarding | Agent A |
| T5 | 定价页面 | 首页定价区改为从 API 获取，与/pricing 统一 | page.tsx（首页） | plans.ts | 三处定价完全一致 | Agent E |
| T6 | 定价页面 | 重写套餐功能描述，明确价值差异 | plans.ts, pricing/page.tsx | 定价逻辑 | 用户能快速理解套餐差异 | Agent E |
| T7 | 组件系统 | 合并组件分类为 4-5 个大类 | AddModuleDrawer.tsx, profile-modules | 模块渲染器 | 分类清晰，新用户易选择 | Agent C |
| T8 | 底部导航 | 添加安全区域 padding，防止遮挡内容 | ConsoleShell.tsx | 桌面端布局 | 手机端内容不被导航栏遮挡 | Agent B |
| T9 | 账户设置 | 统一账户设置入口，移除重复入口 | console-navigation.ts | 账户业务逻辑 | 只有一个账户设置入口 | Agent A |
| T10 | 命名规范 | 统一"知识库"和"企业工作空间"命名 | console-navigation.ts, console/page.tsx | 企业空间业务逻辑 | 导航中名称一致 | Agent A |

---

## 11. 待人工确认清单

| 编号 | 问题 | 证据等级 | 需要确认的内容 | 确认方式 |
|------|------|---------|--------------|---------|
| C1 | 手机端 Dashboard Tab 切换方式 | L3 | 7 个 Tab 在手机端如何展示 | 真机测试 |
| C2 | 列表页移动端适配 | L3 | 线索/数据/短链接/产品在 360px 下是否横向滚动 | 真机测试 |
| C3 | 安全区域实现 | L3 | safe-area-pb 是否正确生效 | 真机测试（iPhone 12+） |
| C4 | 沙箱测试按钮可见性 | L3 | 生产环境普通用户是否可见 | 生产环境检查 |
| C5 | 预览与公开页一致性 | L2 | 视觉是否完全一致 | 页面对比 |
| C6 | AI 客服入口可见性 | L3 | 公开主页 AI 入口是否明显 | 页面观察 |
| C7 | Jeepwork 访问控制 | L2 | 普通用户访问 /jeepwork 是否被拒绝 | 权限测试 |
| C8 | Showcase 入口 | L3 | 普通用户是否能通过导航进入 | 页面检查 |

---

## 12. 建议产品结构

### 12.1 手机端结构

```
底部导航（5 个 Tab）
├── 名片 → 名片装修器（编辑/预览切换）
├── 客户 → 线索管理
├── 数据 → 数据分析
├── 内容 → 产品管理 + 短链接
└── 我的 → 会员 + 账户设置 + 企业空间
```

### 12.2 电脑端结构

```
左侧导航
├── 名片装修（核心，最上方）
│   ├── 资料设置
│   ├── 内容模块
│   ├── 主题装修
│   └── 分享预览
├── 客户经营
│   ├── 线索管理
│   ├── AI 客服配置
│   └── 产品服务
├── 数据中心
│   ├── 访问分析
│   ├── 线索分析
│   └── AI 数据
├── 工具
│   ├── 短链接
│   └── 企业空间
└── 账户
    ├── 会员套餐
    └── 账号安全
```

### 12.3 后台合并建议

由于 Console 和 Workbench 首页功能重复（L1），建议：
1. 保留 `/dashboard` 作为独立名片装修器
2. 合并 `/console` 和 `/workbench` 为统一管理后台
3. 保留兼容路由（301 重定向）
4. 不做大规模数据迁移

---

## 13. 最终结论

**结论：B. 可进入分阶段结构整改**

### 判断依据

1. **双后台问题已确认（L1）**：Console 和 Workbench 首页功能高度重叠，需要合并。
2. **保存/公开状态问题已确认（L1）**：产品采用自动保存实时公开，但状态表达不清，需要改进。
3. **新用户引导问题已确认（L1）**：验证页面有跳过入口，可能导致 Onboarding 失效。
4. **部分移动端问题待确认（L3）**：Tab 切换、列表页适配需要人工确认后再决定是否开发。
5. **定价数据源问题已确认（L1）**：首页硬编码与 API 不一致，需要统一。

### 建议执行顺序

**第一阶段**（L1 已确认，可直接开发）：
- 合并 Console/Workbench 后台（T1, T9, T10）
- 添加公开状态指示（T2, T3）
- 强制新用户 Onboarding（T4）
- 统一定价数据源（T5）

**第二阶段**（L1 已确认，可直接开发）：
- 优化套餐价值表达（T6）
- 合并组件分类（T7）
- 修复底部导航遮挡（T8）

**第三阶段**（人工确认后）：
- 根据 C1-C8 的确认结果决定是否开发

---

*报告结束*