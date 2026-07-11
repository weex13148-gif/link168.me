# Link168 正式文档索引

**文件名：** `DOCUMENT_INDEX.md`  
**版本：** v1.0-rc9  
**更新日期：** 2026-07-12  
**状态：** 持续生效

---

## 1. 正式文档清单

| 优先级 | 文件 | 当前版本 | 负责内容 |
|---:|---|---|---|
| 1 | `PRODUCT_CONSTITUTION.md` | v1.6 | 定位、统一身份、五档结构、AI、企业、数据和Agent治理 |
| 2 | `PRD.md` | v2.0-rc8 | 页面、路由、身份、企业成员生命周期、价格、权限和验收 |
| 3 | `PROJECT_RULES.md` | v1.0-rc3 | Git、Agent、密钥、数据库、测试、部署和删除边界 |
| 4 | `DOCUMENT_INDEX.md` | v1.0-rc9 | 文档版本、状态、优先级和治理入口 |

持续整改状态：

```text
docs/audits/REMEDIATION_DEVELOPMENT_REPORT.md
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
| 2 | `docs/governance/02_CODE_MAP.md` | v1.1 | 仓库、路由、测试、领域、数据和治理入口地图 |
| 3 | `docs/governance/03_MODULE_BOUNDARY.md` | v1.1 | 十四个核心领域、平台支撑能力和跨模块审批 |
| 4 | `docs/governance/04_VERSION_FREEZE.md` | v1.1 | 当前冻结、P0/P1/P2、CRM边界、解冻和紧急例外 |
| 5 | `docs/governance/05_AGENT_GOVERNANCE.md` | v1.1 | 八个开发Agent、审批矩阵、CODEOWNERS和文件锁 |
| 6 | `docs/governance/06_NAMING_STANDARD.md` | v1.1 | 术语、品牌、路由、套餐、身份、AI、版本和代码命名 |
| 7 | `docs/governance/07_ARCHITECTURE_DECISIONS.md` | v1.1 | 模块化单体、身份、AI账本、安全、兼容、迁移和治理ADR |
| 8 | `docs/governance/08_DEVELOPMENT_RULES.md` | v1.1 | 日常开发、PR、CI、测试、Git、发布和紧急修复流程 |
| 9 | `docs/governance/09_SECURITY_DATA_OPERATIONS.md` | v1.0 | 安全、数据保留、事件响应、API、迁移、依赖、监控和发布 |

治理附件冲突裁决：

```text
PRODUCT_CONSTITUTION.md
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
| `.github/pull_request_template.md` | 强制说明Agent、模块、跨模块、数据库、API、安全、验证和回滚 |
| `.github/workflows/governance.yml` | 在正式分支和PR中运行治理一致性检查 |
| `scripts/governance/check-governance.mjs` | 检查必需文件、上位版本引用、索引登记、编号和并行根文档 |
| `package.json`中的`governance:check` | 本地和CI统一执行入口 |

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

## 7. 统一身份与企业成员

- 内部不可变User ID是唯一主账号标识。
- 邮箱、微信、企业微信、飞书和钉钉是外部身份。
- 微信可以直接注册；已登录用户可在“我的”绑定微信。
- 外部身份冲突不覆盖、不自动合并。
- 通讯录同步只创建待激活企业成员。
- 首次授权后才激活WorkspaceMember。
- 离职冻结企业访问，保留个人账号和企业资产。

---

## 8. 尚待老板决定

- 企业微信、飞书、钉钉中的首个实施平台
- 普通微信登录的平台组合
- 两个已有账号的安全合并规则
- 最后一个登录身份解绑规则
- 企业协作平台同步字段范围
- 外部平台误判离职后的恢复规则
- 一个企业是否同时连接多个协作平台
- 多平台成员去重规则
- 企业成员二级域名规则
- 企业管理员查看成员AI对话正文的规则

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

## 10. 本轮治理整改记录

2026-07-12根据治理审查完成：

- 明确轻量`crm`领域与完整CRM的区别。
- 明确Console、Jeepwork和Workspace并非同义词。
- 明确开发Agent、产品AI Agent、平台管理员和GitHub账号的区别。
- 补充P0/P1/P2、SEV、文档版本、提交和API命名。
- 补充通知、配置、文件存储、监控等平台支撑能力边界。
- 增加安全、数据保留、事件响应、API兼容、数据库迁移、依赖、监控和发布治理。
- 增加CODEOWNERS、PR模板、治理脚本和GitHub Actions。
- 未修改`PRODUCT_CONSTITUTION.md`，因为审查报告假设的CRM/ERP冲突在当前宪法中并不存在。
