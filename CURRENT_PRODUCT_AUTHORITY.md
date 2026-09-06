# CURRENT_PRODUCT_AUTHORITY

**产品：** Link168 / link168.me
**版本日期：** 2026-08-14
**状态：** CURRENT / OWNER APPROVED TARGET
**目的：** 定义当前产品唯一权威、MVP 边界和必须实现的业务规则。

## 1. 权威与事实

### 1.1 冲突裁决

发生冲突时按以下顺序处理：

1. OWNER 最新明确决定；
2. 当前真实代码、运行时、数据库、测试和浏览器事实；
3. 本文件及同目录现役文件；
4. 最近审计与研究；
5. 历史文件、旧设计和旧聊天。

“当前事实”和“目标规则”必须分开表达：真实代码决定目前有什么，本文件决定最终应该实现什么。旧代码不能自动覆盖产品目标，本文件也不能被用来假报功能已经完成。

### 1.2 当前模式

当前开发指导、UI、交互、信任入口与验收合同已经收口，可一次进入连续开发模式。开发模式的首要动作是核对真实仓库、已有改动、数据库、Provider 和现有测试；这不是独立研究阶段，也不再生成平级报告。没有 OWNER 级冲突时，Codex 直接按依赖顺序持续实现、验证和提交。最近只读审计只说明相关代码线索，完成状态仍以本文件和 `MVP_ACCEPTANCE_TESTS.md` 的本次运行证据为准。

## 2. 产品定位

Link168 是：

> **个人 / 团队的 AI 商业主页平台**

核心价值链：

> **商业主页 → AI 接待 → Lead → Handoff**

Link168 帮助专业服务者和小团队：

1. 用低学习成本建立可信商业主页；
2. 展示身份、团队、产品、服务、案例和联系入口；
3. 让访客快速理解“你是谁、能做什么、是否适合我”；
4. 由 AI 基于已发布事实回答和澄清；
5. 在出现真实跟进意图后获取至少一种有效联系方式；
6. 把正式 Lead 确定性地交给正确负责人；
7. 在极简后台完成查看、联系、分配、备注和关闭。

Link168 的市场价值不以功能数量为目标。核心体验保持为“填写业务信息 → 得到商业主页 → 分享链接 / 二维码 → 访客浏览或咨询 AI → 真正有跟进意图的人形成 Lead → 本人或团队成员跟进”。该原则只用于防止产品膨胀，不授权新增 CRM Pipeline、Ticket、Task、SLA、ERP、商城、库存、物流、客服中心、Agent Platform、自由 Canvas 或复杂 Workflow Builder。

### 2.1 当前核心用户

- 个人创业者、个体经营者；
- 顾问、教练、律师、设计师、销售和其他专业服务者；
- 内容创作者和有商业咨询需求的个人品牌；
- 2–20 人左右的服务团队；
- 需要统一品牌入口、成员展示和咨询分配的小企业。

Enterprise 套餐可销售，但复杂组织、深度集成和大型企业工作流不是当前 MVP 主线。

### 2.2 核心成功标准

产品成功不是“页面好看”或“AI 能说话”，而是：

- 用户能快速发布可信主页；
- 公开页和 AI 使用一致、可控、已发布的信息；
- 访客能获得价值并顺利联系；
- 只有合格咨询进入 Lead；
- Lead 能正确分配并完成轻量跟进；
- 所有失败都真实、可恢复、不会造成错误扣点或内容泄露。

## 3. 当前 MVP 边界

### 3.1 当前必须形成闭环的能力

- 注册、登录和公开地址保留；
- Personal Page、Team Page、Member Page；
- 精选 Section 与 Theme；
- Offering；
- Case / Portfolio 作为页面内容；
- Draft、Save、Preview、Publish；
- Public Page 与 Visitor AI 的共同 Published Business Facts；
- Visitor AI 接待；
- Direct Contact / Form fallback；
- Conversation 与正式 Lead 的区分；
- 三级 Lead Routing；
- 极简 Lead Inbox；
- Owner / Admin / Member 协作；
- 基础数据；
- 分享、举报、品牌露出；
- 服务条款、隐私政策、同意记录、账号停用申请与最小申诉；
- 套餐、点数、购买、升级、降级、宽限与退款边界；
- Enterprise 联系销售与 `/jeepwork` 人工激活闭环；
- 真实失败状态、响应式、无障碍与核心浏览器 E2E。

### 3.2 当前不扩展为主线系统

- CRM、Deal、Opportunity、Pipeline；
- Task、Ticket、SLA、Workflow Builder；
- OA、HR、部门、复杂汇报线、排班；
- 通用自由建站平台或 Figma / Framer 式自由画布；
- 万能 AI Agent、联网搜索 Agent；
- 大型文件知识库、任意 URL 抓取；
- 完整 Reviews、Appointment、Lead Attachment、复杂通知；
- 自动开票、复杂财务或收入分佣系统；
- 深度企业目录、SSO、复杂权限矩阵。

### 3.3 冻结后置

以下规则可记录和预留，但不阻塞当前 MVP：

- Customer Reviews 的邀请、原始内容、公开整理和精选；
- AI 编辑器的全页改写、版本历史和深度分析；
- 预约、附件、复杂通知；
- 企业深度集成、SSO、目录同步；
- Promotions、Card Keys、Commissions 等历史商业模块的重新启用。

## 4. 产品领域模型

### 4.1 Workspace

Workspace 是底层 tenant、数据与权限边界，不是普通用户需要理解和管理的主要产品对象。每个账号拥有一个个人业务空间及对应 Personal Page；MVP 最多创建一个自己拥有的 Team，同时可以加入多个其他 Team。加入多个 Team 不创建多个个人业务空间，也不允许用户在 MVP 中创建多个自有 Team。

普通 UI 使用“我的主页”“我的团队”“我加入的团队”“当前团队”“团队设置”“成员”等自然语言，不显示裸 Workspace ID，也不把多个底层 Workspace 呈现为需要用户管理的“Workspace 1 / 2 / 3”。

任何查询、写入、发布、Lead、Conversation、点数和设置必须在 Workspace 范围内校验。跨 Workspace 读取或修改属于严重错误。

### 4.2 Page

采用统一 Page 模型，当前类型：

| 类型 | 所属 | 公开用途 |
| --- | --- | --- |
| Personal Page | 个人业务空间 | 个人品牌与服务入口 |
| Team Page | Team | 团队品牌、Offering、AI、成员与联系入口 |
| Member Page | Team + Member | 成员专业能力与其负责业务入口 |

三种页面共享 Page Schema、Section、Renderer、Theme、Draft / Publish、Analytics 和 AI Business Facts 的基础能力。Team Page 可以有团队特有 Section 和编排，但不能继续成为完全独立的第二套站点系统。

### 4.3 Offering

产品与服务在领域层统一称为 `Offering`，可表现为 Product 或 Service。Offering 服务于：

- 页面展示；
- Visitor AI 已发布事实；
- Lead Context；
- Member / Team 关系；
- 默认负责人。

若当前数据库仍使用 `Product`，不要求仅为改名进行高风险迁移；可在领域层、API 和 UI 中逐步统一语义。

### 4.4 Conversation 与 Lead

Conversation 是一次访客交流。Conversation 不自动等于 Lead。

正式 Lead 必须同时满足：

1. 明确商业跟进意图；
2. 至少一种有效联系方式。

“只有联系方式”或“只有意图”都不能创建正式 Lead。未满足时保留 Conversation、草稿联系信息或匿名事件即可，不得制造 Lead 数量。

### 4.5 Published Business Facts

Published Business Facts 是一次 Publish 产生的、供公开 Page 和 Visitor AI 共同读取的不可分割事实版本。至少包含与公开展示和回答相关的：

- Profile / Team / Member 公共资料；
- 已显示 Section；
- Offering；
- Case / Portfolio；
- FAQ；
- 公开联系信息；
- AI 可回答的结构化事实；
- 负责人映射所需的已发布 Offering / Member 关系。

Draft 不能被 Public Page 或 Visitor AI 读取。Publish 失败时必须继续使用上一个完整 Published 版本，禁止 Page 成功、AI 失败的半发布。

## 5. 信息架构与路由

### 5.1 普通用户唯一后台

普通用户后台根入口为 `/console`。一级导航固定为：

1. 概览；
2. 我的页面；
3. 客户；
4. 数据；
5. 设置。

AI 接待、团队、套餐和账号属于上述栏目内的能力，不再各自抢占一级导航。

旧 `/dashboard`、`/workbench` 等入口可以重定向到 `/console`，但不得继续形成第二套后台。

### 5.2 平台运营后台

平台运营根入口为 `/jeepwork`，与普通 Workspace 权限严格分离。旧 `/admin` 不作为公开或备用平台入口。

### 5.3 公开地址

- 个人公开地址以 `/{username}` 为基础；
- Team / Member 的真实现有路由需在施工前核对并映射，不凭文档强制高风险改路由；
- 新注册在注册阶段选择并保留公开地址标识；
- 地址大小写、保留词、长度和字符规则由统一校验实现；
- 地址分配先到先得；
- 个人可由 Owner 主动把自己的个人路径转给自己拥有的 Team，不允许强制占用他人路径；
- Team Member 默认继承个人 username 作为成员 slug，Workspace 可设置其范围内唯一的覆盖 slug，不改变个人 username；
- 配置自定义域后，自定义域为 canonical，Link168 地址重定向到自定义域。

具体目标子路由写在 `LINK168_MVP_PAGE_AND_INTERACTION_SPEC.md`。Codex 必须先映射真实路由；任何“目标路由”都不是当前已实现声明。

## 6. 注册、登录与首次发布

### 6.1 注册

当前注册不强制邮箱验证。注册字段至少包括：

- 邮箱或当前支持的主账号；
- 密码；
- 公开地址标识 `username`；
- 同意服务条款和隐私政策。

必须实时验证 username 的格式和可用性，并在最终提交时由服务端再次原子校验，防止并发占用。失败必须保留已填写内容并给出可理解的修正建议。

### 6.2 首次设置

注册后进入简短 onboarding，不重复要求设置 username。建议顺序：

1. 欢迎与目标选择；
2. 头像 / Logo、姓名或品牌名、职业 / 一句话介绍；
3. 选择主题起点；
4. 添加首个 Offering 或核心链接；
5. 预览；
6. 发布；
7. 完成页提供复制链接、二维码和进入 Console。

允许跳过非必要内容；必要内容缺失时明确告诉用户为什么不能发布。

## 7. 页面系统

### 7.1 编辑器原则

编辑器采用：

> **精选 Section + Theme System**

允许：添加、编辑、删除、排序、显示 / 隐藏、有限布局、主题、预览和发布。

不允许：自由像素拖拽、任意 HTML、无限组件、任意脚本、复杂响应式控制。

### 7.2 MVP Section Library

| Section | 用途 | 关键规则 |
| --- | --- | --- |
| Profile / Hero | 身份、定位、主 CTA | 每页一个主 Hero；主 CTA 最多一个高意图动作 |
| Links | 常用链接 | 明确标签，不只显示裸 URL |
| Offering | 产品 / 服务 | 可关联负责人，提供公开事实与 Lead Context |
| Case / Portfolio | 案例、作品、成果 | 仅为结构化页面内容，不发展项目管理 |
| Member | 团队成员 | 只展示当前允许公开且状态有效的成员 |
| FAQ | 常见问题 | 可进入 Published Business Facts |
| Contact / CTA | 直接联系 / 表单 | AI 不可用时仍须工作 |
| AI Entry | AI 接待入口 | 仅在启用且配置完成时展示可用状态 |
| Text / Image / Social | 必要基础展示 | 有限、可访问、不可扩展为通用 Builder |

### 7.3 页面发布状态

- `Draft only`：未发布，仅所有者可编辑和预览；
- `Published`：存在有效公开版本；
- `Draft changes`：已发布版本仍在线，同时存在未发布修改；
- `Publishing`：原子发布进行中，防重复提交；
- `Publish failed`：保留上一个 Published；
- `Disabled`：公开访问不可用，但数据保留；
- `Archived` 仅作为未来预留，不在 MVP 强制实现。

### 7.4 Team Page

Team Page 采用“企业业务 + 成员获客融合型”结构：

1. 品牌身份；
2. 核心 Offering；
3. 团队 AI / 咨询入口；
4. 成员；
5. 案例与信任；
6. 联系 / Lead。

Owner / Admin 可编辑 Team Page；Member 当前无 Team Page 直接编辑权。团队设置主主题，成员仅在限定范围内个性化其 Member Page。

Member 只能编辑自己的 Member Page，允许字段为头像、展示名、职位、简介、个人公开联系方式、个人专业介绍，以及被允许关联给自己的 Offering。Member 可以 Save Draft、Preview，并 Publish 自己权限范围内的修改。Member 不得修改 Team Theme、团队统一品牌、团队全局内容、其他 Member Page 或未授权 Offering 关系。

Owner / Admin 继续控制 Team Page 与团队品牌，并可管理、禁用 Member Page。当前不增加 Member 每次 Publish 都必须审批的工作流。Member 不允许调用 Team Publish API，但这不限制其 Publish 自己权限范围内的 Member Page。

所有 active 成员可成为展示候选，最终公开显示由 Owner / Admin 管理。被移除、停用或离开 Workspace 的成员自动不公开。

### 7.5 Member 移除

移除成员时：

- Member Page 立即 Disabled，公开访问不可用；
- 历史 Leads、Conversation、页面版本和数据保留；
- 操作者选择活跃 Lead 的继任负责人；
- 未选择、继任无效或并发异常时，自动回退 Workspace Owner；
- 保存完整分配历史；
- 被移除成员不再出现在 Team Page 成员候选或公开内容中。

## 8. 视觉与品牌

### 8.1 当前视觉方向

当前 UI 采用已选方向 2：

> **温暖编辑感的专业服务品牌**

- 暖象牙背景建立可信、有人情味的编辑感；
- 真实人物与服务内容建立信任；
- 金色用于品牌身份和温暖强调；
- 深蓝用于高意图主操作；
- 界面必须像真实产品，不使用灰色框线稿冒充高保真 UI；
- 旧电光蓝、赛博玻璃和墙纸式设计不再是当前方向。

完整 token、组件和响应式规则见 `LINK168_UI_DESIGN_SYSTEM.md`。

### 8.2 固定 Logo

使用本开发包 `assets/link168-logo-system/assets/` 中提供的固定 `link168-logo-system` 资产；原始交付同时保存在 `assets/link168-logo-system-original.zip`。不得重绘、改比例或随意改色。生产使用时：

- SVG wordmark 中的文字应转曲或使用已确认的稳定矢量字形，避免字体差异；
- 16px favicon 使用简化版；
- `share-entry.svg` 只作视觉参考，实际必须使用语义化 HTML 链接 / 按钮；
- Logo 品牌蓝 `#1677FF` 与 UI 行动深蓝 `#0B4DD8` 可同时存在，不能混为一个 token；
- Logo 金色保持资产原值，UI 可使用 `#E9A52B` 作为界面强调色。

### 8.3 公开品牌与举报

| 套餐 | Link168 品牌入口 | 举报入口 |
| --- | --- | --- |
| Free | 必须显示，可点击 | 必须显示 |
| Plus | 不显示 | 必须显示 |
| Pro | 不显示 | 必须显示 |
| Enterprise | 不显示 | 必须显示 |
| Enterprise Pro | 不显示 | 必须显示 |

举报入口不得被主题隐藏；举报表单必须关联公开页面、原因和时间，并防止明显滥用。举报不会自动向访问者泄露页面 Owner 的私人信息。

## 9. Visitor AI

### 9.1 定位

Visitor AI 是商业主页上的接待层，只承担：

- Answer；
- Recommend；
- Clarify；
- Capture；
- Handoff。

访客必须清楚知道自己正在与 AI 功能互动，而非人类员工。AI interaction 与 Human Handoff / follow-up 必须在状态与文案上可区分，不得使用虚假的真人身份。Visitor AI 文本交互至少保留可见 AI 身份 / AI 生成提示位置；其他生成内容形态按上线时适用规则提供对应显式及隐式 / 元数据标识能力。

它不是通用聊天机器人，不执行任意互联网任务。

公开营销不得把 Handoff 写成“保证成交”“自动筛出真正客户”或平台必然主动联系。可验证边界是：AI 根据已发布资料回答，访客可提交咨询，信息进入后台后由负责人自行跟进。

### 9.2 信息边界

Visitor AI：

- 不访问互联网；
- 只使用当前有效 Published Business Facts；
- 不读取 Draft；
- 不把访客输入自动写成商家事实；
- 没有依据时必须澄清、明确无法确认或建议人工联系；
- 推荐具体 Member 必须依据公开专业信息、Offering、配置负责人或访客明确指定，不能猜测。

### 9.3 联系方式获取时机

普通咨询先提供价值。只有访客表达明确商业跟进意图后，AI 才请求联系方式。获取到联系方式后仍需确认意图完整，才创建正式 Lead。

### 9.4 AI 可用状态

- 未启用；
- 已启用但配置不完整；
- 可用；
- 正在回答；
- 点数不足；
- Provider 未配置；
- 临时失败 / 超时；
- 安全拒绝；
- 已转人工。

每个不可用状态都必须保留 Direct Form 或明确联系入口。

### 9.5 点数扣除与失败补偿

- 只有得到可用输出后才最终扣点；
- 超时、Provider 错误、系统错误、安全拒绝或没有可用输出，自动全额退回；
- 预扣、结算、退回必须幂等；
- 用户重试、刷新、网络重复提交不得重复扣点或重复退点；
- 扣点顺序：最早到期优先；同一到期时间先用订阅点数，再用充值点数；
- 免费用户可以购买充值包并使用基础 AI 接待，不再沿用“Free 不能购买或不能使用真实 AI”的旧规则。

### 9.6 Visitor AI 点数承担与成本

- 公开页真实模型调用由该 Page 所属 Workspace 承担，访客不付费；
- 当前核心 Visitor AI 每次产生一个可用回答，默认使用基础档 5 点；
- 调用前成本对商家可见，公开访客不看到商家点数余额、扣费明细或内部配置；
- 商家“测试接待”若真实调用 Provider，同样明确显示并扣除 5 点；纯本地预览不得伪装成真实模型回答；
- Free Workspace 可使用购买所得、仍在有效期内的充值点数；余额不足时不调用模型，Direct Form 仍可用；
- 普通 1 点和高级 20 点只有在具体能力有明确配置与用户可见说明时才能扣除；高级能力当前后置，不得被 Visitor AI 动态暗扣。

## 10. Lead 与 Handoff

### 10.1 正式 Lead 条件

所有入口必须调用同一服务端资格判断：

```text
qualified_intent == true
AND valid_contact_methods >= 1
```

Direct Form 可通过明确的咨询类型、需求描述和提交动作建立商业意图；不能仅因输入手机号或邮箱就创建 Lead。

### 10.2 有效联系方式

手机号、微信、邮箱等为替代关系，至少一个有效。服务端进行格式和空值校验；前端校验只用于即时反馈，不能替代服务端验证。

### 10.3 Lead 状态

新业务状态固定为：

> **New → Contacted → Closed**

- `New`：已创建，尚未实际联系；
- `Contacted`：负责人已通过真实方式开始跟进；
- `Closed`：本次咨询已结束，不区分销售输赢。

旧 `viewed / following_up / won` 等状态只允许历史读取映射，不得继续写入新 Lead。读取映射必须明确、可测试，不得无声改变历史含义。

### 10.4 三级分配

固定三级 Routing：

1. Member Page 来源成员；
2. Offering default assignee；
3. Workspace default assignee。

若最终候选为空、已停用、已离开 Workspace 或没有权限，则分配 Workspace Owner，并在 Console 提示 Owner 完善默认负责人配置。

不做 Round Robin、地域、技能评分、复杂队列或 AI 猜负责人。

### 10.5 Lead Inbox

Lead Inbox 只提供：

- 列表与搜索 / 必要筛选；
- 来源、时间、访客联系方式、Offering Context；
- 负责人；
- `New / Contacted / Closed`；
- Conversation；
- 真实 AI Summary；
- Internal Notes；
- 联系客户；
- 手动转派与历史。

不提供 Pipeline 看板、金额预测、Task、自动化工作流或复杂 CRM 报表。

### 10.6 权限

- Owner：读取和管理 Workspace 全部 Leads；
- Admin：读取和管理 Workspace 全部 Leads；
- Member：只读取分配给自己或来源于自己 Member Page 的 Leads；
- Internal Notes 永不公开；
- 所有服务端查询必须在 Workspace 和角色范围内校验，不依赖前端隐藏。

## 11. 团队与邀请

### 11.1 Team v1 角色

当前仅有 Owner、Admin、Member。历史聊天中出现的 Manager 不进入当前角色体系，作为未来预留。

| 能力 | Owner | Admin | Member |
| --- | --- | --- | --- |
| 管理团队基本设置 | 是 | 是 | 否 |
| 编辑 Team Page | 是 | 是 | 否 |
| 邀请 Admin / Member | 是 | 是 | 否 |
| 移除成员 | 是 | 是，不能移除 Owner | 否 |
| 查看 Workspace 全部 Lead | 是 | 是 | 否 |
| 查看自己的 Lead | 是 | 是 | 是 |
| 配置套餐与付款 | 是 | 否，除非未来授权 | 否 |
| 转让 Owner | 是 | 否 | 否 |

### 11.2 Owner 生命周期

- Team 必须始终存在有效 Owner；
- 唯一 Owner 不能直接退出 Team，也不能通过个人账号注销使 Team 无主；
- Owner 转让只能选择当前活跃 Team 成员，接收方明确确认后才生效；确认前原 Owner 权限与责任不变；
- 没有符合条件的接收成员时，服务端阻止退出、注销或其他会造成 Team 无主的操作；
- 不得自动将 Admin 或 Member 升级为 Owner；
- Owner 异常失联或无法访问时，只能由授权 `/jeepwork` 操作员人工恢复，并记录完整 Audit Log。

### 11.3 邀请

- Owner / Admin 选择 Admin 或 Member；
- 生成 7 天有效的一次性链接；
- 可以复制、微信发送，或使用 Workspace 已启用的 Email / SMS；
- 接受者未登录时先登录或注册，再返回接受；
- 链接接受成功后即失效；
- 过期、撤销、已使用、角色变化和 Workspace 不可用必须显示明确状态；
- 邀请成功不得依赖未配置的 Email / SMS，复制链接始终可用。

### 11.4 Team 解散与恢复

仅 Owner 可在二次确认后解散 Team。确认成功后：

- Team Page、全部 Member Page 和 Team Visitor AI 立即停止公开服务；
- 不再接收新 Team Lead，全部未使用 Invite 失效；
- Team 进入 `Closed / Pending Deletion` 等价状态，停止后续自动续费；
- Team AI 点数冻结，不得继续消费或转给个人；
- 历史业务数据冻结，不因一次点击立即物理删除。

解散确认后提供 30 天恢复期。恢复必须原子恢复 Team、Members、Pages、Ledger / credits 等一致状态，不得重复订阅、重复发点或复活已明确终止的 Invite。30 天后，普通业务数据进入删除或不可逆匿名化；法律、交易、安全、争议和审计等有合法保存依据的数据进入隔离 retention / legal-hold，不得借此永久保留全部 Team 内容。

## 12. 套餐、席位与点数

### 12.1 套餐价格

| 套餐 | 月付 | 年付 | 包含点数 | 包含席位 |
| --- | ---: | ---: | ---: | ---: |
| Free | ¥0 | — | 0 订阅点数 | 1 |
| Plus | ¥69 | ¥599 | 800 / 月 | 1 |
| Pro | ¥139 | ¥999 | 3,000 / 月 | 3 |
| Enterprise | — | ¥8,800 起 | 每年一次性 180,000 共享点数（等值 15,000 / 月） | 10 |
| Enterprise Pro | — | ¥19,800 起 | 每年一次性 600,000 共享点数（等值 50,000 / 月） | 30 |

Enterprise 页面显示起价并联系销售。超出包含席位时联系销售，不在当前 MVP 建自助席位加购矩阵。

### 12.2 充值包

| 点数 | 价格 | 有效期 |
| ---: | ---: | --- |
| 1,000 | ¥39 | 购买后 365 天 |
| 3,000 | ¥99 | 购买后 365 天 |
| 10,000 | ¥299 | 购买后 365 天 |
| 30,000 | ¥799 | 购买后 365 天 |

所有套餐包括 Free 均可购买充值包。充值点数与订阅点数独立记账。

### 12.3 Personal 与 Team 计费归属

- Personal 业务空间与 Team 是独立计费主体，各自拥有套餐、Credit Account / Ledger；
- Team Page、Member Page、Team Visitor AI 的 AI 消耗均从所属 Team 的共享点数池预扣、结算或退回；
- Member 在所加入 Team 使用 AI 时使用目标 Team 权益，不扣个人业务空间余额；
- Owner 是 Team 账单联系人 / 付款责任人，不代表 Team 点数与 Ledger 归 Owner 个人所有；
- Owner 转让不改变 Team 套餐、订单、历史 Ledger 和剩余点数归属；
- 服务端必须校验 `workspaceId / teamId / billingAccountId` 的真实映射，不得使用前端传入的 Owner account id 代替归属校验。

### 12.4 AI 成本等级

- 普通：1 点；
- 基础：5 点；
- 高级：20 点。

具体功能映射必须在 UI 中提交前可见，不得在调用后才告诉用户费用。Visitor AI 的一次业务回答使用哪一档，由被调用能力的明确配置决定，不能动态暗扣不透明费用。

### 12.5 发放与到期

- Plus / Pro 月付：每个计费月发放当月点数；
- Plus / Pro 年付：开通时一次性发放全年额度，即 Plus 9,600、Pro 36,000；
- Enterprise / Enterprise Pro：开通时一次性发放全年共享额度；
- 订阅点数随当前会员周期到期，不结转到下一个周期；
- 充值点数从购买日起独立有效 365 天；
- 取消自动续费不立即降级，当前周期结束前权益保留；
- 宽限期不发新的订阅点数。

### 12.6 升级与降级

授权代定的当前默认：

- 自助套餐升级立即生效；
- 按当前周期剩余时间计算差价；
- 补发同一剩余周期的新旧套餐点数差额；
- 降级和年付转月付在下一个计费周期生效；
- 周期中不因降级自动退款；
- Enterprise 按合同由平台人工处理，不套用自助按比例规则。

货币四舍五入、时区和税费必须由支付合同统一，不得由前端自行计算最终应付金额。

### 12.7 宽限和过期

- 会员到期后有精确 72 小时权益宽限：`graceEndsAt = expiryAt + 72 hours`，服务端按 UTC 计算，不按自然日取整；
- 宽限期保留原套餐功能和席位，但不发放新订阅点数；
- 宽限结束后降为 Free；
- 已发布页面继续在线，用户数据保留；
- Free 品牌入口恢复；
- 超出 Free 的团队操作被冻结，不删除成员或数据；
- 未到 365 天的充值点数继续保留并可用于 Free 基础 AI；
- 恢复订阅后按新周期发放点数，不补发宽限期点数。

### 12.8 取消与退款

- 关闭自动续费不退款，权益持续到周期结束；
- 经批准的例外退款进入人工审核；
- 退款时回收尚未使用的本次订阅发放点数；
- 已消费的订阅点数计入退款金额计算和人工审核；
- 充值点数与订阅订单分开，除非对应充值订单单独退款；
- 退款、点数回收和支付状态必须幂等并保留审计记录；
- UI 不承诺未批准的即时退款。

## 13. Enterprise 与 `/jeepwork`

### 13.1 Enterprise 购买

Enterprise / Enterprise Pro 显示价格与权益，CTA 为“联系销售”。提交后创建 Link168 平台自身的 Sales Lead，不进入提交者 Workspace 的普通 Lead Inbox。

公开提交结果只说明平台已收到企业需求，不得向访客暴露 Lead Inbox、合同 / 付款记录或人工激活等内部处理路径，也不得承诺未确认的回复时限。

公开页面不承诺固定回复 SLA；内部目标为 1 个工作日，超时在 `/jeepwork` 提醒运营人员。

### 13.2 合同到激活

当前流程：

1. Enterprise Contact Form 创建平台 Sales Lead；
2. `/jeepwork` 记录跟进；
3. 人工记录合同状态、应收 / 实收、付款凭证备注和发票状态；
4. 授权操作员在合同和付款条件满足后激活 Workspace 套餐、席位、点数和周期；
5. 写入完整 Audit Log；
6. 向客户显示真实激活结果。

当前不做直接开票系统集成，不得显示“系统已开票”假成功。只记录申请、处理中、已开具、已发送、异常等真实状态和必要备注。

### 13.3 Jeepwork 当前页面清单

必须基于真实路由和代码盘点现有功能，并分类：

- 当前启用：平台概览、用户 / Workspace、平台 Sales Leads、Enterprise 合同 / 付款 / 发票状态、举报、Provider 配置、审计；
- 当前保留但禁用：Promotions、Card Keys、Commissions；
- 未来预留：需要新 OWNER 决定才启用的模块；
- 历史废弃：无真实用途且经过授权可退役的旧入口。

盘点和重新设计不代表自动启用旧模块。任何历史模块必须默认不可达或明确标记禁用。

## 14. 数据与分析

基础数据只帮助用户理解商业主页表现，不发展复杂 BI。MVP 可包括：

- 页面访问；
- 访客发起 AI / 表单的数量；
- 合格 Lead 数量；
- 主要来源页面；
- Offering 兴趣；
- 负责人分布；
- 时间趋势；
- 点数使用摘要。

数据必须注明时间范围、时区和是否包含机器人 / 重复访问。没有数据时显示空状态，不使用样例数字冒充真实业务数据。

## 15. 法律、隐私、账号停用与举报

### 15.1 公共信任入口

必须保留并映射以下未登录可访问入口：

- `/terms`：服务条款；
- `/privacy`：隐私政策；
- `/report`：公开页面举报；
- `/account-cancellation`：账号停用 / 注销说明与申请入口。

若真实仓库路由不同，可保留兼容跳转，但不得只在 Footer 放不可用文字。条款和隐私页面至少说明运营主体、服务范围、用户责任、禁止内容、AI 边界、套餐 / 点数 / 退款入口、数据类别、处理目的、共享对象类别、保存原则、用户权利、未成年人保护、更新方式和联系渠道。正式上线文案需由 OWNER 使用适用法域的最终版本确认；开发不得用空白页或 lorem ipsum 代替。

当前已知运营主体法定名称为：**合肥市造梦哈勃文化传媒有限公司**。正式联系方式、Privacy / Terms 版本号与生效日期、实际 AI / Payment / Email / SMS / Storage 第三方处理者、个人信息出境情况、最终争议条款和最终法定 retention 期限仍必须按真实运营信息确认，不得自行编造。

交付包中的 LEGAL-01 / LEGAL-02 PDF 页面仅是版式和信息结构参考，不构成可直接发布的法律全文。开发必须等待 OWNER 基于真实运营主体、实际产品行为、真实数据处理和适用法域确认最终文本，不得自行发明处理目的、共享对象或法律承诺。

### 15.2 同意记录

注册、Direct Form 和 Enterprise 联系表单需要同意时，服务端至少记录：政策类型、政策版本、同意时间、主体 / 会话、业务用途和撤回后的处理状态。历史同意不得因政策文件更新而被静默改写。不同用途需要单独同意时，不得用一个总开关替代。

所有真实个人信息入口还必须能够关联 Purpose、Data Category、Consent 或其他适用合法处理基础、Source / Scene 和适用的 Withdrawal state。Privacy / Terms 必须可版本化，至少具有 `policyType / version / effectiveAt / publishedAt / status / content-hash-or-reference` 产品语义。处理目的、方式或个人信息种类发生依法需要重新取得同意的变化时，不得静默继承旧记录。

只收集实现当前明确业务目的所必要的数据。不得以“以后可能有用、方便分析、方便 AI 或未来营销”为由默认扩大 Visitor AI、Direct Form、Lead、Team Member、Billing 或 Reports 的个人信息收集。

### 15.3 个人账号注销与 Data Retention

用户从 `/account-cancellation` 发起注销时必须重新鉴权并完成高风险二次确认。若用户仍是任一 Team 的唯一 Owner，必须先完成第 11.2 节的 Owner 转让，否则服务端阻止注销。

注销确认成功后：

- Personal Page 立即下线；
- 账号进入 30 天 `Pending Cancellation`，显示真实撤销截止时间；
- 30 天内可以撤销并一致恢复个人业务空间；
- Pending Cancellation 期间不得产生新的正常经营行为，也不立即物理删除全部历史数据。

30 天后，对无继续保存必要或法定依据的数据删除或不可逆匿名化；网络安全日志、交易 / 订单 / 支付 / 退款、争议 / 审计等数据按适用法律和必要性独立保留。保留数据必须与正常产品可用数据隔离，不能继续公开 Personal Page 或正常运营账号。固定 retention 数字除已确认的 30 天产品恢复窗口和适用法律明确最低要求外，仍需按真实数据类别、处理目的和法律依据确认，Codex 不得猜测。

30 天 Pending Cancellation 是 Link168 的 Product Recovery Window，不是统一法定保存期限。生产上线前必须建立按数据类别区分的 Retention Matrix；无继续处理依据的数据删除 / 不可逆匿名化，存在明确法定期限或合法 Legal Hold 的数据进入 Restricted Retention。Restricted Retention 只允许限制性存储与必要安全处理，不得继续正常业务使用。

现有 `/api/auth/deactivate` 仅作为【待核验】实现线索；未完成鉴权、唯一 Owner 检查、幂等、撤销恢复和数据一致性验证前不得直接复用。Privacy Policy 必须说明数据类别、处理目的、保存期限或确定方法、到期处理方式、注销 / 删除 / 更正等权利入口和实际第三方处理者。

### 15.4 举报与申诉

举报类别至少包括：垃圾 / 误导、欺诈风险、违法违规、侵权、隐私泄露、骚扰仇恨、其他。举报保存目标 Page、当时 Published 版本、原因、时间和最小必要证据，不读取 Draft 或私人资料。

平台状态为：待处理、审核中、已处理、驳回。举报数量本身不自动封禁。人工处置可为无动作、要求整改、限制公开 Page、停用 Page、严重情况下限制账号；必须记录证据、理由、操作者、时间和可申诉入口。被处置用户可提交一次申诉，由不同操作者复核；当前不扩展复杂 Ticket / SLA 系统。

## 16. 错误、安全与隐私

### 16.1 真实失败

Database、AI、Payment、Email、SMS、Storage 或 OAuth 未配置时，功能必须安全失败并给出下一步。不得用 Mock、空接口、永远 success 或静态假数据宣称完成。

历史资料显示仓库曾存在百炼、支付宝、Nodemailer / SMTP、`/terms`、`/privacy`、`/report`、账号停用和自定义域相关实现。这些均标为【待核验】代码事实，不是删除理由，也不是已通过声明。真实实现存在且不冲突时复用；配置缺失时保留入口和安全失败。

### 16.2 数据安全

- 所有私有查询进行 Workspace 与角色校验；
- 公开接口只返回 Published 和允许公开的数据；
- Draft、Internal Notes、付款凭证、私人联系方式和 Provider 密钥不得公开；
- API Key 不写入 Git、测试夹具、日志或普通用户页面；
- 关键计费、权限、成员移除、发布、Lead 分配和企业激活写审计记录；
- 删除或迁移真实数据前必须单独获得授权。

### 16.3 幂等

以下操作必须幂等或具备明确重复提交保护：

- Publish；
- Lead 创建；
- Invite 接受；
- AI 扣点 / 退点；
- 支付回调；
- 套餐激活；
- Refund / point reclaim；
- Member 移除和 Lead 转派。

### 16.4 支付 Provider

当前自助支付优先复用并核验现有支付宝路径。订单金额只能由服务端按分生成；回调必须验证签名、应用 / 商户、订单归属、金额、状态和幂等；前端返回页不能作为支付成功依据。必须保留主动查询、丢失回调补偿、对账和退款审计。真实商户未配置或验证未通过时，入口显示真实阻断，不删除订单、套餐或回调结构。

## 17. 响应式与无障碍

必须验证 360、375、390、430 和 1440px。核心要求：

- 无横向溢出；
- 输入、按钮和触控目标至少约 44px；
- 固定操作栏不遮挡内容、键盘或错误提示；
- Editor 在移动端使用抽屉 / 底部操作区，不复制桌面三栏；
- 导航、对话、表单、Lead 列表和弹窗可用键盘操作；
- 颜色对比满足 WCAG AA 目标；
- 焦点可见；
- 图片有替代文本或明确装饰属性；
- 错误不仅依赖颜色表达；
- 动画尊重 `prefers-reduced-motion`。

每个页面都必须遵守 `LINK168_MVP_PAGE_AND_INTERACTION_SPEC.md` 的页面级移动适配矩阵。不是每页必须另画一张完整移动高保真图，但任何页面都不能只靠 Codex 自行缩放桌面稿。

## 18. 当前实现差距

最近只读审计结论如下，开发开始前须重新核对：

| 领域 | 当前审计状态 | 本文件要求 |
| --- | --- | --- |
| `/console` 与 `/jeepwork` 边界 | 【已实现】代码存在 | 保持并补齐目标页面 |
| Owner / Admin / Member Lead 读取边界 | 【已实现】代码与历史测试证据 | 真实 DB 再验收 |
| Personal / Member Renderer | 【部分实现】 | 与 Team 收敛到共享页面系统 |
| 正式 Lead 条件 | 【部分实现】入口不一致 | 统一服务端资格判断 |
| Lead Routing | 【本次改版】未实现 | 固定三级与 Owner 回退 |
| Lead Status | 【本次改版】仍写旧状态 | 新业务仅三状态 |
| Draft / Publish | 【本次改版】现役记录直接改 | 建立最小版本隔离 |
| Page / AI 同版本 | 【本次改版】无共同版本 | 原子 Published Business Facts |
| Lead Inbox | 【部分实现】缺 Conversation / 可靠 Summary | 补齐极简闭环 |
| 浏览器 Golden Path | 【本次改版】未发现 E2E | 建立唯一核心 E2E |
| 导航与对外定位 | 【部分实现】旧命名 | 按本文件收敛 |
| Provider / DB / Mobile / Desktop | 【待核验】 | 真实环境验证 |
| 法律 / 举报 / 注销入口 | 【待核验】历史路由和 API 线索存在 | 按第 15 节复用并补齐可操作闭环 |
| 百炼 / 支付宝 / SMTP | 【待核验】历史实现线索存在 | 保留结构，运行真实成功与安全失败验证 |
| Visitor AI 点数承担 | 【本次改版】旧资料未形成单一规则 | Workspace 承担，核心回答基础 5 点 |

## 19. 定义完成

MVP 只有在以下完整链路以真实数据通过时才能宣布完成：

> **注册 → 建页 → Draft → Preview → Publish → 公开访问 → AI / Direct Form → 正式 Lead → 三级分配 → Lead Inbox 跟进 → Closed**

并同时满足：权限正确、Workspace 隔离、公开内容不泄露 Draft、AI 不编造、失败真实、点数准确、重复请求幂等、法律 / 隐私 / 举报入口可用、账号停用不破坏历史、移动端与桌面端可用。

详细可执行标准以 `MVP_ACCEPTANCE_TESTS.md` 为准。

## 20. China Production Readiness Boundary

### Development Ready

产品合同明确，普通代码可以按权威文件施工。正式联系方式、真实 Provider 或最终争议条款尚未提供，不自动成为普通产品开发阻断。

### Feature Complete

对应业务功能与 `MVP_ACCEPTANCE_TESTS.md` 已由真实证据完成。Feature Complete 只说明产品功能合同完成。

### Production Ready

必须进一步同时满足：

```text
CHINA_PRODUCTION_COMPLIANCE_GATE.md PASS
+ 真实 Provider 配置
+ 真实数据流与跨境状态核验
+ 真实安全 / 数据库 / 备份恢复 / E2E 验证
+ 必要法律文本、许可、登记、备案和公示事实完成
```

> **Feature Complete ≠ Production Ready**

`CHINA_PRODUCTION_COMPLIANCE_GATE.md` 是中国正式生产上线门槛，不覆盖 OD-001～OD-058，不改变核心产品闭环，也不构成法律意见。生产状态未知时必须标记对应 `PRODUCTION DATA REQUIRED`、`LEGAL DETERMINATION REQUIRED`、`REGULATORY CLASSIFICATION REQUIRED` 或受影响数据流 `UNKNOWN — PRODUCTION BLOCKED`，不得使用 placeholder 或推断标记 PASS。
