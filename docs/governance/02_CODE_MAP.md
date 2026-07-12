# Link168 V2 代码地图

**文件名：** `docs/governance/02_CODE_MAP.md`  
**版本：** v1.4  
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
├─ .github/
│  ├─ CODEOWNERS
│  ├─ pull_request_template.md
│  └─ workflows/governance.yml
├─ prisma/
│  ├─ schema.prisma
│  ├─ workspace-invitation.prisma
│  ├─ workspace-resource.prisma
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
│  ├─ lib/
│  │  ├─ workspace/
│  │  ├─ billing/
│  │  └─ ai/
│  └─ features/
└─ scripts/
   ├─ auth-integration-test.mjs
   ├─ console-integration-test.mjs
   ├─ console-mobile-browser-test.cjs
   ├─ workspace-invitation-integration-test.mjs
   └─ workspace-resource-integration-test.mjs
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

正式二级路由包括：

```text
/console/card/products
/console/card/short-links
/console/card/analytics
/console/ai/[assistant]
/console/ai/service
/console/ai/reception
/console/ai/knowledge
/console/account/membership
/console/account/enterprise
/console/account/notifications
```

普通用户导航不得显示`/jeepwork`。

---

## 4. Workspace成员与邀请地图

### 4.1 模型

```text
Workspace
WorkspaceMember
WorkspaceInvitation
```

`WorkspaceInvitation`位于：

```text
prisma/workspace-invitation.prisma
```

邀请与成员资格分离：邀请接受前不创建活跃`WorkspaceMember`。

### 4.2 服务和策略

```text
src/lib/workspace/index.ts
src/lib/workspace/invitation-policy.ts
src/lib/workspace/invitations.ts
```

### 4.3 API和页面

```text
/api/workspaces/[workspaceId]/members
/api/workspaces/[workspaceId]/invitations
/api/workspace-invitations
/api/workspace-invitations/[token]
/workspace-invitations/[token]
```

旧`/api/enterprise/organizations/[orgId]/*`只作为适配层，正式权限和邀请规则统一由Workspace处理器执行。

---

## 5. 企业资源归属地图

### 5.1 模型

```text
WorkspaceResource
WorkspaceAuditLog
```

位于：

```text
prisma/workspace-resource.prisma
```

当前正式支持：

```text
product
knowledge_doc
```

### 5.2 归属原则

- 原有`Product`和`KnowledgeDoc`个人表结构保持不变。
- 是否属于企业由`WorkspaceResource`唯一判定。
- 历史个人数据不会自动转移到Workspace。
- 企业资源底层可保留创建人，但真正Owner是Workspace。
- 企业资源不能通过个人Dashboard、旧Workbench或个人公开名片访问。
- 企业资源不占用创建人的个人产品或知识文档套餐数量。

### 5.3 服务与策略

```text
src/lib/workspace/resource-policy.ts
src/lib/workspace/resources.ts
```

### 5.4 正式资源API

```text
/api/workspaces/[workspaceId]/products
/api/workspaces/[workspaceId]/products/[productId]
/api/workspaces/[workspaceId]/knowledge
/api/workspaces/[workspaceId]/knowledge/[docId]
```

规则：

- owner/admin可创建、修改、分配和删除。
- member/viewer只读。
- 未分配资源为Workspace共享。
- 分配资源仅对owner、admin和目标成员可见。
- 资源只能分配给当前Workspace活跃成员。
- 禁用或移除成员立即失去访问权。
- 跨Workspace读取和操作被拒绝。
- 创建、更新、分配和删除写`WorkspaceAuditLog`。

---

## 6. 个人与企业读取边界

以下个人路径必须排除`WorkspaceResource`已登记资产：

```text
/api/dashboard/products/**
/api/dashboard/knowledge/**
/api/workbench/knowledge/**
/api/[username]/products
/[username]
/workbench/products
/workbench/knowledge
个人套餐产品和知识文档计数
```

后续新增任何个人产品或知识读取路径时，必须复用`getWorkspaceOwnedResourceIds`或`isWorkspaceOwnedResource`，不得只按创建人`userId`判断所有权。

---

## 7. 数据领域映射

| 领域 | 主要能力 | 典型位置 |
|---|---|---|
| `identity` | 邮箱身份、Session、账号安全 | `src/lib/auth*`、`src/app/api/auth`、`prisma` |
| `card` | 个人经营名片、公开页和组件 | `src/app/[username]`、`src/components` |
| `catalog` | 个人及企业产品 | Dashboard API、Workspace产品API、Product、WorkspaceResource |
| `crm` | 轻量客户线索和跟进 | `src/app/api/workbench/leads`、Lead |
| `analytics` | 访问、点击、短链和来源 | `src/lib`、ShortLink、Visit、Click |
| `billing` | 套餐、订单、退款和权益 | `src/lib/billing`、Order、MembershipSubscription |
| `ai-platform` | 六大AI、知识库、额度和账本 | `src/app`、`src/lib/ai`、AI模型 |
| `workspace` | 企业成员、邀请、资源归属和审计 | `src/lib/workspace`、Workspace系列模型 |
| `governance` | Jeepwork、举报、安全和平台审计 | `src/app/jeepwork`、AdminAuditLog |

`crm`表示轻量经营线索，不表示扩张为完整CRM、ERP或OA。

---

## 8. 测试与CI地图

| 测试 | 负责内容 |
|---|---|
| `auth-credential-policy.test.ts` | 邮箱身份策略 |
| `console-route-policy.test.ts` | 五分类和旧路由归类 |
| `invitation-policy.test.ts` | 邀请有效期、Token和角色边界 |
| `resource-policy.test.ts` | 企业资源读写和分配边界 |
| `auth-integration-test.mjs` | 认证真实API回归 |
| `workspace-invitation-integration-test.mjs` | 邀请并发、邮箱和Workspace隔离 |
| `workspace-resource-integration-test.mjs` | 企业产品/知识归属、分配、移除和跨空间隔离 |
| `console-integration-test.mjs` | Console正式和兼容路由 |
| `console-mobile-browser-test.cjs` | 360/390/430px真实Chromium回归 |

CI使用临时PostgreSQL 16、测试账号、`MAIL_ENABLED=false`和临时Playwright，不连接生产数据库或真实第三方服务。

---

## 9. 当前尚未完成的企业归属域

以下能力仍需独立设计和migration：

- 企业主页和企业成员名片。
- 企业客户池、任务和重新分配。
- 企业AI共享账户与成员额度。
- 企业品牌、域名、报表、订单和发票。

不得把现有个人Profile、Lead或AI账本直接批量迁移、覆盖或清空。

---

## 10. 更新规则

出现以下变化时必须同步本文件：

- 新增或调整正式路由。
- 新增Workspace资源类型。
- 数据Owner或权限来源变化。
- 新增migration、集成测试或CI入口。
- 个人与企业资产读取边界变化。
