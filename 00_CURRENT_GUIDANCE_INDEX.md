# Link168 当前开发指导索引

**版本日期：** 2026-08-14
**状态：** CURRENT / DEVELOPMENT MODE READY
**适用对象：** OWNER、Codex、设计与验收人员
**当前模式：** 产品、UI、交互、信任入口与验收合同已准备完成，可一次进入连续开发模式。开发模式首要动作核对真实仓库和环境；无 OWNER 级冲突时直接继续施工，不再拆分 A–G 阶段或新增平级研究报告。

## 1. 使用结论

本目录中的 8 份 Markdown 是 Link168 当前开发与生产就绪的可执行文字合同；2 份 PDF 是与合同一致的视觉和交互参考；`PRODUCT_DESIGN_CODEX_HANDOFF_AUDIT.pdf` 是非权威的正式交付审核记录；`assets/link168-logo-system/` 是固定品牌资产。Codex 进入开发模式后先读取真实仓库并完成事实映射，随后直接据此建立任务、实现和验收，不需要再向 OWNER 追问普通产品选择，也不需要到包外寻找 Logo。不得把 PDF 中的示例数据误认为当前生产数据，也不得把目标界面误报为当前已实现。

本轮交付采用以下组织方式：

> **一个产品权威 + 一个决策登记 + 一套执行规则 + 一套验收合同 + 两套施工规格 + 两份可视化参考 + 一份交付审核记录 + 一套固定品牌资产**

不再建立第二套平级 PRD、产品宪法、Roadmap 或重复决策文件。

## 2. 权威优先级

发生冲突时，严格按以下顺序裁决：

1. OWNER 最新、明确、可追溯的决定；
2. 当前真实代码、运行时、数据库 Schema、测试和浏览器验证事实；
3. 本目录中的当前权威文件；
4. 最近审计或分析报告；
5. 历史 PRD、旧设计稿、旧代码注释和旧聊天记录。

说明：

- 第 2 项用于判断“现在真实是什么”，不能覆盖 OWNER 对“目标应是什么”的决定；
- 第 1 项改变目标后，必须同步更新本目录的相应文件；
- 历史文件只用于追溯，不得重新成为施工依据；
- 代码存在不等于功能通过；未运行验证时必须标记为【待核验】。

## 3. 现役文件

| 顺序 | 文件 | 角色 | Codex 必须如何使用 |
| --- | --- | --- | --- |
| 1 | `00_CURRENT_GUIDANCE_INDEX.md` | 唯一入口 | 先确认权威顺序、文件完整性、开发模式和当前事实 |
| 2 | `CURRENT_PRODUCT_AUTHORITY.md` | 产品唯一权威 | 决定做什么、不做什么、对象、规则和边界 |
| 3 | `OWNER_DECISION_REGISTER.md` | 决策证据 | 区分 OWNER 直接确认、授权代定、冻结后置和历史废弃 |
| 4 | `DEVELOPMENT_EXECUTION_RULES.md` | 施工纪律 | 约束分支、真实验证、安全、提交、失败报告和任务顺序 |
| 5 | `MVP_ACCEPTANCE_TESTS.md` | 完成定义 | 每个开发闭环必须对应验收 ID 和真实证据 |
| 6 | `LINK168_UI_DESIGN_SYSTEM.md` | UI 施工合同 | 实现颜色、字体、间距、组件、状态、响应式和无障碍 |
| 7 | `LINK168_MVP_PAGE_AND_INTERACTION_SPEC.md` | 页面与交互合同 | 按页面 ID、流程 ID、字段、状态和异常实现完整体验 |
| 8 | `CHINA_PRODUCTION_COMPLIANCE_GATE.md` | 中国正式生产上线门槛 | 不覆盖 OWNER Decision 或功能合同，不等同法律意见；阻止把 Feature Complete 误报为 Production Ready |
| 9 | `LINK168_UI_REFERENCE.pdf` | 视觉参考 | 对照真实产品画面、层级和响应式；不单独定义业务规则 |
| 10 | `LINK168_INTERACTION_REFERENCE.pdf` | 流程参考 | 对照状态机、分支、角色和失败路径；不单独覆盖文字合同 |

### 3.1 配套资源（不单独定义业务）

| 路径 | 内容 | 使用规则 |
| --- | --- | --- |
| `assets/link168-logo-system/` | OWNER 固定 Logo、favicon、app icon、share entry 与品牌说明 | 直接复用，不重绘、不改比例；按 UI 设计系统映射到真实仓库 |
| `assets/link168-logo-system-original.zip` | 上述资产的原始交付 ZIP | 用于来源保全和字节级复核，不要求产品运行时读取 ZIP |
| `PRODUCT_DESIGN_CODEX_HANDOFF_AUDIT.pdf` | Product Design 对整个开发包的正式交付就绪度审核记录 | 用于确认“可开始开发”与“尚未实现完成”的边界；不覆盖产品权威 |
| `R2_PACKAGE_ORIGINAL_CHECKSUMS.sha256` | 原始 R2 开发包不可变 SHA-256 清单 | 只证明原始 R2 来源；CURRENT 文件变化时不得更新 |
| `CURRENT_AUTHORITY_CHECKSUMS.sha256` | 当前权威文件与固定参考资产 SHA-256 清单 | 每次正式 CURRENT 同步后重新生成和验证 |
| `PACKAGE_CHECKSUMS.sha256` | 已弃用的兼容指针 | 不再作为原始来源或 CURRENT 校验真相；分别使用上述两份清单 |

`LINK168_UI_REFERENCE.pdf` 的业务 Page ID 通过视觉页面标识逐页核对，PDF 文本层不保证可靠全文搜索。`LINK168_INTERACTION_REFERENCE.pdf` 的 `IF-01` 至 `IF-17` 可文本搜索；`IF-18` 至 `IF-20` 由 CURRENT Markdown 增量合同定义，等待后续 PDF 同步。组合参考页必须显式写全每个 ID；`SET-03` 只表示邀请接受，不再用邀请创建页面代替。`LEGAL-01`、`LEGAL-02`、`LEGAL-03` 与 `REPORT-01` 分别表示服务条款、隐私政策、账号注销说明和公开举报。其中 `LEGAL-01` / `LEGAL-02` 只定义信息结构与版式，不是可直接上线的法律全文；已知运营主体为“合肥市造梦哈勃文化传媒有限公司”，其余正式法律信息仍由 OWNER 按真实运营和适用法域确认。

公开文案只陈述可验证能力，不承诺保证成交、必然联系或未确认 SLA；普通用户界面遵循中文术语映射，具体由 `AT-COPY-001` 至 `AT-COPY-006` 验收。

## 4. 文件之间的引用规则

- 页面使用 `MKT-*`、`AUTH-*`、`ONB-*`、`CON-*`、`EDT-*`、`PRE-*`、`PUB-*`、`LEAD-*`、`DATA-*`、`SET-*`、`ENT-*`、`LEGAL-*`、`REPORT-*`、`JEEP-*`、`SYS-*` ID。
- 交互流程使用 `IF-*` ID。
- 验收使用 `AT-*` ID。
- OWNER 决策使用 `OD-*` ID。
- 开发任务和提交说明必须同时引用至少一个页面或流程 ID，以及至少一个验收 ID。
- UI PDF 中的业务 Page ID 必须通过视觉标识核对；Interaction PDF 中现有 IF ID 应可文本搜索；所有 PDF 业务 ID 必须能在 Markdown 中搜索到。`DS-01`、`IF-INDEX`、`IF-IA`、`IF-ERROR`、`IF-RESPONSIVE`、`IF-HANDOFF` 是参考文档自身的元 ID。若 PDF 与文字合同冲突，以 CURRENT Markdown 为准，并安排修复 PDF。

## 5. 状态词典

所有施工和汇报统一使用以下标签：

| 标签 | 含义 |
| --- | --- |
| 【已实现】 | 有当前代码或运行证据，并满足对应产品规则 |
| 【部分实现】 | 有相关代码，但缺关键行为、统一规则或完整闭环 |
| 【本次改版】 | 已确定的目标，需要 Codex 实现或收敛 |
| 【未来预留】 | 架构可预留，但当前不建设完整能力 |
| 【历史废弃】 | 旧逻辑可为迁移兼容存在，但不能用于新业务 |
| 【待核验】 | 有代码或历史测试线索，但本轮未进行当前运行验证 |

禁止使用“看起来完成”“应该能用”“页面已经有了”等模糊结论。

## 6. 当前仓库事实基线

以下内容来自 2026-08-12 最近一次只读代码审计，不是本轮重新运行后的结果：

| 项目 | 当前证据 |
| --- | --- |
| 审计仓库路径 | `C:\Users\bifuc\.codex\worktrees\a056\link1688` |
| 唯一施工分支 | `codex/controlled-clean-rebuild-20260814` |
| 审计时 HEAD | `5cb707e2b98840c88961a7bf73b23b4a15ba3921` |
| 工作区 | 审计时 clean、非 detached |
| 旧索引记录 SHA | `b61c09b089d6f3c31d1e649cbe6a7c619c99b786`，已过期 |
| 本轮运行验证 | 未运行测试、数据库、浏览器或真实 Provider |

审计确认或发现：

- 【已实现】`/console` 普通用户入口收敛与 `/jeepwork` 平台管理边界在代码中存在；
- 【已实现】Owner / Admin / Member 的 Lead 服务端读取边界有代码与历史测试证据；
- 【部分实现】Personal / Member 使用共享 Renderer，Team Page 仍为独立布局；
- 【部分实现】AI、Direct Form、Lead、编辑器、公开页和产品数据已有代码，但没有形成当前权威要求的统一闭环；
- 【本次改版】正式 Lead 必须统一为“明确商业意图 + 至少一种有效联系方式”；
- 【本次改版】三级 Lead Routing、`New → Contacted → Closed`、最小 Draft / Preview / Publish、共同 Published Business Facts、极简 Lead Inbox、统一导航和浏览器 Golden Path；
- 【待核验】真实注册登录、数据库隔离、百炼 / AI Provider、支付宝、SMTP / Email、SMS、Storage、自定义域、移动端、桌面端和最终构建测试；
- 【待核验】历史资料显示 `/terms`、`/privacy`、`/report`、`/account-cancellation`、`/api/auth/deactivate` 及相关闭环存在；必须在真实仓库确认，不得再按“完全缺失”处理；
- 【历史废弃】`viewed / following_up / won` 等旧 Lead 状态不得用于新 Lead，可仅为历史读取兼容存在。

任何 Codex 开发开始前，必须在真实仓库重新确认分支、HEAD、dirty state、依赖、环境和现有测试；不得把上述审计快照当作永远不变的事实。

### 6.1 本轮整理依据

本文件包已经交叉核对：

- OWNER 最近对话中的套餐、品牌、宽限、退点、Invite、Member 移除、Enterprise 与 Jeepwork 决策；
- 5 份原始现役权威文件；
- 2026-08-12 Codex 只读代码审计报告；
- Link168 产品定位与 MVP 深度研究、竞品 / 市场分析和执行摘要；
- 已选历史来源“Link168_方向2_三页高保真视觉定版_20260812.pdf”；
- 固定 `link168-logo-system` 资产；
- UI 对话归档中不与最新方向冲突的组件、状态与响应式原则。

历史来源“Link168_事实型高保真线框图_20260812.pdf”只作为“框线 + 说明文字不足以代表真实产品”的反例，不再作为视觉施工依据。旧电光蓝 / 玻璃风只保留历史追溯价值；最新方向 2 覆盖它。

## 7. 当前产品施工主闭环

当前 MVP 的唯一完成闭环是：

> 注册并设置公开地址 → 建立商业主页 → 保存 Draft → Preview → Publish → 访客访问 → AI 接待或直接表单 → 满足正式 Lead 条件 → 确定性分配 → 后台跟进 → 状态关闭

其中：

- Draft 不能影响公开页或 Visitor AI；
- Publish 必须让公开页与 Visitor AI 使用同一个 Published Business Facts 版本；
- AI 不联网，不得把 Draft、访客输入或猜测当成商家事实；
- Direct Form 在 AI 未启用、点数不足或 Provider 故障时仍须可用；
- Lead Inbox 只做轻量 Handoff，不扩展为 CRM。

## 8. Codex 进入开发模式后的固定起步顺序

Codex 一次进入开发模式后必须依次完成以下动作；它们属于同一连续施工，不生成单独研究阶段或等待 OWNER 再次批准：

1. 读取仓库级 `AGENTS.md` 和工程运行说明；
2. 读取本索引及其余 7 份 Markdown；
3. 分别验证不可变 `R2_PACKAGE_ORIGINAL_CHECKSUMS.sha256` 与当前 `CURRENT_AUTHORITY_CHECKSUMS.sha256`，确认来源证据、权威文件和固定品牌资产完整；
4. 浏览两份 PDF，以视觉方式核对 UI Page ID，并文本核对 Interaction PDF 已包含的 IF ID；
5. 读取 `PRODUCT_DESIGN_CODEX_HANDOFF_AUDIT.pdf`，确认审核结论、非阻塞风险与证据限制；
6. 核对当前分支、HEAD 和用户已有改动，不覆盖无关变更；
7. 对照真实路由、组件、Schema、API、测试，建立“复用 / 修改 / 新增 / 历史兼容”映射；
8. 同步权威文件入口，并按 `DEVELOPMENT_EXECUTION_RULES.md` 的连续施工顺序直接实现；
9. 每个实现任务都先写失败验收或测试，再实现，再运行验证；
10. 无法验证的真实外部依赖必须报告阻塞，不得使用假成功绕过。

## 9. 本轮明确不包含

本轮文件准备没有授权以下动作：

- 修改 Link168 产品仓库代码；
- 修改数据库或运行 migration；
- 连接生产环境；
- 创建、删除或合并分支 / worktree；
- 发布线上版本；
- 自动启用历史 Promotions、Card Keys、Commissions 等模块；
- 代替 OWNER 执行真实合同、收款、退款或开票。

## 10. 开发模式判定

本开发包已经满足文档侧进入开发模式条件。Codex 不再等待新的产品研究报告；进入真实仓库后完成文件、页面 / 流程 ID、分支、已有改动、Schema、Provider 和测试核对。没有需要 OWNER 决定的新冲突时，必须在同一会话直接继续实现，不把普通环境差异包装成新的“准备阶段”。

若出现以下情况，应停止并向 OWNER 说明：

- 新发现的真实代码或数据库事实会改变数据安全、计费、退款、权限或公开内容；
- 需要删除或不可逆迁移真实数据；
- 外部 Provider、生产密钥、域名、支付或合同操作必须由 OWNER 完成；
- 最新 OWNER 决定与本目录冲突且无法通过“当前事实 / 目标规则”区分解决。

除这些情况外，Codex 应使用本文件包中的默认值继续，不再把已经授权代定的问题退回给 OWNER。

## 11. 中国生产上线判定

普通产品开发可以继续；开发完成不等于生产合规批准。任何 Agent 在声称“可以正式上线”“PRODUCTION READY”或“中国合规已完成”前，必须逐项核对 `CHINA_PRODUCTION_COMPLIANCE_GATE.md`，并取得真实 Provider、数据流、安全环境、法律文本及适用许可 / 备案 / 登记 / 公示证据。

Build、Unit Test 或 234 项 Acceptance 通过均不能单独得出生产合规结论。Gate 只约束生产上线判断，不覆盖 OD-001～OD-058、不改变 CURRENT 功能合同，也不构成律师意见。
