# Link168 正式文档索引

**文件名：** `DOCUMENT_INDEX.md`  
**版本：** v1.0-rc17  
**更新日期：** 2026-07-12  
**状态：** 持续生效

---

## 1. 正式文档清单

| 优先级 | 文件 | 当前版本 | 负责内容 |
|---:|---|---|---|
| 1 | `PRODUCT_CONSTITUTION.md` | v1.6 | 定位、身份、套餐、AI、企业、数据和Agent治理 |
| 2 | `PRD.md` | v2.0-rc8 | 页面、路由、邮箱身份、企业成员、价格、权限和验收 |
| 3 | `PROJECT_RULES.md` | v1.0-rc3 | Git、Agent、密钥、数据库、测试、部署和删除边界 |
| 4 | `DOCUMENT_INDEX.md` | v1.0-rc17 | 文档版本、状态、优先级和治理入口 |

唯一持续整改报告：

```text
docs/audits/REMEDIATION_DEVELOPMENT_REPORT.md（v2.3）
```

历史仓库检查证据：

```text
docs/audits/REPOSITORY_INSPECTION_REPORT_20260710.md
```

---

## 2. 工程治理附件

| 顺序 | 文件 | 版本 | 负责内容 |
|---:|---|---|---|
| 2 | `docs/governance/02_CODE_MAP.md` | v1.6 | 路由、Workspace资产、企业客户、企业名片、测试和数据边界 |
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

## 3. 组件和历史文档

以下文档不替代根目录正式`PRD.md`：

```text
docs/PRD_AI名片_AI客服_微信联系组件.md
docs/PRD_MEDIA_UPLOAD_RULES.md
docs/history/PRD_WECHAT_CONTACT_COMPONENT.md
```

根目录不得建立并行产品宪法或并行PRD。

---

## 4. GitHub和自动化文件

| 文件 | 用途 |
|---|---|
| `.github/CODEOWNERS` | 正式文档、Prisma、API、核心服务和治理配置审批 |
| `.github/pull_request_template.md` | 强制说明范围、风险、数据库、API、安全、验证和回滚 |
| `.github/workflows/governance.yml` | 治理、认证、Console、Workspace、migration、构建和浏览器验收 |
| `scripts/governance/check-governance.mjs` | 文档、版本、索引、编号和根目录唯一性检查 |
| `scripts/auth-integration-test.mjs` | 邮箱认证真实API验收 |
| `scripts/console-integration-test.mjs` | Console正式和兼容路由验收 |
| `scripts/console-mobile-browser-test.cjs` | 360、390、430px Chromium验收 |
| `scripts/workspace-invitation-integration-test.mjs` | 企业邀请、并发接受和隔离 |
| `scripts/workspace-resource-integration-test.mjs` | 企业产品和知识归属 |
| `scripts/workspace-customer-integration-test.mjs` | 企业客户、任务和离职重分配 |
| `scripts/workspace-card-integration-test.mjs` | 企业主页、成员名片、组件和离职保留 |

统一命令：

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

治理失败明细写入：

```text
artifacts/integration/governance.log
```

---

## 5. 当前代码基线

- 仓库：`weex13148-gif/link168.me`
- V2主线：`codex/link168-v2-direction`
- D2开发分支：`codex/d-workspace-cards-20260712`
- 本地正式工作区：`D:\77.me\branches\link168-v2-direction`
- 旧`master`、归档分支和旧工作区不作为V2正式事实

---

## 6. 已完成主线

### A：邮箱身份闭环

完成30天限制、令牌单次消费、密码重置、Session撤销和故障恢复；已通过临时PostgreSQL和真实API回归，未执行真实邮件和生产部署。

### B：Console五分类

```text
首页 / 名片 / 客户 / AI / 我的
```

完成统一导航、正式一级和二级路由、旧地址兼容、Jeepwork隐藏、状态页面和360/390/430px浏览器验收。

```text
PR #33
Workflow Run 29188363168
Conclusion: success
```

### C1：企业邀请和成员权限

完成`WorkspaceInvitation`、7天邀请、Token哈希、邮箱校验、原子接受、角色层级和跨Workspace隔离。

### C2：企业产品和知识

完成`WorkspaceResource`、`WorkspaceAuditLog`和企业产品/知识归属；企业资源不进入个人Dashboard、Workbench、公开页或个人套餐计数。

```text
PR #38
Workflow Run 29192341961
Conclusion: success
```

### D1：企业客户池和任务

完成独立企业客户、跟进、任务、负责人、离职前强制重分配、分配历史和审计。

```text
PR #40
Workflow Run 29194160887
Conclusion: success
```

### D2：企业主页和成员名片

新增：

```text
WorkspaceCard
WorkspaceCardComponent
20260712_workspace_cards
```

规则：

- 个人Profile/Link与企业名片完全分离。
- 每个Workspace最多一张企业主页。
- 每个成员在同一Workspace最多一张成员名片。
- owner/admin管理和发布全部企业名片。
- member只维护自己的成员名片。
- viewer只读取企业主页。
- 企业组件继承名片权限。
- 跨Workspace访问被拒绝。
- 成员移除后企业名片和组件继续保留。
- 最终公网域名和成员二级域名尚未批准，本轮仅提供企业后台内部API。

内部API：

```text
/api/workspaces/[workspaceId]/cards
/api/workspaces/[workspaceId]/cards/[cardId]
/api/workspaces/[workspaceId]/cards/[cardId]/components
```

权威验证：

```text
PR #41
Workflow Run 29195374596
Conclusion: success
integration-evidence 8260814111
console-mobile-evidence 8260814233
```

该证据来自CI临时数据库和浏览器，不表示生产服务器已部署。

---

## 7. D当前状态

已完成：

- D1企业客户池、任务和离职重分配。
- D2企业主页、成员名片、组件归属和发布权限。

仍未完成：

- D3企业AI共享账户、成员额度、批次和账本。
- D4企业管理员页和成员页完整UI。
- 企业名片最终公网域名、二级域名和自购域名渲染。
- 企业品牌、域名验证、报表、订单和发票。

个人Profile、Link、Lead和AI账本不得自动迁移、覆盖或清空。

---

## 8. V2明确延后

- 普通微信注册、登录和绑定
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
4. 正式变化同步本索引、代码地图和唯一整改报告。
5. 不创建并行宪法、并行PRD或重复整改报告。
6. 修改治理文件后执行完整CI复验。