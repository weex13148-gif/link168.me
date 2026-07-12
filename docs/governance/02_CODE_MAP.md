# Link168 V2 代码地图

**文件名：** `docs/governance/02_CODE_MAP.md`  
**版本：** v1.6  
**生效日期：** 2026-07-12  
**性质：** 工程治理附件  
**上位规则：** `PRODUCT_CONSTITUTION.md` v1.6、`PRD.md` v2.0-rc8、`PROJECT_RULES.md` v1.0-rc3

> 本文件只说明代码位置、领域归属和验收入口，不创造新的产品规则。

---

## 1. 正式代码基线

- 仓库：`weex13148-gif/link168.me`
- 正式分支：`codex/link168-v2-direction`
- 正式本地工作区：`D:\77.me\branches\link168-v2-direction`
- 技术栈：Next.js App Router、React、TypeScript、Prisma多文件Schema、PostgreSQL、Node.js
- 架构：模块化单体
- 用户后台：`/console`
- 平台后台：`/jeepwork`
- 个人公开名片：`/[username]`

---

## 2. 核心目录

```text
link168.me/
├─ PRODUCT_CONSTITUTION.md
├─ PRD.md
├─ PROJECT_RULES.md
├─ DOCUMENT_INDEX.md
├─ .github/workflows/governance.yml
├─ prisma/
│  ├─ schema.prisma
│  ├─ workspace-invitation.prisma
│  ├─ workspace-resource.prisma
│  ├─ workspace-crm.prisma
│  ├─ workspace-card.prisma
│  └─ migrations/
├─ src/
│  ├─ app/api/workspaces/
│  ├─ app/console/
│  ├─ app/dashboard/
│  ├─ app/workbench/
│  ├─ app/jeepwork/
│  ├─ components/
│  └─ lib/workspace/
├─ scripts/
│  ├─ auth-integration-test.mjs
│  ├─ console-integration-test.mjs
│  ├─ console-mobile-browser-test.cjs
│  ├─ workspace-invitation-integration-test.mjs
│  ├─ workspace-resource-integration-test.mjs
│  ├─ workspace-customer-integration-test.mjs
│  └─ workspace-card-integration-test.mjs
└─ docs/
   ├─ governance/
   ├─ audits/
   ├─ history/
   └─ PRD_AI名片_AI客服_微信联系组件.md
```

根目录只保留一份正式`PRD.md`。组件级、历史和研究文档进入`docs/`，不得在根目录建立并行PRD。

---

## 3. Console路由

一级分类固定为：

```text
首页 / 名片 / 客户 / AI / 我的
```

| 分类 | 正式路由 |
|---|---|
| 首页 | `/console` |
| 名片 | `/console/card` |
| 客户 | `/console/customers` |
| AI | `/console/ai` |
| 我的 | `/console/account` |

普通用户导航不得显示`/jeepwork`。

---

## 4. Workspace成员与邀请

模型：

```text
Workspace
WorkspaceMember
WorkspaceInvitation
```

服务与策略：

```text
src/lib/workspace/index.ts
src/lib/workspace/invitation-policy.ts
src/lib/workspace/invitations.ts
```

正式API：

```text
/api/workspaces/[workspaceId]/members
/api/workspaces/[workspaceId]/invitations
/api/workspace-invitations
/api/workspace-invitations/[token]
```

---

## 5. 企业产品和知识资源

模型：

```text
WorkspaceResource
WorkspaceAuditLog
```

当前资源类型：

```text
product
knowledge_doc
```

服务与API：

```text
src/lib/workspace/resource-policy.ts
src/lib/workspace/resources.ts
/api/workspaces/[workspaceId]/products/**
/api/workspaces/[workspaceId]/knowledge/**
```

企业资源Owner是Workspace。个人Dashboard、旧Workbench、个人公开页和个人套餐计数必须排除企业归属资源。

---

## 6. 企业客户池和任务

个人与企业客户分离：

```text
个人客户：Lead / LeadFollowUp
企业客户：WorkspaceCustomer / WorkspaceCustomerFollowUp
```

模型：

```text
prisma/workspace-crm.prisma
WorkspaceCustomer
WorkspaceCustomerFollowUp
WorkspaceCustomerTask
WorkspaceCustomerAssignmentHistory
```

服务与API：

```text
src/lib/workspace/customer-policy.ts
src/lib/workspace/customers.ts
/api/workspaces/[workspaceId]/customers
/api/workspaces/[workspaceId]/customers/[customerId]
/api/workspaces/[workspaceId]/customers/[customerId]/tasks
```

owner/admin管理全部企业客户；member只处理分配给自己的客户和任务；viewer不能查看PII。成员离职前必须重新分配未完成客户和任务。

---

## 7. 企业主页和成员名片

个人与企业名片分离：

```text
个人经营名片：Profile / Link
企业主页和成员名片：WorkspaceCard / WorkspaceCardComponent
```

模型：

```text
prisma/workspace-card.prisma
WorkspaceCard
WorkspaceCardComponent
```

正式migration：

```text
20260712_workspace_cards
```

服务与策略：

```text
src/lib/workspace/card-policy.ts
src/lib/workspace/cards.ts
```

内部API：

```text
/api/workspaces/[workspaceId]/cards
/api/workspaces/[workspaceId]/cards/[cardId]
/api/workspaces/[workspaceId]/cards/[cardId]/components
```

规则：

- 每个Workspace最多一张企业主页。
- 每个成员在同一Workspace最多一张成员名片。
- owner/admin管理和发布全部企业名片。
- member只创建、读取和编辑自己的成员名片。
- member可读取企业主页；viewer只读取企业主页。
- 企业组件继承对应名片权限。
- 成员移除后失去访问权，但企业名片和组件继续保留。
- 企业名片不写入个人Profile或Link。
- 最终公网域名和成员二级域名尚未批准，本轮API仅供企业后台和内部预览。

---

## 8. 领域映射

| 领域 | 主要能力 | 典型位置 |
|---|---|---|
| `identity` | 邮箱身份、Session、账号安全 | `src/app/api/auth`、`src/lib/auth*`、`prisma` |
| `card-personal` | 个人经营名片和公开页 | Profile、Link、`/[username]` |
| `card-workspace` | 企业主页、成员名片和企业组件 | WorkspaceCard系列模型和API |
| `catalog` | 个人及企业产品 | Product、WorkspaceResource、Workspace产品API |
| `crm-personal` | 个人名片线索 | Lead、LeadFollowUp |
| `crm-workspace` | 企业客户、任务和分配历史 | WorkspaceCustomer系列模型和API |
| `analytics` | 访问、点击、短链和来源 | Visit、Click、ShortLink |
| `billing` | 套餐、订单、退款和权益 | `src/lib/billing`、Order、MembershipSubscription |
| `ai-platform` | 六大AI、知识库、额度和账本 | `src/lib/ai`、AI模型 |
| `workspace` | 企业成员、邀请、资产归属和审计 | `src/lib/workspace`、Workspace系列模型 |
| `governance` | Jeepwork、举报、安全和平台审计 | `src/app/jeepwork`、AdminAuditLog |

---

## 9. 测试和CI

| 测试 | 负责内容 |
|---|---|
| `auth-credential-policy.test.ts` | 邮箱身份策略 |
| `console-route-policy.test.ts` | 五分类和旧路由归类 |
| `invitation-policy.test.ts` | 邀请有效期、Token和角色边界 |
| `resource-policy.test.ts` | 企业产品/知识权限 |
| `customer-policy.test.ts` | 企业客户PII、任务和重分配 |
| `card-policy.test.ts` | 企业主页、成员名片和发布权限 |
| `workspace-invitation-integration-test.mjs` | 邀请并发和Workspace隔离 |
| `workspace-resource-integration-test.mjs` | 企业产品/知识归属 |
| `workspace-customer-integration-test.mjs` | 企业客户、任务和离职重分配 |
| `workspace-card-integration-test.mjs` | 企业主页、成员名片、组件和离职保留 |
| `console-mobile-browser-test.cjs` | 360/390/430px Chromium回归 |

CI使用临时PostgreSQL 16、测试账号、`MAIL_ENABLED=false`和临时Playwright，不连接生产数据库或第三方服务。

治理错误写入：

```text
artifacts/integration/governance.log
```

---

## 10. 并发文档治理

微信联系组件文档内容全部保留：

```text
docs/history/PRD_WECHAT_CONTACT_COMPONENT.md
docs/PRD_AI名片_AI客服_微信联系组件.md
```

D2分支通过双父提交接入并发文档，没有覆盖其他Agent业务代码。

---

## 11. 未完成域

- 企业AI共享账户、成员额度和企业AI账本。
- 企业管理员页和成员页完整UI。
- 企业名片最终公网域名、成员二级域名和自购域名渲染。
- 企业品牌、域名验证、报表、订单和发票。

不得把个人Profile、Link、Lead或AI账本批量迁移、覆盖或清空。

---

## 12. 更新规则

出现以下变化时必须同步本文件：

- 新增或调整正式路由。
- 新增Workspace资产类型。
- 数据Owner或权限来源变化。
- 新增migration、集成测试或CI入口。
- 个人与企业资产边界变化。