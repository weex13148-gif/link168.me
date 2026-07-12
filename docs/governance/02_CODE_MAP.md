# Link168 V2 代码地图

**文件名：** `docs/governance/02_CODE_MAP.md`  
**版本：** v1.5  
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
- 公开个人经营名片：`/[username]`

旧`master`、归档分支和旧工作区不作为V2当前代码事实。

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
│  └─ migrations/
├─ src/
│  ├─ app/
│  │  ├─ console/
│  │  ├─ dashboard/
│  │  ├─ workbench/
│  │  ├─ workspace-invitations/
│  │  ├─ api/workspaces/
│  │  ├─ api/workspace-invitations/
│  │  └─ jeepwork/
│  ├─ components/
│  │  ├─ layout/
│  │  ├─ workspace/
│  │  ├─ workbench/
│  │  └─ dashboard-v1/
│  └─ lib/
│     ├─ workspace/
│     ├─ billing/
│     └─ ai/
└─ scripts/
   ├─ auth-integration-test.mjs
   ├─ console-integration-test.mjs
   ├─ console-mobile-browser-test.cjs
   ├─ workspace-invitation-integration-test.mjs
   ├─ workspace-resource-integration-test.mjs
   └─ workspace-customer-integration-test.mjs
```

不得提交`.env*`、真实密钥、`node_modules`、`.next`、构建缓存和运行期上传目录。

---

## 3. 用户Console路由

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

### 模型

```text
Workspace
WorkspaceMember
WorkspaceInvitation
```

### 服务和策略

```text
src/lib/workspace/index.ts
src/lib/workspace/invitation-policy.ts
src/lib/workspace/invitations.ts
```

### API和页面

```text
/api/workspaces/[workspaceId]/members
/api/workspaces/[workspaceId]/invitations
/api/workspace-invitations
/api/workspace-invitations/[token]
/workspace-invitations/[token]
```

旧`/api/enterprise/organizations/[orgId]/*`只作为适配层，正式权限和邀请规则统一由Workspace处理器执行。

---

## 5. 企业产品与知识资源归属

### 模型

```text
WorkspaceResource
WorkspaceAuditLog
```

当前正式支持：

```text
product
knowledge_doc
```

### 服务和API

```text
src/lib/workspace/resource-policy.ts
src/lib/workspace/resources.ts
/api/workspaces/[workspaceId]/products/**
/api/workspaces/[workspaceId]/knowledge/**
```

企业资源Owner是Workspace。个人Dashboard、旧Workbench、个人公开主页和个人套餐计数必须排除企业归属资源。

---

## 6. 企业客户池与任务

### 6.1 个人域与企业域分离

```text
个人客户：Lead / LeadFollowUp
企业客户：WorkspaceCustomer / WorkspaceCustomerFollowUp
```

不得把个人`Lead`自动迁移或改写为企业客户。

### 6.2 模型

```text
prisma/workspace-crm.prisma
WorkspaceCustomer
WorkspaceCustomerFollowUp
WorkspaceCustomerTask
WorkspaceCustomerAssignmentHistory
```

正式migration：

```text
20260712_workspace_customer_pool
```

### 6.3 服务和策略

```text
src/lib/workspace/customer-policy.ts
src/lib/workspace/customers.ts
```

职责：

- 判断owner/admin/member/viewer的客户PII权限。
- 校验客户和任务负责人属于当前Workspace且为活跃非viewer成员。
- 查询管理员全部客户或成员本人负责客户。
- 校验单客户的Workspace归属和负责人。
- 统计成员名下未完成客户和任务。

### 6.4 正式API

```text
/api/workspaces/[workspaceId]/customers
/api/workspaces/[workspaceId]/customers/[customerId]
/api/workspaces/[workspaceId]/customers/[customerId]/tasks
```

### 6.5 权限边界

- owner/admin可管理全部企业客户、跟进和任务。
- member只读写分配给自己的客户与任务。
- viewer不允许读取客户PII。
- 所有查询必须同时校验`workspaceId`和成员状态。
- 普通成员不能重新分配客户或任务。
- 客户跨Workspace访问返回404。

### 6.6 离职重分配

成员API：

```text
src/app/api/workspaces/[workspaceId]/members/route.ts
```

当成员仍有未完成客户或任务时，`remove`、`disable`和主动`leave`不得直接完成。

管理员提供`reassignToUserId`后，在同一事务中：

1. 重新分配未完成客户。
2. 重新分配未完成任务。
3. 写`WorkspaceCustomerAssignmentHistory`。
4. 写`WorkspaceAuditLog`。
5. 最后更新成员状态。

---

## 7. 数据领域映射

| 领域 | 主要能力 | 典型位置 |
|---|---|---|
| `identity` | 邮箱身份、Session、账号安全 | `src/lib/auth*`、`src/app/api/auth`、`prisma` |
| `card` | 个人经营名片、公开页和组件 | `src/app/[username]`、`src/components` |
| `catalog` | 个人及企业产品 | Dashboard API、Workspace产品API、Product、WorkspaceResource |
| `crm-personal` | 个人名片线索和跟进 | Lead、LeadFollowUp、Workbench leads API |
| `crm-workspace` | 企业客户池、跟进、任务和分配历史 | workspace-crm.prisma、Workspace customers API |
| `analytics` | 访问、点击、短链和来源 | `src/lib`、ShortLink、Visit、Click |
| `billing` | 套餐、订单、退款和权益 | `src/lib/billing`、Order、MembershipSubscription |
| `ai-platform` | 六大AI、知识库、额度和账本 | `src/app`、`src/lib/ai`、AI模型 |
| `workspace` | 企业成员、邀请、资源归属和审计 | `src/lib/workspace`、Workspace系列模型 |
| `governance` | Jeepwork、举报、安全和平台审计 | `src/app/jeepwork`、AdminAuditLog |

`crm`仍表示轻量经营线索，不表示扩张为完整CRM、ERP或OA。

---

## 8. 测试与CI地图

| 测试 | 负责内容 |
|---|---|
| `auth-credential-policy.test.ts` | 邮箱身份策略 |
| `console-route-policy.test.ts` | 五分类和旧路由归类 |
| `invitation-policy.test.ts` | 邀请有效期、Token和角色边界 |
| `resource-policy.test.ts` | 企业产品/知识读写和分配边界 |
| `customer-policy.test.ts` | 企业客户PII、跟进、任务和重分配边界 |
| `auth-integration-test.mjs` | 认证真实API回归 |
| `workspace-invitation-integration-test.mjs` | 邀请并发、邮箱和Workspace隔离 |
| `workspace-resource-integration-test.mjs` | 企业产品/知识归属和跨空间隔离 |
| `workspace-customer-integration-test.mjs` | 企业客户、任务、离职重分配和审计 |
| `console-integration-test.mjs` | Console正式和兼容路由 |
| `console-mobile-browser-test.cjs` | 360/390/430px真实Chromium回归 |

CI使用临时PostgreSQL 16、测试账号、`MAIL_ENABLED=false`和临时Playwright，不连接生产数据库或真实第三方服务。

---

## 9. D后续未完成域

- 企业主页和企业成员名片归属。
- 企业AI共享账户、成员额度与企业AI账本。
- 企业管理员页和成员页完整UI。
- 企业品牌、域名、报表、订单和发票。

不得把个人Profile、Lead或AI账本直接批量迁移、覆盖或清空。

---

## 10. 更新规则

出现以下变化时必须同步本文件：

- 新增或调整正式路由。
- 新增Workspace资源或客户类型。
- 数据Owner或权限来源变化。
- 新增migration、集成测试或CI入口。
- 个人与企业资产读取边界变化。
