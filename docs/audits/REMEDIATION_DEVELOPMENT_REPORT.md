# Link168 V2 后续整改开发报告

**版本：** v2.1  
**更新日期：** 2026-07-12  
**状态：** A邮箱身份、B Console、C企业邀请及产品/知识资源隔离已完成开发和自动化验收  
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

### 5.1 数据模型

新增多文件Prisma模型：

```text
prisma/workspace-invitation.prisma
WorkspaceInvitation
```

正式migration：

```text
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
- 旧`/api/enterprise/organizations/*`成员接口统一适配正式Workspace处理器，不能绕过邀请流程直接激活成员。

### 5.3 页面与API

新增：

```text
/api/workspaces/[workspaceId]/invitations
/api/workspace-invitations
/api/workspace-invitations/[token]
/workspace-invitations/[token]
```

企业成员页面已区分：

- 正式成员
- 待处理邀请
- 发送失败邀请
- 撤销邀请

### 5.4 第一批验收断言

真实临时PostgreSQL验证：

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

### 6.1 审计结论

只完成成员表隔离并不足以形成企业数据隔离。原有`Product`和`KnowledgeDoc`主要按创建人`userId`归属，成员离职后可能通过个人接口继续读取。

采用兼容式企业资源归属层：

- 原有个人业务表和历史数据保持不变。
- 企业归属由独立映射表判定。
- 现有个人数据默认不自动转移到企业。
- 企业资源保留创建人记录，但真正Owner是Workspace。

### 6.2 新增模型与migration

```text
prisma/workspace-resource.prisma
WorkspaceResource
WorkspaceAuditLog
```

正式migration：

```text
20260712_workspace_resource_ownership
```

当前正式支持的企业资源类型：

```text
product
knowledge_doc
```

`WorkspaceResource`记录：

- `workspaceId`
- 资源类型和资源ID
- 创建人
- 可选分配成员
- active / archived状态

`WorkspaceAuditLog`独立记录企业资源创建、更新、分配和删除，不与平台超级管理员日志混用。

### 6.3 权限规则

- owner和admin可以创建、修改、分配和删除企业产品及知识文档。
- member和viewer只能读取。
- 未指定分配人表示企业共享资源。
- 指定分配人后，普通成员只能读取分配给自己的资源。
- 资源只能分配给当前Workspace的活跃成员。
- 成员被禁用或移除后立即失去企业资源访问权。
- 所有单资源操作同时校验`workspaceId`、资源类型和资源ID。
- 通过其他Workspace ID访问同一资源返回不存在或拒绝。

### 6.4 正式API

```text
/api/workspaces/[workspaceId]/products
/api/workspaces/[workspaceId]/products/[productId]
/api/workspaces/[workspaceId]/knowledge
/api/workspaces/[workspaceId]/knowledge/[docId]
```

### 6.5 个人与企业边界

企业归属产品和知识文档已从以下个人入口排除：

- 个人Dashboard产品和知识API。
- 旧Workbench知识API和服务端页面。
- 旧Workbench个人产品页面。
- 个人公开名片产品API和公开页面。
- 个人套餐产品、知识文档使用量计算。

因此企业资产不会因为底层保留创建人`userId`而被当作个人资产展示、修改或占用个人套餐数量。

### 6.6 第二批真实集成断言

```text
PASS 企业产品和知识文档与归属映射在事务中创建
PASS 企业资源不出现在个人API和个人公开主页
PASS 活跃成员可读共享资源但不能管理
PASS 成员只看共享或分配给自己的资源
PASS 跨Workspace资源访问被拒绝
PASS 移除成员立即失去资源访问权
PASS 删除资源同时删除映射并写入企业审计日志
```

### 6.7 C阶段权威验收证据

最终草稿验证PR：

```text
#38 ci: verify C workspace resource isolation
```

最终成功运行：

```text
Workflow Run 29192341961
Conclusion: success
```

以下步骤全部成功：

```text
PostgreSQL 16临时数据库
→ npm ci
→ Prisma多文件Schema生成
→ 全部正式migration部署
→ governance:check
→ 邮箱身份策略测试
→ Console导航策略测试
→ Workspace邀请策略测试
→ Workspace资源策略测试
→ Lint
→ TypeScript
→ Next.js生产构建
→ 邮箱认证真实API回归
→ Workspace邀请并发与隔离回归
→ Workspace产品/知识资源真实隔离回归
→ Console登录态路由回归
→ 360/390/430px Chromium回归
```

证据产物：

```text
integration-evidence：Artifact ID 8259909885
console-mobile-evidence：Artifact ID 8259910070
保留至：2026-07-19
```

### 6.8 C阶段尚未完成的企业域

以下能力仍需后续独立主线，不得宣称已经完成：

- 企业主页和企业成员名片归属。
- 企业客户池、任务和离职重新分配。
- 企业AI共享额度、成员额度分配和企业AI账本。
- 企业品牌、域名、报表、订单、发票和更完整的企业操作日志页面。
- 企业管理员页和成员页的完整企业产品/知识管理UI。

当前完成的是**邮箱邀请、成员权限、企业产品库和企业知识库的数据归属与服务端隔离底座**。

---

## 7. 当前自动化命令

```bash
npm run governance:check
npm run test:auth
npm run test:console-nav
npm run test:workspace-invite
npm run test:workspace-resource
npm run lint
npm run typecheck
npm run build
```

GitHub Actions额外执行认证、Workspace邀请、Workspace资源、Console和真实移动端浏览器集成测试。

---

## 8. 明确未执行

- 未连接生产数据库。
- 未执行生产migration。
- 未调用真实阿里云邮件。
- 未使用真实AI、支付宝或企业协作平台。
- 未修改生产服务器、Nginx、PM2或`.env`。
- 未部署生产域名。
- 未删除旧业务结构、未来模型或历史migration。

---

## 9. 下一主线

C数据隔离底座完成后，下一项应从以下企业域继续：

> **D：企业客户池、企业名片归属、任务重新分配与企业AI共享额度。**

D开始前必须分别确定客户、Profile和AI账本的兼容归属模型，禁止把个人历史数据自动迁移或清空。
