# Link168 现有仓库只读审计：执行摘要

审计范围：当前工作区（用户已确认纳入现有未提交改动），分支 `recovery/direct-goal-closeout-20260722`，HEAD `3febe5003984dd691d0b46826935136922aa013f`。本轮未切换分支、未清理工作区、未改动业务代码、Schema、迁移或配置；只创建本目录审计文档。

## 总结结论

当前仓库不是“从零重写”状态，也不是已经完成新版产品的状态。它具备可运行的 Next.js/Prisma 基础、个人名片、产品、Lead、AI、会员/订单、Workspace、企业域名和企业额度等真实代码基础；但产品入口和数据归属仍存在明显并存结构，个人业务数据与 Workspace 数据没有完全统一，AI 知识库尚未形成真正的检索增强闭环，D2/D4 和真实外部服务仍有验证边界。

建议：继续整改现有仓库，采用“局部重构 + 统一入口 + 先修安全/归属/额度”的路线，不建议全部重写。下一批可以启动，但应先处理 P0/P1：数据租户边界、企业域名 Host 校验、企业 AI 额度状态机、重复后台入口和真实环境验收门禁。

## 已核实的 10 个事实

1. 构建链为 Next.js 16.2.11、React 19.2.7、TypeScript 6.0.3、Prisma 7.9.0、PostgreSQL 适配器。
2. `npm run lint`、`npm run typecheck`、`npm test -- --runInBand`、`npm run build` 和 `git diff --check` 本地通过。
3. Jest 当前为 40 个套件、489 个测试，全部通过；这不等于真实数据库/浏览器验收。
4. `/console` 已存在并有多个子页，但 `/workbench`、`/dashboard` 仍然是可构建、可访问的入口。
5. `/showcase` 公开路由未发现，动态用户名页对 `showcase` 做了 404；但 Showcase 历史 Schema、审计动作和迁移仍保留。
6. Schema 有 `Profile`、`Product`、`Lead`、`LeadFollowUp`、`AiConversation`、`AiMessage`、额度、订单、Workspace、域名和企业额度模型。
7. Schema 未发现独立 `Service`、`Offer`、`Booking`、`Quote`、`ContactForm`、Embedding/Chunk/Vector 或 Feishu 同步模型。
8. 公开联系表单可真实创建 Lead，并有来源组件、产品快照和重复提交/频率限制。
9. AI 有 Provider、百炼应用调用、额度预扣/退款、输出审核、traceId 和风险日志代码；公开接待读取的是用户个人产品/知识库，不是 Workspace 级 RAG。
10. 套餐配置已出现五档正式套餐，但仍保留历史别名和 `enterprise_pro_plus`；域名代码的限额表仍按旧别名判断，存在商业配置漂移风险。

## 10 个主要风险

1. 普通业务模型多数以 `userId`/`profileId` 归属，Workspace 尚未成为全部经营数据的统一边界。
2. `/console`、`/workbench`、`/dashboard` 三类后台入口并存，兼容跳转尚不足以证明唯一后台已经收口。
3. `WorkspacePublicProfile` 只关联成员公开名片，企业产品、服务、知识库和 Lead 仍主要落在个人模型。
4. AI 知识库是整文档拼接到 prompt 的基础实现，没有发现文档解析、切片、Embedding、向量检索或重排。
5. `src/lib/domains.ts` 的域名限额只显式支持 `enterprise` 和旧的 `enterprise_pro_plus`，与正式套餐 `enterprise_pro` 不一致。
6. 企业额度虽然有 pending/reserved/succeeded/refund_pending/refunded/failed 结构，但需要真实隔离 PostgreSQL 并发验证。
7. Lead Schema 注释要求的新状态与代码兼容旧状态并存，状态迁移尚未形成单一数据库状态闭环。
8. 业务模型没有独立 Service/Offer/Booking/Quote，联系 API 通过 `sourceComponent` 和消息拼接承载这些语义。
9. `.github` 有多条历史触发分支和多个 workflow，正式唯一主线与 CI 收口规则仍有治理风险。
10. 本地门禁通过不能替代真实支付宝、邮件、百炼、对象存储、DNS/HTTPS/公网回调和浏览器验收。

## 最大阻断

最大阻断不是编译，而是“数据边界和产品入口没有完全统一”：新版目标要求 Workspace 是个人或团队数据边界，但现有主闭环仍以个人 `Profile.userId` 为核心；同时三个后台族群都能构建。若直接在其上继续新增 Team/企业功能，容易形成第二套业务逻辑。

## 下一批是否可启动

可以启动，但必须限定为收口批次：先统一后台入口与 Workspace 归属策略，修复 D2/D4 的服务端安全和并发证据，补齐公开页→咨询→Lead→跟进→四指标的端到端验证。暂不建议增加新的复杂 CRM、社媒自动发布或新的后台。
