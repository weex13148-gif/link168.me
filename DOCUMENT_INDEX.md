# Link168 正式文档索引

**文件名：** `DOCUMENT_INDEX.md`  
**版本：** v1.0-rc16  
**更新日期：** 2026-07-12  
**状态：** 持续生效

---

## 1. 正式文档清单

| 优先级 | 文件 | 当前版本 | 负责内容 |
|---:|---|---|---|
| 1 | `PRODUCT_CONSTITUTION.md` | v1.6 | 定位、身份、套餐、AI、企业、数据和Agent治理 |
| 2 | `PRD.md` | v2.0-rc8 | 页面、路由、邮箱身份、企业成员、价格、权限和验收 |
| 3 | `PROJECT_RULES.md` | v1.0-rc3 | Git、Agent、密钥、数据库、测试、部署和删除边界 |
| 4 | `DOCUMENT_INDEX.md` | v1.0-rc16 | 文档版本、状态、优先级和治理入口 |

持续整改状态：

```text
docs/audits/REMEDIATION_DEVELOPMENT_REPORT.md（v2.2）
```

历史仓库检查证据：

```text
docs/audits/REPOSITORY_INSPECTION_REPORT_20260710.md
```

---

## 2. 工程治理附件

| 顺序 | 文件 | 版本 | 负责内容 |
|---:|---|---|---|
| 2 | `docs/governance/02_CODE_MAP.md` | v1.5 | 路由、邀请、企业资源、客户池、测试和数据边界 |
| 3 | `docs/governance/03_MODULE_BOUNDARY.md` | v1.1 | 核心领域、平台支撑能力和跨模块审批 |
| 4 | `docs/governance/04_VERSION_FREEZE.md` | v1.2 | V2邮箱身份、企业手工成员和冻结边界 |
| 5 | `docs/governance/05_AGENT_GOVERNANCE.md` | v1.1 | 八个Agent、审批矩阵、CODEOWNERS和文件锁 |
| 6 | `docs/governance/06_NAMING_STANDARD.md` | v1.1 | 品牌、路由、套餐、身份、AI和代码命名 |
| 7 | `docs/governance/07_ARCHITECTURE_DECISIONS.md` | v1.1 | 模块化单体、身份、账本、安全、兼容和migration ADR |
| 8 | `docs/governance/08_DEVELOPMENT_RULES.md` | v1.3 | 日常开发、PR、CI、测试、Git和发布流程 |
| 9 | `docs/governance/09_SECURITY_DATA_OPERATIONS.md` | v1.0 | 安全、数据保留、事件响应、API、migration和监控 |

冲突裁决：

```text
老板最新明确决定
→ PRODUCT_CONSTITUTION.md
→ PRD.md
→ PROJECT_RULES.md
→ DOCUMENT_INDEX.md
→ docs/governance/*
→ 持续整改报告、Agent任务单与代码实现
```

---

## 3. GitHub与自动化执行文件

| 文件 | 用途 |
|---|---|
| `.github/CODEOWNERS` | 正式文档、Prisma、API、核心服务和治理配置审批 |
| `.github/pull_request_template.md` | 强制说明范围、风险、数据库、API、安全、验证和回滚 |
| `.github/workflows/governance.yml` | 治理、认证、Console、Workspace、migration、构建和浏览器验收 |
| `scripts/governance/check-governance.mjs` | 文档和版本一致性检查 |
| `scripts/auth-integration-test.mjs` | 邮箱认证、并发令牌和Session真实API验收 |
| `scripts/console-integration-test.mjs` | Console正式与兼容路由验收 |
| `scripts/console-mobile-browser-test.cjs` | 360、390、430px真实Chromium验收 |
| `scripts/workspace-invitation-integration-test.mjs` | 企业邀请、并发接受、邮箱和Workspace隔离 |
| `scripts/workspace-resource-integration-test.mjs` | 企业产品/知识归属、分配、移除和跨空间隔离 |
| `scripts/workspace-customer-integration-test.mjs` | 企业客户、任务、离职重分配和审计验收 |
| `src/lib/workspace/invitation-policy.test.ts` | 邀请Token、有效期和角色边界 |
| `src/lib/workspace/resource-policy.test.ts` | 企业产品/知识读写和成员分配边界 |
| `src/lib/workspace/customer-policy.test.ts` | 企业客户PII、跟进、任务和重分配边界 |

统一命令：

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

Playwright只在CI临时安装，不进入项目正式依赖或锁文件。

---

## 4. 当前代码基线

- 仓库：`weex13148-gif/link168.me`
- V2主线：`codex/link168-v2-direction`
- D1开发分支：`codex/d-workspace-crm-20260712`
- 本地正式工作区：`D:\77.me\branches\link168-v2-direction`
- 旧`master`、归档分支和旧工作区不作为V2正式事实

---

## 5. 已完成主线

### 5.1 A：邮箱身份闭环

- V2只使用邮箱注册和登录。
- 支持30天验证限制、重置密码、Session撤销和故障恢复。
- 已通过临时PostgreSQL、真实Next.js API、Lint、TypeScript和生产构建验收。
- 未验证真实阿里云邮件和生产环境。

### 5.2 B：Console五分类

一级分类固定为：

```text
首页 / 名片 / 客户 / AI / 我的
```

已完成统一导航、正式一级和二级路由、旧路径兼容、Jeepwork隐藏、状态页和360/390/430px真实Chromium验收。

权威证据：

```text
PR #33
Workflow Run 29188363168
Conclusion: success
Artifact 8258742618
```

### 5.3 C：企业邮箱邀请与成员权限

- `WorkspaceInvitation`模型和正式migration。
- 7天有效、Token哈希、单次接受和邀请邮箱校验。
- 邀请未接受前无企业访问权。
- 邮件失败不伪造成功。
- owner/admin角色授予和管理边界。
- 旧企业成员API统一适配正式Workspace处理器。

### 5.4 C：企业产品和知识资源隔离

- `WorkspaceResource`和`WorkspaceAuditLog`。
- 企业产品和知识文档归Workspace所有。
- owner/admin可管理，member/viewer按授权只读。
- 企业资源不显示在个人Dashboard、旧Workbench、个人公开主页或个人套餐计数中。
- 跨Workspace访问被拒绝。

权威证据：

```text
PR #38
Workflow Run 29192341961
Conclusion: success
integration-evidence 8259909885
console-mobile-evidence 8259910070
```

### 5.5 D1：企业客户池、任务和离职重分配

新增模型：

```text
WorkspaceCustomer
WorkspaceCustomerFollowUp
WorkspaceCustomerTask
WorkspaceCustomerAssignmentHistory
```

正式migration：

```text
20260712_workspace_customer_pool
```

规则：

- 个人Lead与企业客户池完全分离，个人历史数据不自动迁移。
- 企业客户Owner是Workspace。
- owner/admin可管理全部企业客户。
- member只能查看、跟进和处理分配给自己的客户与任务。
- viewer不能查看客户PII。
- 客户和任务只能分配给同一Workspace活跃非viewer成员。
- 跨Workspace访问被拒绝。
- 成员有未完成客户或任务时，移除、禁用或主动退出被阻止。
- 管理员指定接替成员后，客户、未完成任务、分配历史、审计和成员状态在同一事务完成。

正式API：

```text
/api/workspaces/[workspaceId]/customers
/api/workspaces/[workspaceId]/customers/[customerId]
/api/workspaces/[workspaceId]/customers/[customerId]/tasks
```

权威验证：

```text
PR #40
Workflow Run 29193931340
Conclusion: success
integration-evidence 8260404032
console-mobile-evidence 8260404140
```

该证据来自CI临时数据库和浏览器，不表示生产服务器已经部署。

---

## 6. D当前状态

已完成：

- D1企业客户池。
- 企业客户跟进。
- 企业客户任务。
- 客户和任务负责人权限。
- 离职/禁用前强制重新分配。
- 企业客户分配历史与审计。

仍未完成：

- D2企业主页和企业成员名片归属。
- D3企业AI共享账户、成员额度和企业AI账本。
- D4企业管理员页和成员页完整UI。
- 企业品牌、域名、报表、订单和发票。

不得把个人Profile、Lead或AI账本自动迁移、覆盖或清空。

---

## 7. 正式套餐与AI边界

1. 免费版
2. Plus
3. Pro
4. 企业版
5. 企业Pro

免费用户不能购买AI加量包，也不能调用六大AI Agent。套餐额度、购买点数和企业共享额度必须分账。

---

## 8. V2明确延后的事项

- 普通微信注册、登录或绑定
- 企业微信、飞书和钉钉
- 外部组织和成员同步
- 多平台成员去重
- 账号合并
- 最后登录身份解绑
- 企业管理员查看成员AI对话正文

当前仍待老板决定但不阻塞V2：

- 企业成员二级域名规则

---

## 9. 生产边界

本轮没有执行：

- 生产数据库migration
- 真实阿里云邮件
- 真实AI、支付宝或企业协作平台调用
- 生产服务器、Nginx、PM2和`.env`修改
- 生产域名部署

---

## 10. 更新机制

1. 长期产品边界更新产品宪法。
2. 页面、流程、角色、价格和验收更新PRD。
3. 工程、安全和部署边界更新PROJECT_RULES或治理附件。
4. 每次正式变化同步本索引和代码地图。
5. 开发状态统一更新唯一整改报告。
6. 不创建并行宪法、并行PRD或重复整改报告。
7. 修改治理文件后执行完整CI复验。
