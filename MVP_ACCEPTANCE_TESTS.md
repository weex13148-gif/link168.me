# MVP_ACCEPTANCE_TESTS

**版本日期：** 2026-08-13
**状态：** CURRENT ACCEPTANCE CONTRACT
**目的：** 定义 Link168 当前 MVP 可以被宣布“真正完成”的条件。
**说明：** 本文件负责验收，不重新定义产品；产品行为以 `CURRENT_PRODUCT_AUTHORITY.md` 为准。

## 1. 完成定义

必须用真实数据跑通：

> **注册 → 建页 → Draft → Preview → Publish → 公开访问 → AI / Direct Form → 正式 Lead → 确定性分配 → Lead Inbox 跟进 → Closed**

并同时满足：

- Workspace 与角色权限正确；
- Draft 不公开；
- Page 与 AI 使用同一 Published Business Facts；
- AI 不联网、不编造；
- 点数扣除和退回准确、幂等；
- 外部服务失败真实；
- 360 / 375 / 390 / 430 / 1440px 可用；
- 至少一个浏览器 Golden Path 自动化通过；
- 没有 Mock、假成功或生产样例数据。

## 2. 结果与证据格式

每个验收项只能标为：

- `PASS — 本轮已验证`；
- `FAIL — 本轮已验证失败`；
- `NOT IMPLEMENTED — 未实现`；
- `BLOCKED — 真实依赖阻塞`；
- `NOT VERIFIED — 本轮未验证`；
- `NOT APPLICABLE — 有明确产品依据不适用`。

PASS 必须记录：代码版本、环境、测试命令或操作步骤、结果、必要截图 / 数据 ID。历史某个 SHA 的通过记录不能作为当前 PASS。

## 3. 验收环境

最终验收至少需要：

- 可连接的非生产 PostgreSQL 测试环境；
- 两个独立 Workspace；
- Owner、Admin、Member、外部访客和 `/jeepwork` 操作员账号；
- 一套真实可用 AI Provider 测试配置，以及未配置 / 超时 / 失败注入方式；
- 若支付、Email、SMS 暂无真实沙箱，必须验证安全失败和复制链接 fallback，并把真实成功路径标为 BLOCKED；
- Chromium 桌面与移动 viewport；
- 清晰记录时区和测试时间。

测试数据必须标记为测试并与生产隔离。

## 4. 权威与入口

| ID | Given / When | Then |
| --- | --- | --- |
| AT-GOV-001 | 新 Codex 会话进入仓库 | 可以从 `AGENTS.md` / README 找到 9 个现役文件、1 份非权威 Product Design 交付审核记录、固定品牌资产与校验清单；旧 PRD 不与其平级 |
| AT-GOV-002 | 检索价格、Lead 状态、角色、品牌规则 | 只得到当前规则；旧规则被标 Historical 或有清楚覆盖说明 |
| AT-GOV-003 | 查看 Git 状态 | 在唯一授权分支；用户已有改动未被覆盖；报告真实 HEAD |
| AT-GOV-004 | 运行当前验证 | 报告本次结果，不复用旧 SHA 的“通过”措辞 |
| AT-GOV-005 | 校验原始 R2 来源与当前 CURRENT 文件 | 原始 R2 使用不可变 `R2_PACKAGE_ORIGINAL_CHECKSUMS.sha256`；CURRENT 文件使用独立 `CURRENT_AUTHORITY_CHECKSUMS.sha256`；更新 CURRENT 不得覆盖原始来源证据 |
| AT-GOV-006 | 核对页面规格、UI PDF 与 Interaction PDF | UI PDF 的业务 Page ID 通过视觉页面标识逐页核对，不要求文本层全部可搜索；Interaction PDF 的 IF 编号可文本检索；缺失参考必须报告而非自行设计 |
| AT-GOV-007 | Codex 开始本轮工作 | 一次进入连续开发模式；先核对真实事实，无 OWNER 级冲突时直接施工；不生成 A–G 平级阶段报告 |
| AT-GOV-008 | 检索外部能力规则 | AI、Email、Payment 等配置和代码结构被保留；未配置安全失败，不因缺密钥删除入口 |
| AT-GOV-009 | 统计 Acceptance ID | 使用可识别 A11Y / E2E 等数字分类名的完整 ID 规则；报告 total / unique / duplicate；不得继续使用漏算 176 的旧统计 |
| AT-GOV-010 | 原始 R2 checksum 与 CURRENT checksum 同时存在 | 原始清单不可随 CURRENT 更新；CURRENT 清单可随正式权威更新；文档明确两者职责 |
| AT-GOV-011 | Codex 搜索不到 UI PDF 某 Page ID 文本 | 不因此判定设计不存在；必须视觉核对对应 PDF 页面或报告 PDF 文本层限制 |

## 5. 注册、登录与账号恢复

| ID | Given / When | Then |
| --- | --- | --- |
| AT-AUTH-001 | 新用户提交有效账号、密码、可用 username 并同意条款 | 注册成功，不强制邮箱验证，进入 onboarding |
| AT-AUTH-002 | username 含非法字符、保留词或不合长度 | 前端即时提示；服务端拒绝；不创建半账号 |
| AT-AUTH-003 | 两个请求并发占用同一 username | 只有一个成功；另一个得到可理解冲突提示 |
| AT-AUTH-004 | 登录凭证正确 | 登录成功并进入 `/console` 或原目标页 |
| AT-AUTH-005 | 登录错误 | 不泄露账号是否存在；保留可重试状态；不显示假成功 |
| AT-AUTH-006 | 未登录访问受保护 `/console` 子页 | 跳转登录并能在登录后返回 |
| AT-AUTH-007 | 普通用户访问 `/jeepwork` | 服务端拒绝或 404，不只依赖前端隐藏 |
| AT-AUTH-008 | 发起找回密码 | 成功提交显示中性提示；Provider 未配置时显示真实可操作失败 |
| AT-AUTH-009 | 符合注销条件的用户二次确认注销 | Personal Page 立即下线；账号进入 30 天 Pending Cancellation；显示真实撤销截止时间 |
| AT-AUTH-010 | Pending Cancellation 用户在 30 天内撤销 | 恢复个人账号 / 业务空间一致状态；不重复创建 Personal Page 或发放权益 |
| AT-AUTH-011 | Pending Cancellation 超过 30 天未撤销 | 无继续处理必要的数据删除 / 不可逆匿名化；法定 / 必要留存进入隔离 retention，不继续公开或正常运营 |
| AT-AUTH-012 | 用户查看 Privacy / 注销说明 | 能看到运营主体、数据类别、保存期限或确定方法、到期处理方式、注销 / 删除权利入口；不能用“永久保留全部数据”笼统替代 |

## 6. Onboarding 与首次发布

| ID | Given / When | Then |
| --- | --- | --- |
| AT-ONB-001 | 注册成功 | onboarding 不重复要求 username，显示 4–6 步清晰进度 |
| AT-ONB-002 | 用户只完成必要资料 | 可以继续到预览；非必要项可跳过 |
| AT-ONB-003 | 必要发布字段缺失 | Publish 禁止并精确指出缺失内容，而非笼统报错 |
| AT-ONB-004 | 添加首个 Offering / 链接 | 即时出现在 Draft 预览，不公开 |
| AT-ONB-005 | 首次 Publish 成功 | 完成页显示真实公开链接、复制、二维码和进入 Console |
| AT-ONB-006 | 首次 Publish 失败 | 保留输入和 Draft，允许重试，不生成半公开页 |

## 7. Console 信息架构

| ID | Given / When | Then |
| --- | --- | --- |
| AT-CON-001 | 登录普通用户 | 唯一后台根为 `/console` |
| AT-CON-002 | 查看桌面一级导航 | 只有概览、我的页面、客户、数据、设置及必要账号菜单 |
| AT-CON-003 | 访问旧 `/dashboard` / `/workbench` | 重定向 `/console`，不形成第二套后台 |
| AT-CON-004 | 查看概览 | 显示真实发布状态、访问 / Lead 摘要、AI 状态和必要快捷操作 |
| AT-CON-005 | 新账号无数据 | 显示可行动空状态，不显示伪造统计数字 |
| AT-CON-006 | API 失败 | 保留导航和重试入口，错误不冒充空数据 |

## 8. Page、Section 与 Renderer

| ID | Given / When | Then |
| --- | --- | --- |
| AT-PAGE-001 | 新账号建立个人业务空间 | 存在唯一 Personal Page，可进入统一编辑器；底层 Workspace / tenant 可以存在但普通 UI 不要求用户管理 |
| AT-PAGE-002 | 用户创建自己拥有的第一个 Team | 存在 Team Page；成员可有 Member Page；Personal 与 Team 数据、计费和点数隔离；MVP 不允许创建第二个自有 Team |
| AT-PAGE-003 | Personal / Team / Member 使用相同基础 Section | Editor Preview 与 Public 由共享 schema / renderer 输出等价结构 |
| AT-PAGE-004 | Team Page 使用团队特有 Member Section | 仍走共享 Page / Section / Publish 基础能力，不走独立旧站点系统 |
| AT-PAGE-005 | 添加、编辑、排序、隐藏、删除 Section | Draft 正确更新；键盘和触控可完成核心操作 |
| AT-PAGE-006 | 隐藏 Section 后 Publish | Public Page 和 AI Facts 不包含该公开内容 |
| AT-PAGE-007 | 删除含必要业务关系的 Offering | 显示影响并安全处理负责人 / Lead 历史，不静默破坏历史快照 |
| AT-PAGE-008 | 上传无效或过大图片 | 明确格式 / 大小错误，保留其他编辑内容 |
| AT-PAGE-009 | 图片加载失败 | 有占位与替代文本，页面结构不崩溃 |
| AT-PAGE-010 | Team 成员 removed / disabled | 自动不在公开 Team Page 展示 |

## 9. Draft、Preview、Publish 与共同事实

| ID | Given / When | Then |
| --- | --- | --- |
| AT-PUB-001 | 已有 Published 价格 ¥100，Draft 改为 ¥200 未发布 | Public Page 仍显示 ¥100 |
| AT-PUB-002 | 同上，向 Visitor AI 询价 | AI 也只能回答 ¥100 |
| AT-PUB-003 | 打开 Preview | 显示 Draft ¥200，并明确“预览 / 未发布” |
| AT-PUB-004 | Publish 成功 | Public Page 与 AI 同时切到同一新版本并显示 / 回答 ¥200 |
| AT-PUB-005 | Publish 中重复点击或重试请求 | 只产生一个版本和一次副作用 |
| AT-PUB-006 | Page 写入成功但 AI Facts 生成失败 | 整体 Publish 失败，外部继续使用旧完整版本 |
| AT-PUB-007 | Publish 失败后刷新 | Draft 保留，旧 Published 可用，可重试 |
| AT-PUB-008 | 无 Published 的页面 | 公开访问显示正确未发布 / 404 状态，不泄露 Draft |
| AT-PUB-009 | 未授权 Member 调用 Team Publish API | 服务端拒绝，不产生版本 |
| AT-PUB-010 | Published 版本被读取 | 只包含允许公开字段，不含 Internal Notes、私密联系方式、密钥或 Draft |

## 10. 公开页面、品牌与举报

| ID | Given / When | Then |
| --- | --- | --- |
| AT-PUBLIC-001 | 访问已发布 Personal Page | 身份、Offering、内容、主 CTA 和可用联系入口正确 |
| AT-PUBLIC-002 | 访问 Team Page | 品牌→Offering→AI / 咨询→成员→案例 / 信任→联系结构成立 |
| AT-PUBLIC-003 | 访问 Member Page | 显示成员公开专业信息，Lead 来源能识别该成员 |
| AT-PUBLIC-004 | Free Page | 显示可点击 Link168 品牌入口和举报 |
| AT-PUBLIC-005 | Plus / Pro / Enterprise / Enterprise Pro Page | 不显示 Link168 品牌，只保留举报 |
| AT-PUBLIC-006 | 会员宽限期内 | 保持原付费品牌规则；宽限结束降 Free 后品牌恢复 |
| AT-PUBLIC-007 | Member 被移除 | Member Page 不再公开；历史数据仍存在 |
| AT-PUBLIC-008 | 提交举报 | 关联正确页面和原因；成功仅在服务端确认后显示；防重复滥用 |
| AT-PUBLIC-009 | 已配置自定义域 | 自定义域为 canonical，Link168 地址重定向且 SEO metadata 一致 |
| AT-PUBLIC-010 | 公开页加载失败 | 显示品牌一致的错误 / 重试，不泄露内部错误和私人信息 |

## 11. Visitor AI 事实与体验

| ID | Given / When | Then |
| --- | --- | --- |
| AT-AI-001 | 询问已发布 Offering、价格、适用对象 | 只依据当前 Published Facts 回答 |
| AT-AI-002 | 询问未提供的具体可用时间 | 明确无法确认、澄清或建议人工联系，不编造 |
| AT-AI-003 | Draft 新增秘密信息未发布 | AI 无法读取或泄露 |
| AT-AI-004 | 检查工具与网络请求 | Visitor AI 不调用 Web / Search / 任意 URL 抓取 |
| AT-AI-005 | 普通知识咨询，无商业意图 | 先回答价值，不立即索取联系方式 |
| AT-AI-006 | 访客明确希望报价 / 洽谈 | AI 才请求至少一种联系方式 |
| AT-AI-007 | 推荐 Member | 有 Offering / 公开专业信息 / 配置负责人依据，并可解释；无依据不猜 |
| AT-AI-008 | AI 未启用或配置不完整 | 显示真实状态，Direct Form 仍可用 |
| AT-AI-009 | Provider 未配置 / 超时 / 系统错误 | 显示安全失败和重试 / 联系入口，不生成假答案 |
| AT-AI-010 | 安全拒绝 | 不返回不安全输出；不扣最终点数；保留联系 fallback |

## 12. Conversation、正式 Lead 与 Direct Form

| ID | Given / When | Then |
| --- | --- | --- |
| AT-LEAD-001 | 只有普通 Conversation | 不创建正式 Lead |
| AT-LEAD-002 | 有有效联系方式但无明确商业意图 | 不创建正式 Lead |
| AT-LEAD-003 | 有商业意图但无联系方式 | 不创建正式 Lead；引导补充联系 |
| AT-LEAD-004 | 同时有意图和至少一种有效联系方式 | 创建一个正式 Lead，初始状态 New |
| AT-LEAD-005 | 同一提交重复请求 / 刷新 | 不创建重复 Lead |
| AT-LEAD-006 | Direct Form 只填手机号但未表达需求 | 不因联系方式单独创建 Lead |
| AT-LEAD-007 | Direct Form 选择咨询类型、填写需求并提供一种有效联系 | 创建 Lead，保留来源和需求快照 |
| AT-LEAD-008 | Email / 手机 / 微信其中一种有效 | 可以提交；不要求全部填写 |
| AT-LEAD-009 | 所有联系方式无效 | 服务端拒绝并指出如何修正 |
| AT-LEAD-010 | AI Provider 故障 | Direct Form 仍能用真实数据库创建合格 Lead |

## 13. Lead Routing 与成员变更

| ID | Given / When | Then |
| --- | --- | --- |
| AT-ROUTE-001 | Lead 来自有效 Member Page | 分配给该来源 Member |
| AT-ROUTE-002 | 非 Member 来源且 Offering 有有效默认负责人 | 分配 Offering default assignee |
| AT-ROUTE-003 | 前两级无有效候选且 Workspace default 有效 | 分配 Workspace default assignee |
| AT-ROUTE-004 | 所有配置缺失 / disabled / left | 分配 Workspace Owner，并提示配置 |
| AT-ROUTE-005 | 来源 Member 已离开 Workspace | 不分给旧 Member，回退后续级别 |
| AT-ROUTE-006 | 并发中负责人被停用 | 事务内重新校验并安全回退 |
| AT-ROUTE-007 | 两次同一 Lead 创建请求 | 分配历史不重复 |
| AT-ROUTE-008 | 移除有活跃 Lead 的 Member 并选择继任 | 活跃 Lead 转给继任，历史保留 |
| AT-ROUTE-009 | 移除 Member 未选继任 / 继任失效 | 活跃 Lead 自动转 Workspace Owner |
| AT-ROUTE-010 | 检索 Routing 代码 | 不存在 Round Robin、地域、技能评分或 AI 猜负责人 |

## 14. Lead 状态、Inbox 与权限

| ID | Given / When | Then |
| --- | --- | --- |
| AT-INBOX-001 | 新合格 Lead 创建 | 列表显示来源、时间、联系、Offering、负责人和 New |
| AT-INBOX-002 | 负责人完成真实联系并标记 | New → Contacted 成功并记录操作者 / 时间 |
| AT-INBOX-003 | 本次咨询结束 | Contacted → Closed；必要时允许 New → Closed 并记录原因 |
| AT-INBOX-004 | 新业务提交旧状态 viewed / following_up / won | 服务端拒绝；历史记录可映射读取 |
| AT-INBOX-005 | 打开 Lead 详情 | 显示 Conversation、真实 Summary、Internal Notes、来源和分配历史 |
| AT-INBOX-006 | AI Summary 不存在或生成失败 | 明确“尚无摘要 / 生成失败”，不显示虚构摘要 |
| AT-INBOX-007 | 写 Internal Note | 仅授权 Workspace 用户可读，不出现在公开 API / Page / AI |
| AT-INBOX-008 | Owner / Admin 查询 | 可读 Workspace 全部 Lead |
| AT-INBOX-009 | Member 查询 | 只读分配给自己或来源于自己 Member Page 的 Lead |
| AT-INBOX-010 | Member 修改他人 Lead URL / API 参数 | 服务端拒绝且不泄露内容 |
| AT-INBOX-011 | Workspace A 用户请求 Workspace B Lead | 服务端拒绝；日志不泄露私人字段 |
| AT-INBOX-012 | 无 Lead / 网络失败 | 空状态与错误状态明确区分 |

## 15. Team、角色、Invite 与席位

| ID | Given / When | Then |
| --- | --- | --- |
| AT-TEAM-001 | Owner / Admin 编辑 Team Page | 允许；Member 服务端拒绝 |
| AT-TEAM-002 | Owner / Admin 创建邀请 | 只能选 Admin / Member，链接 7 天一次性 |
| AT-TEAM-003 | 未登录打开有效邀请 | 登录 / 注册后返回并可接受 |
| AT-TEAM-004 | 同一邀请重复接受 | 只加入一次；后续显示已使用 |
| AT-TEAM-005 | 过期 / 撤销邀请 | 明确状态，不加入 Workspace |
| AT-TEAM-006 | Email / SMS Provider 未启用 | 复制链接仍可用；不显示已发送假成功 |
| AT-TEAM-007 | 达到席位上限 | 禁止新增并显示升级 / 联系销售入口，不删除现有成员 |
| AT-TEAM-008 | Admin 尝试移除 Owner / 变更计费 | 服务端拒绝 |
| AT-TEAM-009 | 套餐降 Free 导致超席位 | 团队操作冻结、数据保留，不自动删成员 |
| AT-TEAM-010 | slug override 冲突 | Workspace 范围服务端拒绝，不改变个人 username |
| AT-TEAM-011 | 用户没有自有 Team，创建第一个 Team | 成功；成为 Owner；Team 与 Personal 数据隔离 |
| AT-TEAM-012 | 已拥有 1 个 Team 的用户尝试创建第二个自有 Team | 服务端拒绝；普通 UI 不显示第二个创建入口；仍可加入其他 Team |
| AT-TEAM-013 | 用户加入多个其他 Team | 可以切换“我加入的团队 / 当前团队”；不创建额外 Personal Page，不显示裸 Workspace ID |
| AT-TEAM-014 | 唯一 Owner 尝试直接退出 Team | 服务端拒绝并引导先转让 Owner；Team 不得无主 |
| AT-TEAM-015 | 唯一 Owner 尝试注销个人账号 | 服务端拒绝进入 Pending Cancellation，直到完成 Owner 转让 |
| AT-TEAM-016 | Owner 发起转让给 active Member | 进入 Pending Transfer；接收方确认前原 Owner 权限与责任不变 |
| AT-TEAM-017 | 接收方确认 Owner 转让 | 服务端事务完成 Owner 变更、权限刷新并记录前后 Owner / 时间 / 操作者 / 结果 |
| AT-TEAM-018 | Owner 转让被拒绝、过期或并发失效 | Owner 不变；不自动提升 Admin / Member；返回真实状态 |
| AT-TEAM-019 | 非授权人员尝试异常 Owner 恢复 | 拒绝；只有授权 `/jeepwork` 操作员可执行，且必须填写理由并记录 Audit |
| AT-TEAM-020 | Member 修改自己的允许字段 | 服务端允许并保存 Draft；不能修改未授权字段 |
| AT-TEAM-021 | Member 修改 Team Theme / Team global content / 其他 Member | 服务端拒绝；不能只靠 UI 隐藏 |
| AT-TEAM-022 | Member Preview 自己 Member Page Draft | 可看到当前 Draft；公开版本不受影响 |
| AT-TEAM-023 | Member Publish 自己权限范围内的 Member Page 修改 | Publish 成功；只更新自己的 Member Published Facts；Team Page 未被越权修改 |
| AT-TEAM-024 | Owner 二次确认解散 Team | Team / Member Pages、Visitor AI、新 Lead、Invites 立即停用；Team 进入 Pending Deletion；credits 冻结；auto-renew 停止 |
| AT-TEAM-025 | Pending Deletion Team 在 30 天内由 Owner 恢复 | Team、Pages、Members、Ledger / credits 恢复一致；不重复发点、不重复订阅、不复活已明确终止的旧 Invite |
| AT-TEAM-026 | Pending Deletion 超过 30 天且无恢复 | 普通业务数据进入删除 / 匿名化；有合法保存依据的数据转入隔离 retention / legal-hold；公开业务保持关闭 |

## 16. 点数、套餐与账单

| ID | Given / When | Then |
| --- | --- | --- |
| AT-BILL-001 | 查看 Pricing | 价格、点数、席位、月 / 年规则与权威完全一致 |
| AT-BILL-002 | Free 购买充值包 | 可以进入真实支付；成功后点数独立有效 365 天 |
| AT-BILL-003 | Plus / Pro 月付续期 | 发放当月额度，不叠加过期订阅点数 |
| AT-BILL-004 | Plus / Pro 年付开通 | 一次性发 9,600 / 36,000 点，周期末到期 |
| AT-BILL-005 | Enterprise / Enterprise Pro 开通 | 一次性发 180,000 / 600,000 共享点数 |
| AT-BILL-006 | 有多个点数 bucket | 最早到期先扣；同到期订阅先于充值 |
| AT-BILL-007 | Public Page Visitor AI 成功返回可用输出 | 从该 Page 所属 Workspace 按基础 5 点最终扣点一次；访客不承担、不读取商家余额 |
| AT-BILL-008 | AI 超时 / Provider / 系统 / 安全 / 无输出 | 全额自动退回；重复回调不多退 |
| AT-BILL-009 | 点数不足 | 调用前阻止并给充值 / 升级入口；Direct Form 可用 |
| AT-BILL-010 | 自助升级 | 立即生效、剩余周期补差、补点差额，记录账单 |
| AT-BILL-011 | 自助降级 | 下周期生效；当前周期权益不变；不自动退款 |
| AT-BILL-012 | 取消自动续费 | 不退款；显示当前权益结束日期 |
| AT-BILL-013 | 到期进入宽限 | `graceEndsAt = expiryAt + 72 hours`（服务端 UTC、不按自然日取整）；原权益保留且无新订阅点数；覆盖到期前 1 秒、到期时刻、到期后 1 秒 |
| AT-BILL-014 | 宽限结束 | 降 Free、页面继续、数据保留、品牌恢复、充值点保留 |
| AT-BILL-015 | 批准例外退款 | 回收未用订阅点；已消费点数纳入人工计算；充值包独立 |
| AT-BILL-016 | 支付回调重复 / 乱序 | 订单、点数、套餐只结算一次且状态一致 |
| AT-BILL-017 | 支付宝 return URL 显示成功但服务端未确认 | 不激活套餐 / 点数；主动查询真实订单状态 |
| AT-BILL-018 | 支付回调丢失 | 主动查询 / 对账补偿后只结算一次，并记录审计 |
| AT-BILL-019 | 商户或支付宝未配置 | 保留套餐 / 订单入口并显示真实阻断；不创建假付款或删除支付结构 |
| AT-BILL-020 | 同一用户同时有 Personal 与 Team 额度 | 两个 billing / credit ledger 独立，余额和消费互不污染 |
| AT-BILL-021 | Team Page / Member Page / Team Visitor AI 发生 AI 消耗 | 从该 Team 共享 credit pool 预扣 / 结算 / 退回，不扣 Owner / Member 个人余额 |
| AT-BILL-022 | Member 在加入的其他 Team 使用 Team AI | 使用目标 Team 权益；Member 个人套餐与个人点数不变化 |
| AT-BILL-023 | Team Owner 转让完成 | Team plan、订单归属、历史 ledger、剩余 credits 保持属于 Team；不迁移到旧 / 新 Owner 的个人账本 |

## 17. Enterprise 与 Jeepwork

| ID | Given / When | Then |
| --- | --- | --- |
| AT-ENT-001 | 访客查看 Enterprise | 显示 ¥8,800 / ¥19,800 起、权益和联系销售，不显示自助立即购买 |
| AT-ENT-002 | 提交有效 Enterprise Contact | 创建 Link168 平台 Sales Lead，不进入客户 Workspace Inbox |
| AT-ENT-003 | 公开页面 | 不承诺固定 SLA；`/jeepwork` 内部目标 1 工作日并有逾期提醒 |
| AT-ENT-004 | 运营记录合同 / 付款 / 发票 | 保存真实状态与操作者，不显示直接开票假集成 |
| AT-ENT-005 | 合同 / 付款条件未满足就激活 | 服务端拒绝或要求明确授权例外 |
| AT-ENT-006 | 授权操作员激活 | 套餐、席位、周期、共享点数原子生效并写 Audit Log |
| AT-ENT-007 | 普通用户调用 Jeepwork API | 服务端拒绝 |
| AT-JEEP-001 | 盘点真实 `/jeepwork` 路由 | 每项标当前启用 / 保留禁用 / 未来 / 历史废弃 |
| AT-JEEP-002 | Promotions / Card Keys / Commissions | 默认不可用或清楚禁用；不会因重新设计自动启用 |
| AT-JEEP-003 | Provider 密钥页面 | 不显示完整密钥，不写日志，普通用户不可访问 |

## 18. 数据、空状态与真实性

| ID | Given / When | Then |
| --- | --- | --- |
| AT-DATA-001 | 有真实事件 | 时间范围内的访问、AI / 表单、Lead、来源和趋势正确 |
| AT-DATA-002 | 无事件 | 显示 0 / 空状态和建议，不显示样例图表 |
| AT-DATA-003 | 改变时间范围 | 指标和图表同步更新并注明时区 |
| AT-DATA-004 | API 局部失败 | 失败卡片与真实 0 区分，允许重试 |
| AT-DATA-005 | Member 访问数据 | 只看到权限允许范围，不通过聚合泄露他人 Lead |

## 19. 响应式、无障碍与浏览器

| ID | Given / When | Then |
| --- | --- | --- |
| AT-UI-001 | 360 / 375 / 390 / 430px 运行 Golden Path | 无横向溢出，核心按钮 / 表单 / AI / Lead 可操作 |
| AT-UI-002 | 1440px | 内容宽度、侧栏、预览和表格层级与 UI 规格一致 |
| AT-UI-003 | 移动 Editor | 单列 + 抽屉 / 底部操作，不是缩小的桌面三栏 |
| AT-UI-004 | 打开移动键盘 | 固定操作不遮输入、错误或提交按钮 |
| AT-A11Y-001 | 仅键盘操作 | 可完成登录、导航、编辑核心操作、Publish、AI / 表单、Lead 跟进 |
| AT-A11Y-002 | 检查 focus | 所有交互控件 focus 可见，dialog 焦点被正确管理和返回 |
| AT-A11Y-003 | 检查标签 | 输入有外置 label；placeholder 不是唯一名称 |
| AT-A11Y-004 | 检查对比与错误 | 目标 WCAG AA；错误不只靠红色 |
| AT-A11Y-005 | reduced motion | 非必要动画降低或关闭 |
| AT-E2E-001 | 自动化主闭环 | 从注册 / 登录到 Lead Closed 的唯一 Golden Path 在浏览器通过 |

### 19.1 公开文案与术语

| ID | Given / When | Then |
| --- | --- | --- |
| AT-COPY-001 | 查看首页 Hero | 只说明商业主页、基于已发布资料的 AI 回答、访客提交与负责人跟进，不承诺保证成交或平台必然联系 |
| AT-COPY-002 | 查看 Pricing 的 AI 成本 | 当前 Visitor AI 只标示基础回答 5 点 / 次；未启用的 1 点 / 20 点能力不被写成当前功能 |
| AT-COPY-003 | Direct Form 提交成功 | 说明主页负责人“可以”按所留方式联系，不承诺一定联系或平台代为联系 |
| AT-COPY-004 | Enterprise Form 提交成功 | 只说明平台已收到需求和后续以实际处理为准，不暴露内部 Lead、合同、付款或人工激活路径 |
| AT-COPY-005 | 普通用户浏览 Marketing、Auth、Console、Public 与设置页 | 使用中文业务词；Draft、Offering、Workspace、Conversation、Canonical 等工程词不直接暴露；DNS 记录名除外 |
| AT-COPY-006 | 开发查看 LEGAL-01 / LEGAL-02 交付 PDF | 明确识别为结构参考；上线前使用 OWNER 按真实运营、数据处理和适用法域确认的全文，不自行编造 |

## 20. 法律、隐私、账号停用与举报

| ID | Given / When | Then |
| --- | --- | --- |
| AT-LEGAL-001 | 未登录访问 `/terms` / `/privacy` | 页面可读，显示运营主体、版本、生效日期和联系渠道，无占位文本 |
| AT-LEGAL-002 | 注册页勾选条款 / 隐私并提交 | 服务端记录政策类型、版本、同意时间、主体和用途 |
| AT-LEGAL-003 | 用户打开表单后政策版本更新 | 不静默沿用旧勾选；保留非敏感输入并要求确认新版本 |
| AT-LEGAL-004 | 查询历史同意 | 能区分旧 / 新政策版本，政策更新不改写历史记录 |
| AT-LEGAL-005 | Direct Form / Enterprise Form 提交 | 同意版本与业务记录关联；不同用途不被一个总布尔值替代 |
| AT-LEGAL-006 | 用户撤回非必要同意 | 停止相应用途，不伪造已删除依法仍需保留的记录 |
| AT-LEGAL-007 | 访问 `/account-cancellation` | 显示登录、公开 Page、Workspace、订单 / 退款 / 审计的真实影响 |
| AT-LEGAL-008 | 未重新鉴权直接调用停用 API | 服务端拒绝，不改变账号或 Page |
| AT-LEGAL-009 | 确认停用成功 | 撤销 session、阻止登录、停止相关公开展示并返回真实结果 |
| AT-LEGAL-010 | 停用过程中任一写入失败 | 事务 / 补偿保持账号、Page、Workspace 与历史一致，不出现半停用 |
| AT-LEGAL-011 | 账号涉及其他 Workspace / 历史 Lead | 不删除其他主体数据、账务、Lead 或分配历史 |
| AT-LEGAL-012 | 请求永久删除 | 不由普通 UI 自动清库；进入需 OWNER / 合规确认的人工流程 |
| AT-REPORT-001 | 从 Public Page 点击举报 | REPORT-01 绑定正确 Page 和当时 Published version，不包含 Draft |
| AT-REPORT-002 | 提交有效类别和说明 | 创建一条 Pending 举报；成功文案不承诺自动封禁 |
| AT-REPORT-003 | 重复 / 滥用举报 | 幂等或真实限流，不重复制造处罚，不泄露内部规则 |
| AT-REPORT-004 | Jeepwork Operator 审核 | 只能访问最小必要公开证据，不读取私人联系方式 / Internal Notes |
| AT-REPORT-005 | 同一 Page 举报数量增加 | 不自动封禁；必须由授权操作者基于证据决定 |
| AT-REPORT-006 | 采取要求整改 / 限制 Page / 停用 Page / 限制账号 | 保存证据、理由、操作者、时间和 Audit Log |
| AT-REPORT-007 | 举报被驳回 | 状态和理由摘要真实保存，不产生限制副作用 |
| AT-REPORT-008 | 被处置用户申诉 | 允许一次提交，保留原处置，不同操作者复核 |
| AT-REPORT-009 | 申诉维持 / 撤销 | 记录 Upheld / Reversed、理由和后续真实状态 |
| AT-REPORT-010 | 查看举报双方信息 | 不向举报者泄露 Owner 私人信息，不向被举报者泄露举报者身份 |

### 20.1 China Production Compliance Gate

| ID | 场景 | 通过标准 |
| --- | --- | --- |
| AT-CN-001 | 核对运营主体 | 正式法律资料使用真实法定名称“合肥市造梦哈勃文化传媒有限公司”，不使用虚构主体 |
| AT-CN-002 | 正式联系方式未知 | Production Gate 不通过并标记 `PRODUCTION DATA REQUIRED`，不把 placeholder 当正式联系信息 |
| AT-CN-003 | Privacy / Terms 缺真实 version 或 effective date | Production Gate 不通过；正式用户不可见 placeholder 协议 |
| AT-CN-004 | 查询 Consent | 每条记录可追踪 Policy Type、Policy Version、Purpose、Data Category、主体 / 会话、时间和场景 |
| AT-CN-005 | 处理目的、方式或个人信息种类发生依法需重新取得同意的变化 | 旧 Consent 不被静默继承或改写；系统可要求并记录新决定 |
| AT-CN-006 | Lead / Visitor AI / Direct Form 收集信息 | 只收集当前明确目的必要的数据，不以未来分析或营销为由扩大收集 |
| AT-CN-007 | 审查 Retention Matrix | 覆盖当前主要数据类别、触发条件、到期处理和 Legal Hold；不宣称全部数据可无限期保留，也不使用统一臆测期限 |
| AT-CN-008 | 账号注销 30 天恢复窗口结束 | 无继续处理依据的普通数据进入删除 / 不可逆匿名化流程 |
| AT-CN-009 | 注销后仍有法定期限或合法 Legal Hold | 数据进入 Restricted Retention，只允许存储和必要安全处理，不继续公开、经营或营销 |
| AT-CN-010 | Team 解散 | 30 天 Product Restore Window 与 Legal Retention 明确分离，不能互相替代 |
| AT-CN-011 | 访客打开 Visitor AI | 页面持续明确当前是 AI interaction，不让访客误认为真人员工已在线 |
| AT-CN-012 | AI 生成内容进入产品 | 按实际内容形态具备适用显式及隐式 / 元数据标识能力；不能以一句文字概括全部义务 |
| AT-CN-013 | 配置 Visitor AI | 可真实记录 Provider、Model、监管状态、备案 / 登记 / 上线编号、主体、核验日期与证据 |
| AT-CN-014 | 适用模型信息公示 | 只显示真实配置的模型名称及备案号 / 上线编号，不显示 placeholder |
| AT-CN-015 | Provider 尚未确定或未核验 | 显示 `TBD — PROVIDER NOT CONFIGURED` / Production blocked，不伪造厂商、模型或编号 |
| AT-CN-016 | 启用第三方服务 | Processor Registry 完整记录 Provider、服务、数据类别、目的、区域、处理 / 存储位置、传输路径、retention、安全条款、环境、Owner 和复核日期 |
| AT-CN-017 | 评估受影响数据流 | Cross-border 状态为真实已确认的无出境或存在出境；`UNKNOWN` 时该数据流 Production Gate 不通过 |
| AT-CN-018 | AI 备案 / 登记 / 公示适用事实尚未确认 | 不得标记 Visitor AI Production Ready，也不得断言调用已备案模型即可免除全部核验 |
| AT-CN-019 | 互联网信息服务 / 电信业务分类尚未核定 | 状态为 `REGULATORY CLASSIFICATION REQUIRED`，不得断言有 ICP 即可经营全部收费业务或无需额外许可 |
| AT-CN-020 | 实际启用自动续费 | 不默认勾选；由用户主动选择；明确金额 / 周期 / 规则；提供显著简便的取消 / 变更入口 |
| AT-CN-021 | 发布 Privacy / Terms | Operator、Contact、version、effective date、Processor、Retention、权利渠道、争议条款和 AI 披露均为真实值，不以 placeholder 上线 |
| AT-CN-022 | 审查 Production Security | 明确区分 Implemented、Verified in Test、Verified in Real Environment 与 Production Ready；Unit Test 不能单独形成生产 PASS |
| AT-CN-023 | 全部 Feature Acceptance 通过 | 只有 China Production Compliance Gate、真实 Provider / 数据流 / 安全 / E2E 及必要许可备案事实也通过时，才可标 Production Ready |
| AT-CN-024 | AI / Payment / Email / SMS / Storage 未配置 | 相应能力保留并安全、明确失败，不产生 Mock 成功，也不阻止无关普通产品开发 |
| AT-CN-025 | 以合规名义提出新系统 | 未有新 OWNER Decision 时拒绝新增 CRM Pipeline、Ticket、Task、SLA 或复杂 Workflow；保持商业主页 → AI → Lead → Handoff |

## 21. 最终验证集合

Codex 必须从真实项目脚本确定命令，最终报告至少覆盖：

- Prisma validate / generate；
- lint；
- typecheck；
- unit tests；
- integration tests；
- production build；
- browser Golden Path E2E；
- 开发包 SHA-256 与页面 / 流程 ID 覆盖检查；
- 双 Workspace / 角色真实数据库验证；
- AI 成功与失败 / 退点；
- 360 / 375 / 390 / 430 / 1440 浏览器截图；
- 法律 / 隐私政策版本、账号停用一致性、举报 / 申诉与 Audit；
- `git diff --check`。

## 22. 当前审计基线（不是最终验收）

最近 2026-08-12 只读审计没有运行测试、数据库、浏览器或 Provider。审计快照只用于安排施工：

| 领域 | 基线状态 |
| --- | --- |
| `/console`、`/jeepwork` 边界 | PASS 代码证据，仍需当前运行复核 |
| Owner / Admin / Member Lead 读取边界 | 历史测试与代码证据，需真实 DB 复核 |
| Renderer 一致性 | FAIL：Team 独立 |
| Editor / Draft | FAIL：编辑直接写现役数据 |
| Lead 正式条件 | FAIL：各入口不一致 |
| Routing | NOT IMPLEMENTED |
| Lead 三状态 | FAIL：仍使用旧状态 |
| Page / AI 同 Published 版本 | NOT IMPLEMENTED |
| Lead Inbox 完整闭环 | NOT IMPLEMENTED |
| Browser Golden Path | NOT IMPLEMENTED |
| Mobile / Desktop / DB / Provider | NOT VERIFIED 或 BLOCKED |
| `/terms` / `/privacy` / `/report` / `/account-cancellation` | 历史代码线索存在，当前运行 NOT VERIFIED |
| 百炼 / 支付宝 / SMTP | 历史实现线索存在，真实配置与成功 / 失败路径 NOT VERIFIED |
| Visitor AI Workspace 扣点 | 本次规则已冻结，真实代码 NOT VERIFIED |

本表必须在真实开发后被新的本轮验收结果替换，不能直接改成 PASS。

## 23. 最终交付报告模板

```text
代码版本：
环境：
数据库：
Provider：
已通过 AT-*：
失败 AT-*：
被阻塞 AT-*：
未验证 AT-*：
运行命令与结果：
浏览器证据：
数据隔离证据：
点数 / 支付 / 退款证据：
已知限制：
是否可以宣布 MVP 完成：是 / 否
```

只要核心闭环、权限、Published 隔离、Lead 条件、Routing、点数、法律 / 举报入口、账号停用一致性或 Golden Path 任一未通过，就不能宣布 MVP 完成。
