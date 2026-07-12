# Link168 正式文档索引

**文件名：** `DOCUMENT_INDEX.md`  
**版本：** v1.0-rc12  
**更新日期：** 2026-07-12  
**状态：** 持续生效

---

## 1. 正式文档清单

| 优先级 | 文件 | 当前版本 | 负责内容 |
|---:|---|---|---|
| 1 | `PRODUCT_CONSTITUTION.md` | v1.6 | 定位、统一身份、五档结构、AI、企业、数据和Agent治理 |
| 2 | `PRD.md` | v2.0-rc8（2026-07-12 V2范围修订） | 页面、路由、邮箱身份、企业成员、价格、权限和验收 |
| 3 | `PROJECT_RULES.md` | v1.0-rc3 | Git、Agent、密钥、数据库、测试、部署和删除边界 |
| 4 | `DOCUMENT_INDEX.md` | v1.0-rc12 | 文档版本、状态、优先级和治理入口 |

持续整改状态：

```text
docs/audits/REMEDIATION_DEVELOPMENT_REPORT.md（v1.7）
```

历史仓库检查证据：

```text
docs/audits/REPOSITORY_INSPECTION_REPORT_20260710.md
```

---

## 2. 工程治理附件

以下文件是正式文档的从属执行附件，不得覆盖产品宪法、PRD或工程规则：

| 顺序 | 文件 | 版本 | 负责内容 |
|---:|---|---|---|
| 2 | `docs/governance/02_CODE_MAP.md` | v1.2 | 仓库、路由、测试、领域、数据和治理入口地图 |
| 3 | `docs/governance/03_MODULE_BOUNDARY.md` | v1.1 | 十四个核心领域、平台支撑能力和跨模块审批 |
| 4 | `docs/governance/04_VERSION_FREEZE.md` | v1.2 | V2邮箱身份、企业手工成员、P0/P1/P2和解冻边界 |
| 5 | `docs/governance/05_AGENT_GOVERNANCE.md` | v1.1 | 八个开发Agent、审批矩阵、CODEOWNERS和文件锁 |
| 6 | `docs/governance/06_NAMING_STANDARD.md` | v1.1 | 术语、品牌、路由、套餐、身份、AI、版本和代码命名 |
| 7 | `docs/governance/07_ARCHITECTURE_DECISIONS.md` | v1.1 | 模块化单体、身份、AI账本、安全、兼容、迁移和治理ADR |
| 8 | `docs/governance/08_DEVELOPMENT_RULES.md` | v1.3 | 日常开发、V2身份边界、四原则、PR、CI、测试、Git和发布流程 |
| 9 | `docs/governance/09_SECURITY_DATA_OPERATIONS.md` | v1.0 | 安全、数据保留、事件响应、API、迁移、依赖、监控和发布 |

治理附件冲突裁决：

```text
老板最新明确决定
→ PRODUCT_CONSTITUTION.md
→ PRD.md
→ PROJECT_RULES.md
→ DOCUMENT_INDEX.md
→ docs/governance/*
→ Agent任务单与代码实现
```

---

## 3. GitHub执行文件

| 文件 | 用途 |
|---|---|
| `.github/CODEOWNERS` | 将正式文档、Prisma、API、核心服务和治理配置交由真实GitHub账号审批 |
| `.github/pull_request_template.md` | 强制说明Agent、假设、成功标准、最小修改、数据库、API、安全、验证和回滚 |
| `.github/workflows/governance.yml` | 在正式分支和PR中运行治理、邮箱认证、迁移、构建和临时数据库集成验收 |
| `scripts/governance/check-governance.mjs` | 检查必需文件、上位版本引用、索引登记、编号和并行根文档 |
| `scripts/auth-integration-test.mjs` | 启动生产构建并对邮箱认证、并发令牌、限制和Session执行真实API验收 |
| `package.json`中的`governance:check`和`test:auth` | 本地和CI统一执行入口 |

说明：Agent01–Agent08是职责角色，不是GitHub账号。当前CODEOWNERS使用仓库所有者`@weex13148-gif`；未来建立真实团队后再替换。

---

## 4. 当前代码基线

- 仓库：`weex13148-gif/link168.me`
- V2主线：`codex/link168-v2-direction`
- 本地正式工作区：`D:\77.me\branches\link168-v2-direction`
- 旧`master`、旧工作区和归档分支只读，不作为V2正式事实

---

## 5. 冲突裁决

```text
老板最新明确决定
→ PRODUCT_CONSTITUTION.md
→ PRD.md
→ PROJECT_RULES.md
→ 治理附件与持续整改报告
→ 代码、数据库、页面、测试和部署结果
```

开发Agent无权单独改变产品宪法、五档套餐、五分类导航、免费与AI边界或版本冻结范围。

---

## 6. 当前关键产品事实

### 定位

> Link168是面向自媒体、小商家、一人公司和轻量经营团队的AI SaaS经营名片工具与商业基础设施平台。

### V2账号与登录

- V2只使用邮箱注册和登录。
- 支持邮箱验证、30天限制、忘记密码、重置密码、修改密码和Session管理。
- 30天未验证后允许登录受限后台，但公开主页和敏感写入受限。
- 邮箱身份主线已通过临时PostgreSQL、真实Next.js API、并发、Lint、TypeScript和生产构建验收。
- 普通微信注册、登录和绑定退出V2范围。
- 已有普通微信或其他外部身份结构如存在，保留、隐藏或关闭，不擅自删除。

### 用户后台

1. 首页
2. 名片
3. 客户
4. AI
5. 我的

### 正式套餐

1. 免费版
2. Plus
3. Pro
4. 企业版
5. 企业Pro

### AI边界

- 免费用户不能购买AI加量包。
- 免费用户不能调用六大AI Agent。
- 套餐额度、购买点数和企业共享额度分账。
- 购买点数按独立90天批次管理，失败回补原来源和原批次。

### 轻量客户域

`crm`代码领域表示客户线索、状态、跟进和分配，不表示Link168扩张为完整CRM。完整CRM、ERP、OA和复杂营销自动化仍不属于当前主线。

---

## 7. V2企业空间与成员

- V2不接入企业微信、飞书和钉钉。
- 企业成员通过Link168站内邮箱邀请加入Workspace。
- 邀请未接受前没有企业数据访问权。
- 已有Link168账号复用原内部User ID。
- 冻结或移除企业访问时保留个人账号和个人合法数据。
- 企业客户、企业名片、知识库、任务和工作记录继续归企业。
- 企业数据必须按Workspace隔离。
- 企业管理员不得查看成员密码、私人会话、个人空间数据或AI对话正文。

---

## 8. V2已明确延后的事项

以下事项不再作为V2待决阻塞项：

- 普通微信采用哪种登录方式
- 企业微信、飞书、钉钉先接哪个
- 企业协作平台同步字段范围
- 外部平台误判离职后的恢复规则
- 一个企业同时连接多个协作平台
- 多平台成员去重
- 两个已有账号安全合并
- 最后一个登录身份解绑
- 企业管理员查看成员AI对话正文

TRAE不得对以上事项进行V2技术选型、数据库扩张、页面开发或真实第三方接入。

当前仍待老板决定但不阻塞V2：

- 企业成员二级域名规则

---

## 9. 更新机制

1. 长期产品边界更新产品宪法。
2. 页面、流程、角色、价格、额度、权限和验收更新PRD。
3. 工程、安全和部署边界更新PROJECT_RULES或对应治理附件。
4. 每次正式变化同步本索引。
5. 代码差距和开发状态统一更新持续整改报告。
6. 不创建并行宪法、并行PRD或重复整改报告。
7. 修改治理文件后运行`npm run governance:check`。

---

## 10. 治理整改记录

### 2026-07-12：治理体系补齐

- 明确轻量`crm`领域与完整CRM的区别。
- 明确Console、Jeepwork和Workspace并非同义词。
- 明确开发Agent、产品AI Agent、平台管理员和GitHub账号的区别。
- 补充P0/P1/P2、SEV、文档版本、提交和API命名。
- 补充通知、配置、文件存储、监控等平台支撑能力边界。
- 增加安全、数据保留、事件响应、API兼容、数据库迁移、依赖、监控和发布治理。
- 增加CODEOWNERS、PR模板、治理脚本和GitHub Actions。

### 2026-07-12：Agent四原则适配

- 明示假设，但不重复询问已经明确的信息。
- 最小充分实现，但不削弱身份、支付、AI、数据库和企业隔离的安全边界。
- 外科式修改，不顺手重构、格式化或删除无关代码。
- 目标驱动验证，按风险决定复现、测试和针对性检查。
- 未新增`CLAUDE.md`、新治理文件或外部插件依赖。

### 2026-07-12：V2身份与企业协作范围收口

- V2只保留邮箱注册登录。
- 普通微信注册、登录和绑定移入后续版本。
- 企业微信、飞书和钉钉连接移入后续版本。
- V2企业成员改为邮箱邀请和站内管理。
- 账号合并、最后身份解绑、多平台成员去重和企业管理员查看成员AI对话正文暂不处理。
- 已有未来代码和数据结构保留，不因V2暂缓而删除。

### 2026-07-12：A邮箱身份主线验收

- 30天邮箱边界、公开主页限制和后台受限登录完成。
- 验证码按User ID隔离并保留旧凭证兼容。
- 邮箱验证和密码重置令牌完成并发单次消费。
- 密码重置后旧Session和旧密码失效。
- Session创建故障不会记录假成功，注册账号可恢复登录。
- GitHub Actions使用临时PostgreSQL 16完成migration、Lint、TypeScript、生产构建和真实API集成验收。
- 未连接生产数据库、真实邮件密钥或生产服务器。
