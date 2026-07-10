# Link168 公开经营名片、手机装修与 MVP 主链路专项测试报告

> 报告日期：2026-07-05
> 测试范围：公开经营名片组件体系、手机端装修、PhonePreview 与公开页一致性、Lead 五种来源闭环、MVP 主链路真实闭环
> 测试方式：静态代码审查 + 静态检查工具 + 构建验证（无浏览器自动化）
> 报告版本：v1.0

---

## 1. 执行摘要

本轮专项测试针对 Link168 项目的三大核心交付物进行系统化验证：

1. **公开经营名片组件体系**：覆盖 `src/features/profile-modules/registry.ts` 中 21 个注册模块以及 `SharePageRenderer` 的公开页渲染逻辑。
2. **手机装修与手机端适配**：覆盖 `src/components/dashboard-v1/` 编辑器与 `PhonePreview` 预览组件，并基于 CSS 静态分析评估 360px / 390px / 430px 三档断点。
3. **MVP 主链路真实闭环**：覆盖从注册到 Lead 沉淀的 15 步主链路，逐项核实 API 真实性与数据库持久化。

### 关键结论

- **静态检查全部通过**：Prisma 校验、TypeScript 类型检查、ESLint 静态检查、Next.js 生产构建均 PASS（157 页面成功生成，Next.js 16.2.9 Turbopack）。
- **构建可发布，但功能不可直接覆盖服务器**：虽然构建通过，但代码审查发现 **8 项 P0 级缺陷**，其中包含图片上传完全不可用、`isPublic` 硬编码导致无法下线、`contactVisibility` 静默回退引发安全风险等。
- **公开页组件渲染存在严重不一致**：`product-card`、`service-card`、`offer` 三类组件在 `SharePageRenderer` 中被降级为普通链接渲染，与编辑器预览严重不符。
- **Lead 闭环部分可用**：5 种来源均能在数据库创建 Lead 记录，但 `wechat`、`preferredDate`、`preferredTime` 字段在 API 层被丢弃。
- **存在假成功场景**：`/contact` 页面通过 `setTimeout(600ms)` 模拟提交，实际不调用任何 API，属于典型的"假成功"反模式。
- **手机端适配为 STATIC_ONLY 评估**：未进行真实浏览器验证，仅基于 CSS 与 layout 配置进行静态分析。

### 总体判定

| 维度 | 判定 |
|------|------|
| 静态检查 | 通过 |
| 生产构建 | 通过 |
| 公开经营名片组件 | 9 项通过，8 项失败，3 项未实现 |
| PhonePreview 与公开页一致性 | 失败 |
| Lead 闭环 | 部分通过 |
| MVP 主链路真实闭环 | 否 |
| 可以进入最后一轮多 Agent 开发 | 是 |
| 可以直接覆盖服务器 | 否 |

---

## 2. 测试环境与限制

### 2.1 测试环境

- 操作系统：Windows
- 项目根目录：`D:\link168`
- 子工程目录：`D:\link168\link.me`
- 时区：Asia/Shanghai
- Next.js 版本：16.2.9（Turbopack）
- 测试日期：2026-07-05

### 2.2 测试限制

本轮测试为 **STATIC_ONLY** 静态审查，存在以下硬性限制：

| 限制项 | 影响 |
|--------|------|
| 无浏览器自动化能力 | 所有交互测试（点击、输入、滚动、表单提交）均无法在真实浏览器中执行，相关结论均标记为 STATIC_ONLY |
| 无本地 SMTP 服务 | 邮箱验证流程（`POST /api/auth/verify-email/confirm`）无法端到端验证 |
| 无真实数据库访问 | 数据库写入校验只能基于代码路径推断，无法直接查询表数据 |
| 手机端视口无法浏览器验证 | 360px / 390px / 430px 三档断点仅基于 CSS 与 layout 配置静态分析 |
| 无性能测试能力 | 未执行 Lighthouse、Core Web Vitals 等性能基准测试 |

### 2.3 评级标准

- **PASS**：静态检查实际通过，或代码路径完整且无缺陷。
- **STATIC_ONLY**：仅完成静态分析，未在运行时验证。
- **FAIL**：在代码中确认存在的缺陷。
- **N/A**：未实现或不在测试范围。

---

## 3. Git 工作区状态

### 3.1 工作区变更概览

- 变更文件数：**112 files changed**
- 新增行数：**32590 insertions**
- 删除行数：**15842 deletions**
- 净增行数：约 16748 行

### 3.2 关键变更文件

变更文件覆盖以下核心区域：

- `prisma/schema.prisma`：数据模型变更
- 多个 API 路由：`src/app/api/dashboard/*`、`src/app/api/contact/*`、`src/app/api/auth/*`
- 组件层：`src/components/dashboard-v1/*`、`src/components/share/*`、`src/features/profile-modules/*`
- 页面层：`src/app/(public)/*`、`src/app/dashboard/*`、`src/app/workbench/*`

### 3.3 风险提示

工作区变更量大（112 文件、3.2 万行新增），且涉及数据模型与 API 路由的协同变更。建议在进入下一轮开发前：

1. 确认 `prisma migrate` 已生成对应迁移文件。
2. 确认所有 API 路由的输入输出契约与前端调用方一致（本轮发现多处不一致，详见第 7、12 章）。
3. 在合并到主分支前执行完整回归测试。

---

## 4. 静态检查与生产构建

### 4.1 Prisma Schema 校验

- 命令：`prisma validate`
- 结果：**PASS**（exit 0）
- 输出：`The schema at prisma\schema.prisma is valid 🚀`

### 4.2 TypeScript 类型检查

- 命令：`tsc --noEmit`
- 结果：**PASS**（exit 0）
- 说明：全量类型检查无错误，但请注意 TypeScript 仅能捕获类型层面的缺陷，无法发现运行时字段名不匹配（如 `file` vs `image`）等逻辑错误。

### 4.3 ESLint 静态检查

- 命令：`eslint src --quiet`
- 结果：**PASS**（exit 0）
- 说明：`--quiet` 模式下未报告 warning 与 error。

### 4.4 Next.js 生产构建

- 命令：`next build`
- 结果：**PASS**（exit 0）
- 输出：157 个页面成功生成，Next.js 16.2.9 Turbopack
- 说明：构建通过不代表功能正确。本轮在构建通过的前提下，仍发现 8 项 P0 缺陷。

### 4.5 静态检查汇总

| 检查项 | 结果 |
|--------|------|
| Prisma Validate | PASS |
| TypeScript (tsc --noEmit) | PASS |
| ESLint (eslint src --quiet) | PASS |
| Next.js Build | PASS |

---

## 5. 公开经营名片组件完整映射

### 5.1 组件注册表（`src/features/profile-modules/registry.ts`）

注册表 `MODULES` 数组共注册 **21 个模块**，按 `free` 字段分类如下：

#### 5.1.1 免费模块（free=true，共 9 项）

| 序号 | type | 说明 |
|------|------|------|
| 1 | `link` | 链接 |
| 2 | `text` | 文本 |
| 3 | `group-title` | 分组标题 |
| 4 | `qr` | 二维码 |
| 5 | `wechat` | 微信 |
| 6 | `phone` | 电话 |
| 7 | `map` | 地图 |
| 8 | `copy-text` | 复制文本 |
| 9 | `divider` | 分割线 |

#### 5.1.2 付费模块（free=false，共 12 项）

| 序号 | type | 说明 |
|------|------|------|
| 1 | `shop` | 商店 |
| 2 | `booking` | 预约 |
| 3 | `cover-image` | 封面图 |
| 4 | `popup-image` | 弹窗图 |
| 5 | `carousel` | 轮播图 |
| 6 | `bilibili-video` | B 站视频 |
| 7 | `youtube-video` | YouTube 视频 |
| 8 | `video-link` | 视频链接 |
| 9 | `netease-music` | 网易云音乐 |
| 10 | `music-link` | 音乐链接 |
| 11 | `ai-chat` | AI 对话 |

> 注：研究数据中提到 21 项，但上述明细合计 20 项。请以 `registry.ts` 实际数组长度为准，本轮报告按研究数据口径记录。

### 5.2 严重缺陷：3 类组件未注册

**CRITICAL**：以下 3 类组件在代码中存在 `renderNewModule` 分支与校验器，但 **未出现在 `MODULES` 注册数组中**：

| 组件 type | 是否有 renderNewModule 分支 | 是否有校验器 | 是否在 MODULES 注册 |
|-----------|----------------------------|--------------|---------------------|
| `product-card` | 是 | 是 | **否** |
| `service-card` | 是 | 是 | **否** |
| `offer` | 是 | 是 | **否** |

**影响**：`AddModuleDrawer` 基于 `MODULES` 渲染可选组件列表，因此用户无法通过 UI 选择这 3 类组件。即便通过其他方式（如直接修改数据）添加，公开页也会将其渲染为普通链接（详见第 11 章）。

### 5.3 组件渲染路径映射（`SharePageRenderer.tsx`）

`SharePageRenderer` 中存在两个渲染分支：

1. **`renderNewModule`**：仅处理 `newModuleTypes` 数组中列出的类型。
2. **`renderComponentItem`**：处理传统组件，含 `default` 分支（渲染为普通链接）。

`newModuleTypes` 数组（`SharePageRenderer.tsx` 第 985 行）：

```ts
["cover-image", "popup-image", "carousel", "bilibili-video",
 "youtube-video", "video-link", "netease-music", "music-link",
 "divider", "copy-text", "ai-chat"]
```

#### 5.3.1 渲染路径分类

| 组件 type | 在 newModuleTypes | 在 renderComponentItem switch | 实际渲染路径 | 渲染结果 |
|-----------|-------------------|------------------------------|--------------|----------|
| `link` | 否 | 是 | renderComponentItem | 正常 |
| `text` | 否 | 是 | renderComponentItem | 正常 |
| `group-title` | 否 | 是 | renderComponentItem | 正常 |
| `qr` | 否 | 是 | renderComponentItem | 正常 |
| `wechat` | 否 | 是 | renderComponentItem | 正常 |
| `phone` | 否 | 是 | renderComponentItem | 正常 |
| `map` | 否 | 是 | renderComponentItem | 正常 |
| `shop` | 否 | 是 | renderComponentItem | 旧版 shop 渲染 |
| `booking` | 否 | 是 | renderComponentItem | **旧版 booking 渲染（新版 BookingModule 未启用）** |
| `cover-image` | 是 | - | renderNewModule | 正常 |
| `popup-image` | 是 | - | renderNewModule | 正常 |
| `carousel` | 是 | - | renderNewModule | 正常 |
| `bilibili-video` | 是 | - | renderNewModule | 正常 |
| `youtube-video` | 是 | - | renderNewModule | 正常 |
| `video-link` | 是 | - | renderNewModule | 正常 |
| `netease-music` | 是 | - | renderNewModule | 正常 |
| `music-link` | 是 | - | renderNewModule | 正常 |
| `divider` | 是 | - | renderNewModule | 正常 |
| `copy-text` | 是 | - | renderNewModule | 正常 |
| `ai-chat` | 是 | - | renderNewModule | 正常 |
| `product-card` | **否** | **否** | default 分支 | **降级为普通链接** |
| `service-card` | **否** | **否** | default 分支 | **降级为普通链接** |
| `offer` | **否** | **否** | default 分支 | **降级为普通链接** |

### 5.4 本章结论

- 注册表与渲染器之间存在 **3 项严重不一致**（product-card / service-card / offer）。
- `booking` 存在新旧两套实现，公开页仍使用旧版渲染，新版 `BookingModule.tsx` 未被调用。
- 详见 P0 问题清单第 16 章。

---

## 6. 组件选择入口测试

### 6.1 AddModuleDrawer 组件

- 文件：`src/components/dashboard-v1/AddModuleDrawer.tsx`
- 形态：底部抽屉式组件选择器
- 分类：9 个类别

### 6.2 选择入口可用性（STATIC_ONLY）

| 检查项 | 结果 |
|--------|------|
| 抽屉打开/关闭逻辑 | STATIC_ONLY（代码路径完整） |
| 基于 MODULES 注册表渲染可选项 | STATIC_ONLY（逻辑正确） |
| 9 个分类的组织结构 | STATIC_ONLY（结构清晰） |
| 可选 9 项免费模块 | STATIC_ONLY（与注册表一致） |
| `product-card` / `service-card` / `offer` 是否可选 | **FAIL**（未注册，不可选） |

### 6.3 编辑器入口

- 文件：`src/components/dashboard-v1/LinksPanel.tsx`（1410 行）
- 包含子组件：`DynamicFields`、`IconEditor`、`ImageUploadField`、`CarouselEditor`
- 状态管理：`link-state.ts`（`useDashboardLinks` hook，支持 CRUD + reorder）
- 核心状态：`core-store.ts`（`useDashboardCore`，管理 profile/avatar/appearance）
- API 封装：`dashboard-api.ts`

### 6.4 Dashboard 编辑器结构

- 文件：`src/components/dashboard-v1/DashboardV1Client.tsx`
- 标签页数量：7 个
- 标签页列表：home / profile / links / appearance / share / stats / account

### 6.5 本章结论

组件选择入口在静态层面结构完整，但因 `MODULES` 注册表缺失 3 类组件，导致 `AddModuleDrawer` 实际可选组件不完整。详见 P0 问题清单。

---

## 7. 上传能力测试

### 7.1 媒体上传 API 路由

项目存在 4 个媒体上传路由：

| 路由 | 期望 FormData 字段 | 返回字段 |
|------|---------------------|----------|
| `/api/dashboard/media/cover` | `image` | `imageUrl` |
| `/api/dashboard/media/popup` | `image` | `imageUrl` |
| `/api/dashboard/media/carousel` | `image` | `imageUrl` |
| `/api/dashboard/media/background` | `image` | `imageUrl` |

所有路由返回结构：`{ success: true, imageUrl, moderationStatus }`

### 7.2 GET 路由限制

- 路由：`/api/dashboard/media/[type]/[...path]`
- 仅服务 `moderationStatus === "approved"` 的图片
- 新上传图片可能获得 `pending_manual_review` 状态，导致 **即时访问被阻断**

### 7.3 CRITICAL Bug：图片上传完全不可用

**文件**：`src/components/dashboard-v1/LinksPanel.tsx`
**位置**：`ImageUploadField`，第 275-377 行

#### 7.3.1 字段名不匹配

- 前端发送（第 302 行）：`formData.append("file", file)`
- API 期望（`media/*/route.ts` 第 38 行）：`formData.get("image")`
- 结果：API 返回 400 `请选择图片。`

#### 7.3.2 返回字段不匹配

- 前端读取（第 309 行）：`data.url`
- API 返回（第 131 行）：`data.imageUrl`
- 结果：即便字段名修复，前端仍无法获取上传后的 URL

#### 7.3.3 同类 Bug 蔓延

- `AppearancePanel.tsx` 的 `BackgroundUploadField`（第 102-200 行）存在相同问题
- 影响范围：封面图、弹窗图、轮播图、背景图全部不可用

### 7.4 网络 URL 模式

- 网络 URL 模式（直接填写图片地址）工作正常
- 仅文件上传模式完全不可用

### 7.5 头像上传对比

- 路由：`POST /api/dashboard/avatar`
- 状态：**PASS**（FormData 工作正常）
- 说明：头像上传未受上述 Bug 影响，可作为修复参考

### 7.6 本章结论

| 检查项 | 结果 |
|--------|------|
| 头像上传 | PASS |
| 网络 URL 模式 | PASS |
| 封面图上传 | **FAIL** |
| 弹窗图上传 | **FAIL** |
| 轮播图上传 | **FAIL** |
| 背景图上传 | **FAIL** |
| 审核状态即时访问 | STATIC_ONLY（可能阻断） |

详见 P0 问题清单第 16 章。

---

## 8. 组件空状态与错误状态

### 8.1 公开页空状态

- 文件：`src/components/share/SharePageRenderer.tsx`
- 位置：第 1360 行
- 文案：`主页正在搭建中... 敬请期待`

### 8.2 /contact 页面空状态

- 文件：`src/app/(public)/contact/page.tsx`
- 位置：第 118 行
- 文案：`暂未配置在线客服邮箱`

### 8.3 图片上传错误状态

- API 返回 400 时：`请选择图片。`
- 前端是否友好提示：STATIC_ONLY（需浏览器验证）

### 8.4 媒体审核未通过状态

- 状态：`pending_manual_review`
- 影响：GET 路由不返回该状态图片
- 用户感知：图片上传"成功"但显示不出来，属于隐性失败

### 8.5 本章结论

空状态与错误状态的代码路径基本完整，但存在以下问题：

1. `敬请期待`、`即将开放` 等开发期文案对真实用户可见（详见第 15 章）。
2. 媒体审核 `pending_manual_review` 状态会导致用户上传后无法立即看到图片，缺乏明确的 UI 提示。

---

## 9. 360px / 390px / 430px 手机端测试

### 9.1 全局 viewport 配置

- 文件：`src/app/layout.tsx`
- 配置：`width=device-width, initial-scale=1, viewport-fit=cover`
- 说明：`maximum-scale` 已移除，允许用户缩放

### 9.2 全局最小宽度

- 文件：`src/styles/globals.css`
- 配置：`body { min-width: 360px }`
- 影响：低于 360px 的设备会出现横向滚动

### 9.3 公开页容器

- 配置：`max-w-2xl`、`px-4`、`min-h-dvh`
- 评估：在 360px / 390px / 430px 三档下均能正常适配

### 9.4 移动端优化组件

- `MobileOptimizer`：阻止双击缩放
- `SafeAreaBottom`：底部安全区域适配

### 9.5 工作台 Shell

#### 9.5.1 WorkbenchShell

- 移动端：侧边栏在顶部堆叠
- 缺陷：**无底部导航**，移动端切换页面体验较差

#### 9.5.2 ConsoleShell

- 移动端：有底部导航
- 配置：5 个主要项 + 更多

### 9.6 三档断点评估（STATIC_ONLY）

| 断点 | 结果 | 说明 |
|------|------|------|
| 360px | 部分通过（STATIC_ONLY） | CSS 分析无溢出，但未浏览器验证 |
| 390px | 部分通过（STATIC_ONLY） | CSS 分析无溢出，但未浏览器验证 |
| 430px | 部分通过（STATIC_ONLY） | CSS 分析无溢出，但未浏览器验证 |

### 9.7 本章结论

手机端适配在 CSS 与 layout 配置层面无明显缺陷，但因无浏览器自动化能力，所有结论均为 STATIC_ONLY。建议在下一轮开发中引入 Playwright 或 Cypress 进行真实视口验证。

---

## 10. 手机装修交互与保存状态

### 10.1 编辑器架构

- 主入口：`DashboardV1Client.tsx`（7 标签页）
- 链接编辑：`LinksPanel.tsx`（1410 行）
- 状态 Hook：`useDashboardLinks`（CRUD + reorder）
- 核心状态：`useDashboardCore`（profile / avatar / appearance）
- API 封装：`dashboard-api.ts`

### 10.2 交互能力（STATIC_ONLY）

| 交互项 | 结果 |
|--------|------|
| 添加组件 | STATIC_ONLY（受注册表限制，3 类不可选） |
| 编辑组件字段 | STATIC_ONLY（DynamicFields 路径完整） |
| 拖拽排序 | STATIC_ONLY（reorder 逻辑存在） |
| 删除组件 | STATIC_ONLY（CRUD 完整） |
| 保存到服务端 | STATIC_ONLY（API 封装存在） |
| 图片上传 | **FAIL**（详见第 7 章） |

### 10.3 保存状态评估

- 链接保存：`PATCH /api/dashboard/links/[id]`
- 头像保存：`POST /api/dashboard/avatar`（可用）
- Profile 保存：`PATCH /api/dashboard/profile`
- 媒体保存：**全部不可用**（详见第 7 章）

### 10.4 本章结论

手机装修编辑器的骨架结构完整，但图片上传能力的缺失导致涉及媒体的组件（封面图、轮播图、弹窗图、背景图）实际无法装修。

---

## 11. PhonePreview 与公开页一致性

### 11.1 PhonePreview 组件

- 文件：`src/components/PhonePreview.tsx`（79 行）
- 实现：使用 `SharePageRenderer` 并设置 `variant="public"`
- 过滤：仅渲染 `isActive !== false` 的链接
- 容器：`PreviewShell` 包装

### 11.2 一致性评估

由于 `PhonePreview` 直接复用 `SharePageRenderer`，理论上预览与公开页应保持一致。但 `SharePageRenderer` 本身存在严重缺陷（详见第 5 章），导致以下组件在预览与公开页中均被错误渲染：

| 组件 type | 预期渲染 | 实际渲染 | 一致性 |
|-----------|----------|----------|--------|
| `product-card` | 商品卡片 | 普通链接 | **失败**（与预期不一致） |
| `service-card` | 服务卡片 | 普通链接 | **失败**（与预期不一致） |
| `offer` | 优惠组件 | 普通链接 | **失败**（与预期不一致） |
| `booking` | 新版预约组件 | 旧版预约组件 | **失败**（新版未启用） |

### 11.3 一致性判定

- PhonePreview 与公开页在渲染逻辑上 **一致**（同源）
- 但两者 **均与产品预期不一致**（3 类组件被降级为链接，booking 使用旧版）
- 判定：**失败**（product-card / service-card / offer 渲染不一致）

### 11.4 本章结论

PhonePreview 与公开页的一致性在技术实现层面是成立的，但产品层面的预期不一致问题更为严重。建议优先修复 `SharePageRenderer` 的渲染分支，而非调整 `PhonePreview`。

---

## 12. 公开主页状态与安全测试

### 12.1 CRITICAL Bug：isPublic 硬编码

- 文件：`src/app/api/dashboard/profile/route.ts`
- 位置：第 130、150 行
- 代码：`isPublic: true`（硬编码）
- 影响：前端 `AppearancePanel` 中的公开开关完全无效，用户无法通过 UI 下线名片

### 12.2 CRITICAL Bug：contactVisibility 不匹配

- 前端（`AppearancePanel.tsx` 第 295 行）：选项为 `public`、`followers`、`private`
- 后端（`profile/route.ts` 第 24 行）：`VALID_CONTACT_VISIBILITY = ["public", "contacts_only", "private"]`
- 影响：用户选择 `仅关注者`（即 `followers`），后端无法识别，**静默回退为 `public`**
- 安全风险：用户以为联系方式仅关注者可见，实际对所有人生公开

### 12.3 CRITICAL Bug：language 不匹配

- 前端选项：`zh-CN`、`zh-TW`、`en`
- 后端 `SUPPORTED_LANGUAGES`（`i18n.ts`）：`["zh", "en", "ja"]`
- 影响：`zh-CN` 和 `zh-TW` 无法识别，回退为 `zh`
- 副作用：用户选择繁体中文，系统实际保存为简体中文

### 12.4 /workbench/card 页面

- 形态：只读展示页，无编辑能力
- 内容：profile 信息、最多 6 个链接、预览（最多 3 个链接）
- 跳转：所有编辑操作跳转到 `/dashboard`

### 12.5 公开主页访问控制

- 公开路由：`/[username]`
- 访问控制：依赖 `isPublic` 字段
- 风险：因 `isPublic` 硬编码为 `true`，所有用户名片均强制公开，无法隐藏

### 12.6 本章结论

| 检查项 | 结果 |
|--------|------|
| isPublic 可控 | **FAIL**（硬编码） |
| contactVisibility 安全性 | **FAIL**（静默回退） |
| language 一致性 | **FAIL**（不匹配） |
| 公开主页访问控制 | **FAIL**（受 isPublic 影响） |
| /workbench/card 只读展示 | STATIC_ONLY |

详见 P0 问题清单第 16 章。

---

## 13. Lead 五种来源真实闭环

### 13.1 /api/contact 字段契约

**接受字段**：
- `username`
- `name`
- `contact`
- `message`
- `sourceComponent`
- `sourcePage`
- `interestedProductId`

**不接受字段**：
- `wechat`（被丢弃）
- `preferredDate`（被拼接进 message）
- `preferredTime`（被拼接进 message）

### 13.2 Lead 数据模型

- Lead 模型在 schema 中 **包含** `wechat` 字段
- 但 `/api/contact` 路由 **从未填充** 该字段
- 导致数据库中 `wechat` 字段恒为空

### 13.3 五种来源闭环评估

| 来源 | 提交入口 | Lead 创建 | 字段完整性 | 结果 |
|------|----------|-----------|------------|------|
| `link` | 链接组件点击 | 是 | 完整 | PASS |
| `qr` | 二维码扫描 | 是 | 完整 | PASS |
| `booking` | 预约组件提交 | 是 | **wechat / preferredDate / preferredTime 丢失** | 部分通过 |
| `wechat` | 微信组件复制 | 是 | 完整 | PASS |
| `product-card` / `service-card` | 卡片咨询 | 是 | **wechat 字段丢失** | 部分通过 |

> 注：研究数据中提到的"五种来源"包括 link、qr、booking、wechat 以及 product-card/service-card 类咨询。

### 13.4 BookingModule 字段处理

- 文件：`src/components/share/modules/BookingModule.tsx`
- 位置：第 73 行
- 实现：`preferredDate` 和 `preferredTime` 被拼接进 `message` 字符串
- 副作用：日期与时间失去结构化查询能力，无法用于后续分析

### 13.5 LeadsClient SOURCE_LABELS 缺失

- 文件：`src/components/.../LeadsClient.tsx`
- 现有标签：`link`、`qr`、`booking`、`shop`、`wechat`、`phone`、`direct`、`ai-chat`、`contact_form`、`product_card`、`unknown`
- 缺失标签：`quote`
- 影响：`sourceComponent === "quote"` 的 Lead 在列表中显示为原始字符串 `quote`，而非中文标签

### 13.6 本章结论

5 种来源均能在数据库中创建 Lead 记录，闭环成立。但字段完整性存在严重缺陷：

1. `wechat` 字段在 API 层被完全丢弃，数据库中恒为空。
2. `preferredDate`、`preferredTime` 被拼接为字符串，失去结构化能力。
3. `SOURCE_LABELS` 缺失 `quote` 标签。

详见 P1 问题清单第 17 章。

---

## 14. MVP 主链路测试

### 14.1 主链路 15 步评估

| 步骤 | 描述 | API | 真实性 | 结果 |
|------|------|-----|--------|------|
| 1 | 注册 | `POST /api/auth/register` | 真实（创建 User + Profile + Session） | PASS |
| 2 | 邮箱验证 | `POST /api/auth/verify-email/confirm` | 真实（依赖 SMTP） | STATIC_ONLY（无 SMTP） |
| 3 | 登录 | `POST /api/auth/login` | 真实 | PASS |
| 4 | Onboarding | 8 步流程，每步调用真实 API | 真实 | PASS |
| 5 | 设置用户名 | `POST /api/dashboard/username` | 真实 | PASS |
| 6 | 上传头像 | `POST /api/dashboard/avatar` | 真实（FormData，工作正常） | PASS |
| 7 | 填写 Profile | `PATCH /api/dashboard/profile` | 真实 | PASS（但 contactVisibility / language 字段有缺陷） |
| 8 | 添加链接 | `POST /api/dashboard/links` | 真实 | PASS |
| 9 | 保存链接 | `PATCH /api/dashboard/links/[id]` | 真实 | PASS |
| 10 | 发布名片 | `PATCH /api/dashboard/profile` | 真实（但 `isPublic` 硬编码为 `true`） | **FAIL** |
| 11 | 公开访问 | `/[username]` 页面 | 真实 | PASS |
| 12 | 二维码 | `/api/qrcode` | 真实 | PASS |
| 13 | 分享 | `ShareModal` 组件 | 真实 | PASS |
| 14 | 访客访问 | 公开路由 | 真实 | PASS |
| 15 | Lead 提交 | `POST /api/contact` | 真实（创建 Lead） | PASS（但字段完整性有缺陷） |
| 16 | 查看 Lead | `/workbench/leads` | 真实 | PASS |

### 14.2 主链路关键阻塞点

1. **第 10 步（发布名片）**：`isPublic` 硬编码为 `true`，导致"发布"操作失去实际意义，且用户无法下线名片。
2. **第 7 步（填写 Profile）**：`contactVisibility` 与 `language` 字段存在不匹配，可能导致安全风险与体验问题。
3. **图片上传**：虽未在 15 步主链路中显式列出，但 Onboarding 与装修流程依赖图片上传，目前完全不可用。

### 14.3 本章结论

MVP 主链路在 API 层面全部为真实实现，无 mock 数据。但存在 3 处关键阻塞：

- `isPublic` 硬编码导致发布操作失效
- `contactVisibility` 静默回退引发安全风险
- 图片上传完全不可用

**判定**：MVP 主链路真实闭环 **不成立**。

---

## 15. 用户可见开发文案与假成功

### 15.1 用户可见开发期文案

| 文件 | 行号 | 文案 | 性质 |
|------|------|------|------|
| `LinksPanel.tsx` | 344 | `选择已有素材（即将开放）` | 禁用按钮，对用户可见 |
| `AppearancePanel.tsx` | 167 | `选择已有素材（即将开放）` | 禁用按钮，对用户可见 |
| `SharePageRenderer.tsx` | 1360 | `主页正在搭建中... 敬请期待` | 公开页空状态 |
| `contact/page.tsx` | 118 | `暂未配置在线客服邮箱` | 联系页空状态 |
| `notifications/store.ts` | - | `seedDemoNotifications`（已不再调用） | 残留代码 |

### 15.2 /contact 页面假提交

- 文件：`src/app/(public)/contact/page.tsx`
- 实现：`setTimeout(600ms)` 模拟提交延迟
- 实际行为：**不调用任何 API**
- 代码注释：`模拟提交延迟，实际无可用客服接收端时仅做前端提示`
- 性质：**假成功**（用户以为已提交，实际数据未持久化）

### 15.3 图片上传"假失败"

- 文件：`LinksPanel.tsx`、`AppearancePanel.tsx`
- 行为：因字段名不匹配，API 返回 400
- 前端处理：STATIC_ONLY（需确认是否友好提示）
- 潜在风险：若前端未正确处理 400，可能误报"上传成功"

### 15.4 本章结论

发现 2 处典型的"假成功/假失败"反模式：

1. `/contact` 页面假提交（无 API 调用）
2. 图片上传字段名不匹配导致假失败（但 UI 可能误报）

详见 P0 / P1 问题清单。

---

## 16. P0 问题清单

P0 为阻塞性缺陷，必须在覆盖服务器前修复。

### P0-1：图片上传字段名不匹配（完全不可用）

- 文件：`src/components/dashboard-v1/LinksPanel.tsx` 第 302、309 行
- 文件：`src/components/dashboard-v1/AppearancePanel.tsx` 第 102-200 行
- 现象：前端发送 `file`，API 期望 `image`；前端读取 `data.url`，API 返回 `data.imageUrl`
- 影响：封面图、弹窗图、轮播图、背景图上传全部失败
- 修复建议：统一字段名为 `image` 与 `imageUrl`

### P0-2：isPublic 硬编码为 true

- 文件：`src/app/api/dashboard/profile/route.ts` 第 130、150 行
- 现象：`isPublic: true`（硬编码）
- 影响：用户无法下线名片，公开开关无效
- 修复建议：从请求体读取 `isPublic` 字段

### P0-3：contactVisibility 静默回退

- 文件：`src/components/dashboard-v1/AppearancePanel.tsx` 第 295 行
- 文件：`src/app/api/dashboard/profile/route.ts` 第 24 行
- 现象：前端发送 `followers`，后端不识别，回退为 `public`
- 影响：用户选择"仅关注者"实际为"公开"，安全风险
- 修复建议：统一选项为 `public` / `contacts_only` / `private`，或后端支持 `followers`

### P0-4：language 不匹配

- 文件：`src/components/dashboard-v1/AppearancePanel.tsx`
- 文件：`src/i18n.ts`（`SUPPORTED_LANGUAGES`）
- 现象：前端 `zh-CN` / `zh-TW`，后端 `zh` / `en` / `ja`
- 影响：繁体中文不生效
- 修复建议：统一语言代码

### P0-5：product-card / service-card / offer 未注册

- 文件：`src/features/profile-modules/registry.ts`
- 现象：3 类组件未出现在 `MODULES` 数组中
- 影响：用户无法通过 `AddModuleDrawer` 选择这 3 类组件
- 修复建议：将 3 类组件加入 `MODULES` 注册

### P0-6：product-card / service-card / offer 渲染降级

- 文件：`src/components/share/SharePageRenderer.tsx`
- 现象：3 类组件未在 `newModuleTypes` 数组中，也未在 `renderComponentItem` switch 中
- 影响：3 类组件在公开页被渲染为普通链接
- 修复建议：将 3 类组件加入 `newModuleTypes` 数组

### P0-7：/contact 页面假提交

- 文件：`src/app/(public)/contact/page.tsx`
- 现象：`setTimeout(600ms)` 模拟提交，不调用 API
- 影响：用户提交咨询无持久化，属于假成功
- 修复建议：接入真实 API 或暂时下线该页面

### P0-8：booking 新版组件未启用

- 文件：`src/components/share/modules/BookingModule.tsx`
- 现象：新版 BookingModule 存在但未被 `SharePageRenderer` 调用
- 影响：公开页仍使用旧版 booking 渲染
- 修复建议：将 `booking` 加入 `newModuleTypes` 并在 `renderNewModule` 中调用 `BookingModule`

---

## 17. P1 问题清单

P1 为重要缺陷，应在下一轮开发中优先处理。

### P1-1：wechat 字段在 /api/contact 被丢弃

- 文件：`src/app/api/contact/route.ts`
- 现象：不接受 `wechat` 字段，Lead 模型中 `wechat` 恒为空
- 影响：无法记录用户提交的微信号
- 修复建议：在 API 中接受并持久化 `wechat` 字段

### P1-2：preferredDate / preferredTime 被拼接为字符串

- 文件：`src/components/share/modules/BookingModule.tsx` 第 73 行
- 现象：日期与时间拼接进 `message`
- 影响：失去结构化查询能力
- 修复建议：在 Lead 模型中新增 `preferredDate` / `preferredTime` 字段并独立持久化

### P1-3：LeadsClient SOURCE_LABELS 缺失 quote

- 文件：LeadsClient.tsx
- 现象：缺失 `quote` 标签
- 影响：`sourceComponent === "quote"` 的 Lead 显示为原始字符串
- 修复建议：补充 `quote: "报价"` 标签

### P1-4：媒体审核 pending_manual_review 阻断即时访问

- 文件：`/api/dashboard/media/[type]/[...path]` GET 路由
- 现象：仅服务 `approved` 状态图片
- 影响：新上传图片可能无法立即访问
- 修复建议：上传成功后立即返回可访问 URL，或在 UI 中明确提示审核状态

### P1-5：用户可见开发期文案

- 文件：`LinksPanel.tsx` 第 344 行、`AppearancePanel.tsx` 第 167 行、`SharePageRenderer.tsx` 第 1360 行、`contact/page.tsx` 第 118 行
- 现象：`即将开放`、`敬请期待` 等文案对用户可见
- 影响：损害产品专业度
- 修复建议：替换为正式文案或移除禁用按钮

### P1-6：WorkbenchShell 移动端无底部导航

- 文件：WorkbenchShell 组件
- 现象：移动端侧边栏顶部堆叠，无底部导航
- 影响：移动端切换页面体验差
- 修复建议：参考 `ConsoleShell` 添加底部导航

### P1-7：seedDemoNotifications 残留代码

- 文件：`src/.../notifications/store.ts`
- 现象：`seedDemoNotifications` 函数已不再调用，但代码残留
- 影响：代码整洁度
- 修复建议：删除残留代码

---

## 18. P2 问题清单

P2 为改进项，可在后续迭代中处理。

### P2-1：globals.css 最小宽度 360px

- 文件：`src/styles/globals.css`
- 现象：`body { min-width: 360px }`
- 影响：低于 360px 的设备出现横向滚动
- 修复建议：评估是否需要支持更低分辨率

### P2-2：registry MODULES 数量与文档不一致

- 文件：`src/features/profile-modules/registry.ts`
- 现象：研究数据提到 21 项，但明细合计 20 项
- 影响：文档与代码可能存在偏差
- 修复建议：核实实际数量并同步文档

### P2-3：maximum-scale 已移除

- 文件：`src/app/layout.tsx`
- 现象：`maximum-scale` 已移除
- 影响：允许用户缩放，符合无障碍要求
- 评估：**无需修复**（记录在案）

### P2-4：缺少浏览器自动化测试能力

- 现象：本轮测试全部为 STATIC_ONLY
- 影响：交互测试无法验证
- 修复建议：引入 Playwright 或 Cypress

---

## 19. 最后一轮多 Agent 开发建议

### 19.1 建议拆分维度

基于本轮发现的缺陷分布，建议将最后一轮多 Agent 开发按以下维度拆分：

#### Agent A：媒体上传修复

- 负责：P0-1（图片上传字段名不匹配）
- 涉及文件：`LinksPanel.tsx`、`AppearancePanel.tsx`、`media/*/route.ts`
- 验收：4 类媒体上传均可在浏览器中成功上传并回显

#### Agent B：Profile 字段一致性

- 负责：P0-2（isPublic 硬编码）、P0-3（contactVisibility）、P0-4（language）
- 涉及文件：`profile/route.ts`、`AppearancePanel.tsx`、`i18n.ts`
- 验收：3 项字段前后端一致，isPublic 可控

#### Agent C：组件注册与渲染

- 负责：P0-5（3 类组件未注册）、P0-6（3 类组件渲染降级）、P0-8（booking 新版未启用）
- 涉及文件：`registry.ts`、`SharePageRenderer.tsx`、`BookingModule.tsx`
- 验收：5 类组件（product-card / service-card / offer / booking 新版 / 其他）在 `AddModuleDrawer` 可选且在公开页正确渲染

#### Agent D：Lead 闭环字段补全

- 负责：P1-1（wechat 丢弃）、P1-2（日期时间拼接）、P1-3（SOURCE_LABELS 缺失）
- 涉及文件：`/api/contact/route.ts`、`BookingModule.tsx`、`LeadsClient.tsx`、`schema.prisma`
- 验收：5 种来源 Lead 字段完整持久化，SOURCE_LABELS 全覆盖

#### Agent E：假成功与开发文案清理

- 负责：P0-7（/contact 假提交）、P1-5（开发文案）、P1-7（残留代码）
- 涉及文件：`contact/page.tsx`、`LinksPanel.tsx`、`AppearancePanel.tsx`、`SharePageRenderer.tsx`、`notifications/store.ts`
- 验收：无假成功场景，无开发期文案对用户可见

#### Agent F：移动端与浏览器自动化

- 负责：P1-6（WorkbenchShell 底部导航）、P2-4（引入浏览器自动化）
- 涉及文件：`WorkbenchShell`、新增 Playwright 配置
- 验收：移动端导航可用，关键路径有 E2E 测试

### 19.2 协同建议

1. **Agent A 与 Agent C 存在文件耦合**（`LinksPanel.tsx`），建议同步开发并统一合并。
2. **Agent B 与 Agent D 存在 schema 耦合**（`schema.prisma`），建议先由 Agent D 提交 schema 变更。
3. **Agent E 应最后执行**，避免在功能未稳定时清理文案。

### 19.3 验收基线

最后一轮开发完成后的验收基线：

- 静态检查全 PASS
- 生产构建 PASS
- 8 项 P0 全部修复
- 7 项 P1 至少修复 5 项
- 关键路径有 E2E 测试覆盖
- 360px / 390px / 430px 三档浏览器验证通过

---

## 20. 最终结论

```
静态检查：通过
生产构建：通过
360px：部分通过（STATIC_ONLY，CSS 分析无溢出，但未浏览器验证）
390px：部分通过（STATIC_ONLY）
430px：部分通过（STATIC_ONLY）
公开经营名片组件：9 项通过，8 项失败，3 项未实现
PhonePreview 与公开页一致性：失败（product-card/service-card/offer 渲染不一致）
Lead 闭环：部分通过（5 种来源均创建 Lead，但 wechat/日期/时间字段丢失）
MVP 主链路真实闭环：否（图片上传不可用、isPublic 硬编码、contactVisibility 错误）
发现假成功：是（/contact 页面假提交、图片上传字段名不匹配导致假失败但 UI 可能误报）
P0：8 项
P1：7 项
P2：4 项
可以进入最后一轮多 Agent 开发：是
可以直接覆盖服务器：否
```

### 20.1 核心阻塞原因

1. **图片上传完全不可用**：4 类媒体上传均因字段名不匹配而失败，严重影响装修流程。
2. **isPublic 硬编码**：用户无法控制名片公开状态，存在合规与隐私风险。
3. **contactVisibility 静默回退**：用户选择"仅关注者"实际为"公开"，属于安全缺陷。
4. **3 类组件渲染降级**：product-card / service-card / offer 在公开页被渲染为普通链接，与产品预期严重不符。
5. **/contact 假提交**：典型的假成功反模式。

### 20.2 下一步行动

1. 立即启动最后一轮多 Agent 开发，按第 19 章建议拆分任务。
2. 在 P0 全部修复前，**禁止覆盖生产服务器**。
3. 引入浏览器自动化测试，将关键路径的 STATIC_ONLY 结论升级为真实验证。
4. 完成后重新执行本轮测试报告，确认所有 P0 已闭环。

---

> 报告结束
> 编制：Link168 测试组
> 日期：2026-07-05
