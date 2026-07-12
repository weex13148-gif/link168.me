# Link168 V2 后续整改开发报告

**版本：** v2.3  
**更新日期：** 2026-07-12  
**状态：** A、B、C、D1、D2已完成开发和自动化验收  
**依据：** `PRODUCT_CONSTITUTION.md` v1.6、`PRD.md` v2.0-rc8、`PROJECT_RULES.md` v1.0-rc3

---

## 1. 报告用途与边界

本文件是Link168唯一持续整改报告，记录正式决策、代码差距、开发结果和验收证据。

```text
老板最新决定
→ 产品宪法
→ PRD
→ 工程规则
→ 本报告
→ 代码、自动化证据与部署结果
```

当前边界：

- V2只使用邮箱注册和登录。
- 企业成员使用Link168站内邮箱邀请。
- 微信登录、企业微信、飞书、钉钉不属于V2。
- 个人Profile、Link、Lead和AI账本不得自动迁入企业空间。
- 企业管理员不得查看成员密码、私人会话、个人空间或AI对话正文。
- 企业成员二级域名规则尚未批准，D2不创建最终公网地址。
- 未连接生产数据库、服务器、真实邮件、AI或支付宝。

---

## 2. A：邮箱身份闭环

**状态：完成。**

完成30天邮箱验证限制、User ID隔离、验证和重置令牌单次消费、密码重置撤销旧Session、Session故障不伪造登录成功，以及注册故障恢复。

已通过临时PostgreSQL、真实Next.js API、Lint、TypeScript和生产构建。未执行真实阿里云邮件和生产部署。

---

## 3. B：Console五分类收口

**状态：完成。**

正式一级入口：

```text
首页  /console
名片  /console/card
客户  /console/customers
AI    /console/ai
我的  /console/account
```

完成三套用户壳层统一、正式二级路由、旧Dashboard和Workbench兼容跳转、Jeepwork隐藏、加载与错误状态，以及360/390/430px真实Chromium移动端验收。

权威证据：

```text
PR #33
Workflow Run 29188363168
Conclusion: success
Artifact 8258742618
```

---

## 4. C1：企业邮箱邀请与成员权限

**状态：完成。**

模型和migration：

```text
WorkspaceInvitation
20260712_workspace_email_invitations
```

完成7天有效邀请、Token哈希、邀请邮箱校验、原子单次接受、角色层级、跨Workspace隔离和邮件失败不伪造成功。旧企业成员API已统一适配正式Workspace处理器。

---

## 5. C2：企业产品和知识资源隔离

**状态：完成。**

模型和migration：

```text
WorkspaceResource
WorkspaceAuditLog
20260712_workspace_resource_ownership
```

当前企业资源类型：

```text
product
knowledge_doc
```

企业资源Owner为Workspace；owner/admin可管理，普通成员按授权只读。企业资产从个人Dashboard、旧Workbench、个人公开主页和个人套餐计数中排除。

权威证据：

```text
PR #38
Workflow Run 29192341961
Conclusion: success
integration-evidence 8259909885
console-mobile-evidence 8259910070
```

---

## 6. D1：企业客户池、任务与离职重分配

**状态：完成。**

个人客户与企业客户完全分离：

```text
个人客户：Lead / LeadFollowUp
企业客户：WorkspaceCustomer / WorkspaceCustomerFollowUp
```

新增：

```text
WorkspaceCustomer
WorkspaceCustomerFollowUp
WorkspaceCustomerTask
WorkspaceCustomerAssignmentHistory
20260712_workspace_customer_pool
```

正式API：

```text
/api/workspaces/[workspaceId]/customers
/api/workspaces/[workspaceId]/customers/[customerId]
/api/workspaces/[workspaceId]/customers/[customerId]/tasks
```

权限和离职规则：

- owner/admin管理全部企业客户。
- member只处理分配给自己的客户和任务。
- viewer不能查看客户PII。
- 客户和任务只能分配给同一Workspace活跃非viewer成员。
- 跨Workspace访问返回404。
- 有未完成客户或任务时，移除、禁用或主动退出返回409。
- 指定接替成员后，客户、任务、历史、审计和成员状态在同一事务完成。

权威证据：

```text
PR #40
Workflow Run 29194160887
Conclusion: success
```

---

## 7. D2：企业主页、成员名片与组件归属

**状态：数据归属、服务端权限、发布状态、组件API和真实临时PostgreSQL验收完成。**

### 7.1 独立归属

```text
个人经营名片：Profile / Link
企业主页和成员名片：WorkspaceCard / WorkspaceCardComponent
```

D2不修改个人Profile、Link、用户名或`/[username]`地址。企业成员名片归Workspace所有，成员只是绑定和维护者；成员移除后名片继续归企业。

### 7.2 模型和migration

```text
prisma/workspace-card.prisma
WorkspaceCard
WorkspaceCardComponent
20260712_workspace_cards
```

约束：

- 每个Workspace最多一张企业主页。
- 每个Workspace成员最多一张企业成员名片。
- 企业主页不得绑定成员；成员名片必须绑定成员。
- 状态：`draft / published / archived`。
- 联系可见性：`public / members_only / private`。
- 模板：`business / creator / conversion`。
- 成员名片外键使用`ON DELETE RESTRICT`，避免硬删除用户破坏企业资产归属。

### 7.3 内部API

```text
/api/workspaces/[workspaceId]/cards
/api/workspaces/[workspaceId]/cards/[cardId]
/api/workspaces/[workspaceId]/cards/[cardId]/components
```

这些是企业后台和内部预览接口，不代表最终公网域名规则已经批准。

### 7.4 权限

- owner/admin管理企业主页和全部成员名片。
- owner/admin可以发布、下线和归档。
- member只能创建、读取和编辑自己的成员名片。
- member不能创建企业主页、创建他人名片或自行发布。
- member可读取企业主页。
- viewer只能读取企业主页。
- 名片组件继承对应名片的Workspace和角色权限。
- 跨Workspace访问返回404。

### 7.5 资产与审计

- 企业组件不写入个人Link表。
- 成员移除后立即失去访问权，但成员名片和组件继续保留。
- 创建、更新、发布、下线、归档和组件变化写入WorkspaceAuditLog。

### 7.6 并发文档治理

D2期间正式分支新增微信联系组件文档。内容全部保留：

```text
docs/history/PRD_WECHAT_CONTACT_COMPONENT.md
docs/PRD_AI名片_AI客服_微信联系组件.md
```

根目录并行PRD已移入历史目录，主PRD仍只有根目录`PRD.md`。D2通过双父提交接入并发文档，没有覆盖其他Agent变更。

### 7.7 真实集成断言

```text
PASS 每个Workspace最多一张企业主页
PASS 成员只能创建自己的成员名片，管理员可创建任意成员名片
PASS 成员看到企业主页和自己的名片，viewer只看到企业主页
PASS 成员可编辑自己的名片，只有管理员可发布
PASS 企业名片组件遵循同一Workspace和名片所有权
PASS 企业名片不能通过其他workspaceId访问
PASS 成员移除后失去访问权但企业名片继续保留
PASS 企业名片和组件不修改个人Profile或Link
PASS 名片创建、发布和组件变化写入企业审计日志
```

### 7.8 权威证据

```text
PR #41
Workflow Run 29195374596
Conclusion: success
integration-evidence 8260814111
console-mobile-evidence 8260814233
保留至 2026-07-19
```

该运行通过全部migration、治理、邮箱、Console、邀请、企业资源、客户、名片策略、Lint、TypeScript、生产构建、真实API和移动端浏览器回归。

---

## 8. 当前自动化命令

```bash
npm run governance:check
npm run test:auth
npm run test:console-nav
npm run test:workspace-invite
npm run test:workspace-resource
npm run test:workspace-customer
npm run test:workspace-card
npm run lint
npm run typecheck
npm run build
```

治理失败时，详细错误保存到：

```text
artifacts/integration/governance.log
```

---

## 9. D仍未完成

- D3：企业AI共享账户、成员额度、批次和企业AI账本。
- D4：企业管理员页和成员页完整UI。
- 企业主页和成员名片最终公网域名、二级域名和自购域名渲染。
- 企业品牌、域名验证、报表、订单和发票。

---

## 10. 明确未执行

- 未连接或修改生产数据库。
- 未执行生产migration。
- 未调用真实邮件、AI、支付宝或企业协作平台。
- 未修改服务器、Nginx、PM2或`.env`。
- 未部署到生产域名。
- 未创建未批准的企业公开域名规则。
- 未删除个人Profile、Link、Lead、AI账本、旧业务结构或历史migration。

---

## 11. 下一主线

> **D3：企业AI共享账户、成员额度分配和企业AI账本。**

D3必须与个人`AiCreditAccount`、个人购买批次和个人用量账本完全分离；企业额度按来源和批次扣减，失败必须回补原来源和原批次。