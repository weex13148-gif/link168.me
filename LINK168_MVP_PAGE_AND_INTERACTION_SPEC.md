# LINK168 MVP PAGE AND INTERACTION SPEC

**版本：** 1.1
**日期：** 2026-08-13
**状态：** CURRENT TARGET CONSTRUCTION SPEC
**用途：** 让 Codex 可按页面、字段、状态、流程和验收 ID 直接实现，不再补做普通产品选择题。

## 1. 使用方式

每个开发任务至少引用：

- 一个页面 ID；
- 一个交互流程 ID；
- 一个 `AT-*` 验收 ID。

本文件的路由分两类：

- **固定路由**：OWNER 已确认，如 `/console`、`/jeepwork`、`/{username}`；
- **目标路由**：用于设计信息架构，Codex 开始前必须映射真实路由；若改路由会造成高风险，可保留现有 URL 并实现同等信息架构。

PDF 中的内容是本规格的视觉投影，不单独覆盖文字规则。

### 1.1 视觉与交互覆盖

- `LINK168_UI_REFERENCE.pdf` 提供页面级视觉参考，业务 Page ID 以视觉页面标识逐页核对；PDF 文本层不保证所有 Page ID 可可靠全文搜索；强关联页面可同页表达，但必须显式写全 ID；
- `AUTH-03`、`SET-01`、`SET-03` 以及 `JEEP-01`、`JEEP-02`、`JEEP-03`、`JEEP-05`、`JEEP-06`、`JEEP-07` 均有独立参考页；
- `SET-03` 的参考页只描述邀请接受与终态，邀请创建属于 `SET-02`；
- `LINK168_INTERACTION_REFERENCE.pdf` 对 `IF-01` 至 `IF-17` 提供可文本搜索流程参考；`IF-18` 至 `IF-20` 由本次 CURRENT Markdown 增量合同定义，PDF 后续同步但不能反向覆盖；
- 参考 PDF 的 `DS-01` 与 `IF-INDEX` 等元 ID 只用于文档导航，不是产品路由或业务对象。

## 2. 全局角色与访问

| 访问者 | 可访问范围 |
| --- | --- |
| 未登录访客 | Marketing、Pricing、Auth、已发布 Public Page、Visitor AI、Direct Form、Enterprise Contact、Invite 登录前状态 |
| Personal Owner | 自己个人业务空间的全部 Console、Personal Page、Lead、数据、套餐 |
| Team Owner | 自己拥有的 Team 全部数据、Team / Member Page、成员、计费、Lead、设置；MVP 最多拥有 1 个 Team |
| Team Admin | Team Page、Member、全部 Team Lead 与数据；不能转让 Owner 或管理计费 |
| Team Member | 自己 Member Page、分配给自己或来源自己页面的 Lead、权限内数据 |
| Jeepwork Operator | 平台范围页面；与普通 Workspace 鉴权分离 |

所有权限必须由服务端验证。UI 隐藏只是体验，不是安全措施。

## 3. 页面清单

### 3.1 Marketing / Auth / Onboarding

| ID | 页面 | 路由 | 主任务 | 主 CTA |
| --- | --- | --- | --- | --- |
| MKT-01 | 首页 | `/` | 理解价值并开始建页 | 免费开始 |
| MKT-02 | 套餐 | `/pricing` 目标 | 比较套餐 / 充值 | 选择套餐 / 联系销售 |
| AUTH-01 | 登录 | 真实 auth 路由映射 | 登录并返回目标页 | 登录 |
| AUTH-02 | 注册 | 真实 auth 路由映射 | 建账号并保留 username | 创建账号 |
| AUTH-03 | 找回 / 重置 | 真实 auth 路由映射 | 恢复访问 | 发送重置链接 / 更新密码 |
| ONB-01 | 首次设置 | `/console/onboarding` 目标 | 完成最小主页并发布 | 预览 / 发布主页 |
| ENT-01 | Enterprise 联系销售 | `/enterprise` 目标 | 提交企业需求 | 联系销售 |
| LEGAL-01 | 服务条款 | `/terms` | 查看当前服务规则 | 返回产品 / 联系平台 |
| LEGAL-02 | 隐私政策 | `/privacy` | 理解数据处理与用户权利 | 返回产品 / 提交请求 |
| LEGAL-03 | 账号停用 / 注销说明 | `/account-cancellation` | 理解影响并提交安全申请 | 提交停用申请 |
| REPORT-01 | 公开举报 | `/report` | 举报当前公开 Page | 提交举报 |

### 3.2 Console / Editor / Public

| ID | 页面 | 路由 | 主任务 |
| --- | --- | --- | --- |
| CON-01 | 概览 | `/console` | 看状态并继续最重要下一步 |
| CON-02 | 我的页面 | `/console/pages` 目标 | 管理 Personal / Team / Member Page |
| EDT-01 | 桌面编辑器 | `/console/pages/:pageId/edit` 目标 | 编辑 Draft、Preview、Publish |
| EDT-02 | 移动编辑器 | 同一响应式路由 | 完成核心编辑与发布 |
| PRE-01 | Preview | `/console/pages/:pageId/preview` 目标 | 查看 Draft 在不同 viewport 的效果 |
| PUB-01 | Personal Page | `/{username}` | 理解个人 / 服务并联系 |
| PUB-02 | Team Page | 真实团队公开路由映射 | 理解团队 / 服务 / 成员并联系 |
| PUB-03 | Member Page | 真实成员公开路由映射 | 理解成员能力并联系 |
| PUB-04 | Visitor AI | 公开页内 panel / sheet | 获得基于已发布事实的回答 |
| PUB-05 | Direct Form | 公开页内 panel / page | 在 AI 不可用时仍可提交咨询 |

### 3.3 Lead / Data / Settings

| ID | 页面 | 路由 | 主任务 |
| --- | --- | --- | --- |
| LEAD-01 | 客户咨询列表 | `/console/leads` 目标 | 找到并处理需要跟进的咨询 |
| LEAD-02 | 客户咨询详情 | `/console/leads/:leadId` 目标 | 理解上下文、联系、备注、分配和关闭 |
| DATA-01 | 数据 | `/console/data` 目标 | 理解页面到 Lead 的表现 |
| SET-01 | 账号 / 公开地址 | `/console/settings/account` 目标 | 管理个人资料、username、域名 |
| SET-02 | 团队 / 成员 | `/console/settings/team` 目标 | 邀请、角色、席位、移除 |
| SET-03 | 邀请接受 | 真实 invite 路由映射 | 登录 / 注册后加入团队 |
| SET-04 | AI / 点数 / 套餐 | `/console/settings/billing` 目标 | 配置 AI、查看点数、购买 / 变更套餐 |

### 3.4 Jeepwork

| ID | 页面 | 目标路由 | 当前设计状态 |
| --- | --- | --- | --- |
| JEEP-01 | 平台概览 | `/jeepwork` | 当前启用 |
| JEEP-02 | 用户 / Workspace | `/jeepwork/workspaces` | 当前启用 |
| JEEP-03 | 平台 Sales Leads | `/jeepwork/sales-leads` | 当前启用 |
| JEEP-04 | Enterprise 合同 / 付款 / 发票 | `/jeepwork/enterprise` | 当前启用 |
| JEEP-05 | 举报 | `/jeepwork/reports` | 当前启用 |
| JEEP-06 | Provider 配置 | `/jeepwork/providers` | 按真实代码确认 |
| JEEP-07 | Audit Log | `/jeepwork/audit` | 当前启用 / 必须补齐 |
| JEEP-08 | 历史商业模块清单 | `/jeepwork/legacy` 目标 | Promotions / Card Keys / Commissions 保留禁用 |

Codex 必须先盘点真实 `/jeepwork` 路由、组件、API 和启用状态，不能仅按此表制造新页面或自动启用旧逻辑。

## 4. 全局交互约定

### 4.1 页面状态

每个数据页必须有：

- initial loading；
- loaded；
- empty；
- partial error；
- blocking error；
- permission denied；
- stale / retry（必要时）。

错误与空状态不得共用同一文案。

### 4.2 表单提交

1. 用户输入时做即时格式反馈；
2. 提交时服务端重新验证；
3. 提交中锁定重复操作但允许返回 / 取消的场景需明确；
4. 字段错误回填到字段；
5. 全局错误放在表单顶部并聚焦；
6. 成功只在服务端确认后显示；
7. 网络失败保留输入；
8. 重试使用相同 idempotency key（适用时）。

### 4.3 保存与发布

保存 Draft 和 Publish 是两个动作：

- 自动保存可在停止输入 800–1200ms 后触发；
- 离开前有未保存内容时提示；
- “已保存”只表示 Draft 已落库；
- Preview 永远读当前 Draft；
- Publish 才改变公开版本；
- Publish 失败说明公开页仍是上一版本。

### 4.4 通知

- 普通保存成功：状态文字 + 可选 toast；
- 重要结果：持久 banner / result card；
- 后台实时通知不是当前 MVP 必需；页面重新获取能看到真实状态即可；
- 不因未配置 Email / SMS 阻塞可复制链接的核心流程。

## 5. 页面详细规格

### 5.1 MKT-01 首页

#### 目标

在 10 秒内让访客理解：Link168 不是普通链接页，而是把商业主页、AI 接待和客户咨询连接起来。

#### Desktop 结构

1. 顶栏：固定 Logo、产品、场景、套餐、登录、免费开始；
2. Hero：主标题、两行价值说明、免费开始、查看示例；
3. 右侧真实 Personal / Team Page 组合预览；
4. 价值链：主页 → AI → Lead → 跟进；
5. 三类使用场景：个人服务、团队业务、成员获客；
6. “AI 只使用已发布资料”的信任段；
7. 产品真实界面片段：编辑 / 接待 / Lead；
8. Pricing 摘要；
9. FAQ；
10. Footer：条款、隐私、登录、品牌。

#### Mobile

- Hero 单列；
- 主 CTA 宽度 100%；
- 产品预览在标题后，不早于价值说明；
- 顶栏折叠，仍保留登录和免费开始；
- 不用横向三列卡片造成滚动。

#### 推荐主文案

- H1：`把你的专业服务，变成客户看得懂、愿意咨询的主页`
- 说明：`用商业主页集中展示业务，让 AI 根据已发布资料回答问题；访客也可以直接提交咨询，信息进入后台后由负责人跟进。`
- Primary：`免费开始`
- Secondary：`查看主页示例`

#### 状态

- 登录用户点击“免费开始”进入 `/console` 或继续 onboarding；
- 未登录进入注册；
- 示例必须明确为示例，不记录成真实客户 Lead。

对应：AT-CON-001、AT-UI-001、AT-A11Y-001。

### 5.2 MKT-02 Pricing

#### 结构

- 月付 / 年付切换只影响 Plus / Pro；
- 五个 Plan Card，Enterprise 可采用两张销售卡；
- 当前推荐以 Pro 视觉强调，但不写虚假“最受欢迎”统计；
- 点数成本说明；
- 充值包；
- 品牌 / 举报说明；
- 宽限、到期、退款 FAQ；
- Enterprise 联系销售 CTA。

#### 核心显示

必须完整显示价格、点数、席位、发放周期、品牌规则和是否联系销售。Free 卡必须写：`可购买充值包，使用基础 AI 接待`。

Visitor AI 当前公开成本统一写：`基础回答 5 点 / 次`。普通 1 点与高级 20 点只允许在对应能力已经启用、调用前明确标价时出现；不得把尚未启用的成本档写成当前可用能力。

#### 行为

- 未登录购买 → 注册 → 返回 checkout；
- 当前套餐 → 显示“当前套餐”；
- Upgrade → 先显示剩余周期差价和补点；
- Downgrade → 显示下周期生效；
- Enterprise → ENT-01，不进入普通 checkout。

对应：AT-BILL-001…016、AT-ENT-001。

### 5.3 AUTH-01 登录

#### 字段

| 字段 | 规则 | Autocomplete |
| --- | --- | --- |
| 账号 / 邮箱 | 必填，trim | `username` / `email` |
| 密码 | 必填，可显示 / 隐藏 | `current-password` |

#### 布局

Desktop 左侧品牌叙事和真实公开页局部，右侧 440–520px 表单；Mobile 只保留紧凑 Logo、标题、表单和条款入口。

#### 行为

- 登录中按钮显示“登录中…”；
- 错误统一为“账号或密码不正确”，不泄露账号存在性；
- 登录成功返回 `returnTo`，否则 `/console`；
- Invite 流程必须保留 token / returnTo；
- 连续失败可触发真实安全限制，但文案不暴露内部策略。

对应：AT-AUTH-004…007。

### 5.4 AUTH-02 注册

#### 字段

| 字段 | 必填 | 校验 |
| --- | --- | --- |
| 邮箱 / 主账号 | 是 | 真实格式、唯一性由服务端最终确认 |
| 密码 | 是 | 至少 8 位，建议显示强度但不制造复杂规则 |
| 公开地址 | 是 | 3–30；小写字母、数字、连字符；不能首尾连字符；保留词拒绝 |
| 同意条款 / 隐私 | 是 | 未勾选不能提交 |

#### Username 交互

- 输入框前显示 `link168.me/`；
- 400–600ms debounce 检查可用性；
- 状态：未检查、检查中、可用、不可用、格式错误、网络失败；
- 客户端显示“可用”不保证最终占用，提交时原子保留；
- 冲突提供 2–3 个非侵入建议，不自动修改用户输入。

#### 成功

建立账号、保留 username、登录并进入 ONB-01。不强制邮箱验证。

对应：AT-AUTH-001…003。

### 5.5 AUTH-03 找回 / 重置

- 发起页只有账号 / 邮箱与中性结果；
- 无论账号是否存在都显示相近成功文案；
- Provider 未配置时，开发 / 管理环境显示真实阻塞，生产普通用户显示安全帮助入口；
- Reset token 单次、过期、有速率限制；
- 成功后所有相关 session 是否失效由现有安全策略决定并记录。

对应：AT-AUTH-008。

### 5.6 ONB-01 首次设置

#### Step 1 — 你希望访客先认识什么

单选起点：个人服务 / 团队业务。只决定默认 Section 和文案，不建立复杂分支；以后可调整。

#### Step 2 — 基本信息

- 头像 / Logo；
- 姓名 / 品牌名；
- 职业 / 业务类型；
- 一句话介绍；
- 所在城市（可选）；
- 主联系入口（可选，Publish 前若要表单可后补）。

#### Step 3 — 主题起点

提供 3 个基于同一 Design System 的 layout 起点，不是三套完全不同产品。当前默认“温暖专业”。

#### Step 4 — 首个 Offering / 链接

至少完成一项：添加 Offering 或核心链接。Offering 字段：名称、类型、简短说明、价格表达（可选）、适用对象（可选）。

#### Step 5 — Preview / Publish

- 显示真实 Draft；
- 列出缺失项；
- 发布成功显示链接 / QR；
- 允许“稍后发布”进入 Console，状态为 Draft only。

对应：AT-ONB-001…006。

### 5.7 CON-01 概览

#### 页面标题

`概览` + 当前个人 / 团队切换器 + 主操作 `编辑主页`。

#### 内容优先级

1. 发布状态卡：Draft only / Published / 有未发布修改 / Disabled；
2. 下一步卡：配置 AI、完善 Offering、发布、处理 New Leads；
3. 过去 7 / 30 天真实摘要：访问、AI / 表单、Lead；
4. 最新客户咨询；
5. AI 状态和点数；
6. 快捷操作：复制链接、预览、编辑、邀请成员。

#### 空状态

新用户只显示 2–3 个最重要行动，不渲染零值仪表盘墙。

#### 权限

Member 的概览只显示自己 Page / Lead / 权限内数据。

对应：AT-CON-004…006、AT-DATA-005。

### 5.8 CON-02 我的页面

#### 列表字段

- 页面名称与类型；
- 公开地址；
- Published / Draft 状态；
- 最近编辑；
- 过去 30 天访问 / Lead；
- 编辑、预览、复制、更多。

#### 操作

- 点击主对象进 Editor；
- Preview 读 Draft；
- Copy 复制 canonical URL；
- Disable 说明公开影响；
- 不在列表直接永久删除有历史 Lead 的页面；
- 卡片区分“我的主页”“我的团队”（MVP 0 或 1）和“我加入的团队”；属于多个 Team 时使用“当前团队 / 我加入的团队”选择，不显示裸 Workspace ID；
- Team 中 Member Page 由权限显示。

对应：AT-PAGE-001…004。

### 5.9 EDT-01 桌面编辑器

#### 三栏

1. **左栏 Section**：添加、排序、显示 / 隐藏、更多；
2. **中栏 Canvas**：真实 Renderer 的 Draft，desktop / mobile 视图切换；
3. **右栏属性**：当前 Section 内容、布局、媒体、关联 Offering / Member。

顶部 Publish Bar：返回、页面名、保存状态、Preview、Publish。

#### Section 操作

- Add：打开按用途分组的 Section picker；
- Select：中间预览同步定位；
- Reorder：拖拽 + 键盘上移 / 下移；
- Hide：Draft 中变为半透明并标“已隐藏”，Preview / Public 不显示；
- Delete：说明影响，确认后软删除或从 Draft 移除；
- Edit：输入即时更新本地 Draft，自动保存；
- Failed save：保留本地输入，显示持久错误和 retry。

#### 添加 Section 上限

不在本规格创造任意数值上限。Codex 根据性能和现有 schema 实现合理保护；若需要套餐化上限必须新增 OWNER 决定。

#### 发布

点击 Publish 打开确认：

- 本次变更摘要；
- 公开页与 AI 将一起更新；
- 当前缺失 / 风险；
- 主按钮 `发布新版本`。

对应：AT-PAGE-005…009、AT-PUB-001…010。

### 5.10 EDT-02 移动编辑器

- 顶栏：返回、页面名、保存状态；
- 主区域：单列 Section 内容 / 预览切换；
- 底部栏：Section、预览、发布；
- 属性在 bottom sheet / drawer；
- 拖拽排序提供全屏列表和上移 / 下移；
- 键盘打开时底部栏不遮挡字段；
- 图片上传显示进度和取消；
- Publish confirmation 使用全屏 sheet。

不得把桌面三栏缩放到 360px。

对应：AT-UI-001、AT-UI-003、AT-UI-004。

### 5.11 PRE-01 Preview

- 顶部固定 Preview Banner：`预览草稿 · 公开页面尚未更新`；
- viewport：Mobile / Desktop；
- 退出预览回 Editor，保留选中 Section；
- 有权限用户可从 Preview 直接 Publish；
- Preview URL 必须鉴权、短期有效或服务端权限校验；
- 搜索引擎不可索引；
- AI Preview 若提供，只能读取 Draft 沙箱，绝不污染公开事实或真实 Lead；MVP 可暂不提供 Draft AI 对话，不能假装已支持。

对应：AT-PUB-003、AT-PUB-009。

### 5.12 PUB-01 Personal Page

#### 推荐顺序

1. Hero：头像、姓名、职业、一句话价值、主 CTA；
2. Offering；
3. Case / Portfolio；
4. About / Links；
5. FAQ；
6. AI / Direct Contact；
7. Footer：举报 + 套餐对应品牌。

#### CTA

第一屏最多一个 Primary，例如 `问问我的 AI`；Direct Contact 为 Secondary。若 AI 不可用，则 Direct Form 升为 Primary。

#### SEO / Share

title、description、OG image 来自 Published；自定义域 canonical；未发布 / Disabled 不被索引。

对应：AT-PUBLIC-001、004…010。

### 5.13 PUB-02 Team Page

#### 顺序

1. Team 品牌 / 定位；
2. 核心 Offerings；
3. 团队 AI / 咨询；
4. 可公开成员；
5. Cases / trust；
6. Contact / Lead；
7. Footer。

#### Member cards

显示头像、姓名、角色 / 专长、负责 Offering、进入 Member Page。removed / disabled / hidden 成员不出现。

#### Theme

Team primary theme 约束颜色 / 字体 / spacing；Member 个性化不能破坏品牌对比和结构。

对应：AT-PUBLIC-002、AT-PAGE-010、AT-TEAM-001。

### 5.14 PUB-03 Member Page

- Hero 明确团队归属和成员身份；
- 展示公开专长、Offerings、Cases、联系方式；
- AI 推荐与回答只用成员和团队已发布事实；
- 所有咨询带 `sourcePageId` / `sourceMemberId`；
- Member removed 后返回合适不可用状态，可提供 Team Page 链接，不公开旧内容。

Member 只能编辑自己的头像、展示名、职位、简介、个人公开联系方式、个人专业介绍和获准关联的 Offering；可以 Save Draft → Preview → Publish 自己权限范围内的变化。Member 不得 Publish Team Page、修改 Team Theme / Brand / 全局 Section、编辑其他 Member Page 或关联未授权 Offering。Owner / Admin 可以管理和禁用 Member Page，但当前不增加逐次 Publish 审批。

对应：AT-PUBLIC-003、007、AT-ROUTE-001。

### 5.15 PUB-04 Visitor AI

#### 打开

桌面使用右侧 panel / centered dialog，移动使用全屏 sheet。触发按钮具有明确标签，如 `问问 AI`。真实模型回答由 Page 所属 Workspace 承担点数；公开访客不显示商家余额、扣费记录或成本配置。

#### 初始状态

- 标题或对话区持续明确“AI 接待 / AI 生成”，不能让访客误认为真人员工已经在线；
- 为上线时真实模型名称及备案号 / 上线编号（适用时）保留公示位置；未配置或未核验时不显示 placeholder 编号；
- 说明：`我只会依据这个主页已发布的资料回答。`
- 3 个真实预设问题，来自已发布 Offering / FAQ；
- 输入 `你想了解什么？`；
- Secondary `直接联系`。

#### 对话行为

1. 发送用户消息；
2. 显示真实请求中状态；
3. 服务端基于 Published Facts 回答；
4. 无事实 → 澄清 / 不知道 / 人工；
5. 商业意图出现 → 先回答当前问题，再询问是否希望联系；
6. 同意联系 → 展示联系方式组；
7. 意图 + 有效联系 → 创建 Lead；
8. 显示真实提交结果与后续说明。

AI 输出按实际内容形态显示适用的可见标识；未来增加图片、音频、视频或文件导出时重新验收隐式 / 元数据标识。AI 开始获取联系方式前，显示本次收集目的、数据类别、Privacy 链接 / 版本和适用的 consent / acknowledgement。进入 Human Handoff 后明确显示“已转交人工跟进”，与 AI interaction 状态分离，不冒充人工已在线回复。

#### 不可用分支

| 状态 | 文案核心 | 操作 |
| --- | --- | --- |
| 未启用 | 该主页暂未启用 AI 接待 | 直接联系 |
| 配置不完整 | AI 资料尚未准备好 | 直接联系 |
| 点数不足 | AI 暂时无法回答 | 直接联系 |
| Provider 未配置 | AI 接待尚未配置 | 直接联系 |
| 超时 / 临时错误 | 这次回答没有完成，未扣除点数 | 重试 / 直接联系 |
| 安全拒绝 | 无法帮助处理该请求 | 改写问题 / 直接联系 |

当前核心可用回答默认基础档 5 点。商家在 SET-04 启用和测试时看到该成本；访客不需要确认费用。Workspace 余额不足时调用前阻止，不能先回答再透支。每个错误都保留 Direct Form，对话失败不得创建假 Lead 或扣最终点数。

对应：AT-AI-001…010、AT-BILL-007…009。

### 5.16 PUB-05 Direct Form

#### 字段

| 字段 | 必填 | 规则 |
| --- | --- | --- |
| 我想咨询 | 是 | Offering / 合作 / 报价 / 其他；用于表达明确业务意图 |
| 需求说明 | 是 | 10–1000 字，trim；不能只有空白 |
| 称呼 | 否 | 1–80 字 |
| 手机 | 条件必填 | 与微信 / 邮箱至少一个有效 |
| 微信 | 条件必填 | 与手机 / 邮箱至少一个有效 |
| 邮箱 | 条件必填 | 与手机 / 微信至少一个有效 |
| 联系偏好 | 否 | 从已填写方式中选择 |
| 隐私同意 | 是 | 同意处理本次咨询所需信息 |

#### 行为

- 提交前显示数据用途、Privacy 链接与版本，以及当前场景适用的 consent / acknowledgement；
- 是否需要同意、单独同意或其他合法处理基础以真实处理场景为准，不机械要求所有处理活动勾选同一总开关；
- Contact group 显示组级错误；
- hidden 字段记录 Page / Member / Offering 来源，服务端不信任客户端，重新查关联；
- 重复提交用 idempotency key；
- 成功：`咨询已提交。主页负责人可以通过你留下的方式联系你。`；
- 失败保留内容；
- 不自动把表单内容写入商家 Published Facts。

对应：AT-LEAD-006…010。

### 5.17 LEAD-01 客户咨询列表

#### 顶部

标题 `客户`，数量，搜索，筛选（状态、负责人、来源、时间），可见时提供 `导出` 仅作为未来预留，不在 MVP 假按钮。

#### Desktop columns

客户 / 联系、需求摘要、来源 / Offering、负责人、状态、时间。Mobile 卡片显示同样核心信息。

#### 默认排序

New 优先，其次按创建时间倒序；用户筛选后保留选择。

#### 批量操作

MVP 可支持批量转派与批量关闭（成员移除需要），但不要求普通列表第一版暴露复杂批量工具。若没有真实实现，不显示按钮。

#### 权限

Owner / Admin 全部；Member 仅自己范围。服务端分页、搜索、统计都应用相同 scope。

对应：AT-INBOX-001、008…012。

### 5.18 LEAD-02 客户咨询详情

#### Desktop 双栏

左侧：需求摘要、Conversation 时间线、Internal Notes。右侧：联系方式、状态、负责人、来源 / Offering、分配历史。

#### 核心操作

- 联系客户：打开 tel / mail 或复制微信，不假报已联系；
- 标记 Contacted：在用户确认已联系后更新；
- Close：可选简短关闭原因，不引入赢 / 输 pipeline；
- 转派：只选 active、有权限成员；
- 添加 Internal Note；
- 重新生成 Summary 可后置，失败不显示假摘要。

#### Conversation

区分 AI、访客、系统 handoff。联系方式和敏感字段按角色显示。公开访客永远不能访问详情 URL。

对应：AT-INBOX-002…011。

### 5.19 DATA-01 数据

#### 默认范围

过去 30 天，可切 7 / 30 / 90 天；显示时区。

#### 指标

- 页面访问；
- AI / Direct Form 发起；
- 合格 Lead；
- 访问 → Lead 转化；
- 来源 Page；
- Offering 兴趣；
- 负责人分布（Owner / Admin）；
- 点数使用摘要。

#### 图表

主趋势最多 2–3 条；分类用条形图，不用难比较的饼图；提供数字表或摘要。无数据时不绘制样例曲线。

对应：AT-DATA-001…005。

### 5.20 SET-01 账号与公开地址

分组：个人资料、安全、公开地址、自定义域、危险操作。

- username 改动显示旧链接影响；
- 自定义域展示验证步骤、DNS 状态、SSL 状态、canonical；
- 域名未验证不切 canonical；
- 个人路径转 Team 仅 Owner 且目标 Team 属于自己；
- 不提供强制夺取别人 slug；
- 注销个人账号必须显示影响摘要；若用户仍是任一 Team 的唯一 Owner，阻止并引导先走 IF-18；
- 二次确认成功后 Personal Page 立即下线，账号进入 30 天 Pending Cancellation 并显示撤销截止时间；
- 30 天内可撤销；到期后普通数据删除 / 匿名化，有合法依据的数据进入隔离 retention。

#### Privacy 与个人信息权利

不建立复杂客服工单系统；使用简单入口让用户查看当前 Privacy / Terms 的真实版本和生效日期，请求访问 / 复制、更正或删除个人信息，在适用场景撤回同意并看到对相应处理目的的影响，以及发起账号注销。页面必须说明 30 天是 Product Recovery Window，Restricted Retention 不等于继续正常业务使用。任何生产法律值未知时，内部显示 `PRODUCTION DATA REQUIRED`，不得把 placeholder 发布给真实用户。

对应：AT-PUBLIC-009、AT-TEAM-010、AT-AUTH-009…012。

### 5.21 SET-02 团队与成员

#### 页面

- Team 基本资料；
- Seat Meter；
- Member 列表：姓名、角色、Page 状态、Lead 数、加入时间；
- `邀请成员`；
- Workspace default assignee；
- Team Page 入口。

普通 UI 使用“我的团队 / 我加入的团队 / 当前团队”，不显示裸 Workspace ID。没有自有 Team 时可以创建第一个；已经拥有 1 个 Team 时，MVP 不再显示或允许创建第二个，但仍可接受其他 Team 邀请。

#### Invite

Dialog：角色 Admin / Member、7 天有效说明、创建链接。结果显示复制、微信、已启用 Email / SMS。

#### Remove member

1. 显示 Member Page 将禁用；
2. 显示 active Lead 数；
3. 选择继任负责人；
4. 默认建议 Workspace Owner；
5. 输入 / 确认成员姓名（只在高风险数量时需要）；
6. 提交中不可重复；
7. 成功显示转移数量与历史保留；
8. 失败保持成员和 Lead 的一致状态。

#### Owner Transfer

1. 仅 Owner 选择当前 active Member；
2. 显示权限、账单联系人和退出影响；
3. Owner 二次确认后进入 Pending Transfer；
4. 接收方明确确认；
5. 服务端事务完成 Owner 变更并刷新权限；
6. 未确认、拒绝或过期时原 Owner 不变；
7. 记录操作者、前后 Owner、理由、时间和结果；
8. 异常恢复只能由授权 `/jeepwork` 操作员处理并写 Audit。

#### Dissolve Team

1. 仅 Owner，二次确认并明确展示影响；
2. Team Page、Member Pages、Visitor AI、新 Lead 和未使用 Invite 立即停用；
3. Team credits 冻结，停止后续自动续费；
4. 显示 30 天恢复截止时间；
5. 恢复原子恢复 Team、Members、Pages、Ledger / credits，不重复订阅或发点；
6. 30 天后普通业务数据删除 / 匿名化，合法保留数据进入隔离 retention / legal-hold。

对应：AT-ROUTE-008…009、AT-TEAM-001…026。

### 5.22 SET-03 邀请接受

状态：valid logged out、valid logged in、expired、revoked、used、seat full、workspace unavailable、already member。

Valid 页面显示 Team、邀请角色、邀请者（若可公开）、到期时间。未登录主 CTA `登录并加入`，没有账号 `注册并加入`。接受成功只执行一次并返回 Team Console。

此页面不得出现“创建邀请”主操作；创建、复制和分享邀请由 `SET-02` 中的 Owner / Admin 完成。

对应：AT-TEAM-002…006。

### 5.23 SET-04 AI、点数与套餐

Tabs 可为：AI 接待、点数、套餐与账单。

#### AI 接待

- 启用开关；
- 配置完整度；
- 当前 Published Facts 版本 / 上次发布；
- 预设问题；
- 测试接待；
- 明确显示 `真实回答 5 点 / 次（仅产生可用输出后结算）`；
- Provider 状态（普通用户只显示可用性）；
- Direct Form fallback 开关不得被完全关闭到无联系入口。

#### 点数

- 分开显示“个人主页套餐”“当前团队套餐”“团队共享 AI 点数”；
- 总余额；
- 最早到期；
- 订阅 / 充值 buckets；
- 近期真实用量；
- 成本等级说明；
- 充值包。

个人与 Team 的套餐、余额和 Ledger 不得合并。Member 在所加入 Team 使用 Team AI 时显示并使用目标 Team 权益，不得把 Member 个人余额展示为 Team 可用余额。

#### 套餐

- 当前套餐与结束 / 续费时间；
- 升级立即生效和差价预览；
- 降级下周期；
- 取消续费；
- 宽限 banner；
- 例外退款联系支持，不提供未经批准的一键退款。

实际启用自动续费时必须由用户主动选择，不默认勾选；确认前显示金额、周期、续费规则和下一扣费相关信息；设置中提供显著、简便的取消 / 变更入口，不设置不合理取消障碍或费用。

对应：AT-BILL-001…023。

### 5.24 ENT-01 Enterprise 联系销售

#### 左侧

Enterprise / Enterprise Pro 起价、点数、席位、适用场景、人工合同说明。

#### 表单

| 字段 | 必填 |
| --- | --- |
| 姓名 | 是 |
| 公司 / 团队 | 是 |
| 联系方式（手机 / 微信 / 邮箱至少一项） | 是 |
| 团队人数 | 是 |
| 关注套餐 | 是 |
| 需求与场景 | 是 |
| 期望联系时间 | 否 |
| 隐私同意 | 是 |

提交创建 Platform Sales Lead。公开结果不得暴露内部 Lead Inbox、合同、付款或人工激活路径，也不承诺具体公开 SLA。成功文案：`企业需求已提交。平台已收到以上信息，后续联系以实际处理结果为准。`

对应：AT-ENT-001…003。

### 5.25 JEEP-01 平台概览

高信息密度但不堆无意义图表。显示：待处理 Sales Lead、逾期 1 工作日、待确认付款、待激活、未处理举报、Provider 异常、最近审计事件。

所有数字来自平台真实数据；无数据为 0 / 空状态。

### 5.26 JEEP-02 用户 / Workspace

搜索、状态、套餐、席位、点数摘要、创建 / 到期时间、风险标记。敏感操作进入详情，不在列表一键执行。普通 Jeepwork 人员也按平台角色限制。

### 5.27 JEEP-03 Sales Leads

状态建议：New、Contacted、Qualified、Closed；这是 Link168 自身销售流程，不得与客户 Workspace 的三状态 Lead 复用同一枚举而造成混淆。字段：联系人、公司、联系方式、团队规模、套餐兴趣、需求、Owner、最后联系、内部目标是否逾期。

平台 Sales Lead 状态是平台内部对象；若现有 Schema 不同，Codex 先做映射，不得误改普通 Lead 规则。

### 5.28 JEEP-04 Enterprise 合同 / 付款 / 发票

#### 合同

Draft、Sent、Signed、Cancelled（目标状态需对照现有代码）。

#### 付款

Pending、Partially paid、Paid、Refunded / Exception。记录金额、币种、时间、参考号和备注，不存完整卡数据。

#### 发票

Not requested、Requested、Processing、Issued、Sent、Exception。只记录状态和必要信息，不调用未集成的开票系统假成功。

#### 激活

显示目标 Workspace、套餐、周期、席位、点数和生效日期。服务端重新校验合同 / 付款；二次确认；幂等；Audit Log。

对应：AT-ENT-004…007。

### 5.29 JEEP-05 举报

列表显示 Page、原因、时间、举报数量、处理状态、处理者。详情允许查看当时公开版本快照或必要信息，避免 Draft / 私人数据。处理动作：待处理、审核中、已处理、驳回；具体处罚需要平台政策，不在本规格自动封禁。

### 5.30 JEEP-06 Provider

显示 AI、Payment、Email、SMS、Storage 等配置状态、最近健康检查、最后错误。密钥只能新设 / 轮换，不显示完整值；保存后显示掩码和更新时间。健康检查不能写入真实业务副作用。

### 5.31 JEEP-07 Audit

至少覆盖：Enterprise 激活、套餐人工变更、退款、点数调整、Provider 变更、成员移除、Lead 批量转派、发布异常处理。字段：时间、操作者、对象、动作、结果、关联 request / idempotency key、非敏感差异摘要。

### 5.32 JEEP-08 历史商业模块

只做清单和明确状态：

- Promotions — 保留禁用；
- Card Keys — 保留禁用；
- Commissions — 保留禁用；
- 其他真实存在项 — 盘点后分类。

禁用页面不提供可执行主按钮。只有 OWNER 新决定后才设计重新启用流程。

### 5.33 LEGAL-01 服务条款

未登录可访问。页面必须显示运营主体、当前版本、生效日期、服务范围、账号责任、禁止内容、AI 接待边界、公开 Page / 举报规则、套餐 / 点数 / 支付 / 退款入口、知识产权、服务变更、账号限制与申诉、联系渠道。交付 PDF 仅提供信息结构与版式参考，不是可直接上线的法律全文；正式文本必须由 OWNER 根据真实运营主体、实际产品行为、数据处理方式和适用法域确认。不得自行补写不存在的处理目的、共享对象或法律承诺。

Desktop 使用 760px 阅读列 + sticky 目录；Mobile 使用单列正文和目录 drawer。条款链接在注册、Footer、Pricing / Checkout 和账号停用页可到达。旧版本必须保留版本号和适用时间，不能把历史同意静默改到新版本。

对应：AT-LEGAL-001…004、AT-A11Y-001…004。

### 5.34 LEGAL-02 隐私政策

未登录可访问。至少说明：收集的数据类别、处理目的、公开 / 私有边界、AI Provider / 支付 / 邮件短信 / 云服务等接收方类别、保存原则、安全措施、用户查阅 / 更正 / 撤回 / 停用 / 删除请求、未成年人保护、政策更新和联系渠道。

不得承诺“完全匿名”或“绝不共享”等无法证明的绝对表述。交付 PDF 仅提供信息结构与版式参考，不是可直接上线的法律全文；正式文本必须由 OWNER 根据真实运营主体、实际产品行为、数据处理方式和适用法域确认，开发不得编造处理目的。Direct Form、Enterprise 联系与注册必须链接到实际版本。政策更新显示变更摘要；需要重新同意的用途不得只靠继续使用推定同意。

对应：AT-LEGAL-001…006。

### 5.35 LEGAL-03 账号停用 / 注销说明

当前不是一个“立即永久清空”按钮。页面显示：

1. 停用后立即退出、停止登录和公开展示；
2. Personal / Member / 相关 Team 内容的影响；
3. 订单、退款、点数、举报、审计、安全和其他 Workspace 历史的保留边界；
4. 需要重新鉴权与二次确认；
5. 处理结果与支持 / 申诉入口。

提交成功只表示平台已执行并确认的真实状态。若当前仅支持人工申请，显示申请结果，不调用未核验 API 假装停用。若复用 `/api/auth/deactivate`，必须先通过鉴权、幂等、session 撤销、公开 Page、Workspace 关系与历史数据测试。

对应：AT-LEGAL-007…012。

### 5.36 REPORT-01 公开举报

从 Public Page Footer 进入时携带 Page ID 与 Published version。字段：类别、事实说明、可选证据、可选联系、隐私提示。类别至少包括垃圾 / 误导、欺诈风险、违法违规、侵权、隐私泄露、骚扰仇恨、其他。

成功文案：`举报已收到，平台将根据公开版本证据进行审核。提交举报不会自动停用该页面。` 不显示 Owner 私人资料，不向被举报者暴露举报人。明显重复或滥用触发真实限流。

处置在 JEEP-05 完成：待处理 → 审核中 → 已处理 / 驳回。被处置用户获得理由摘要与一次申诉入口；申诉由不同操作者复核并写 Audit。

对应：AT-REPORT-001…010。

## 6. 核心交互流程

### IF-01 注册到首次发布

```text
MKT-01 免费开始
→ AUTH-02 注册 + username 原子保留
→ ONB-01 最小资料 / Offering
→ PRE-01 Draft 预览
→ Publish 原子提交
→ 成功页复制公开链接
→ CON-01
```

异常：username 冲突留在注册；Publish 失败保留 Draft；用户可稍后发布。

对应：AT-AUTH-001…003、AT-ONB-001…006、AT-PUB-004…007。

### IF-02 Draft → Preview → Publish

```text
编辑本地状态
→ 自动保存 Draft
→ Preview 读取 Draft
→ 发布确认
→ 服务端建立完整版本
→ 原子切换 Published pointer
→ Public Page + AI 读取同一 versionId
```

任何失败：Published pointer 不变；Draft 保留；不得半发布。

### IF-03 Visitor AI 到正式 Lead

```text
访客提问
→ Published Facts 回答
→ 是否有明确商业意图？
  ├─ 否：继续提供价值，不索取联系
  └─ 是：回答后邀请人工跟进
       → 是否提供至少一种有效联系？
          ├─ 否：保留 Conversation，不建 Lead
          └─ 是：统一资格服务 → 创建一个 Lead → IF-05 Routing
```

### IF-04 Direct Form 到正式 Lead

```text
选择咨询类型 + 写需求
→ 填至少一种有效联系方式
→ 服务端验证意图与联系
→ 幂等创建 Lead
→ IF-05 Routing
→ 显示真实成功
```

### IF-05 Lead Routing

```text
有效来源 Member？
├─ 是 → 分配来源 Member
└─ 否 → Offering 有有效默认负责人？
        ├─ 是 → 分配 Offering 负责人
        └─ 否 → Workspace 默认负责人有效？
                ├─ 是 → 分配默认负责人
                └─ 否 → 分配 Workspace Owner + 配置提醒
```

每一级都在事务内验证 active、Workspace membership 和权限。

### IF-06 Lead 跟进

```text
New
→ 查看 Context / Conversation / Summary
→ 真实联系客户
→ 标记 Contacted
→ 添加 Internal Note / 必要转派
→ 本次咨询结束
→ Closed
```

查看 Lead 本身不自动变 Contacted。

### IF-07 Invite

```text
Owner/Admin 选择 Admin 或 Member
→ 创建 7 天一次性链接
→ 复制 / 微信 / 已启用渠道
→ 接受者打开
→ 登录或注册并 return
→ 服务端校验 token / seat / membership
→ 原子加入
→ token 已使用
```

### IF-08 移除 Member

```text
选择 Member
→ 显示 Page 与 active Leads 影响
→ 选择继任负责人（默认 Owner）
→ 服务端事务：禁用 Page + 转派 active Leads + 移除 membership + 写历史
→ 成功摘要
```

事务失败不得留下 Page 已禁用但 Lead 未转移的半状态。

### IF-09 AI 点数结算

```text
识别 Page 所属 Workspace + 显示商家侧本次成本（核心回答 5 点）
→ 检查余额
→ 建立幂等预扣
→ 调用 AI
→ 有可用输出？
  ├─ 是：最终结算一次
  └─ 否：全额退回一次
→ 记录 bucket 与到期顺序
```

### IF-10 套餐升级 / 降级

升级：展示差价与补点 → 服务端创建支付宝订单（金额按分）→ 支付 → 验签 / 金额 / 订单校验 → 回调或主动查询幂等确认 → 立即生效。丢失回调由查询 / 对账补偿，return URL 不直接激活。
降级：展示下周期日期 → 确认 → 保存 scheduled change → 当前权益不变。
取消续费：显示结束日期 → 确认 → 关闭 auto-renew，不退款。

### IF-11 宽限

```text
周期到期
→ `graceEndsAt = expiryAt + 72 hours`（服务端按 UTC 计算，界面转换为用户时区）
→ 保留原权益，不发新订阅点
→ 续费成功：恢复正常
→ 未续费：降 Free、品牌恢复、数据与有效充值点保留
```

宽限在 `graceEndsAt` 前有效，到点结束；不按自然日取整。Codex 必须覆盖到期前 1 秒、到期时刻和到期后 1 秒的边界测试，前后端不得使用不同算法。

### IF-12 例外退款

支持人员发起 → 显示订单、已用 / 未用订阅点、独立充值订单 → 人工审核 → 批准后支付退款与点数回收幂等 → Audit。失败时可安全重试，不静默改变套餐。

### IF-13 Enterprise

```text
ENT-01 提交
→ Platform Sales Lead
→ 1 工作日内部提醒
→ 联系 / 方案 / 合同
→ 记录付款与发票状态
→ 授权 operator 复核
→ 原子激活 Workspace 套餐 / 席位 / 点数
→ Audit + 客户真实状态
```

### IF-14 Custom Domain

输入域名 → 给 DNS 记录 → 定时 / 手动验证 → 验证成功后申请 SSL → ready 后切 canonical → Link168 URL 301 / 308。任何中间失败继续保持 Link168 URL 可用。

### IF-15 政策同意与版本

```text
打开注册 / Direct Form / Enterprise Form
→ 加载当前适用政策版本
→ 用户阅读链接并主动同意
→ 提交时服务端再次校验版本
→ 记录政策类型 / 版本 / 时间 / 主体 / 用途
→ 业务提交成功
```

政策在用户填写期间更新时，不自动替用户同意新版本；返回明确提示并保留非敏感输入。

### IF-16 账号停用（兼容 / 平台处置）

```text
LEGAL-03 查看影响
→ 重新鉴权
→ 展示 Page / Workspace / 数据保留影响
→ 二次确认
→ 服务端幂等停用 + 撤销 session + 停止公开展示
→ 返回真实处理摘要与支持入口
```

本流程保留给现有停用能力或平台处置，不代替用户主动注销的 IF-20。任何失败不得留下“仍能登录但 Page 已丢失”或“账号已停用但公开页仍在线”的半状态；本流程不自动执行永久硬删除。

### IF-17 举报、处置与申诉

```text
Public Page Footer → REPORT-01
→ 提交类别 / 说明 / 最小证据
→ 绑定当时 Published version
→ JEEP-05 人工审核
→ 已处理或驳回 + Audit
→ 如有限制措施：通知理由摘要和申诉入口
→ 不同操作者复核一次申诉
```

举报数量本身不自动封禁；Draft、私人联系方式和 Internal Notes 不进入举报证据。

### IF-18 Owner Transfer

```text
Owner 发起
→ 选择 active Member
→ 展示影响并二次确认
→ Pending Transfer
→ 接收方确认？
   ├─ 否 / 过期 / 拒绝：Owner 不变
   └─ 是：服务端事务变更 Owner
          → 权限刷新
          → Team plan / ledger / credits 归属不变
          → Audit
```

没有合格接收人时阻止会造成 Team 无主的退出或注销；系统不得自动将 Admin / Member 升级为 Owner。异常恢复只允许授权 `/jeepwork` 人工流程。

### IF-19 Team Dissolution / Restore

```text
Owner 二次确认解散
→ Team 进入 Closed / Pending Deletion
→ Team Page / Member Pages / AI / Invite / New Lead 停用
→ Billing auto-renew off + Team credits frozen
→ 30 天内恢复？
   ├─ 是：原子恢复 Team / Members / Pages / Ledger
   └─ 否：普通业务数据删除 / 匿名化
          → legal retention 单独隔离保留
```

恢复不得产生重复订阅、重复点数或复活已明确终止的 Invite。

### IF-20 Account Cancellation

```text
用户发起注销
→ 是否仍是某 Team 唯一 Owner？
   ├─ 是：阻止 → IF-18
   └─ 否：重新鉴权 + 二次确认
          → Personal Page 下线
          → 30 天 Pending Cancellation
          → 撤销？
             ├─ 是：一致恢复个人业务空间
             └─ 否：删除 / 匿名化普通数据
                    → legal retention 单独隔离保留
```

Pending Cancellation 期间不得继续正常经营；保留数据不得继续支持公开 Page 或正常账号运营。

## 7. 状态机

### 7.1 Page

| 当前 | 事件 | 下一状态 | 失败 |
| --- | --- | --- | --- |
| Draft only | Publish | Published | Draft only |
| Published | Edit Draft | Published + draft changes | Published |
| Published + draft changes | Publish | Published new version | Published old version + draft |
| 任意可编辑 | Disable | Disabled | 原状态 |
| Disabled | Re-enable | 上次 Published 或 Draft only | Disabled |

### 7.2 Lead

| 当前 | 可到 | 说明 |
| --- | --- | --- |
| New | Contacted / Closed | Close 可用于无效 / 已解决咨询，记录原因 |
| Contacted | Closed | 正常结束 |
| Closed | — | MVP 默认终态；重新开启需未来决定或明确实现依据 |

### 7.3 Invite

`Active → Used / Expired / Revoked`。Used / Expired / Revoked 均为终态，不复活；需要新邀请。

### 7.4 Subscription

`Active → Cancel at period end → Active until end → Grace → Free`。续费成功可从 Active / Grace 回 Active。Upgrade 在 Active 内立即切换；Downgrade 为 scheduled state。

### 7.5 AI Request

`Created → Reserved → Running → Settled` 或 `Refunded`。Settled / Refunded 必须终态且幂等。

### 7.6 Report

`Pending → Reviewing → Resolved / Rejected`。若产生限制措施，可进入一次 `Appealed → Upheld / Reversed` 复核结果；原举报和处置记录不删除。

## 8. 验证与错误文案

| 场景 | 文案 |
| --- | --- |
| Draft 已保存 | `已保存草稿` |
| Draft 保存失败 | `更改尚未保存。内容仍保留在当前页面，请重试。` |
| 有未发布修改 | `有未发布修改` |
| Publish 成功 | `已发布，公开页与 AI 已更新。` |
| Publish 失败 | `新版本未发布，公开页仍使用上一版本。` |
| AI 不知道 | `主页资料里没有这项信息，我无法确认。你可以换个问法或直接联系。` |
| AI 临时失败 | `这次回答没有完成，未扣除点数。你可以重试或直接联系。` |
| 点数不足 | `当前点数不足（需要 {cost} 点）。` |
| Lead 成功 | `咨询已提交。主页负责人可以通过你留下的方式联系你。` |
| 联系方式组错误 | `请至少填写一种有效联系方式：手机、微信或邮箱。` |
| 邀请复制 | `邀请链接已复制，7 天内有效且只能使用一次。` |
| 成员移除成功 | `成员已移除，{count} 条进行中的咨询已转给 {assignee}。` |
| 降级 scheduled | `将在 {date} 切换为 {plan}，当前权益保持到该日期。` |
| 宽限 | `套餐已到期，当前权益保留至 {date}，宽限期不发放新点数。` |
| Enterprise 提交 | `企业需求已提交。平台已收到以上信息，后续联系以实际处理结果为准。` |

## 9. 数据与事件建议

事件命名应描述真实动作，不把展示当成成功：

- `page_draft_saved`；
- `page_publish_started / succeeded / failed`；
- `public_page_viewed`；
- `ai_question_submitted / answered / failed`；
- `direct_form_submitted / lead_created`；
- `lead_assigned / status_changed / note_added`；
- `invite_created / accepted / failed`；
- `credits_reserved / settled / refunded`；
- `plan_change_scheduled / activated`；
- `enterprise_sales_lead_created / activated`。

事件不得包含完整消息、密码、API Key、完整付款资料或无需分析的私人联系方式。

## 10. Browser Golden Path 脚本

唯一主闭环建议覆盖：

1. 注册并保留 username；
2. onboarding 创建 Profile + Offering；
3. Preview；
4. Publish；
5. 匿名访客访问 Public Page；
6. AI 提问已知与未知问题；
7. 通过 Direct Form 或 AI 提交意图 + 联系；
8. 验证 Lead 只创建一次并按规则分配；
9. Owner 登录 Inbox；
10. 添加 Note、标记 Contacted、Closed；
11. 修改 Draft 未发布，验证 Public + AI 仍旧；
12. Publish 后两者同时更新。

再以独立权限测试覆盖 Workspace B 越权和 Member scope。不要在一个脆弱脚本里塞入所有套餐 / Enterprise 分支。

## 11. Codex 页面施工输出

每完成一个页面，提交说明需列：

```text
Page ID：
Flow ID：
Acceptance IDs：
复用组件：
新增组件：
真实 API / Schema：
Loading / Empty / Error / Permission：
360 / 390 / 1440 结果：
键盘 / focus 结果：
未验证依赖：
```

## 12. 进入开发的默认规则

Codex 一次进入开发模式后，除 `DEVELOPMENT_EXECUTION_RULES.md` 明确要求停止的 OWNER 级高风险事项外，可直接采用本规格中的字段、文案、布局、状态和异常默认值连续开发，不再拆成 A–G 阶段，也不再把普通 UI 细节退回 OWNER。

如果真实代码已经提供更成熟且不冲突的交互，优先复用并在任务说明中记录映射；不能因为 PDF 位置不同就重写一个功能正确、可访问、符合当前视觉的组件。

## 13. 页面级移动适配矩阵

每个页面必须按下表实现明确移动模式。此表与全局 Mobile Design Reference 共同构成移动端施工依据，不要求每页重复制作一张独立完整高保真画板。

| 页面 ID | 360–430px 模式 | 固定 / 抽屉规则 | 主要风险 |
| --- | --- | --- | --- |
| MKT-01 / MKT-02 | 单列价值与套餐卡；月 / 年切换可见 | 顶栏折叠，主 CTA 不遮 Footer | 套餐横向溢出、价格脚注过小 |
| AUTH-01 / AUTH-02 / AUTH-03 | 单列表单，品牌叙事缩为紧凑标题 | 键盘打开时提交按钮可见 | iOS 放大、错误被键盘遮挡 |
| ONB-01 | 单任务一步一屏，Mini Preview 可折叠 | 底部“上一步 / 继续”，Publish 独立确认 | 进度丢失、字段过长 |
| CON-01 / CON-02 | 指标与 Page 转卡片列表 | 底部导航最多 5 项 | 零值仪表盘墙、行内按钮冲突 |
| EDT-01 / EDT-02 | 单列编辑 / 预览切换 | Section / 属性用 drawer，底部保存 / 发布 | 缩小桌面三栏、键盘遮挡 |
| PRE-01 | Draft 单列预览，可切目标宽度 | Preview banner 固定但不遮内容 | 误认为已发布 |
| PUB-01 / PUB-02 / PUB-03 | Hero、Offering、信任、AI / 联系按叙事单列 | 只保留一个 Primary | 图片裁切、双主 CTA 竞争 |
| PUB-04 / PUB-05 | AI / 表单全高 sheet 或独立页 | 输入区随键盘上移，Direct Form 始终可达 | 对话区被键盘遮挡、假成功 |
| LEAD-01 / LEAD-02 | 表格转 Lead Card；详情单列分区 | 筛选 / 转派用 drawer | 私人字段过曝、操作误触 |
| DATA-01 | 指标单列 / 双列，图表可读且有摘要 | 时间范围 sticky 可选 | 图表横溢、只靠颜色 |
| SET-01 / SET-02 / SET-03 / SET-04 | 设置分组卡；邀请 / 成员 / 点数 / Privacy 权利入口转纵向 | 危险操作独立确认 sheet | 域名字符串溢出、账单数字拥挤 |
| ENT-01 | 起价摘要 + 单列表单 | 提交持久结果 | 联系字段和隐私同意被折叠 |
| LEGAL-01 / LEGAL-02 | 16px 以上单列正文，目录 drawer | 返回、版本、联系入口可达 | 文字过小、超长不可导航 |
| LEGAL-03 | 影响清单 + 重新鉴权 + 二次确认 | 危险 CTA 不与返回并排 | 误触永久操作、影响说明缺失 |
| REPORT-01 | 单列类别、说明、证据、隐私提示 | 提交结果持久 | 泄露身份、自动封禁误导 |
| JEEP-01…08 | 桌面优先；移动只支持必要查看 / 紧急处理 | 密集表格转分组卡，危险操作需桌面或二次确认 | 平台权限、横向表格、误操作 |
| SYS-01 | 单列状态卡与一个下一步 | Retry 不重复副作用 | 错误与空状态混淆 |
