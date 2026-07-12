# Link168 V2 后续整改开发报告

**版本：** v2.2  
**更新日期：** 2026-07-12  
**状态：** A邮箱身份、B Console、C企业邀请与产品/知识隔离、D1企业客户池已完成开发和自动化验收  
**依据：** `PRODUCT_CONSTITUTION.md` v1.6、`PRD.md` v2.0-rc8、`PROJECT_RULES.md` v1.0-rc3

---

## 1. 报告用途

本文件是Link168唯一持续整改报告，统一记录正式决策、代码差距、开发进度和验收证据。

```text
老板最新决定
→ 产品宪法
→ PRD
→ 工程规则
→ 本报告
→ 代码、自动化证据与部署结果
```

代码存在、临时数据库验收、浏览器验收、真实第三方服务验证和生产验证必须分开表述。

---

## 2. 当前V2边界

- V2只开放邮箱注册和登录。
- 企业成员采用Link168站内邮箱邀请。
- 普通微信、企业微信、飞书和钉钉接入不属于V2。
- 邀请未接受前不得获得企业数据访问权。
- 企业成员冻结或移除后保留个人账号，但立即失去企业访问权。
- 企业管理员不能查看成员密码、个人空间、私人会话或AI对话正文。
- 个人历史数据不得自动迁入企业空间。
- 未来代码和数据结构采用保留、隐藏或关闭，不擅自删除。

---

## 3. A主线：邮箱身份闭环

**状态：开发和自动化验收完成。**

已完成：

- 30天未验证规则、受限后台和公开主页限制。
- 邮箱验证码按User ID隔离。
- 验证和重置令牌原子单次消费。
- 重置密码撤销旧Session。
- Session创建失败不记录虚假登录成功。
- 注册Session失败后的账号可恢复登录。
- 临时PostgreSQL、真实Next.js API、Lint、TypeScript和生产构建通过。

尚未执行：阿里云邮件真实投递、生产数据库migration、生产部署和生产域名冒烟。

---

## 4. B主线：Console五分类兼容收口

**状态：开发、登录态路由和真实移动端浏览器验收完成。**

正式一级入口固定为：

```text
首页  /console
名片  /console/card
客户  /console/customers
AI    /console/ai
我的  /console/account
```

已完成：

- ConsoleShell、WorkbenchShell和DashboardFrame统一五项导航。
- 手机底栏固定为：首页、名片、客户、AI、我的。
- 普通用户导航不显示Jeepwork。
- 正式二级路由覆盖产品、短链、分析、AI服务、知识库、会员、企业和通知。
- `/dashboard`和`/workbench/*`保留兼容并临时307跳转至正式Console路径。
- 新增统一加载态、可恢复错误态和移动端横向溢出保护。
- Chromium验证360px、390px、430px五个主页面无文档级横向溢出。

权威最终证据：

```text
PR #33
Workflow Run 29188363168
Conclusion: success
Artifact: console-mobile-evidence（ID 8258742618）
```

B主线未部署生产，也未连接生产数据库和真实密钥。

---

## 5. C主线第一批：企业邮箱邀请与成员权限

**状态：开发和真实临时数据库集成验收完成。**

### 5.1 模型与migration

```text
prisma/workspace-invitation.prisma
WorkspaceInvitation
20260712_workspace_email_invitations
```

邀请记录与`WorkspaceMember`最终成员资格分离。邀请接受前不创建活跃成员。

### 5.2 正式邀请流程

```text
企业所有者或管理员输入邮箱
→ 创建7天有效邀请
→ Token只保存SHA-256哈希
→ 发送邀请邮件
→ 受邀者注册或登录对应邮箱
→ 校验Token、邮箱、有效期和Workspace
→ 事务内单次接受
→ 创建或恢复WorkspaceMember(active)
```

规则：

- 支持已注册和未注册邮箱。
- 同一Token并发接受只能成功一次。
- 邀请错误邮箱不能接受。
- 邮件未配置或发送失败不得返回虚假成功。
- owner不能通过邀请授予。
- admin只能邀请和管理member或viewer，不能管理其他admin。
- 邀请操作同时校验目标`workspaceId`。
- 被移除成员再次加入必须重新接受邀请。
- 旧`/api/enterprise/organizations/*`成员接口统一适配正式Workspace处理器。

### 5.3 第一批验收断言

- 邮件失败明确返回，且不创建活跃成员。
- 待接受邀请没有企业访问权。
- 只有邀请邮箱可以接受。
- 并发接受只有一次成功。
- 接受后仅生成一条活跃成员记录。
- admin不能邀请或授予其他admin。
- 跨Workspace撤销邀请被拒绝。

---

## 6. C主线第二批：企业产品与知识资源隔离

**状态：开发和真实临时数据库集成验收完成。**

### 6.1 模型与migration

```text
prisma/workspace-resource.prisma
WorkspaceResource
WorkspaceAuditLog
20260712_workspace_resource_ownership
```

当前正式支持：

```text
product
knowledge_doc
```

### 6.2 归属和权限规则

- 原有个人业务表和历史数据保持不变。
- 企业归属由`WorkspaceResource`唯一判定。
- 企业资源保留创建人记录，但真正Owner是Workspace。
- owner和admin可以创建、修改、分配和删除。
- member和viewer只能按授权读取。
- 未指定分配人为企业共享资源。
- 指定分配人后，普通成员只能读取分配给自己的资源。
- 成员被禁用或移除后立即失去访问权。
- 所有单资源操作同时校验`workspaceId`、资源类型和资源ID。
- 创建、更新、分配和删除写入`WorkspaceAuditLog`。

### 6.3 个人与企业边界

企业产品和知识文档已从以下个人入口排除：

- 个人Dashboard。
- 旧Workbench。
- 个人公开名片。
- 个人产品和知识文档套餐计数。

### 6.4 C阶段权威验收证据

```text
PR #38
Workflow Run 29192341961
Conclusion: success
integration-evidence：8259909885
console-mobile-evidence：8259910070
```

---

## 7. D1：企业客户池、客户任务与离职重分配

**状态：开发和真实临时PostgreSQL集成验收完成。**

### 7.1 设计原则

D1没有给个人`Lead`或`LeadFollowUp`强行增加企业归属，也没有把个人历史客户自动迁入企业。

采用独立企业客户域：

```text
个人客户：Lead / LeadFollowUp
企业客户：WorkspaceCustomer / WorkspaceCustomerFollowUp
```

这样可以保证：

- 个人客户继续归个人名片所有者。
- 企业客户从创建开始即归Workspace所有。
- 企业成员离职不会带走企业客户、跟进和任务。
- 个人与企业客户接口、数据和权限不串线。

### 7.2 新增模型与migration

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

模型职责：

- `WorkspaceCustomer`：企业客户PII、来源、产品快照、状态和当前负责人。
- `WorkspaceCustomerFollowUp`：独立跟进与状态变化记录。
- `WorkspaceCustomerTask`：客户待办、优先级、负责人和完成状态。
- `WorkspaceCustomerAssignmentHistory`：每次客户负责人变化的完整历史。

### 7.3 正式API

```text
/api/workspaces/[workspaceId]/customers
/api/workspaces/[workspaceId]/customers/[customerId]
/api/workspaces/[workspaceId]/customers/[customerId]/tasks
```

### 7.4 客户权限

- owner和admin可查看、创建、编辑和重新分配全部企业客户。
- member只能查看和跟进分配给自己的客户。
- member不能读取其他成员客户。
- viewer不能查看企业客户姓名、电话、邮箱、微信和需求等PII。
- 客户和任务只能分配给当前Workspace的活跃owner、admin或member。
- 所有查询同时校验`workspaceId`、成员状态、角色和当前负责人。
- 通过其他Workspace ID访问同一客户返回不存在。

### 7.5 跟进和任务

- 客户状态固定为：`new / contacted / following / converted / closed`。
- 跟进记录独立保存，不继续向历史备注字段追加文本。
- 分配成员可以更新客户状态和写跟进记录。
- 客户任务状态固定为：`pending / in_progress / completed / cancelled`。
- 客户任务优先级固定为：`low / normal / high / urgent`。
- 分配成员可以创建和更新自己的客户任务。
- 普通成员不能把任务分给其他人。
- owner和admin可以重新分配客户及未完成任务。

### 7.6 离职、禁用和重新分配

当成员仍负责未完成客户或任务时：

```text
直接移除或禁用
→ 返回409 WORKSPACE_REASSIGN_REQUIRED
→ 不改变成员状态
```

管理员指定接替成员后：

```text
查询未完成客户和任务
→ 校验接替成员属于同一Workspace且为活跃非viewer成员
→ 事务内重新分配客户
→ 事务内重新分配未完成任务
→ 写客户分配历史
→ 写企业审计日志
→ 最后更新成员为removed或disabled
```

成员主动退出时，如仍有未完成客户或任务，也必须先由管理员完成重新分配。

### 7.7 D1真实集成断言

```text
PASS owner可创建并分配企业客户
PASS 客户PII只对管理员和当前负责人可见
PASS 只有当前负责人可更新客户状态和跟进
PASS 当前负责人可创建和更新自己的客户任务
PASS 客户重新分配可同步移动未完成任务并立即改变可见性
PASS 客户不能通过其他workspaceId访问
PASS 成员移除前必须先重新分配未完成客户和任务
PASS 分配历史和企业审计记录被完整保留
```

### 7.8 D1权威验收证据

开发草稿PR：

```text
#40 test: define D1 workspace customer access rules
```

权威成功运行：

```text
Workflow Run 29193931340
Conclusion: success
integration-evidence：Artifact ID 8260404032
console-mobile-evidence：Artifact ID 8260404140
保留至：2026-07-19
```

成功步骤包括：

```text
PostgreSQL 16临时数据库
→ Prisma多文件Schema生成
→ 全部正式migration
→ governance:check
→ 邮箱、Console、邀请、资源、客户策略测试
→ Lint
→ TypeScript
→ Next.js生产构建
→ 邮箱认证真实API回归
→ Workspace邀请回归
→ Workspace产品/知识资源回归
→ Workspace客户池、任务和重分配真实回归
→ Console登录态路由回归
→ 360/390/430px Chromium回归
```

### 7.9 D仍未完成的范围

以下能力不得宣称已经完成：

- D2：企业主页和企业成员名片归属。
- D3：企业AI共享账户、成员额度分配和企业AI账本。
- D4：完整企业管理员页和成员页UI。
- 企业品牌、域名、报表、订单和发票。

---

## 8. 当前自动化命令

```bash
npm run governance:check
npm run test:auth
npm run test:console-nav
npm run test:workspace-invite
npm run test:workspace-resource
npm run test:workspace-customer
npm run lint
npm run typecheck
npm run build
```

GitHub Actions额外执行认证、Workspace邀请、Workspace资源、Workspace客户池、Console和真实移动端浏览器集成测试。

---

## 9. 明确未执行

- 未连接生产数据库。
- 未执行生产migration。
- 未调用真实阿里云邮件。
- 未使用真实AI、支付宝或企业协作平台。
- 未修改生产服务器、Nginx、PM2或`.env`。
- 未部署生产域名。
- 未删除个人Lead、Profile、AI账本、旧业务结构或历史migration。

---

## 10. 下一主线

D1完成后，下一项为：

> **D2：企业主页和企业成员名片归属。**

D2必须使用独立企业名片归属，不得把个人唯一Profile自动改造成企业资产，也不得改变个人公开主页现有地址和数据。
