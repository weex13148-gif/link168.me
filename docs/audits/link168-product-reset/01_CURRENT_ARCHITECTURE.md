# Link168 当前架构审计

## 技术栈与工程入口

- Next.js App Router、React、TypeScript、Prisma、PostgreSQL；见 `package.json`。
- 生产脚本：`dev`、`build`、`start`；门禁脚本：`lint`、`typecheck`、`test`、`release:preflight`、`release:smoke`。
- Prisma Client 输出到 `src/generated/prisma`；当前 Schema 有效，`prisma generate` 成功。
- CI：`.github/workflows/mvp-closeout.yml` 包含 PostgreSQL service、迁移、lint、typecheck、Jest、build、release smoke；另有 `v1-check.yml` 和 `build-standalone.yml`，说明仍有历史工作流并存。
- `.env.example` 与 `.env.local` 存在；本轮只读取配置结构，未输出密钥内容。

## 主要页面与 API

### 公共与认证

- `/`：产品首页；`src/app/page.tsx`。
- `/register`、`/login`、`/forgot-password`、`/reset-password`、`/verify-email`：认证闭环页面。
- `/[username]`：个人公开名片；`src/app/[username]/page.tsx`。
- `/__w/[workspaceId]` 及 `about`、`ai`、`contact`、`employees`、`products`、`p/[slug]`：企业 Workspace 公开页面。
- `/s/[slug]`、`/go/[linkId]`、`/api/qrcode`：短链、跳转、二维码能力。
- `/api/contact`：访客留资入口，服务端创建 `Lead`。
- `/api/public/[username]/visit`：公开访问事件入库；`ProfileVisit` 有幂等事件 ID。

### 控制台与旧后台

- `/console`：当前新增的统一控制台入口，含 account、card、products、short-links、ai、ai-reception、knowledge、leads、analytics、membership、enterprise、notifications。
- `/workbench`：仍有完整页面族群和 API：AI、knowledge、leads、membership、account、products、analytics、enterprise 等。
- `/dashboard`：仍存在旧仪表盘入口及 `/api/dashboard/*`，覆盖 profile、appearance、links、products、media、knowledge、analytics、domains、stats、entitlements。
- `/admin/*`：旧管理页面族群仍能构建；部分旧 `/api/admin/*` 文件注释说明真正后台在 `/api/jeepwork/*`。
- `/jeepwork/*`：平台级运营/治理后台仍保留，包含 AI、订单、会员、用户、审计、日志、系统健康和配置。

### 支付、会员、企业与 AI API

- `/api/billing/orders`、`/api/billing/orders/[orderId]`、refund、addons：正式订单、退款、AI 点数包接口。
- `/api/pay/*`、`/api/payments/alipay/*`、sandbox、wechat：支付兼容和测试入口。
- `/api/enterprise-ai/access`、`/api/enterprise-ai/chat`、`/api/enterprise/quota`：企业 AI 与共享额度。
- `/api/workspaces`、`/api/workspaces/[workspaceId]/*`：Workspace、成员和企业公开名片管理。
- `/api/jeepwork/settings/*`：受控第三方配置和真实测试前置检查。

## 数据架构

核心模型集中在 `prisma/schema.prisma`：

- 身份：`User`、`Session`、冻结记录、邮箱/密码令牌、`Profile`。
- 个人名片：`Link`、`LinkClick`、`ProfileVisit`、`ShortLink`、`ShortLinkClick`、媒体字段。
- 经营：`Product`、`Lead`、`LeadFollowUp`。
- AI：`AiServiceConfig`、`AiConversation`、`AiMessage`、`KnowledgeDoc`、`AiUsageLog`、风险/审计日志。
- 商业：`MembershipSubscription`、`Order`、`AiCreditAccount`、`AiCreditLedger`、`AiCreditBucket`。
- Workspace：`Workspace`、`WorkspaceMember`、`WorkspacePublicProfile`、`Domain`、`EnterpriseQuotaPool`、`EnterpriseQuotaConsumption`。
- 历史：`CompetitionFile`、`ShowcaseContent`、`ShowcaseSequence`、`ShowcaseAIDemoCall`、`ShowcaseAIDebugLog`、`ShowcasePromptDraft`。

没有发现独立 `Service`、`Offer`、`Booking`、`Quote`、`ContactForm`、`Conversation`/`Message`（使用 `AiConversation`/`AiMessage`）、Embedding/Chunk/Vector 或 Feishu 同步模型。相关业务语义目前由 `Link.type`、`payloadJson`、`sourceComponent` 或整篇 `KnowledgeDoc.content` 承载。

## 权限与 Workspace

- `WorkspaceMember.role` 代码注释包含 `owner/admin/member/viewer`；成员 API 对成员查看、邀请、接受、禁用和角色变更有 `assertWorkspaceMember` 检查。
- 平台治理使用 `super_admin` 的 Jeepwork/管理员守卫；代码中仍可见历史 `admin` 语义，需继续核实其是否只作为企业角色或旧兼容层。
- 个人经营资料、产品、知识库、Lead、AI 对话和个人额度账户大多直接通过 `userId` 或 `Profile.userId` 隔离；Workspace 与这些对象没有全面外键关联。
- 企业域名与企业公开成员页具有 Workspace 外键；企业额度通过 `workspaceId` 和成员状态校验。

## 会员、支付和 AI 点数

- `src/lib/billing/plans.ts` 配置了 free、plus、pro、enterprise、enterprise_pro，同时保留 member_basic、member_plus、enterprise_pro_plus、internal_test。
- 合同价格与当前配置一致的正式档位为：Plus ¥69/月、¥599/年；Pro ¥139/月、¥999/年；企业 ¥8,800/年起；企业 Pro ¥19,800/年起；AI 加量包 1,000/3,000/10,000/30,000 点。
- 订单快照字段、支付宝回调、退款服务、点数账本和到期桶已存在代码，但真实第三方和生产回调未在本轮验证。

## 测试与 CI

- 本地结果：Prisma validate、generate、lint、typecheck、Jest 40/40 套件、489/489 测试、build、diff check 均通过。
- 测试覆盖文件包括 AI、额度、支付、退款、域名、企业权限、Lead、公开页、移动端、展示退役和安全收口。
- 仍缺少本轮实际执行的真实隔离 PostgreSQL 并发、浏览器端到端、公网 Host/DNS/HTTPS、真实支付宝/邮件/百炼/对象存储验证。
