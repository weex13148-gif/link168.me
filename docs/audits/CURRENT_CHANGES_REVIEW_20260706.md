# Link168 当前工作区改动审查报告

审查日期：2026-07-06
审查范围：主题权限、公开主页缓存、vCard、全局 CSS、Onboarding
审查方式：只读 git diff + 静态代码审查

---

## 1. 审查边界

* **只读审查**，未修改任何代码
* **未测试 API**，仅检查接口定义和调用路径
* **未写数据库**，仅查看 schema 定义和数据流向
* **未运行浏览器**，移动端问题基于 CSS 断点分析
* **未执行构建**，不确认 TypeScript 或 ESLint 结果
* **未修改代码**，所有结论仅基于 git diff

---

## 2. 本轮可确认修改

基于 git diff，重点审查用户指定的 5 类文件：

### 2.1 主题权限相关
- src/app/api/dashboard/appearance/route.ts
- src/components/dashboard-v1/AppearancePanel.tsx
- src/components/theme/presetThemes.ts

### 2.2 公开主页缓存相关
- src/app/[username]/page.tsx
- src/lib/cache/public-profile.ts（新增文件）
- src/app/api/dashboard/profile/route.ts
- src/app/api/dashboard/appearance/route.ts
- src/app/api/dashboard/avatar/route.ts
- src/app/api/dashboard/links/route.ts
- src/app/api/dashboard/links/[id]/route.ts
- src/app/api/dashboard/links/reorder/route.ts
- src/app/api/dashboard/username/route.ts

### 2.3 vCard 隐私相关
- src/app/api/public/[username]/vcard/route.ts（新增文件）

### 2.4 全局手机端样式
- src/app/globals.css

### 2.5 Onboarding 相关
- src/components/onboarding/OnboardingWizard.tsx（新增文件）
- src/app/onboarding/page.tsx（新增文件）
- src/app/api/dashboard/username/route.ts
- src/app/api/dashboard/profile/route.ts
- src/app/api/dashboard/appearance/route.ts
- src/app/api/dashboard/avatar/route.ts

---

## 3. 修改审查表

| 文件 | 修改内容 | 业务影响 | 风险 | 建议保留/撤销/重做/暂不处理 | 理由 |
|------|---------|---------|------|---------------------------|------|
| [presetThemes.ts](file:///D:/link168/link.me/src/components/theme/presetThemes.ts) | 新增 12 个 V2 主题定义、免费/付费主题分类、旧名称映射 | 主题数量从 6 个扩展到 12 个，增加自定义主题支持 | 免费主题数量定义未经产品确认 | **C. 建议重新设计** | 主题数量和免费/付费划分属于商业权限决策，需产品确认 |
| [appearance/route.ts](file:///D:/link168/link.me/src/app/api/dashboard/appearance/route.ts) | 主题权限校验扩展到 13 个，新增 customTheme 接口，接入缓存失效 | 免费主题从 2 个变为 3 个（增加"草木原色"），新增自定义主题能力 | 免费主题扩大可能影响付费转化；自定义主题无权限校验 | **C. 建议重新设计** | 免费主题数量变化和自定义主题权限需产品确认 |
| [AppearancePanel.tsx](file:///D:/link168/link.me/src/components/dashboard-v1/AppearancePanel.tsx) | 从 6 主题选择器扩展为主题/自定义/系统三 Tab，新增自定义主题编辑器 | UI 复杂度大幅增加，新增 isPublic 开关和 contactVisibility 设置 | 自定义主题编辑体验待验证；系统设置混入主题页 | **C. 建议重新设计** | 功能扩展过大，需产品确认是否该版本上线 |
| [public-profile.ts](file:///D:/link168/link.me/src/lib/cache/public-profile.ts) | 新增 revalidatePath 封装函数，提供按用户名和用户 ID 失效 | 公开页缓存可精准失效 | force-dynamic 同时存在时缓存效果存疑；额外数据库查询 | **A. 建议保留** | 缓存基础设施，不影响业务逻辑，性能优化方向正确 |
| [[username]/page.tsx](file:///D:/link168/link.me/src/app/[username]/page.tsx) | 改用 PublicProfileClientWrapper、JSON-LD、StatePage 组件，新增 dynamic="force-dynamic" | 公开主页结构重构，增加 SEO 和状态页组件 | force-dynamic 与 revalidatePath 同时存在，缓存策略不一致 | **B. 建议精准撤销** | 移除 force-dynamic，保留组件重构；缓存策略需统一 |
| [vcard/route.ts](file:///D:/link168/link.me/src/app/api/public/[username]/vcard/route.ts) | 新增 vCard 下载接口 | 公开主页新增 vCard 能力 | 属于隐私接口，不在 UI 整改范围内；contactVisibility 检查存在但返回 404 不一致 | **D. 无法归因，暂不处理** | vCard 是功能开发，非 UI 结构问题，独立审查 |
| [globals.css](file:///D:/link168/link.me/src/app/globals.css) | body 新增 overflow-x:hidden、min-width 从 320 改 360px、新增响应式字体、safe-area、动画等 | 全局样式调整，影响所有页面 | overflow-x:hidden 可能截断弹窗和抽屉；属于掩盖问题而非修复 | **C. 建议重新设计** | 全局隐藏溢出是危险做法，应定位具体溢出组件修复 |
| [OnboardingWizard.tsx](file:///D:/link168/link.me/src/components/onboarding/OnboardingWizard.tsx) | 新增完整 Onboarding 组件（4 步引导） | 新用户注册后引导流程 | 代码完整存在，但验证页面有跳过入口 | **A. 建议保留** | Onboarding 是核心路径，功能完整，需配合验证页收口 |
| [verify-email/page.tsx](file:///D:/link168/link.me/src/app/verify-email/page.tsx) | 验证成功后跳转到 /onboarding，保留"稍后验证"链接 | 验证流程明确 | "稍后验证"可绕过 Onboarding | **A. 建议保留**（需配合收口） | 基础功能正确，仅需弱化跳过入口 |

---

## 4. 主题权限审查

### 当前权限状态

| 项目 | 修改前 | 修改后 | 变化 |
|------|--------|--------|------|
| 主题总数 | 6 个 | 12 个（V2）+ 自定义 | +6 个预设 + 自定义 |
| 免费主题 | "Link168 草木默认"、"简约白"（2 个） | "Link168 草木默认"、"草木原色"、"简约白"（3 个） | +1 个免费 |
| 付费主题 | 4 个 | 10 个 + 自定义 | +6 个 |
| 自定义主题 | 无 | 有 | 新增能力 |
| 后端校验 | FREE_THEMES Set 检查 | FREE_THEMES 扩展为 3 个，新增 customTheme 接口 | 校验扩展 |

### 关键问题

1. **别名重复风险（L1）**：
   - "Link168 草木默认" 和 "草木原色" 通过 `themeNameMap` 映射为同一个 V2 主题
   - 后端 FREE_THEMES 同时包含这两个名称，可能被统计为 2 个免费主题
   - 实际是同一个主题的新旧名称，用户感知为 1 个

2. **免费主题数量扩大（L1）**：
   - 修改前：2 个免费主题
   - 修改后：3 个（增加了"草木原色"，但实际是原默认主题的新名称）
   - 对用户感知影响：免费主题数量看似增加，实际可能只是改名

3. **自定义主题权限未校验（L1）**：
   - appearance/route.ts 中 customTheme 接口未检查会员权限
   - 任何用户都可以设置自定义主题
   - 属于权限漏洞

4. **无产品文档确认（L1）**：
   - 没有找到产品文档或老板确认的主题权益划分
   - 免费/付费主题数量、自定义主题归属均为开发侧自定

### 最终建议

**归类：C. 建议重新设计**

理由：
- 主题权益属于商业决策，需产品文档或老板确认
- 自定义主题权限校验缺失，需补全
- 别名问题需要澄清（是 2 个免费主题还是 1 个）
- 12 个主题是否该版本全部上线需确认

---

## 5. 缓存审查

### 当前缓存策略

| 项目 | 状态 | 证据 |
|------|------|------|
| 公开页 force-dynamic | **存在** | `export const dynamic = "force-dynamic"` 在 [username]/page.tsx |
| revalidatePath 工具 | **存在** | src/lib/cache/public-profile.ts |
| 接入的写入接口 | appearance、profile、avatar、links、username | 各 API route 中调用 revalidatePublicProfileByUser |
| username 修改双路径失效 | **已实现** | revalidateUsernameChange 函数 |

### 关键问题

1. **force-dynamic 与 revalidatePath 冲突（L1）**：
   - 页面设置了 `dynamic = "force-dynamic"`，意味着每次请求都重新渲染
   - 同时接入了 `revalidatePath`，但 force-dynamic 下缓存本就不生效
   - revalidatePath 当前没有实际性能价值

2. **隐私即时性 vs 性能（L2）**：
   - 隐私角度：用户修改后立即生效很重要
   - 性能角度：高流量时 force-dynamic 可能有压力
   - 当前阶段（准备商业化）隐私即时性优先于性能

3. **缓存失效时机（L2）**：
   - revalidatePublicProfileByUser 在数据库更新后调用
   - 但调用位置在 API route 中，是否在事务完成后需确认
   - 缓存失败是否静默？是否影响业务保存？

4. **不属于 UI 任务（L1）**：
   - 缓存架构是后端性能优化
   - 与 UI 产品结构整改无关
   - 不应混入 UI 整改任务

### 最终建议

**归类：A. 建议保留（但不纳入 UI 整改）**

理由：
- 缓存基础设施代码质量可接受
- force-dynamic 与 revalidatePath 同时存在不影响正确性，只是性能优化未到位
- 属于后端性能范畴，不在本次 UI 结构整改范围内
- 建议后续独立优化缓存策略

---

## 6. vCard 审查

### 安全规则检查

| 检查项 | 状态 | 证据 |
|--------|------|------|
| profile 不存在 | 返回 404 JSON | 第 43-45 行 |
| isPublic=false | 返回 404 JSON | 第 47-49 行 |
| 账号冻结/封禁 | 检查 getActiveRestrictions，返回 404 | 第 51-59 行 |
| contactVisibility=private | 返回 404 JSON | 第 61-63 行 |
| Content-Type | text/vcard; charset=utf-8 | 第 119 行 |
| Content-Disposition | attachment; filename="xxx.vcf" | 第 120 行 |
| 字段转义 | escapeVCard 函数处理 | 第 15-17 行 |

### 关键问题

1. **统一返回 404 JSON，但实际是 vCard 接口（L2）**：
   - 拒绝状态返回 JSON 错误信息
   - 正常状态返回 vCard 文件
   - 不一致但不构成安全问题

2. **不属于 UI 任务（L1）**：
   - vCard 是功能/隐私接口
   - 与 UI 产品结构整改无关

### 最终建议

**归类：D. 无法归因，暂不处理**

理由：
- vCard 是独立功能开发，不属于本轮 UI 结构整改范围
- 隐私检查逻辑基本完整
- 建议由安全/后端独立审查

---

## 7. 全局 CSS 审查

### 改动清单

| 改动 | 位置 | 影响 |
|------|------|------|
| `body { overflow-x: hidden }` | body 选择器 | 全局隐藏横向溢出 |
| `min-width: 360px`（原 320px） | body | 最小宽度上调 |
| `width: 100%; max-width: 100vw` | body | 宽度约束 |
| `--ui-warning` 变量 | :root | 新增警告色 |
| `animate-slide-up` 动画 | 全局 | 新增上滑动画 |
| 414px 以下响应式字体 14px | @media | 小屏字体调整 |
| 640px 以下响应式字体 15px | @media | 小屏字体调整 |
| 768px 容器宽度调整 | @media | 平板容器宽度 |
| safe-area-pt/pl/pr/inset | @supports | 安全区域 |
| 640px 以下 input font-size: 16px | @media | 防止 iOS 缩放 |
| `-webkit-text-size-adjust: 100%` | html | 禁止字体自动调整 |
| `-webkit-tap-highlight-color: transparent` | body | 移除点击高亮 |
| `overscroll-behavior-y: contain` | body | 控制滚动边界 |

### 关键问题

1. **overflow-x: hidden 是危险做法（L1）**：
   - 加在 body 上会全局隐藏横向溢出
   - 可能截断：抽屉、弹窗、下拉菜单、拖拽元素、sticky 元素
   - 属于"掩盖问题"而非"修复问题"
   - 没有定位具体是哪个组件产生溢出
   - 桌面端也会受影响

2. **min-width: 360px 可能有问题（L2）**：
   - 从 320px 上调到 360px
   - 小屏设备（如 320px 宽的旧手机）可能出现横向滚动
   - 但 320px 设备已非常少见

3. **大部分改动是合理的（L1）**：
   - safe-area 支持
   - iOS input 防缩放
   - 响应式字体调整
   - 点击高亮移除
   - 这些都是正常的移动端优化

### 最终建议

**归类：C. 建议重新设计**

理由：
- overflow-x: hidden 加在 body 上是危险的全局修复，必须移除
- 应定位具体产生横向溢出的组件，逐一修复
- 其他 CSS 改动（safe-area、字体、input 缩放）可保留
- 不能标记为"手机端 P0 已完成"，因为溢出只是被隐藏了

---

## 8. Onboarding 审查

### 真实现状

| 环节 | 当前状态 | 代码证据 | 证据等级 |
|------|---------|----------|---------|
| 注册成功跳转 | /verify-email | AuthCard.tsx:L65 | L1 |
| 邮箱验证成功跳转 | /onboarding（按钮） | verify-email/page.tsx:L98 | L1 |
| "稍后验证"入口 | 存在，跳 /dashboard | verify-email/page.tsx:L143 | L1 |
| Onboarding 步骤 | 4 步（welcome/username/profile/template → 实际需确认） | OnboardingWizard.tsx | L1 |
| 中途保存 | localStorage | onboarding-store.ts | L1 |
| 完成后跳转 | /dashboard | OnboardingWizard.tsx:L122 | L1 |
| 请求方法 | PUT/POST 对应 API | dashboard API | L1 |

### 关键问题

1. **Onboarding 代码完整存在（L1）**：
   - 不是"没有 Onboarding"
   - 是有 Onboarding 但可能被绕过

2. **"稍后验证"可绕过引导（L1）**：
   - 验证页面底部有"稍后验证，先进入后台"链接
   - 用户可直接进入 /dashboard，跳过 Onboarding
   - 新用户可能因此迷失

3. **功能验证状态（L3）**：
   - 静态代码看路径完整
   - 但未做浏览器验收，不能确认功能正常
   - 各步骤 API 对接需实际测试

### 最终建议

**归类：A. 建议保留（需配合收口）**

理由：
- Onboarding 组件完整，是核心用户路径
- 主要问题是验证页面的跳过入口太明显
- 建议弱化或移除"稍后验证"链接，强制新用户走 Onboarding
- 不建议撤销 Onboarding 代码

---

## 9. 最终处置清单

### A. 建议保留

| 文件 | 理由 |
|------|------|
| [public-profile.ts](file:///D:/link168/link.me/src/lib/cache/public-profile.ts) | 缓存基础设施，不影响业务逻辑，性能优化方向正确 |
| [OnboardingWizard.tsx](file:///D:/link168/link.me/src/components/onboarding/OnboardingWizard.tsx) | 新用户引导核心路径，代码完整 |
| [onboarding-store.ts](file:///D:/link168/link.me/src/components/onboarding/onboarding-store.ts) | 配合 Onboarding 使用 |
| verify-email/page.tsx（主体） | 验证流程正确，仅需调整跳过入口 |
| globals.css 中 safe-area、input 防缩放、响应式字体 | 合理的移动端优化 |
| [[username]/page.tsx 组件重构部分](file:///D:/link168/link.me/src/app/[username]/page.tsx) | PublicProfileClientWrapper、JSON-LD、StatePage 是合理重构 |

### B. 建议精准撤销

| 文件 | 撤销内容 | 理由 |
|------|---------|------|
| [[username]/page.tsx](file:///D:/link168/link.me/src/app/[username]/page.tsx) | `export const dynamic = "force-dynamic"` | 与 revalidatePath 策略冲突，且掩盖了缓存设计问题 |
| [globals.css](file:///D:/link168/link.me/src/app/globals.css) | `body { overflow-x: hidden }` | 全局隐藏溢出是危险做法，应定位具体组件修复 |
| [globals.css](file:///D:/link168/link.me/src/app/globals.css) | `body { min-width: 360px }`（改回 320px 或移除） | 可能导致小屏设备横向滚动，且无明确依据 |

### C. 建议重新设计

| 文件/模块 | 理由 | 需决策内容 |
|----------|------|----------|
| 主题权限体系（presetThemes + appearance API + AppearancePanel） | 商业权益决策需产品确认；自定义主题权限缺失；12 个主题是否全量上线待确认 | 免费/付费主题数量、自定义主题归属、上线范围 |
| 全局 overflow-x: hidden 替换方案 | 掩盖问题而非修复，需定位具体溢出组件 | 哪些组件真正产生溢出，逐一修复 |
| AppearancePanel 系统设置 Tab | isPublic、contactVisibility、language 混入主题页，信息架构不合理 | 系统设置是否应该独立页面 |

### D. 无法归因，暂不处理

| 文件 | 理由 |
|------|------|
| [vcard/route.ts](file:///D:/link168/link.me/src/app/api/public/[username]/vcard/route.ts) | 属于功能/隐私开发，不在 UI 结构整改范围内，独立审查 |
| 缓存接入的各 API 路由 | 属于后端性能优化，不在 UI 整改范围 |
| Jeepwork 相关改动 | 超级管理员后台，不在普通用户 UI 整改范围 |
| Showcase 相关改动 | 比赛展示系统，不在普通用户 UI 整改范围 |
| 支付、订单、会员相关改动 | 业务功能开发，不在 UI 结构整改范围 |
| AI 相关改动 | AI 能力开发，不在 UI 结构整改范围 |
| 短链接、产品、线索功能改动 | 业务功能开发，不在 UI 结构整改范围 |

---

*报告结束*