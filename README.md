# Link168 V2 Direction Branch

这是 `D:\77.me\branches\link168-v2-direction` 的分支说明。

## 分支目标

本分支只服务 Link168 V2 主产品线：经营名片、公开访问、客户线索、数据分析、会员付费、AI经营能力、企业空间和 Jeepwork 平台治理。

## 最高规则与读取顺序

所有人工开发者、TRAE、Codex 和其他 Agent 开始任务前，必须按顺序读取：

1. `PRODUCT_CONSTITUTION.md`：唯一产品宪法，最高产品规则。
2. `PRD.md`：当前页面、流程、价格、权限和验收规则。
3. `PROJECT_RULES.md`：Git、Agent、安全、数据库、测试和部署边界。
4. `DOCUMENT_INDEX.md`：当前正式版本、状态和文档入口。
5. `docs/governance/04_VERSION_FREEZE.md`：当前允许开发范围和冻结事项。
6. `docs/governance/03_MODULE_BOUNDARY.md`：模块责任、依赖和禁止范围。
7. 与任务相关的其他治理附件和持续整改报告。

发生冲突时，不得用旧代码、历史文档或 Agent 建议覆盖产品宪法。

## 第一批治理文件

```text
PRODUCT_CONSTITUTION.md                    # 唯一产品宪法，已存在并持续生效
PRD.md                                     # 当前产品需求
PROJECT_RULES.md                           # 工程、Agent、安全与部署规则
DOCUMENT_INDEX.md                          # 正式文档与治理附件索引

docs/governance/
├─ 02_CODE_MAP.md                          # 代码、路由、领域和数据地图
├─ 03_MODULE_BOUNDARY.md                   # 十四个核心模块边界
├─ 04_VERSION_FREEZE.md                    # 当前版本冻结清单
├─ 05_AGENT_GOVERNANCE.md                  # 八个工作 Agent 管理制度
├─ 06_NAMING_STANDARD.md                   # 产品、路由、代码和数据命名
├─ 07_ARCHITECTURE_DECISIONS.md            # 架构决策记录 ADR
└─ 08_DEVELOPMENT_RULES.md                 # 日常开发执行规则
```

治理附件全部从属于根目录正式文件，不得创建并行宪法、并行 PRD 或第二份持续整改报告。

## 其他必读资料

- `docs/audits/REMEDIATION_DEVELOPMENT_REPORT.md`
- `docs/DEVELOPMENT_DIRECTION_20260707.md`
- `docs/PRD_Link168_V2_DIRECTION_20260707.md`
- `docs/CURATED_CODE_MANIFEST.md`
- `docs/reference-images`

## 开发命令

```bash
npm install
npm run dev
npm run lint
npm run typecheck
```

## 当前工程原则

- 用户侧统一到 `/console`。
- 用户后台一级分类固定为：首页、名片、客户、AI、我的。
- 平台侧统一到 `/jeepwork`。
- 当前采用模块化单体，不为技术先进感提前引入微服务、Kubernetes 或 Kafka。
- 旧 `/dashboard`、`/workbench` 仅作为兼容和迁移来源，不继续形成并列产品心智。
- 旧 `/admin` 不作为 V2 平台后台。
- `/showcase` 只允许受控访问，不在普通首页提供入口。
- 未完成的付费、企业、AI、支付、知识库、推广和身份连接能力优先隐藏、限制或降级，未经批准不得直接删除结构。
- 不提交 `.env`、`.env.local`、`node_modules`、`.next`、上传文件、真实密钥和构建缓存。
