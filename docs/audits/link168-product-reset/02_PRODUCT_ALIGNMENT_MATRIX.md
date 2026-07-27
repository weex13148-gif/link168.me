# 新版产品结构映射矩阵

状态口径：已完成、部分完成、仅有基础设施、仅占位或文档、未发现、无法验证。`已完成`仅表示当前代码和本地测试足以证明该层，不代表真实外部服务或生产验收。

| 新版产品能力 | 当前实现状态 | 证据 | 缺口 | 建议 |
|---|---|---|---|---|
| 免费版基础名片 | 部分完成 | `Profile`、`Link`、公开页、二维码、访问统计；`src/lib/billing/plans.ts` | 组件闭环和 Workspace 归属未完全统一 | 保留并收口到唯一控制台 |
| Plus | 部分完成 | 套餐、价格、知识库上限、AI 额度配置 | 真实支付/AI 未配置验证；配置保留历史别名 | 以合同和服务端配置做单一来源 |
| Pro | 部分完成 | `pro` 计划、产品/Lead/知识库/统计代码 | 服务与行动组件不是独立模型，真实体验未验收 | 先补真实闭环验收 |
| Team | 未发现 | 未发现正式 `team` 计划或专用 Team 模型 | 目标结构未落成；不要从 `Workspace` 名称推断 | 作为企业/Workspace 收口的一部分另行决策 |
| 企业版 | 部分完成 | `Workspace`、成员、公开成员页、域名、企业额度 | 产品/知识库/Lead 仍多为个人归属；企业官网有 owner fallback | 先明确 Workspace 数据边界再扩展 |
| 企业 Pro | 部分完成 | `enterprise_pro` 计划，20 席位、3 域名、50,000 AI 配额 | 域名实现仍显式识别旧 `enterprise_pro_plus`；真实并发未验 | 修复商业配置漂移和 D2/D4 |
| 商业主页编辑 | 部分完成 | `/console/card`、`/api/dashboard/profile`、appearance、links、media | 页面/API 仍有旧后台并行；服务/Offer 等由 payload 承载 | 统一编辑器数据结构和入口 |
| 产品展示 | 部分完成 | `Product`、CRUD、排序、公开产品页/API、产品快照 | 产品以 userId 归属，非 Workspace；服务模型未发现 | 先定义经营数据 owner，再复用 Product |
| 服务展示 | 仅占位或文档 | `/api/contact` 接受 `service_card`；Link.type/payload 有扩展语义 | 未发现 Service 模型和独立 CRUD/公开组件闭环 | 不新增第二套逻辑，明确是否纳入 Product 统一模型 |
| Offer/Booking/Quote/Contact Form | 仅占位或文档 | `/api/contact` 的 `sourceComponent` 和消息拼接 | 未发现独立模型、配置、状态或预约/报价流程 | 作为组件类型补齐真实闭环或明确降级 |
| AI 接待 | 部分完成 | `commercial-agent.ts`、公开 AI API、AI 会话/消息、额度和转人工字段 | 真实百炼未配置；跨 Workspace 知识边界未形成 | 保留 Provider 抽象，补真实/隔离验收 |
| RAG | 仅有基础设施 | `KnowledgeDoc`、`sourceRefs`、AI prompt 传入文档 | 未发现解析、切片、Embedding、向量检索、重排 | 不把整文档 prompt 写成 RAG；单独规划最小检索闭环 |
| Lead | 部分完成 | `Lead`、`LeadFollowUp`、`/api/contact`、workbench leads | 新状态与历史状态并存；Workspace 归属缺失；AI lead 端到端需验收 | 统一状态迁移和归属策略 |
| Team 协作 | 部分完成 | `WorkspaceMember`、成员邀请/角色/API | 共享知识库、共享会话收件箱、分配、审计尚未形成完整闭环 | 先做最小成员权限，不扩成 CRM |
| 自定义域名 | 部分完成 | `Domain`、绑定/验证函数、Host 相关测试 | 旧套餐别名漂移；真实 DNS/HTTPS/Host 未验证 | 修复 D2 后再开放 |
| 飞书 | 未发现 | 本轮未发现 Feishu OAuth/同步模型或真实 API 代码 | 无法证明已存在 | 保留为未来集成，不作为当前完成项 |
| 访问/咨询/留资/转化 | 部分完成 | `ProfileVisit`、AI 事件、Lead、`getCoreMvpMetrics`、analytics API | 事件统一、去重和转化端到端仍需浏览器/真实库验证 | 只收口四类指标，补端到端验收 |

## 关键映射判断

- 新版产品不是缺少所有底层能力，而是缺少统一业务边界和闭环验收。
- `Product`、`KnowledgeDoc`、`Lead`、`AiConversation` 已经是可复用底座；不要另建平行模型，除非先确认 Workspace 归属迁移方案。
- `Team` 不能仅由存在 `Workspace` 模型推断已实现；当前只能判为部分基础设施。
- `/showcase` 公开路由已退役，但历史数据模型和管理审计字段应保留，符合“保留历史数据、退出公开产品”的决定。
