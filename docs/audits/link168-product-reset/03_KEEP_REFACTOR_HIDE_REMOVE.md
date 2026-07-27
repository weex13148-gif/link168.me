# KEEP / REFACTOR / HIDE / REMOVE_LATER / DEFER

## KEEP

| 模块 | 证据 | 原因与前置条件 |
|---|---|---|
| `Profile`、公开用户名页、`Link`、二维码、访问事件 | `prisma/schema.prisma:111-152,212-275`；`src/app/[username]/page.tsx` | 核心经营名片底座；继续统一到控制台 |
| `Product`、Lead、LeadFollowUp | `prisma/schema.prisma:448-553` | 核心业务闭环真实数据底座；先修归属和状态 |
| `AiConversation`、`AiMessage`、Provider、风险与 trace | `prisma/schema.prisma:575-631`；`src/lib/ai/provider.ts` | AI 接待底座已存在，需补 RAG 和真实验证 |
| 会员、订单、额度桶、支付宝/退款服务 | `prisma/schema.prisma:634-763`；`src/lib/billing/*` | 宪法明确禁止删除支付/会员/AI；需保持单一账本 |
| `/jeepwork` | `src/app/jeepwork/*`、`src/app/api/jeepwork/*` | 明确保留的平台治理能力，不得删除 |
| Workspace、成员、域名、企业额度 | `prisma/schema.prisma:953-1045` | 企业能力基础，但不能冒充完整企业经营数据闭环 |

## REFACTOR

| 模块 | 证据 | 原因 | 前置条件 |
|---|---|---|---|
| `/console`、`/workbench`、`/dashboard` 后台结构 | `src/app/console/*`、`src/app/workbench/*`、`src/app/dashboard/page.tsx` | 三套心智并存，存在重复业务入口 | 先列出所有调用方，保留兼容跳转，确定 `/console` 为唯一主入口 |
| 个人业务数据与 Workspace | `Profile.userId`、`Product.userId`、`KnowledgeDoc.userId`、`Lead.profileId` | 新版 Workspace 是数据边界，但当前主要模型仍是个人归属 | 明确个人 Workspace/企业 Workspace 迁移和兼容读取方案 |
| 套餐和域名限额 | `src/lib/billing/plans.ts`、`src/lib/domains.ts` | 正式 `enterprise_pro` 与旧 `enterprise_pro_plus` 逻辑并存 | 以 `plans.ts`/合同为唯一配置，补 D2 测试 |
| Lead 状态 | `Lead.status`、`src/app/api/workbench/leads/route.ts` | `new/viewed/following_up/won/closed` 与历史状态并存 | 明确迁移策略，禁止新旧状态继续双写 |
| 联系组件语义 | `/api/contact` 的 `sourceComponent`、`Link.payloadJson` | Service/Offer/Booking/Quote 没有独立模型，语义散落 | 先以统一组件协议收口，再决定是否拆模型 |

## HIDE

| 模块 | 证据 | 隐藏原因与前置条件 |
|---|---|---|
| 旧 `/workbench`、`/dashboard` 入口 | `src/lib/legacy-console-routes.ts`、旧页面族群 | 兼容已有链接，但不应继续作为主导航；需确认所有旧调用方已迁移 |
| 旧 `/admin/*` 页面/API | `src/app/admin/*`、`src/app/api/admin/*` | 与 Jeepwork 平台后台并行；先保留兼容，避免删除用户已有结构 |
| `internal_test` 套餐和支付测试入口 | `src/lib/billing/plans.ts`、`src/app/api/payments/*/test` | 仅限隔离验收，不能出现在普通用户路径 |

## REMOVE_LATER

| 模块 | 证据 | 原因与条件 |
|---|---|---|
| Showcase 运行时专属代码和历史管理动作 | 当前无 `src/app/showcase`，但 `Showcase*` Schema 与审计动作仍在 | 公开能力已退役；待历史数据迁移/备份方案和单独批准后再清理 |
| 过时套餐别名 | `member_basic`、`member_plus`、`enterprise_pro_plus` | 需完成历史订单/订阅兼容迁移后再删除 |
| 旧后台页面 | `/workbench`、`/dashboard` 完成兼容跳转和观测后 | 不能在当前批次破坏性删除 |

## DEFER

- 真实飞书 OAuth、多维表同步和消息通知：本轮未发现实现，不进入当前闭环。
- 社媒自动发布：PRD 明确要求逐次人工确认，当前不接真实发布 API。
- 完整 CRM、ERP、复杂销售阶段：违反轻量经营定位，不纳入本轮。
- 真正的向量 RAG、复杂文档解析和多模态知识库：先完成最小文档问答与权限边界，再扩大。
