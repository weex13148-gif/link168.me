# Link168 正式文档索引

**文件名：** `DOCUMENT_INDEX.md`  
**版本：** v1.0-rc14  
**更新日期：** 2026-07-12  
**状态：** 持续生效

---

## 1. 正式文档清单

| 优先级 | 文件 | 当前版本 | 负责内容 |
|---:|---|---|---|
| 1 | `PRODUCT_CONSTITUTION.md` | v1.6 | 定位、统一身份、五档结构、AI、企业、数据和Agent治理 |
| 2 | `PRD.md` | v2.0-rc8（2026-07-12 V2范围修订） | 页面、路由、邮箱身份、企业成员、价格、权限和验收 |
| 3 | `PROJECT_RULES.md` | v1.0-rc3 | Git、Agent、密钥、数据库、测试、部署和删除边界 |
| 4 | `DOCUMENT_INDEX.md` | v1.0-rc14 | 文档版本、状态、优先级和治理入口 |

持续整改状态：

```text
docs/audits/REMEDIATION_DEVELOPMENT_REPORT.md（v2.0）
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
| 2 | `docs/governance/02_CODE_MAP.md` | v1.3 | 仓库、正式与兼容路由、测试、领域、数据和治理入口地图 |
| 3 | `docs/governance/03_MODULE_BOUNDARY.md` | v1.1 | 十四个核心领域、平台支撑能力和跨模块审批 |
| 4 | `docs/governance/04_VERSION_FREEZE.md` | v1.2 | V2邮箱身份、企业手工成员、P0/P1/P2和解冻边界 |
| 5 | `docs/governance/05_AGENT_GOVERNANCE.md` | v1.1 | 八个开发Agent、审批矩阵、CODEOWNERS和文件锁 |
| 6 | `docs/governance/06_NAMING_STANDARD.md` | v1.1 | 术语、品牌、路由、套餐、身份、AI、版本和代码命名 |
| 7 | `docs/governance/07_ARCHITECTURE_DECISIONS.md` | v1.1 | 模块化单体、身份、AI账本、安全、兼容、迁移和治理ADR |
| 8 | `docs/governance/08_DEVELOPMENT_RULES.md` | v1.3 | 日常开发、V2身份边界、四原则、PR、CI、测试、Git和发布流程 |
| 9 | `docs/governance/09_SECURITY_DATA_OPERATIONS.md` | v1.0 | 安全、数据保留、事件响应、API、迁移、依赖、监控和发布 |

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
| `.github/workflows/governance.yml` | 治理、认证、Console、migration、Lint、TypeScript、构建和浏览器验收 |
| `scripts/governance/check-governance.mjs` | 检查必需文件、上位版本引用、索引登记和并行根文档 |
| `scripts/auth-integration-test.mjs` | 邮箱认证、并发令牌、限制和Session真实API验收 |
| `scripts/console-integration-test.mjs` | Console正式路由、二级路由、旧路径跳转和Jeepwork隐藏验收 |
| `scripts/console-mobile-browser-test.cjs` | Chromium下360、390、430px横向溢出和五项底栏验收 |
| `src/components/layout/console-route-policy.test.ts` | 五分类顺序、激活规则、旧路径归类和Jeepwork排除测试 |
| `package.json`中的`governance:check`、`test:auth`、`test:console-nav` | 本地和CI统一命令入口 |

Playwright只在CI中使用`--no-save --no-package-lock`临时安装，不进入项目正式依赖或锁文件。

---

## 4. 当前代码基线

- 仓库：`weex13148-gif/link168.me`
- V2主线：`codex/link168-v2-direction`
- 本地正式工作区：`D:\77.me\branches\link168-v2-direction`
- 旧`master`、旧工作区和归档分支只读，不作为V2正式事实

---

## 5. 当前关键产品与代码事实

### 5.1 定位

> Link168是面向自媒体、小商家、一人公司和轻量经营团队的AI SaaS经营名片工具与商业基础设施平台。

### 5.2 V2账号与登录

- V2只使用邮箱注册和登录。
- 支持邮箱验证、30天限制、忘记密码、重置密码、修改密码和Session管理。
- 30天未验证后允许登录受限后台，但公开主页和敏感写入受限。
- 邮箱身份主线已经通过临时PostgreSQL、真实Next.js API、并发、Lint、TypeScript和生产构建验收。
- 普通微信注册、登录和绑定退出V2范围。
- 已有外部身份未来结构保留、隐藏或关闭，不擅自删除。

### 5.3 用户后台

一级分类：

1. 首页：`/console`
2. 名片：`/console/card`
3. 客户：`/console/customers`
4. AI：`/console/ai`
5. 我的：`/console/account`

B Console主线已经完成：

- 三套用户页面壳层统一为五项导航。
- 手机底栏固定为首页、名片、客户、AI、我的。
- 普通用户导航不显示Jeepwork。
- 名片编辑器内部标签不再占用一级底栏。
- Console首页只使用正式`/console/*`入口。
- 产品、短链、数据、AI服务、知识库、会员、企业和通知已建立正式二级路径。
- `/dashboard`和`/workbench/*`使用临时307跳向对应正式Console路径，旧代码和数据结构保留。
- 新增加载态和可恢复错误态。
- 导航策略、登录态路由、认证回归、Lint、TypeScript和生产构建全部通过。
- 真实Chromium已验证360、390、430px五个主页面没有文档级横向溢出。

权威自动化证据：

```text
PR #33
Workflow Run 29188134805
Conclusion: success
Artifact: console-mobile-evidence（ID 8258673568）
```

该证据来自临时数据库和CI浏览器，不代表生产服务器已经部署。

### 5.4 正式套餐

1. 免费版
2. Plus
3. Pro
4. 企业版
5. 企业Pro

### 5.5 AI边界

- 免费用户不能购买AI加量包。
- 免费用户不能调用六大AI Agent。
- 套餐额度、购买点数和企业共享额度分账。
- 购买点数按独立90天批次管理，失败回补原来源和原批次。

### 5.6 轻量客户域

`crm`代码领域表示经营名片获客后的线索、状态、跟进和分配，不表示Link168扩张为完整CRM、ERP、OA或复杂营销自动化平台。

---

## 6. V2企业空间与成员

- V2不接入企业微信、飞书和钉钉。
- 企业成员通过Link168站内邮箱邀请加入Workspace。
- 邀请未接受前没有企业数据访问权。
- 已有Link168账号复用原内部User ID。
- 冻结或移除企业访问时保留个人账号和个人合法数据。
- 企业客户、企业名片、知识库、任务和工作记录继续归企业。
- 企业数据必须按Workspace隔离。
- 企业管理员不得查看成员密码、私人会话、个人空间数据或AI对话正文。

下一主线为企业邮箱邀请、成员权限和Workspace隔离。

---

## 7. V2已明确延后的事项

以下事项不再作为V2待决阻塞项：

- 普通微信登录或绑定方案
- 企业微信、飞书、钉钉接入顺序
- 企业协作平台同步字段和恢复规则
- 一个企业连接多个协作平台
- 多平台成员去重
- 两个已有账号安全合并
- 最后一个登录身份解绑
- 企业管理员查看成员AI对话正文

TRAE和开发Agent不得对以上事项进行V2技术选型、数据库扩张、页面开发或真实第三方接入。

当前仍待老板决定但不阻塞V2：

- 企业成员二级域名规则

---

## 8. 更新机制

1. 长期产品边界更新产品宪法。
2. 页面、流程、角色、价格、额度、权限和验收更新PRD。
3. 工程、安全和部署边界更新PROJECT_RULES或对应治理附件。
4. 每次正式变化同步本索引。
5. 代码差距和开发状态统一更新持续整改报告。
6. 不创建并行宪法、并行PRD或重复整改报告。
7. 修改治理文件后运行`npm run governance:check`。

---

## 9. 2026-07-12执行记录

### 治理体系和V2范围

- 建立文档优先级、Agent治理、命名、架构决策和安全数据治理。
- V2只保留邮箱身份，微信和企业协作平台移入后续版本。
- 企业成员改为站内邮箱邀请和Workspace管理。

### A邮箱身份主线

- 完成30天限制、验证码隔离、令牌原子消费、Session撤销和故障恢复。
- 临时PostgreSQL、真实API、Lint、TypeScript和生产构建通过。

### B Console主线

- 完成五分类正式路由、正式二级路由和旧地址兼容跳转。
- 完成三套Shell、手机底栏、Console首页、加载态和错误态收口。
- 完成登录态路由烟测与真实Chromium移动端验收。
- 最终运行`29188134805`全部成功，截图与日志产物已生成。
- 未修改生产数据库、真实密钥或生产服务器。
