# Link168 V2 Direction Branch

这是`D:\77.me\branches\link168-v2-direction`的分支说明。

## 分支目标

本分支只服务Link168 V2主产品线：经营名片、公开访问、客户线索、数据分析、会员付费、AI经营能力、企业空间和Jeepwork平台治理。

## 最高规则与读取顺序

所有人工开发者、TRAE、Codex和其他Agent开始任务前，必须按顺序读取：

1. `PRODUCT_CONSTITUTION.md`：唯一产品宪法，最高产品规则。
2. `PRD.md`：当前页面、流程、价格、权限和验收规则。
3. `PROJECT_RULES.md`：Git、Agent、安全、数据库、测试和部署边界。
4. `DOCUMENT_INDEX.md`：当前正式版本、状态和文档入口。
5. `docs/governance/04_VERSION_FREEZE.md`：当前允许开发范围和冻结事项。
6. `docs/governance/03_MODULE_BOUNDARY.md`：模块责任、依赖和禁止范围。
7. `docs/governance/09_SECURITY_DATA_OPERATIONS.md`：安全、数据、事故、迁移和发布规则。
8. 与任务相关的其他治理附件和持续整改报告。

发生冲突时，不得用旧代码、历史文档或Agent建议覆盖产品宪法。

## 治理文件

```text
PRODUCT_CONSTITUTION.md                    # 唯一产品宪法
PRD.md                                     # 当前产品需求
PROJECT_RULES.md                           # 工程、Agent、安全与部署规则
DOCUMENT_INDEX.md                          # 正式文档与治理附件索引

docs/governance/
├─ 02_CODE_MAP.md                          # 代码、路由、测试、领域和数据地图
├─ 03_MODULE_BOUNDARY.md                   # 十四个核心领域和平台支撑能力
├─ 04_VERSION_FREEZE.md                    # 当前版本冻结、优先级和解冻流程
├─ 05_AGENT_GOVERNANCE.md                  # 八个开发Agent、审批矩阵和文件锁
├─ 06_NAMING_STANDARD.md                   # 术语、产品、路由、版本和代码命名
├─ 07_ARCHITECTURE_DECISIONS.md            # 架构、安全、兼容和迁移ADR
├─ 08_DEVELOPMENT_RULES.md                 # 开发、PR、CI、测试、Git和部署规则
└─ 09_SECURITY_DATA_OPERATIONS.md           # 安全、数据保留、事故、监控和发布治理
```

治理附件全部从属于根目录正式文件，不得创建并行宪法、并行PRD或第二份持续整改报告。

## GitHub执行机制

```text
.github/CODEOWNERS
.github/pull_request_template.md
.github/workflows/governance.yml
scripts/governance/check-governance.mjs
```

说明：Agent01–Agent08是开发职责角色，不是GitHub账号。当前CODEOWNERS由仓库所有者`@weex13148-gif`承担正式审批。

## 其他必读资料

- `docs/audits/REMEDIATION_DEVELOPMENT_REPORT.md`
- `docs/DEVELOPMENT_DIRECTION_20260707.md`
- `docs/PRD_Link168_V2_DIRECTION_20260707.md`
- `docs/CURATED_CODE_MANIFEST.md`
- `docs/reference-images`

## 开发命令

```bash
npm install
npm run governance:check
npm run dev
npm run lint
npm run typecheck
npm run check
```

`npm run governance:check`检查治理文件是否完整、上位版本引用是否一致、README与索引是否登记完整，以及根目录是否出现并行宪法或PRD。

## 当前工程原则

- 用户侧统一到`/console`。
- 用户后台一级分类固定为：首页、名片、客户、AI、我的。
- 平台侧统一到`/jeepwork`。
- Workspace是企业租户和企业资产容器，不等同于Jeepwork。
- `crm`领域只代表轻量客户线索和跟进，不代表完整CRM产品线。
- 当前采用模块化单体，不为技术先进感提前引入微服务、Kubernetes或Kafka。
- 旧`/dashboard`、`/workbench`仅作为兼容和迁移来源。
- 旧`/admin`不作为V2平台后台。
- `/showcase`只允许受控访问，不在普通首页提供入口。
- 未完成的付费、企业、AI、支付、知识库、推广和身份连接能力优先隐藏、限制或降级，未经批准不得删除结构。
- 不提交`.env`、`.env.local`、`node_modules`、`.next`、上传文件、真实密钥和构建缓存。
