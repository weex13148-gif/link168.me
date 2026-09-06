# LINK168 UI DESIGN SYSTEM

**版本：** 1.1
**日期：** 2026-08-13
**状态：** CURRENT TARGET UI CONTRACT
**视觉方向：** 方向 2 — 温暖编辑感的专业服务品牌
**适用范围：** Marketing、Auth、Onboarding、Console、Editor、Public Page、Lead、Billing、Enterprise、Jeepwork。

## 1. 设计目标

Link168 的界面应同时表达：

1. **可信**：像真实专业服务，不像模板市场或 AI 演示；
2. **温暖**：有人、有内容、有呼吸感，不过度冷硬；
3. **直接**：每个页面有清楚主任务，减少配置负担；
4. **可控**：Draft、Preview、Publish、AI 事实和点数状态明确；
5. **可转化**：高意图操作使用稳定蓝色，引导联系而不强迫；
6. **一致**：公开页与后台不同场景共享品牌、组件和状态语言。

禁止把以下视觉作为当前方向：

- 只有灰色框线和说明文字的“高保真”；
- 赛博、电光、玻璃拟态、荧光壁纸；
- 大面积无意义渐变；
- 为显得“AI”而堆机器人、星光或科技线；
- 复杂仪表盘占据主页核心；
- 过度圆润、像儿童玩具的全局胶囊 UI。

## 2. 品牌资产

### 2.1 固定资产清单

使用 OWNER 提供的 `link168-logo-system`。本开发包已将原始文件放在 `assets/link168-logo-system/assets/`，并在 `assets/link168-logo-system-original.zip` 保留原始交付：

- `link168-logo-light.svg`；
- `link168-logo-dark.svg`；
- `link168-logo-nav.svg`；
- `link168-logo-mark.svg`；
- `link168-app-icon.svg`；
- `link168-favicon.svg`；
- `link168-share-entry.svg`（仅视觉参考）；
- raster favicon 32 / 180 / 512。

实施时建议放入 `public/brand/link168/`，实际路径由 Codex 对照仓库结构决定。

| 包内源文件 | 建议运行时用途 | 说明 |
| --- | --- | --- |
| `link168-logo-nav.svg` | Marketing / Console 浅色导航 | 小尺寸横向 Logo |
| `link168-logo-light.svg` | 浅色大展示区 | 保留完整安全区 |
| `link168-logo-dark.svg` | 深色背景 | 不把浅色版反相代替 |
| `link168-logo-mark.svg` | 紧凑品牌标记 | 不代替 16px favicon |
| `link168-app-icon.svg` | PWA / App icon 源 | 按平台要求输出 raster |
| `link168-favicon.svg`、raster 32 / 180 / 512 | Browser / Apple touch / Manifest | 使用匹配尺寸，不缩小完整 wordmark |
| `link168-share-entry.svg` | 分享入口视觉参考 | 产品中用语义化 `<a>` / `<button>` 重建交互，不把整张图当按钮 |

Codex 必须先比较真实仓库中同名资产的哈希和用途：相同则复用现有路径；不同则报告来源差异并以 OWNER 固定资产为视觉依据，不得自行融合两个 Logo。

### 2.2 资产规则

- 不重绘、不压扁、不拉伸、不改变内部比例；
- 不随意替换品牌色；
- 四周安全区至少为标志高度的 0.25 倍；
- 深色背景用 dark 版本，浅色背景用 light / nav 版本；
- 16px favicon 使用简化标志，避免把完整 wordmark 缩小；
- SVG 中依赖 `<text>` 的 wordmark 在生产前转为 path 或使用经过确认的矢量版；
- `share-entry.svg` 不能直接当作不可访问的图片按钮，实际用 `<a>` / `<button>` 和可读标签实现；
- Logo 旁不擅自增加未确认的公司全称。

### 2.3 品牌色与 UI 色的关系

固定 Logo 使用：

- Brand Blue `#1677FF`；
- Cyan `#12B8FF`；
- Deep Brand Blue `#0A4ED7`；
- Brand Gold `#F4BE5F` / `#D9942D`；
- Brand Ink `#0A1426` / `#11213A`；
- Brand Light `#F8FBFF`。

界面主操作使用更沉稳的 Action Blue `#0B4DD8`。二者必须使用不同 token，不应把 Logo 内部色直接拿来作为所有按钮颜色。

## 3. 核心设计 tokens

### 3.1 Color

| Token | Hex | 用途 |
| --- | --- | --- |
| `--color-canvas` | `#F7F2E9` | Marketing、Auth、公开页外层暖象牙背景 |
| `--color-surface` | `#FFFDF9` | 主要卡片、输入、内容表面 |
| `--color-surface-strong` | `#FFFFFF` | Console 数据表、弹窗、强对比区域 |
| `--color-ink` | `#151515` | 主文字 |
| `--color-ink-muted` | `#5E5A54` | 次要说明 |
| `--color-ink-subtle` | `#8B847B` | 辅助标签、时间 |
| `--color-line` | `#DDD6CC` | 默认边框 / 分隔 |
| `--color-line-strong` | `#BEB5A9` | hover / 强分隔 |
| `--color-gold` | `#E9A52B` | UI 品牌强调、选中痕迹 |
| `--color-gold-soft` | `#F7E7C4` | 暖色标签 / 轻背景 |
| `--color-action` | `#0B4DD8` | 高意图主按钮、链接、focus |
| `--color-action-hover` | `#083EA9` | 主按钮 hover |
| `--color-action-soft` | `#EAF0FF` | 选中、信息提示背景 |
| `--color-success` | `#168A5B` | 成功、已发布、已联系 |
| `--color-success-soft` | `#E5F4EC` | 成功背景 |
| `--color-warning` | `#B8750B` | 未保存、宽限、配置不完整 |
| `--color-warning-soft` | `#FFF0D4` | 警告背景 |
| `--color-danger` | `#B42318` | 错误、删除、逾期 |
| `--color-danger-soft` | `#FDECEA` | 错误背景 |
| `--color-info` | `#2563EB` | 中性信息 |
| `--color-overlay` | `rgba(21,21,21,.48)` | Dialog / drawer 遮罩 |

### 3.2 对比规则

- 主正文使用 `ink`，不在正文使用 `subtle`；
- 主按钮白字仅在满足 AA 的 Action Blue / Danger 上；
- Gold 不作为小号白字按钮背景；金色用于标记、图形、浅底强调；
- 禁用控件仍要可识别，不用过低透明度导致看不见；
- status 同时提供图标或文字，不只靠颜色。

### 3.3 Typography

字体族：

```css
--font-display: "Noto Serif SC", "Source Han Serif SC", serif;
--font-ui: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
--font-mono: "SFMono-Regular", Consolas, monospace;
```

| 样式 | Desktop | Mobile | 字重 | 字体 | 用途 |
| --- | --- | --- | --- | --- | --- |
| Display XL | 52 / 1.12 | 38 / 1.18 | 700 | Serif | Marketing Hero |
| Display L | 40 / 1.18 | 32 / 1.22 | 700 | Serif | 公开页主标题 |
| H1 | 32 / 1.25 | 28 / 1.28 | 700 | Sans / Serif 按场景 | Console / 页面标题 |
| H2 | 24 / 1.35 | 22 / 1.35 | 700 | Sans | Section 标题 |
| H3 | 20 / 1.4 | 18 / 1.4 | 700 | Sans | 卡片标题 |
| Body L | 18 / 1.65 | 17 / 1.6 | 400 | Sans | 公开页说明 |
| Body | 16 / 1.55 | 16 / 1.55 | 400 | Sans | 界面正文 |
| Body S | 14 / 1.5 | 14 / 1.5 | 400 | Sans | 辅助说明 |
| Label | 14 / 1.3 | 14 / 1.3 | 700 | Sans | 表单标签 |
| Meta | 12 / 1.4 | 12 / 1.4 | 400 / 700 | Sans | 时间、状态 |

规则：

- Console 不大面积使用衬线；衬线用于 Marketing、公开页展示标题和少量品牌句；
- 中文正文不使用过紧字距；
- 数字指标使用 tabular numbers；
- 每行中文正文推荐 28–42 个汉字，Marketing 不超过约 48；
- 不使用全大写英文作为主要导航。

### 3.4 Spacing

以 4px 为基础：

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96`

推荐语义：

- 控件内间距：8 / 12 / 16；
- 字段之间：20；
- 卡片内边距：20 mobile、24–32 desktop；
- Section 之间：48 mobile、72–96 desktop；
- 页面顶部：24–32 Console，64–96 Marketing / Public；
- 不允许在业务组件内散落无法解释的 13px、27px 等一次性值。

### 3.5 Radius

| Token | 值 | 用途 |
| --- | ---: | --- |
| `--radius-sm` | 8px | 小控件、标签 |
| `--radius-md` | 10px | Button、Input |
| `--radius-lg` | 14px | Card、Dropdown |
| `--radius-xl` | 20px | 大卡片、移动 drawer 顶部 |
| `--radius-2xl` | 28px | Marketing / Public 大视觉容器 |
| `--radius-pill` | 999px | 仅 status / filter chip / avatar |

采用混合圆角。普通表格、输入和后台卡片不得全部做成巨大胶囊。

### 3.6 Shadow

```css
--shadow-sm: 0 4px 12px rgba(44, 34, 20, .08);
--shadow-md: 0 10px 28px rgba(44, 34, 20, .10);
--shadow-lg: 0 20px 56px rgba(44, 34, 20, .14);
--shadow-focus: 0 0 0 3px rgba(11, 77, 216, .22);
```

Console 更依赖边框和层级，Marketing / Public 可适量使用柔和阴影。禁止大面积浓黑悬浮阴影。

### 3.7 Motion

- hover / focus：120–160ms；
- drawer / dialog：180–240ms；
- 页面大转场不是 MVP 必要能力；
- loading 不使用高速闪烁；
- `prefers-reduced-motion` 下取消位移和循环动画；
- 成功反馈不阻塞下一步。

## 4. 布局系统

### 4.1 Breakpoints

| 名称 | 范围 | 主要模式 |
| --- | --- | --- |
| Compact | 0–479 | 单列手机 |
| Wide mobile | 480–767 | 单列 / 局部双列 |
| Tablet | 768–1023 | 抽屉导航、双列卡片 |
| Desktop | 1024–1439 | 固定侧栏 / 双栏 |
| Large | 1440+ | 最大内容宽度，Editor 三栏 |

验收固定宽度：360、375、390、430、1440px。

### 4.2 内容宽度

- Marketing：最大 1280px，左右 24–72px；
- Public Page 主内容：最大 1120px，阅读列 680–760px；
- Console：侧栏 248px，主内容最大 1180px；
- Editor desktop：左栏 280px、中预览 min 560px、右属性 320px；
- Dialog：小 440px、中 600px、大 800px；
- 表单正文：推荐最大 560px。

### 4.3 Console Shell

Desktop：

- 左侧固定品牌与一级导航；
- 顶部区域显示当前 Workspace、全局状态和账号；
- 页面标题行包含标题、说明、主操作；
- 主内容使用 12 列或可解释的 CSS Grid；
- 只有表格或详情需要时出现横向密度，不为“专业”堆满卡片。

Mobile：

- 顶栏 Logo / 页面名 / 必要操作；
- 一级导航进入底部导航或抽屉，最多 5 项；
- 表格转为列表卡片或横向可控区域；
- 主 CTA 可固定底部，但必须为页面唯一高意图动作。

### 4.4 Public Page Shell

- 顶部不默认复制完整 SaaS Marketing 导航；
- 页面第一屏必须识别身份、价值和主 CTA；
- AI 与直接联系双入口清楚，不使用两个同权重主按钮竞争；
- 真实人物 / 作品图片有稳定比例；
- Page 内容模块间有明显叙事顺序；
- Footer 放举报与套餐对应品牌规则。

## 5. 图标与图像

### 5.1 图标

- 使用一套线性或一套实心图标，不混用多种风格；
- 默认 20px，紧凑处 16px，大入口 24px；
- 图标不能代替关键文字；
- 无文字 icon button 必须有 accessible name 和 tooltip；
- 不使用 Unicode 字符模拟按钮图标。

### 5.2 人物与商业图像

- 优先真实、自然、专业服务场景；
- 避免廉价握手、夸张 AI 机器人、发光大脑；
- 人像色温与暖象牙背景协调；
- 图片焦点不被移动裁剪切掉；
- 公开页允许用户图像风格多样，但系统容器、遮罩和排版稳定；
- 图片缺失时使用品牌化占位，不使用假人物。

## 6. 基础组件

### 6.1 Button

变体：

| 变体 | 用途 | 规则 |
| --- | --- | --- |
| Primary | 每个区域的唯一高意图动作 | Action Blue，白字 |
| Secondary | 次操作 | Surface + line，深色字 |
| Tertiary | 低权重动作 | 无底或 soft background |
| Danger | 删除、撤销访问 | 只在明确破坏性语境使用 |
| Link | 文本导航 | 下划线或明显 hover / focus |

尺寸：

- S：36px；
- M：44px；
- L：52px；
- 移动核心 CTA 高度至少 48px；
- loading 时保留按钮宽度；
- disabled 说明原因时配邻近提示，不让用户猜。

### 6.2 Form Field

结构固定：

1. 外置 Label；
2. 可选标记 / 必填语义；
3. Input / Select / Textarea；
4. Help；
5. Error。

规格：

- 输入高度 48px，textarea 最小 120px；
- 文字 16px，避免 iOS 自动放大；
- focus 使用 Action Blue + focus ring；
- error 使用 Danger border + 图标 + 文字；
- placeholder 只给例子，不充当 label；
- 联系方式组允许手机号 / 微信 / 邮箱至少一个，错误放在组级。

### 6.3 Card

Card 用于形成一个明确对象或任务，不用于给每段文字加框。

变体：

- Plain：边框，无明显阴影；
- Elevated：公共页 / Marketing；
- Interactive：hover 与 focus 明确；
- Status：左侧状态条或顶部 badge；
- Empty：图标、说明、一个主操作。

### 6.4 Status Badge

常用映射：

| 状态 | 色彩 |
| --- | --- |
| Published / Active / Contacted / Paid | Success |
| Draft / New / Pending | Gold / Info |
| Unsaved / Grace / Config incomplete | Warning |
| Failed / Overdue / Disabled | Danger |
| Closed / Expired / Historical | Neutral |

badge 文案必须可独立理解，例如“有未发布修改”，而不是只写“警告”。

### 6.5 Navigation

- 当前项使用 Action Soft + 深蓝文字，辅以 3px 金 / 蓝标记；
- 一级导航不超过 5 个业务项；
- 二级设置使用侧栏或 tabs；
- 移动 tabs 可横向滚动但要显示可滚动提示；
- breadcrumb 只在 3 层以上且有返回价值时使用。

### 6.6 Dialog / Drawer

- Dialog 用于确认、有限表单或必须中断的决策；
- Drawer 用于 Editor 属性、移动筛选和详情；
- 破坏性确认写明对象和后果；
- 默认 focus 放在安全主操作或首个字段；
- Esc 可关闭非强制 dialog；
- 关闭后焦点回触发元素；
- 不嵌套两个 dialog。

### 6.7 Toast / Inline Feedback

- 保存成功可用轻量 toast + 页面状态；
- 失败必须 inline 保留，不只闪过 toast；
- toast 最长 6 秒并可关闭；
- Publish、Payment、Refund、Invite 等重要结果显示持久结果页 / banner。

### 6.8 Table / List

- Header 清晰，数字右对齐，主对象左对齐；
- 行点击与行内按钮不能互相冲突；
- 移动端 Lead 表格转卡片；
- empty、loading、error 独立；
- skeleton 与真实布局一致；
- 分页保留筛选；
- 不无限堆列，详情放到详情页 / drawer。

## 7. 业务组件

### 7.1 Publish Bar

必须同时表达：

- 最近保存时间；
- 未保存 / 保存中 / 已保存 / 保存失败；
- 当前 Published 状态；
- 是否有未发布修改；
- Preview；
- Publish。

Publish 是高意图主按钮，Preview 为 Secondary。Publish 中禁止重复点击。失败 banner 提供重试并说明公开页仍使用上一版本。

### 7.2 Section List Item

包含：拖拽 handle、Section 名称、显示 / 隐藏、状态、更多菜单。键盘支持上移 / 下移，不只依赖拖拽。删除需确认影响；Hero 等唯一 Section 采用禁用或替换规则。

### 7.3 AI Reception Panel

访客侧：

- 标题说明“基于该主页已发布信息”；
- 预设问题可点击；
- 对话区区分访客与 AI；
- 回答中显示稳定 typing / progress，不伪造消息；
- 无依据、点数不足、Provider 故障、安全拒绝各有不同文案；
- 明确商业意图后才出现联系方式表单；
- Direct Form 始终可达。

商家侧：显示启用状态、配置完整度、已发布事实版本、点数余额、测试入口和失败原因。

### 7.4 Lead Card / Row

最低信息：

- 访客显示名或“新咨询”；
- 一种掩码联系方式；
- 来源 Page / Member；
- Offering；
- 状态；
- 负责人；
- 创建时间；
- 未读 / 新事件。

颜色不替代状态文字。Member 只能看到权限允许的行。

### 7.5 Plan Card

- 价格、周期、点数、席位、品牌规则、主 CTA；
- 当前套餐标记，不给自己显示“购买”；
- 年付节省信息基于真实计算；
- Enterprise 用“联系销售”；
- Free 明确“可购买充值包使用基础 AI”；
- 不用隐藏脚注改变主要权益。

### 7.6 Credit Meter

显示：总可用点数、即将到期 bucket、订阅 / 充值构成、当前调用成本、充值 / 升级入口。不要只显示一个无法解释的百分比环。

### 7.7 Invite Card

显示角色、7 天有效期、复制链接、可用发送渠道、已使用 / 过期 / 撤销状态。Email / SMS 未配置时相应按钮 disabled 并解释，复制链接仍是主 fallback。

### 7.8 Enterprise Status Timeline

状态顺序：新咨询 → 已联系 → 方案 / 合同 → 待付款 → 已付款 → 待激活 → 已激活。发票状态单独记录，不应错误阻塞所有激活；实际合同规则由运营确认。

### 7.9 Legal Document Shell

- 交付 PDF 只定义版式和信息结构，不是可直接发布的法律全文；正式文本必须由 OWNER 按真实运营主体、实际数据处理和适用法域确认；
- 未登录可访问，使用 Marketing 顶栏的紧凑版本；
- 主体最大 760px，显示标题、生效日期、版本、目录和联系入口；
- 正文使用 UI Sans，段落与列表可扫描，不用极小灰字；
- 重要权利、费用、AI 边界和账号处理使用普通段落，不藏在折叠区；
- Mobile 目录可进入 drawer，但正文、返回与联系入口始终可用。

### 7.10 Consent Record / Cancellation Card

- 同意控件明确链接到具体政策版本；不同用途需要分开同意时不合并；
- 账号停用卡显示立即影响、保留内容类别、重新鉴权、二次确认和处理结果；
- 不使用一个红色按钮直接永久删除全部数据；
- 失败时保留申请和说明，不显示已经停用假成功。

### 7.11 Public Report Form

- 从公开 Page Footer 进入并携带 Page / Published version；
- 类别、事实说明、可选联系、隐私说明和提交结果清楚；
- 不向举报者泄露 Owner 私人信息，也不向被举报者显示举报者身份；
- 成功只说明“已收到”，不承诺自动封禁；重复 / 滥用有真实限制。

## 8. 页面视觉模式

| 页面族 | 视觉模式 | 说明 |
| --- | --- | --- |
| Marketing | 暖象牙 + 真实人物 + 大标题 | 讲价值和可信度，不堆产品截图 |
| Auth | 左品牌叙事 / 右专注表单 | 简洁、无干扰、错误明确 |
| Onboarding | 单任务卡 + 进度 | 每屏一个决策，实时预览 |
| Console | 白表面 + 清楚层级 | 信息密度适中，真实状态优先 |
| Editor | 工具表面 + 真实预览 | 三栏 desktop、抽屉 mobile |
| Public | 用户品牌内容 + Link168 结构 | 系统不压过用户品牌 |
| AI | 内容对话 + 联系 fallback | 价值先行，不强迫留资 |
| Lead | 列表 / 详情分层 | 轻量 Handoff，不像 CRM |
| Billing | 清楚数字和有效期 | 不隐藏点数 / 退款边界 |
| Jeepwork | 更高信息密度、强状态 | 平台权限和审计显著 |

## 9. 页面 ID 与 UI 责任

`LINK168_UI_REFERENCE.pdf` 已覆盖下表全部业务页面 ID。一个参考页可组合强关联状态，但页内标签必须写出完整 ID；`SET-03` 必须是邀请接受，而不是邀请创建。`DS-01` 是本设计系统的参考封面 ID，不是产品路由。

| ID | 页面 | 必须使用的核心组件 |
| --- | --- | --- |
| MKT-01 | 首页 | Marketing Nav、Hero、价值链、场景、CTA |
| MKT-02 | Pricing | Plan Card、Credit Pack、FAQ |
| AUTH-01 | 登录 | Auth Shell、Form、Provider Error |
| AUTH-02 | 注册 | Username Field、Terms、Form Summary |
| AUTH-03 | 找回 / 重置密码 | Auth Shell、Persistent Result |
| ONB-01 | 首次设置 | Stepper、Form、Mini Preview、Publish Bar |
| CON-01 | 概览 | Console Shell、Status Card、Metrics、Shortcuts |
| CON-02 | 我的页面 | Page Card / Table、Status、Create / Edit |
| EDT-01 | 桌面编辑器 | Section List、Preview Canvas、Property Panel、Publish Bar |
| EDT-02 | 移动编辑器 | Single Column、Bottom Bar、Drawer |
| PRE-01 | 预览 | Preview Banner、Viewport Switch、Exit / Publish |
| PUB-01 | Personal Page | Public Shell、Hero、Offering、Case、AI / Contact |
| PUB-02 | Team Page | Brand、Offering、Team AI、Member、Case、Contact |
| PUB-03 | Member Page | Member Hero、Expertise、Offering、AI / Contact |
| PUB-04 | AI 接待 | AI Panel、Question Chips、Contact Capture、Fallback |
| PUB-05 | 直接表单 | Contact Group、Intent Field、Success / Failure |
| LEAD-01 | Lead Inbox | Filter Bar、Lead List、Empty / Error |
| LEAD-02 | Lead Detail | Summary、Conversation、Contact、Notes、Assignee History |
| DATA-01 | 数据 | Metrics、Trend、Source / Offering Summary |
| SET-01 | 账号与公开地址 | Settings Form、Username / Domain State |
| SET-02 | 团队与成员 | Member List、Role、Seat Meter、Remove Flow |
| SET-03 | 邀请接受 | Invite State Card、Auth Return |
| SET-04 | AI / 点数 / 套餐 | AI Status、Credit Meter、Plan / Billing |
| ENT-01 | Enterprise 联系销售 | Pricing Summary、Sales Form、Result |
| JEEP-01…08 | 平台运营 | Jeepwork Shell、Dense Table、Timeline、Audit |
| LEGAL-01 | 服务条款 | Legal Document Shell、Version、Table of Contents、Contact |
| LEGAL-02 | 隐私政策 | Legal Document Shell、Data Categories、Rights、Contact |
| LEGAL-03 | 账号停用 / 注销说明 | Cancellation Card、Re-auth、Impact Summary、Persistent Result |
| REPORT-01 | 公开举报 | Report Form、Category、Published Evidence、Persistent Result |
| SYS-01 | 系统状态 | 403 / 404 / Provider / Retry Pattern |

页面业务和交互细节以 `LINK168_MVP_PAGE_AND_INTERACTION_SPEC.md` 为准。

## 10. 状态内容规范

### 10.1 Loading

- 首屏 skeleton 在 300ms 后显示，避免闪烁；
- 按钮 loading 保留标签语义，如“发布中…”；
- 不使用全屏 spinner 阻塞可继续阅读的内容；
- 关键请求可取消或防止重复提交。

### 10.2 Empty

空状态必须说明：

1. 当前为什么为空；
2. 用户下一步；
3. 一个主操作。

示例：

- “还没有客户咨询。发布主页并分享后，新咨询会出现在这里。”
- “还没有产品或服务。先添加你最希望客户了解的一项服务。”

### 10.3 Error

错误包含：发生了什么、是否保留数据、可做什么。避免错误码先行。

- 保存失败：“更改尚未保存。你的内容仍保留在当前页面，请重试。”
- 发布失败：“新版本未发布，公开页仍使用上一版本。”
- AI 不可用：“AI 接待暂时不可用，你仍可以直接提交咨询。”
- 点数不足：“当前点数不足以完成这次回答（需要 5 点）。”

内部 error ID 可放在“查看技术信息”，不向普通用户泄露堆栈。

### 10.4 Success

成功文案描述真实结果：

- “已保存草稿”；
- “已发布，公开页与 AI 已更新”；
- “咨询已提交。主页负责人可以通过你留下的方式联系你”；
- “邀请链接已复制”；
- “套餐已激活”。

不要使用“操作成功”这种没有对象的文案。

## 11. 内容语气

### 11.1 原则

- 中文优先，短句，少工程术语；
- 面向普通经营者，不使用 Snapshot、Routing、Workspace 等底层词；
- 主按钮使用动词 + 对象：发布主页、复制链接、联系客户；
- 破坏性操作说明后果；
- AI 明确边界，不说“无所不能”；
- 不使用 P0 / P1 / Sprint 等对 OWNER 的沟通术语。

### 11.2 术语映射

| 工程词 | 用户界面 |
| --- | --- |
| Workspace | 我的团队 / 当前团队 |
| Snapshot / Version | 已发布版本 / 历史版本 |
| Routing | 负责人分配 |
| Draft / Published | 草稿 / 已发布 |
| New / Contacted / Closed | 新咨询 / 已联系 / 已关闭 |
| Personal / Team / Member Page | 个人主页 / 团队主页 / 成员主页 |
| Offering | 产品或服务 |
| Owner / Admin / Member | 所有者 / 管理员 / 成员 |
| Conversation | 对话记录 |
| Canonical | 主访问地址 |
| SSL ready | 安全证书已就绪 |
| Workspace Owner | 团队所有者 |
| Expired / Revoked / Used | 已过期 / 已撤销 / 已使用 |
| Seat full / Already member | 席位已满 / 已是团队成员 |
| membership | 成员关系 |
| Published Business Facts | AI 使用的已发布资料 |
| Provider | AI 服务 / 邮件服务（普通用户） |
| Idempotency | 不在 UI 暴露；表现为不会重复扣费 / 创建 |
| Lead | 客户咨询；专业场景可在辅助文案使用 Lead |

DNS 记录名（如 CNAME、TXT）可保留。JEEPWORK、交互注释和开发文档中的工程词可以保留，但不得直接落到普通用户界面；例如“进入团队 Console”“Draft 预览”“关联 Offering”分别显示为“进入团队后台”“草稿预览”“关联产品或服务”。

## 12. 无障碍检查清单

- [ ] 页面只有一个主 H1；
- [ ] 导航有 landmark 和当前项；
- [ ] 所有表单字段有 programmatic label；
- [ ] 必填、帮助、错误通过 `aria-describedby` 关联；
- [ ] icon-only 控件有 accessible name；
- [ ] dialog / drawer 有标题、焦点锁定和返回；
- [ ] sortable Section 有键盘替代操作；
- [ ] toast 使用合适 live region，但重要错误有持久文本；
- [ ] 对比度和 focus ring 可见；
- [ ] 触控目标约 44×44；
- [ ] 图表不只靠颜色，并有表格 / 摘要；
- [ ] 移动 200% zoom 仍可完成任务；
- [ ] reduced motion 生效。

## 13. 实现映射建议

在不与现有技术栈冲突的前提下，Codex 应建立：

- 全局 CSS variables / token 文件；
- `Button`、`Field`、`Card`、`Badge`、`Dialog`、`Drawer`、`Toast`、`EmptyState`、`ErrorState`、`Skeleton`；
- `ConsoleShell`、`PublicPageShell`、`EditorShell`；
- `PublishBar`、`SectionListItem`、`AIReceptionPanel`、`LeadRow`、`CreditMeter`、`PlanCard`；
- component state stories 或视觉测试 fixture；
- 禁止页面局部复制近似颜色和按钮样式。

若仓库已有组件库，优先收敛现有组件，不为“重做设计系统”一次性重写整个前端。

## 14. UI 完成判定

UI 只有在以下条件同时满足时完成：

- 关键页面能在真实数据和错误状态下工作；
- 与 PDF 的视觉层级、token 和关键组件一致；
- 360 / 375 / 390 / 430 / 1440px 无阻塞问题；
- 键盘和 screen reader 基本语义成立；
- Page / AI / Lead / Billing 的状态没有假成功；
- 设计 token 可检索、组件共享、无大量一次性样式；
- 所有页面通过对应 `AT-UI-*`、`AT-A11Y-*` 和业务验收。

### 14.1 页面级移动依据

每个页面不必单独再制作一张完整移动高保真画板，但必须同时具备：全局移动 token、页面规格中的移动适配矩阵、至少一个相同页面族的移动视觉参考，以及 360 / 375 / 390 / 430px 实际浏览器证据。没有这些依据时，Codex 不得自行把桌面三栏缩小或发明新的移动导航。
