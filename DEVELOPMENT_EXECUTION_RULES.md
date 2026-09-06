# DEVELOPMENT_EXECUTION_RULES

**版本日期：** 2026-08-14
**状态：** CURRENT / OWNER APPROVED
**适用对象：** 在 Link168 真实仓库内工作的 Codex / AI 开发代理
**目的：** 规定如何把当前产品合同落实为真实、可验证、可回退的代码。

## 1. 单一开发模式入口

Codex 一次进入开发模式后，先完成以下核对并在没有 OWNER 级阻塞时直接继续修改、验证和提交。不得把核对单独包装成新的阶段、研究报告或第二次开工申请：

1. 读取仓库 `AGENTS.md` 及其作用域内的全部指令；
2. 依次读取当前 8 份 Markdown 和 2 份 PDF；
3. 读取非权威交付记录 `PRODUCT_DESIGN_CODEX_HANDOFF_AUDIT.pdf`，理解“可开始开发”与“尚未实现完成”的边界；
4. 分别验证不可变 `R2_PACKAGE_ORIGINAL_CHECKSUMS.sha256` 与当前 `CURRENT_AUTHORITY_CHECKSUMS.sha256`，并确认 `assets/link168-logo-system/` 与原始 ZIP 存在；
5. 运行页面 / 流程 ID 覆盖检查：UI Page ID 按 PDF 视觉标识核对；Interaction PDF 的现有 IF ID 可文本搜索；Markdown 新增但 PDF 尚未同步的流程必须明确记录，不得误报缺失设计；
6. 确认真实仓库路径、当前分支、HEAD、remote、dirty state；
7. 识别用户已有改动，禁止覆盖或回退无关修改；
8. 核对 Node / package manager / Prisma / 数据库 / Provider 的真实配置；
9. 搜索真实路由、Schema、API、组件和测试，不按文档猜文件位置；
10. 在当前开发任务回执中写一份短的“当前事实映射”：复用、修改、新增、历史兼容、待核验；不新建平级报告；
11. 把本文件包同步为仓库现役权威入口，旧 PRD 只保留 Historical 标记和短指针。

如果上述核对发现当前分支或仓库与审计快照不同，应以真实仓库为准并在当前回执报告差异；不得强行回到旧 SHA。差异不涉及 OWNER 决策、安全或用户改动时继续施工，不得无故停在“准备中”。

## 2. 唯一施工分支

当前唯一施工分支为：

`codex/controlled-clean-rebuild-20260814`

后续普通施工不得继续创建：

- recovery / backup / experiment / fix 分支；
- 多余 worktree；
- 仓库复制；
- 重复快照。

工作方式为：

> **核对 → 写失败测试 → 修改 → 验证 → 自审 → commit → 继续**

若真实仓库不在该分支或该分支已合并 / 受保护，停止并说明真实情况；不要未经授权创建替代分支。

## 3. 权威读取与同步

### 3.1 仓库入口

仓库中的 `AGENTS.md`、`README.md` 和文档索引只保留简短读取入口，不复制第二套产品规则。当前产品内容必须链接到：

- `00_CURRENT_GUIDANCE_INDEX.md`；
- `CURRENT_PRODUCT_AUTHORITY.md`；
- `OWNER_DECISION_REGISTER.md`；
- `DEVELOPMENT_EXECUTION_RULES.md`；
- `MVP_ACCEPTANCE_TESTS.md`；
- `LINK168_UI_DESIGN_SYSTEM.md`；
- `LINK168_MVP_PAGE_AND_INTERACTION_SPEC.md`；
- 两份参考 PDF。

同时保留 `PRODUCT_DESIGN_CODEX_HANDOFF_AUDIT.pdf` 作为非权威交付审核记录；它只说明开发包就绪度与审核限制，不参与业务冲突裁决。

固定品牌资产同步到仓库时使用本包 `assets/link168-logo-system/` 的原始文件。可按真实工程结构放到 `public/brand/link168/` 或等价位置，但必须保留文件内容、比例和用途映射。`assets/link168-logo-system-original.zip` 只用于来源保全，不作为运行时依赖。

### 3.2 历史文件

旧 PRD、Product Constitution、Roadmap、Decision、价格文件可以保留追溯，但必须：

- 标明 `HISTORICAL / NOT CURRENT AUTHORITY`；
- 不在现役索引中与当前文件平级；
- 不把旧价格、旧角色、旧 Lead 状态或旧视觉重新带入代码；
- 不删除历史文件，除非 OWNER 另行授权。

## 4. 事实优先与状态汇报

所有进度只使用：

- 【已实现】：当前证据满足规则；
- 【部分实现】：代码存在但闭环不完整；
- 【本次改版】：目标已定，正在实现；
- 【未来预留】：不进入当前施工；
- 【历史废弃】：仅为兼容保留；
- 【待核验】：本轮未验证。

禁止把以下内容当成完成：

- 文件存在；
- 页面能打开；
- API 返回 200；
- 单个单元测试通过；
- Build 通过；
- Mock 数据可展示；
- AI 返回一段文字；
- 历史某个 SHA 的测试曾通过。

真正完成必须引用 `AT-*` 验收 ID，并提供本次运行的命令、结果和必要截图 / 数据证据。

## 5. 不假开发

禁止使用：

- 永远返回 success 的接口；
- 假付款、假退款、假发票、假邮件 / 短信；
- 伪造 AI、Lead 或 Analytics 业务数据；
- 把样例数据作为真实空状态；
- 绕过 Workspace / 权限校验；
- 用客户端校验代替服务端规则；
- 遇到 Provider 未配置就静默降级成假结果；
- 把“按钮点了”当成业务完成。

Storybook、测试 fixture 和视觉示例可以使用明确标注的测试数据，但不得进入生产路径，也不得用于声称真实集成通过。

普通用户界面必须遵循 `LINK168_UI_DESIGN_SYSTEM.md` 的中文术语映射。DNS 记录名、JEEPWORK 内部界面和仅供开发阅读的交互注释可保留必要工程词；LEGAL-01 / LEGAL-02 PDF 仅作为结构参考，未经 OWNER 按真实运营和适用法域确认的法律全文不得上线。

`Workspace` 仅作为服务端 tenant、权限和数据隔离术语；普通 UI 使用“我的主页 / 我的团队 / 我加入的团队 / 当前团队”等自然语言，不显示裸 Workspace ID 或要求用户理解多个 Workspace。隐藏工程术语不得降低服务端隔离强度。

## 6. 安全与授权边界

### 6.1 必须严格处理

- 客户与 Workspace 数据隔离；
- Owner / Admin / Member 权限；
- Draft / Published 隔离；
- Internal Notes 和私人联系方式；
- API Key、支付、退款、点数与合同；
- 生产数据库；
- 删除、不可逆 migration、生产发布；
- `/console` 与 `/jeepwork` 的鉴权边界。

### 6.2 必须停止并请求 OWNER

- 需要删除或不可逆改写真实数据；
- 需要生产密钥、生产域名、支付商户、真实邮件 / 短信账号或签署合同；
- 新需求会改变价格、退款、税费或企业合同责任；
- 需要重新启用 Promotions、Card Keys、Commissions 等禁用模块；
- 权限或数据隔离无法在不改变产品规则的情况下解决；
- 当前分支 / 权限不允许安全继续。

普通 UI、文案、组件、可回退重构和已授权默认行为不需要反复请求 OWNER。

## 7. 密钥与 Provider

真实密钥：

- 不写进 Git；
- 不写进前端 bundle；
- 不写进日志、测试 fixture 或错误详情；
- 不向普通用户显示；
- 通过环境变量或平台受控配置读取；
- 后台显示时只能显示状态与必要掩码。

Provider 未配置时：

- AI 显示“尚未配置”，Direct Form 仍工作；
- Email / SMS 邀请回退复制链接；
- Payment 不得假成功；
- Storage 不得生成假 URL；
- Jeepwork 可记录“待配置”，不能删除相应能力。

历史资料显示真实仓库曾存在百炼应用、支付宝支付、Nodemailer / SMTP、账号停用、法律页、举报和自定义域代码。这些是【待核验】代码事实：

- 先搜索并验证现有实现，不得因本包未携带源码就重建第二套；
- 不关闭、不删除、不隐藏 config entry、权限校验、错误处理或 callback structure；
- 配置存在时运行真实成功和失败路径；配置不存在时运行安全失败与 fallback；
- 未运行的外部 API 永远标 `NOT VERIFIED`，但“未配置”本身不阻止其他领域继续开发。

## 8. 实现原则

### 8.1 服务端单一规则

以下规则必须各自有服务端单一实现点，并由所有入口复用：

- 正式 Lead 资格；
- Lead Routing 与 Owner 回退；
- Lead 状态转换；
- Workspace / 角色权限；
- username / slug 分配；
- Published Business Facts 版本；
- 点数预扣、结算、退回与扣除顺序；
- Visitor AI 由 Page 所属 Workspace 承担、核心可用回答基础 5 点；
- 套餐权益和宽限；
- Invite 接受；
- Enterprise 激活；
- Member 移除与 Lead 转派。
- Personal / Team 计费主体与 Credit Ledger 归属；
- Owner 转让、唯一 Owner 保护、Team 解散 / 恢复和个人账号注销 / 撤销。

前端只能提供即时体验，不得复制一套不同的业务真相。

### 8.2 幂等与事务

Publish、Lead 创建、Invite 接受、AI 点数、支付回调、退款、套餐激活、成员移除、Owner 转让、Team 解散 / 恢复和账号注销 / 撤销必须：

- 使用稳定的 idempotency key 或唯一约束；
- 在需要时使用数据库事务；
- 重复请求返回同一业务结果而非重复副作用；
- 失败可重试；
- 保留足够审计记录；
- 不在事务中调用不可控外部 Provider 后留下半状态。

支付宝路径还必须覆盖：服务端按分生成金额、签名 / 商户 / 订单 / 金额验证、重复和乱序回调、主动查询、丢失回调补偿、对账、退款及审计。前端 return URL 只能显示查询中的状态，不能直接激活权益。

### 8.3 数据迁移

- 先查现有数据形态和数量；
- 新字段优先采用 nullable → backfill → constraint 的安全迁移顺序；
- 旧 Lead 状态保留读取映射，新写入只用新状态；
- Offering 可在领域层适配旧 `Product`，不为改名冒险；
- Draft / Published 迁移必须保证当前公开页面不中断；
- 每个 migration 提供验证查询和回退策略；
- 未获授权不删除旧列、旧表或生产数据。

## 9. UI 与交互施工规则

### 9.1 视觉依据

UI 必须遵守 `LINK168_UI_DESIGN_SYSTEM.md` 和 `LINK168_UI_REFERENCE.pdf`：

- 方向 2：暖象牙、专业编辑感、真实人物；
- 固定 Logo 资产；
- 金色做品牌强调，深蓝做高意图主操作；
- Noto Serif SC 作为展示标题，Noto Sans SC 作为界面正文；
- 统一 token 和共享组件；
- 不把灰色框线、赛博玻璃、壁纸感稿件当最终产品。

实现前按视觉页面标识逐页对照 UI PDF，不得因文本搜索失败判断设计不存在；核心流程按 Interaction PDF 已包含的 IF ID 文本核对，`IF-18` 至 `IF-20` 当前以 Markdown 合同为准。若业务 ID 缺失、错误复用或 PDF 与 Markdown 冲突，先报告并以 CURRENT Markdown 为准施工，不得凭空补一套视觉或流程。

### 9.2 交互依据

每个页面按 `LINK168_MVP_PAGE_AND_INTERACTION_SPEC.md` 实现：

- 默认、hover、focus、disabled、loading、empty、error、success；
- 外置 label，不依赖 placeholder；
- 表单错误紧邻字段并提供页首摘要（长表单）；
- 保存状态明确为未保存 / 保存中 / 已保存 / 失败；
- Publish 与 Preview 明确区分；
- 破坏性操作需要上下文明确的确认；
- 成功只在服务端确认后显示；
- 页面 ID 和 `data-testid` 命名可追溯到验收 ID。

### 9.3 响应式

至少在 360、375、390、430、768、1024、1440px 核对。Editor 移动端采用单列内容 + 抽屉 / 底部操作，不缩小桌面三栏。固定 CTA 不得挡住输入、键盘和举报入口。

### 9.4 无障碍

- 语义 HTML 优先；
- 键盘可操作；
- focus 可见；
- 触控目标约 44px；
- 对比度目标 WCAG AA；
- 错误不只靠颜色；
- dialog 有焦点管理；
- toast 不作为唯一反馈；
- 图片、图标和 Logo 有正确替代文本 / aria-hidden；
- 尊重 reduced motion。

## 10. 测试驱动的施工循环

每个任务必须按以下顺序：

1. 选定页面 / 流程 ID 与 `AT-*`；
2. 证明当前测试失败或缺失；
3. 写最小失败测试；
4. 实现最小满足规则的代码；
5. 运行目标测试；
6. 运行受影响领域测试；
7. 运行 lint、typecheck、Prisma validate / generate、build；
8. 对涉及核心旅程的变更运行浏览器测试；
9. 检查日志、权限、重复请求和失败路径；
10. `git diff --check`，审阅 diff；
11. 形成单一、可解释 commit。

涉及 Visitor AI 时，测试必须证明点数从 Page 所属 Workspace 的正确 bucket 预扣 / 结算 / 退回，访客无法读取余额，Free 只在拥有有效充值点时调用真实模型。

如果现有项目没有浏览器框架，只选择一套与项目技术栈匹配的框架，建立唯一 Golden Path；不要同时引入多个 E2E 工具。

## 11. 单一连续施工顺序

以下顺序只表达依赖关系，不是多个开发阶段，不需要每组完成后重新向 OWNER 申请。核对通过后连续推进；可以在不共享可变状态时并行，但不得跳过前置安全规则。

### 依赖队列：权威与真实基线

- 同步 9 个现役文件、Product Design 交付审核记录、固定品牌资产、校验清单和仓库入口；
- 重新运行现有静态验证与测试；
- 在可用环境中验证数据库连接；
- 建立当前路由 / Schema / API / 组件映射；
- 先验证 Workspace 和 Member 权限安全。

### 依赖队列：统一领域规则

- 正式 Lead 资格服务；
- 新 Lead 三状态及历史读取兼容；
- 三级 Routing 与 Owner 回退；
- Offering 默认负责人；
- Member 移除与活跃 Lead 转派；
- 对应服务端测试。

### 依赖队列：发布事实闭环

- 最小 Draft / Published 数据隔离；
- Preview 读取 Draft；
- Publish 原子生成共同 Published Business Facts；
- Public Page 与 Visitor AI 共同读取；
- 失败保留旧版本；
- 版本与泄露测试。

### 依赖队列：页面系统与 Console

- 导航收敛；
- Personal / Team / Member 共享 Section / Renderer；
- Editor 状态与响应式；
- Public Page、品牌、举报和 Direct Form；
- UI token / 组件收敛。

### 依赖队列：AI、Lead Inbox 与数据

- AI 事实边界、联系方式时机、失败状态；
- 点数预扣 / 结算 / 退回；
- Lead Inbox、Conversation、Summary、Notes、分配历史；
- 基础 Analytics，禁止假数据。

### 依赖队列：套餐、团队、信任入口与 Enterprise

- 套餐、充值、宽限、升级 / 降级；
- `/terms`、`/privacy`、`/report`、`/account-cancellation` 与同意版本记录；
- 举报人工审核、处置、最小申诉与账号安全停用；
- Invite 与席位；
- Enterprise Contact → Jeepwork → 合同 / 付款 / 发票状态 → 激活；
- 历史 Jeepwork 功能盘点与禁用标记。

### 依赖队列：完整验收

- 唯一 Golden Path 浏览器 E2E；
- 真实数据库双 Workspace 验证；
- Provider 成功和安全失败；
- 360 / 375 / 390 / 430 / 1440 视觉验收；
- 支付、退款、点数、权限和幂等性；
- 最终 `MVP_ACCEPTANCE_TESTS.md` 结果表。

前置规则尚无可验证基础时，不得通过堆 UI 跳过核心领域规则；这不改变“单一连续开发模式”。

## 12. Commit 规则

- 一个 commit 解决一个可解释闭环；
- commit 标题引用主要领域，不使用模糊“fix stuff”；
- commit body 可引用页面 / 流程 / 验收 ID；
- 不把格式化全仓、无关重构和功能改动混在一起；
- 不提交生成缓存、密钥、数据库 dump、真实客户数据；
- 不修改或 squash 用户已有 commit，除非 OWNER 明确要求；
- 不 push、merge 或发布，除非本次请求明确授权。

## 13. 验证命令的确定

Codex 必须从真实 `package.json`、README、Prisma 配置和 CI 读取命令，不在文档中猜脚本名。通常需要覆盖：

- 依赖安装一致性；
- lint；
- typecheck；
- unit / integration tests；
- Prisma validate / generate；
- production build；
- browser E2E；
- `git diff --check`。

任何未运行项必须明确说明原因和影响。

## 14. 阻塞报告格式

遇到真实阻塞时只需报告：

1. **卡在哪里**：具体页面、API、命令或外部平台；
2. **证据**：错误码、最小日志、测试结果；
3. **为什么无法安全继续**：权限、密钥、生产动作或不可逆风险；
4. **OWNER 要做什么**：一项具体动作；
5. **完成后 Codex 继续什么**。

不要用冗长的工程优先级术语，也不要向 OWNER 安排人日、Sprint 或几周工期。

## 15. 每次交付的完成报告

每次交付至少包含：

- 本次实现的页面 / 流程 / 验收 ID；
- 真实修改文件；
- 运行过的验证及结果；
- 未运行或被阻塞的验证；
- 数据迁移和回退说明（如有）；
- 当前仍未完成的下一项；
- 是否提交、commit SHA；
- 未经授权不得声称已上线。

## 16. Compliance-by-Construction

合规能力必须随对应业务闭环施工，不能全部推迟到最后一个开发单元，也不能借合规名义新增未经 OWNER 授权的 CRM、工单或复杂 Workflow。

- Page / AI：同时实现 AI identity、Published Facts 边界、适用 AI marking 和真实模型监管信息公示能力；
- Lead：同时实现隐私告知、处理目的、政策版本关联、数据最小化及撤回后的处理关系；
- Team：同时实现 tenant isolation、Member access、移除后权限终止和 retention 边界；
- Billing：同时实现价格披露、订阅状态、auto-renew 主动选择与控制、取消及 billing ownership；
- Account Lifecycle：同时实现权利请求、注销、删除 / 匿名化及 Restricted Retention；
- Real Integration：完成 Third-party Processor Registry、跨境状态判断、AI 备案 / 登记 / 公示核验、电信 / ICP 分类、正式法律页面和真实生产安全验证。

开发完成、Build 通过、Unit Test 通过或 Feature Acceptance 通过均不等于生产合规批准。任何 Agent 在声称“可以正式上线”“PRODUCTION READY”或“中国合规已完成”前，必须读取并逐项验证 `CHINA_PRODUCTION_COMPLIANCE_GATE.md`；未在真实环境验证的 Gate 不得写 PASS。
