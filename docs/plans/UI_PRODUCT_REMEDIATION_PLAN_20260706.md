# Link168 UI 与产品结构整改计划

计划日期：2026-07-06
依据报告：
- docs/audits/UI_PRODUCT_STRUCTURE_AUDIT_20260706.md（证据复核版）
- docs/audits/CURRENT_CHANGES_REVIEW_20260706.md

---

## 1. 整改目标

1. **统一后台入口认知**：解决 Console/Workbench 双首页问题，让用户只有一个"管理中心"入口
2. **明确公开状态表达**：自动保存、实时公开的规则不变，但要让用户清楚知道"保存即公开"
3. **收口新用户路径**：注册 → 验证 → Onboarding → Dashboard，减少跳过和迷失
4. **优化组件分类表达**：9 个分类合并为用户能理解的 4-5 个大类，中文命名
5. **统一首页与套餐展示**：首页、pricing、membership 使用同一数据源，价值表达清晰
6. **确认手机端真实问题**：先人工确认，再针对性修复，不做全局溢出隐藏

---

## 2. 已确认不需要重复修复的能力

以下能力已通过代码审查确认存在，**不得重复开发**：

| 能力 | 状态 | 证据 |
|------|------|------|
| Dashboard 手机单列布局 | ✅ 已实现 | [DashboardFrame.tsx](file:///D:/link168/link.me/src/components/dashboard-v1/DashboardFrame.tsx#L148) `lg:grid-cols-[...]`，手机端默认单列 |
| 手机端隐藏预览 | ✅ 已实现 | [DashboardFrame.tsx](file:///D:/link168/link.me/src/components/dashboard-v1/DashboardFrame.tsx#L183) `hidden lg:block` |
| 名片底部导航入口（第二项） | ✅ 已实现 | [console-navigation.ts](file:///D:/link168/link.me/src/components/layout/console-navigation.ts#L58) MOBILE_BOTTOM_NAV 第二项是 /dashboard |
| SharePageRenderer 共享 | ✅ 已实现 | PhonePreview 和公开主页都使用 SharePageRenderer |
| 自动保存实时公开 | ✅ 已实现 | Profile.isPublic 默认 true，保存后立即生效 |
| Onboarding 组件 | ✅ 已存在 | OnboardingWizard.tsx + onboarding-store.ts |
| 公开页状态组件 | ✅ 已存在 | StatePage.tsx（未发布/冻结/封禁） |
| 安全区域 CSS 工具类 | ✅ 已存在 | safe-area-pb/pt/pl/pr/inset |

---

## 3. 产品结构方案对比

### 背景：Console 与 Workbench 首页重复

已确认（L1）：
- Console 首页（/console）：经营概览、统计卡片、功能快捷入口
- Workbench 首页（/workbench）：工作台、统计卡片、下一步建议
- 两者功能高度重叠，用户会困惑

Dashboard 是独立装修器，不参与合并，保持独立。

### 方案 A：保留 Console 为首页，Workbench 首页隐藏

**做法**：
- 保留 /console 作为唯一首页
- /workbench 重定向到 /console
- Workbench 子页面（leads、products、analytics 等）保留，路径不变
- 底部导航"首页"继续指向 /console
- 侧边导航只保留一套

**修改量**：小
- 移除 Workbench 首页（重定向即可）
- 统一侧边导航来源
- 底部导航不变

**用户认知**：
- 只有一个"首页/管理中心"
- 名片装修（Dashboard）是独立入口
- 客户经营、数据等子功能在侧边栏

**路由风险**：低
- 旧 URL 301 重定向
- 不影响业务数据

**现有代码复用**：高
- ConsoleShell 可继续使用
- Workbench 子页面无需改动

**手机导航影响**：无
- 底部导航 5 个 Tab 不变

---

### 方案 B：保留 Workbench 为首页，Console 隐藏

**做法**：
- 保留 /workbench 作为唯一首页
- /console 重定向到 /workbench
- 底部导航"首页"改为指向 /workbench
- 侧边导航统一为 Workbench 风格

**修改量**：中
- 底部导航第一项改 href
- ConsoleShell 可能需要调整
- 首页内容需要统一

**用户认知**：
- 只有一个"工作台/首页"
- 名片装修是独立入口

**路由风险**：中
- Console 是当前底部导航首页，修改影响大
- 旧书签失效

**现有代码复用**：中
- 需要统一两套 Shell

**手机导航影响**：有
- 底部导航第一项路径变更

---

### 方案 C：新建统一首页，旧路由兼容跳转

**做法**：
- 新建 /home 或 /admin 作为统一首页
- /console 和 /workbench 都重定向到新首页
- 重新设计首页内容，融合两者优点
- 侧边导航重新组织

**修改量**：大
- 新首页开发
- 两套 Shell 整合
- 导航重组

**用户认知**：
- 全新首页，最清晰
- 但改动最大

**路由风险**：中
- 两个旧 URL 都要重定向

**现有代码复用**：低
- 大量重写

**手机导航影响**：有
- 底部导航全部重新规划

---

### 推荐方案：方案 A

**理由**：
1. **修改量最小**：只需要隐藏 Workbench 首页，加一个重定向
2. **用户影响最小**：底部导航不变，用户已熟悉 Console 首页
3. **风险最低**：不改变现有导航结构，只是移除重复入口
4. **Dashboard 不受影响**：名片装修器保持独立，符合"名片装修是核心"的定位
5. **可渐进优化**：先收口，后续再逐步优化首页内容

**具体执行**：
- /workbench → 301 重定向到 /console
- WorkbenchShell 侧边导航中移除"工作台"首页项
- 保留 Workbench 子页面路径（/workbench/leads、/workbench/products 等）
- ConsoleShell 侧边导航保持不变
- 底部导航不变（首页 /console，名片 /dashboard）

---

## 4. 第一批 P0 任务（L1 已确认）

### P0-1：统一后台首页（方案 A）

**修改目标**：Console 作为唯一首页，Workbench 首页重定向

**文件范围**：
- src/app/workbench/page.tsx（改为重定向）
- src/components/workbench/WorkbenchShell.tsx（移除首页导航项）
- src/components/layout/console-navigation.ts（确认导航一致性）

**禁止触碰**：
- Dashboard 装修逻辑
- /workbench 子页面（leads、products 等）
- 底部导航
- API 接口
- Prisma

**前置依赖**：无

**验收标准**：
- 访问 /workbench 自动跳转到 /console
- 侧边导航中只有一个首页入口
- 所有子页面路径不变
- 底部导航 5 个 Tab 不变
- 用户登录后只有一个首页认知

**是否需要浏览器确认**：是

**是否依赖后台 API**：否

---

### P0-2：添加公开状态指示

**修改目标**：明确显示"已保存并公开"，区分保存状态和公开状态

**业务规则**（不得修改）：
- 自动保存
- 实时公开（isPublic 默认 true）
- 不新增发布流程

**文件范围**：
- src/components/dashboard-v1/DashboardFrame.tsx（SaveStatus 旁增加公开状态）
- src/components/dashboard-v1/core-store.ts（暴露 isPublic 状态）
- src/components/dashboard-v1/types.ts（类型扩展）

**禁止触碰**：
- isPublic 业务规则
- 数据库
- 保存逻辑
- 缓存

**前置依赖**：无

**验收标准**：
- 顶部状态栏同时显示"已保存"和"公开中"两种状态
- isPublic=false 时显示"已保存但未公开"
- 状态文案清晰，用户一眼能看懂
- 不改变保存行为
- 不影响自动保存

**是否需要浏览器确认**：是

**是否依赖后台 API**：否（isPublic 已在 profile 数据中）

---

### P0-3：添加"查看公开页"入口

**修改目标**：Dashboard 中每个 Tab 都有明显的"查看公开页"按钮

**文件范围**：
- src/components/dashboard-v1/DashboardFrame.tsx（顶部增加按钮）
- 或分享面板中强化入口

**禁止触碰**：
- 公开页渲染逻辑
- 公开页数据获取
- 缓存

**前置依赖**：P0-2 完成（状态表达统一）

**验收标准**：
- Dashboard 顶部有"查看公开页"按钮
- 点击在新标签打开公开主页
- 按钮位置明显，用户容易找到
- 不影响现有保存流程

**是否需要浏览器确认**：是

**是否依赖后台 API**：否

---

### P0-4：收口 Onboarding 路径

**修改目标**：减少跳过 Onboarding 的入口，强制新用户走引导

**业务规则**（不得修改）：
- 邮箱 30 天未验证冻结规则
- Onboarding 中途退出可继续
- Onboarding 完成后不重复进入

**文件范围**：
- src/app/verify-email/page.tsx（弱化"稍后验证"链接）
- 登录后检查 onboardingCompleted 状态（如不存在则增加）

**禁止触碰**：
- 邮箱验证 API
- 邮箱发送逻辑
- 数据库 schema（除非确需 onboardingCompleted 字段）
- Onboarding 步骤内容

**前置依赖**：无

**验收标准**：
- 验证页面"稍后验证"链接弱化（灰色小字、底部）
- 新用户注册后强烈引导进入 Onboarding
- Onboarding 完成后进入 Dashboard
- 已完成用户不重复进入
- 邮箱验证规则不变

**是否需要浏览器确认**：是

**是否依赖后台 API**：可能需要（onboarding 状态持久化）

---

## 5. 第二批 P1 任务

### P1-1：统一首页定价数据源

**修改目标**：首页定价区从 API 获取，与 pricing、membership 保持一致

**文件范围**：
- src/app/page.tsx（首页定价区改为客户端获取）

**禁止触碰**：
- plans.ts 套餐定义
- 价格
- 支付
- 会员权限
- 订单

**前置依赖**：无

**验收标准**：
- 首页、/pricing、/workbench/membership 三处置价完全一致
- 套餐名称、价格、功能列表一致
- 未登录用户也能看到定价
- 不改变价格和功能定义

**是否需要浏览器确认**：是

**是否依赖后台 API**：是（/api/workbench/membership 或公开定价 API）

---

### P1-2：优化套餐价值表达

**修改目标**：重写套餐功能描述，按用户场景表达价值

**文件范围**：
- src/lib/billing/plans.ts（features 文案）
- src/app/pricing/page.tsx（展示文案）
- src/app/page.tsx（首页展示文案）

**禁止触碰**：
- 价格
- 会员权限逻辑
- 支付
- 订单
- limits 配置

**前置依赖**：P1-1 完成（数据源统一后再改文案）

**验收标准**：
- 每个套餐的核心价值一眼能看懂
- 免费版限制清晰
- Plus/Pro 差异明确
- 企业版适合谁、能干嘛清楚
- 未开放能力标明"即将开放"或隐藏
- 不改变实际权益

**是否需要浏览器确认**：是

**是否依赖后台 API**：否（改文案即可）

---

### P1-3：合并组件分类为 4-5 个大类

**修改目标**：9 个分类合并为用户能理解的大类，不删除组件能力

**文件范围**：
- src/features/profile-modules（分类定义）
- src/components/dashboard-v1/AddModuleDrawer.tsx（分类展示）

**禁止触碰**：
- 组件渲染逻辑
- 组件数据库类型
- 会员权益
- 公开页渲染
- 删除任何组件

**前置依赖**：无

**验收标准**：
- 分类从 9 个减少到 4-5 个
- 分类名称使用普通用户能理解的中文
- 所有原有组件都能找到（只是换了分类）
- 免费/会员标记清晰
- 不删除任何组件能力

**是否需要浏览器确认**：是

**是否依赖后台 API**：否

---

### P1-4：统一企业空间命名

**修改目标**："知识库"和"企业工作空间"统一名称

**文件范围**：
- src/components/layout/console-navigation.ts（导航名称）
- src/app/console/page.tsx（快捷入口名称）
- 其他出现"知识库"但实际指企业空间的地方

**禁止触碰**：
- 企业空间业务逻辑
- 知识库文档功能
- 权限
- 数据库

**前置依赖**：无

**验收标准**：
- 所有导航入口名称一致
- 用户不会困惑"知识库"和"企业工作空间"是不是一个东西
- 不改变功能

**是否需要浏览器确认**：是

**是否依赖后台 API**：否

---

### P1-5：统一账户设置入口

**修改目标**：Dashboard 和 Workbench 都有账户设置，统一为一个入口

**文件范围**：
- src/components/dashboard-v1/DashboardFrame.tsx（账户 Tab 处理）
- src/components/layout/console-navigation.ts（导航统一）

**禁止触碰**：
- 账户设置业务逻辑
- 安全设置
- 数据库
- API

**前置依赖**：P0-1（后台收口后更清晰）

**验收标准**：
- 只有一个账户设置入口
- 用户不会困惑该去哪个改密码
- 不改变账户功能

**是否需要浏览器确认**：是

**是否依赖后台 API**：否

---

### P1-6：首页首屏突出 AI 价值

**修改目标**：首页首屏明确表达"AI 智能名片"，不被当成普通链接工具

**文件范围**：
- src/app/page.tsx（首屏文案和主视觉）

**禁止触碰**：
- 价格
- 支付
- 会员权限
- AI 核心逻辑

**前置依赖**：无

**验收标准**：
- 首屏 3 秒内能看懂"AI 名片 + 线索收集 + 客户经营"
- 不只是"链接聚合工具"
- 主按钮明确（免费创建）
- 不改变功能承诺

**是否需要浏览器确认**：是

**是否依赖后台 API**：否

---

## 6. 待人工确认任务（不直接开发）

以下任务**必须先人工页面确认**，确认有问题后再开发：

### C-1：Dashboard 手机 Tab 实际交互

**确认内容**：
- 7 个 Tab 在手机端如何展示
- 是否有横向滚动
- 操作是否方便
- 360px / 375px / 390px / 430px 下表现

**确认方式**：真机或浏览器开发者工具

**如果确认有问题**：
- 任务：优化手机端 Tab 展示
- 建议方案：底部 4-5 个核心 Tab，其余收入"更多"

---

### C-2：fixed 底部导航是否遮挡内容

**确认内容**：
- 各页面底部内容是否被导航栏遮挡
- safe-area-pb 是否生效
- iPhone 12+ 的 Home Indicator 是否遮挡按钮

**确认方式**：真机测试（重点 iPhone）

**如果确认有问题**：
- 任务：修复底部导航遮挡
- 建议方案：增加页面底部 padding，统一安全区域

---

### C-3：列表页移动端适配

**确认页面**：
- /workbench/leads（线索）
- /workbench/analytics（数据）
- /workbench/short-links（短链接）
- /workbench/products（产品）

**确认内容**：
- 360px 下是否横向滚动
- 表格是否转为卡片
- 筛选和搜索是否换行
- 操作按钮是否可点击

**确认方式**：浏览器开发者工具 + 真机

**如果确认有问题**：
- 任务：对应页面移动端适配
- 建议方案：表格改卡片、筛选优化、操作按钮适配

---

### C-4：弹窗、抽屉、长文本边界

**确认内容**：
- 支付弹窗在 360px 下是否完整显示
- 添加模块抽屉在小屏是否可用
- 长链接、长邮箱是否撑破布局
- 下拉菜单是否溢出屏幕

**确认方式**：浏览器开发者工具

**如果确认有问题**：
- 任务：对应组件边界修复
- 建议方案：针对具体组件修复，不使用全局 overflow-x: hidden

---

### C-5：沙箱测试按钮可见性

**确认内容**：
- 生产环境普通用户是否能看到"沙箱测试"按钮
- 开发/测试环境是否正常显示

**确认方式**：生产环境页面检查

**如果确认有问题**：
- 任务：隐藏沙箱按钮（生产环境）
- 建议方案：环境变量或角色控制

---

### C-6：预览与公开页视觉一致性

**确认内容**：
- 手机预览和真实公开页视觉是否完全一致
- 主题、间距、组件渲染是否有差异
- 保存后预览是否实时更新

**确认方式**：页面对比测试

**如果确认有问题**：
- 任务：统一渲染细节
- 建议方案：确保两端使用完全相同的组件和样式

---

## 7. 多 Agent 分工

### Agent A：后台入口与信息架构

**负责**：
- Console/Workbench 首页收口（P0-1）
- 侧边导航统一
- 底部导航确认（不改动，仅验证）
- 账户入口统一（P1-5）
- 企业空间命名统一（P1-4）

**文件范围**：
- src/app/workbench/page.tsx
- src/components/workbench/WorkbenchShell.tsx
- src/components/layout/console-navigation.ts
- src/components/layout/ConsoleShell.tsx
- src/app/console/page.tsx
- src/components/dashboard-v1/DashboardFrame.tsx（账户 Tab 部分）

**禁止**：
- Dashboard 装修逻辑
- API 接口
- Prisma
- Jeepwork
- Showcase
- 主题权限
- 会员业务

**前置依赖**：无

**验收标准**：
- 只有一个首页入口
- 导航名称一致
- 账户设置只有一个入口
- 企业空间命名统一
- 所有旧 URL 正确重定向
- 不影响业务功能

---

### Agent B：公开状态与新用户路径

**负责**：
- 保存状态 + 公开状态表达（P0-2）
- 查看公开页入口（P0-3）
- Onboarding 路径收口（P0-4）
- 验证页面跳转文案优化

**文件范围**：
- src/components/dashboard-v1/DashboardFrame.tsx
- src/components/dashboard-v1/core-store.ts
- src/components/dashboard-v1/types.ts
- src/app/verify-email/page.tsx
- src/components/onboarding/OnboardingWizard.tsx（只读，不改逻辑）

**禁止**：
- 修改邮箱 API
- 修改 isPublic 业务规则
- 数据库
- 缓存
- Onboarding 步骤内容
- 保存逻辑

**前置依赖**：无

**验收标准**：
- 公开状态清晰可见
- "查看公开页"按钮明显
- 新用户不容易跳过 Onboarding
- 不改变业务规则
- 不影响自动保存

---

### Agent C：组件入口与装修体验

**负责**：
- 组件分类合并（P1-3）
- 中文命名优化
- 空状态统一中文
- 上传方式说明（本地文件 vs 外部链接）
- 隐藏/删除交互确认
- 付费标记展示

**文件范围**：
- src/features/profile-modules
- src/components/dashboard-v1/AddModuleDrawer.tsx
- src/components/dashboard-v1/LinksPanel.tsx

**禁止**：
- 删除组件
- 改组件数据库类型
- 改会员权益
- 改公开页渲染
- 改主题权限
- 改保存逻辑

**前置依赖**：无

**验收标准**：
- 分类从 9 个减到 4-5 个
- 名称用户能理解
- 所有组件都能找到
- 空状态有中文提示
- 删除有确认
- 隐藏状态清晰
- 不删除任何组件能力

---

### Agent D：首页与套餐展示

**负责**：
- 首页首屏价值表达（P1-6）
- 首页定价数据源统一（P1-1）
- 套餐价值文案优化（P1-2）
- 未开放能力展示规则
- Showcase 不暴露（确认即可）

**文件范围**：
- src/app/page.tsx
- src/app/pricing/page.tsx
- src/lib/billing/plans.ts（仅文案，不改价格和权限）
- src/app/workbench/membership/page.tsx（仅展示层）

**禁止**：
- 改价格
- 改支付
- 改会员权限
- 改订单
- 改 plans.ts 中的 limits 配置
- 改业务逻辑

**前置依赖**：无（文案和数据源可并行）

**验收标准**：
- 三处置价完全一致
- 首页首屏突出 AI 名片价值
- 套餐价值表达清晰
- 未开放能力正确隐藏或标注
- 不改变实际权益
- Showcase 不在普通首页暴露

---

### Agent E：手机端人工确认与局部修复

**第一阶段（只读检查）**：

**检查设备宽度**：
- 360px
- 375px
- 390px
- 430px

**检查页面**：
- Dashboard 装修器（Tab、表单、抽屉）
- 线索列表
- 数据分析
- 短链接
- 产品管理
- 弹窗和抽屉
- 底部导航遮挡

**输出**：问题清单（有具体截图和组件）

**第二阶段（仅修复确认有问题的组件）**：

**禁止**：
- 全局 overflow-x: hidden 作为通用解决方案
- 重写 Dashboard
- 修改桌面端无关布局
- 改业务逻辑
- 改 API

**验收标准**：
- 只修复确认有问题的组件
- 每个修复有明确的问题和证据
- 不引入全局隐藏
- 不影响桌面端
- 360-430px 下无横向滚动

---

### Agent F：独立验收

**只读**，不修改代码

**检查清单**：
1. 导航是否统一（只有一个首页）
2. 自动保存实时公开表达是否清楚
3. Onboarding 路径是否顺畅
4. 组件分类是否清晰
5. 首页和套餐展示是否统一
6. 手机端已确认问题是否修复
7. 是否误改业务规则
8. 是否误改会员权益
9. 是否误改价格
10. 是否误改 API

**输出**：验收报告（通过/不通过 + 问题清单）

---

## 8. 文件所有权表

| 模块 | Agent A | Agent B | Agent C | Agent D | Agent E |
|------|---------|---------|---------|---------|---------|
| console-navigation.ts | ✅ 主责 |  |  |  |  |
| ConsoleShell.tsx | ✅ 主责 |  |  |  |  |
| WorkbenchShell.tsx | ✅ 主责 |  |  |  |  |
| workbench/page.tsx | ✅ 主责 |  |  |  |  |
| console/page.tsx | ✅ 主责 |  |  |  |  |
| DashboardFrame.tsx | ⚠️ 账户 Tab | ✅ 主责（状态/按钮） |  |  |  |
| core-store.ts |  | ✅ 主责 |  |  |  |
| types.ts（dashboard） |  | ✅ 主责 | ⚠️ 仅组件相关 |  |  |
| verify-email/page.tsx |  | ✅ 主责 |  |  |  |
| OnboardingWizard.tsx |  | ⚠️ 只读 |  |  |  |
| profile-modules/ |  |  | ✅ 主责 |  |  |
| AddModuleDrawer.tsx |  |  | ✅ 主责 |  |  |
| LinksPanel.tsx |  |  | ✅ 主责 |  |  |
| page.tsx（首页） |  |  |  | ✅ 主责 |  |
| pricing/page.tsx |  |  |  | ✅ 主责 |  |
| plans.ts |  |  |  | ⚠️ 仅文案 |  |
| membership/page.tsx |  |  |  | ⚠️ 仅展示层 |  |
| 手机端各页面 |  |  |  |  | ✅ 先检查后修 |

图例：
- ✅ 主责：主要负责修改
- ⚠️ 只读/局部：只读或只改很小一部分
- 空白：不触碰

---

## 9. 每个任务验收标准

| 任务 | 修改目标 | 文件范围 | 禁止触碰 | 前置依赖 | 验收标准 | 浏览器确认 | 依赖 API |
|------|---------|---------|---------|---------|---------|----------|---------|
| P0-1 | 统一后台首页 | workbench/page.tsx, WorkbenchShell.tsx, console-navigation.ts | Dashboard, API, Prisma | 无 | 只有一个首页，子路径不变，底部导航不变 | 是 | 否 |
| P0-2 | 公开状态指示 | DashboardFrame.tsx, core-store.ts, types.ts | isPublic 规则, DB, 保存逻辑 | 无 | 同时显示"已保存"和"公开中" | 是 | 否 |
| P0-3 | 查看公开页入口 | DashboardFrame.tsx | 公开页渲染, 缓存 | P0-2 | 顶部有明显按钮，新标签打开 | 是 | 否 |
| P0-4 | Onboarding 收口 | verify-email/page.tsx | 邮箱 API, DB schema | 无 | 弱化跳过链接，引导进入 Onboarding | 是 | 可能 |
| P1-1 | 定价数据源统一 | page.tsx（首页） | 价格, 支付, 权限 | 无 | 三处置价完全一致 | 是 | 是 |
| P1-2 | 套餐价值文案 | plans.ts, pricing/page.tsx, page.tsx | 价格, 支付, 权限 | P1-1 | 套餐价值清晰，差异明确 | 是 | 否 |
| P1-3 | 组件分类合并 | profile-modules, AddModuleDrawer.tsx | 组件类型, 权益, 渲染 | 无 | 4-5 个大类，组件不丢失 | 是 | 否 |
| P1-4 | 企业空间命名 | console-navigation.ts, console/page.tsx | 业务逻辑, 权限 | 无 | 名称统一不困惑 | 是 | 否 |
| P1-5 | 账户入口统一 | DashboardFrame.tsx, 导航 | 账户逻辑, DB | P0-1 | 只有一个账户设置入口 | 是 | 否 |
| P1-6 | 首页首屏优化 | page.tsx（首页） | 价格, 支付, AI 逻辑 | 无 | 首屏突出 AI 名片价值 | 是 | 否 |

---

## 10. 执行顺序

### 第一阶段：P0 核心认知问题

**并行 Agent**：Agent A + Agent B

| 顺序 | 任务 | Agent | 依赖 |
|------|------|-------|------|
| 1 | P0-1 统一后台首页 | Agent A | 无 |
| 1 | P0-2 公开状态指示 | Agent B | 无 |
| 2 | P0-3 查看公开页入口 | Agent B | P0-2 |
| 2 | P0-4 Onboarding 收口 | Agent B | 无 |

预计：1-2 个迭代

---

### 第二阶段：P1 转化与体验优化

**并行 Agent**：Agent C + Agent D

| 顺序 | 任务 | Agent | 依赖 |
|------|------|-------|------|
| 1 | P1-1 定价数据源统一 | Agent D | 无 |
| 1 | P1-3 组件分类合并 | Agent C | 无 |
| 1 | P1-4 企业空间命名 | Agent A | 无 |
| 1 | P1-5 账户入口统一 | Agent A | P0-1 |
| 2 | P1-2 套餐价值文案 | Agent D | P1-1 |
| 2 | P1-6 首页首屏优化 | Agent D | 无 |

预计：1-2 个迭代

---

### 第三阶段：手机端确认与修复

**Agent**：Agent E

| 顺序 | 内容 | 说明 |
|------|------|------|
| 1 | 人工检查确认 | 4 个宽度，6 类页面 |
| 2 | 针对性修复 | 只修确认有问题的 |

预计：1 个迭代（取决于问题数量）

---

### 第四阶段：独立验收

**Agent**：Agent F

- 全链路走查
- 输出验收报告
- 确认无误改业务规则

预计：0.5 个迭代

---

## 11. 风险控制

### 绝对禁止

1. ❌ 不删除未来功能（组件、页面、能力）
2. ❌ 不改变会员权益（免费/付费/企业）
3. ❌ 不修改支付逻辑
4. ❌ 不修改 AI 核心能力
5. ❌ 不修改 Prisma schema
6. ❌ 不修改 Jeepwork
7. ❌ 不暴露 Showcase 到普通首页
8. ❌ 不覆盖其他 Agent 的代码
9. ❌ 不把待确认项写成已完成
10. ❌ 不使用全局 overflow-x: hidden 作为修复方案

### 变更控制

1. 每个 Agent 只修改自己负责的文件
2. 交叉文件必须先沟通
3. 验收不通过的必须回退或修复
4. 不做计划外的"顺手优化"

### 回退预案

1. 每个任务有明确的回退方案
2. 路由变更保留旧 URL 重定向
3. 功能隐藏优先于删除
4. 文案修改可快速回滚

---

## 12. 最终老板决策表

| 批次 | 任务 | 是否已确认 | 是否可开发 | 风险 | 推荐顺序 |
|------|------|-----------|-----------|------|---------|
| P0 | 统一后台首页（方案 A） | ✅ L1 | ✅ 是 | 低 | 1 |
| P0 | 公开状态指示 | ✅ L1 | ✅ 是 | 低 | 1 |
| P0 | 查看公开页入口 | ✅ L1 | ✅ 是 | 低 | 2 |
| P0 | Onboarding 路径收口 | ✅ L1 | ✅ 是 | 中 | 2 |
| P1 | 定价数据源统一 | ✅ L1 | ✅ 是 | 低 | 3 |
| P1 | 套餐价值文案优化 | ✅ L1 | ✅ 是 | 低 | 4 |
| P1 | 组件分类合并 | ✅ L1 | ✅ 是 | 中 | 3 |
| P1 | 企业空间命名统一 | ✅ L1 | ✅ 是 | 低 | 3 |
| P1 | 账户入口统一 | ✅ L1 | ✅ 是 | 低 | 4 |
| P1 | 首页首屏优化 | ✅ L1 | ✅ 是 | 低 | 4 |
| 待确认 | 手机 Tab 交互 | ❌ L3 | ❌ 先确认 | — | 5 |
| 待确认 | 底部导航遮挡 | ❌ L3 | ❌ 先确认 | — | 5 |
| 待确认 | 列表页移动端 | ❌ L3 | ❌ 先确认 | — | 5 |
| 待确认 | 弹窗抽屉边界 | ❌ L3 | ❌ 先确认 | — | 5 |
| 待确认 | 沙箱按钮可见性 | ❌ L3 | ❌ 先确认 | — | 5 |
| 待确认 | 预览公开页一致性 | ❌ L2 | ❌ 先确认 | — | 5 |

---

*计划结束*