# Link168 模块化单体全面重构实施路线图

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement each phase plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不推倒现有数据库和可复用能力的前提下，将 Link168 迁移为边界清晰、单一写入口、可逐阶段验收的模块化单体。

**Architecture:** 使用绞杀者迁移。旧 Route 逐步改为调用新 Domain Service，读取可短期兼容旧数据，写入始终只有一个权威入口。每个 Phase 形成独立可运行场景并关闭对应旧入口，禁止跨阶段大爆炸重写。

**Tech Stack:** Next.js App Router、TypeScript、React、Prisma 7、PostgreSQL 16、Redis、Jest、Playwright、GitHub Actions、Node.js 22。

## Global Constraints

- 唯一长期重构分支：`refactor/link168-modular-monolith-r1`。
- 不直接修改或覆盖 `master`，不 force push。
- 不连接或修改生产数据库，不调用真实支付和生产外部服务完成开发测试。
- 不把密钥写入仓库，不伪造外部服务成功。
- 不删除 `/showcase` 和 `/jeepwork`。
- 模块化单体，不引入微服务、Kubernetes、Kafka。
- 每个业务动作只有一个权威写入口；禁止新旧双写。
- 所有生产代码先有失败测试，再写最小实现。
- 每个阶段必须通过 Node.js 22、PostgreSQL 16、Redis、Prisma、TypeScript、ESLint、Jest、Build 和 diff check。
- 重构完成前项目状态固定为 `NOT READY FOR PRODUCTION`。

---

## 1. 计划拆分原则

本规格覆盖 Identity、Profile、Media、Catalog、Reception、CRM、Analytics、Billing 八个领域。它们不能放进一份巨型执行清单，否则文件映射会在前置阶段修改后失真。因此实施拆分为六份顺序计划：

1. `2026-07-19-link168-phase-0-foundation.md`
2. `2026-07-19-link168-phase-1-identity-profile-media.md`
3. `2026-07-19-link168-phase-2-catalog-editor-public-page.md`
4. `2026-07-19-link168-phase-3-reception-crm-analytics.md`
5. `2026-07-19-link168-phase-4-billing-credits-integrations.md`
6. `2026-07-19-link168-phase-5-retirement-release.md`

Phase 0 计划现在写成逐文件、逐测试、逐提交的可执行版本。Phase 1–5 的详细计划必须在上一阶段达到 `READY_FOR_NEXT_PHASE` 后，基于当时实际树形结构编写；不得提前猜测已被前置迁移改变的行号和接口。

这不是延期或占位：以下章节固定每个阶段的输入、输出、禁止范围、验收场景和计划编写门禁，后续详细计划不得改变这些契约。

---

## 2. Phase 0：基线冻结与工程骨架

### 输入

- `master@5e8831b12e7528a4956ecae6953ad694609c3a20`
- 已批准设计：`docs/superpowers/specs/2026-07-19-link168-modular-monolith-refactor-design.md`
- 长期分支：`refactor/link168-modular-monolith-r1`

### 交付物

- Node.js 22 的本地和 CI 版本约束；
- 所有直接依赖从 `latest` 固定为 lockfile 已解析版本；
- 新重构分支和 `master` 的完整 CI 门禁；
- `src/domains`、`src/infrastructure`、`src/shared` 的最小骨架；
- 统一 DomainError、Result、FeatureFlags、AuditRecorder 契约；
- 新领域依赖方向检查；
- 旧代码 KEEP/MIGRATING/RETIRED 清单；
- Prisma schema 与 migration 指纹基线；
- Phase 0 验证报告。

### 禁止范围

- 不改变注册、登录、主页、AI、Lead、会员、支付等用户行为；
- 不增加 Prisma 业务表；
- 不切换任何生产功能开关；
- 不合并 PR #52；PR #52 只作为后续补丁素材审阅。

### 完成状态

只有以下全部通过才可标记 `READY_FOR_NEXT_PHASE`：

```text
npm ci
node scripts/refactor/verify-baseline.mjs
node scripts/refactor/pin-direct-dependencies.mjs --check
node scripts/refactor/check-domain-boundaries.mjs
npx prisma validate
npx prisma generate
npx prisma migrate deploy
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build
git diff --check
```

---

## 3. Phase 1：Identity、Profile、Media

### 前置门禁

- Phase 0 状态为 `READY_FOR_NEXT_PHASE`；
- Phase 0 CI 的精确 SHA 全绿；
- 工作区干净；
- PostgreSQL 16 和 Redis 测试环境可用。

### 固定领域契约

#### Identity

```ts
type AccountCapabilities = {
  canLogin: boolean;
  canEnterDashboard: boolean;
  canModifySensitiveData: boolean;
  canPublishProfile: boolean;
  canExposePublicResources: boolean;
  canEnterJeepwork: boolean;
};
```

必须实现：

- 账号主状态只使用 `active | deactivated`；
- 限制类型使用 `EMAIL_UNVERIFIED | ADMIN_FREEZE | SECURITY_RISK | BANNED`；
- 普通用户、现有 Session、公开资源和 Jeepwork 共用底层能力计算；
- 系统所有者不可删除、冻结、封禁或降级；
- 邮箱验证 Token 和密码重置 Token 在同一数据库事务中原子消费；
- 密码重置成功后旧 Session 全部失效。

#### Profile

必须实现：

- 新注册 `Profile.isPublic=false`；
- 邮箱未验证禁止发布；
- `Profile.isPublic` 是唯一发布意图；
- 冻结时不修改发布意图，由统一公开资源守卫拒绝访问；
- 主页、媒体、AI、表单、短链和 `/go` 共用公开资源守卫。

#### Media

```text
uploading → pending_review → approved → rejected → deleted
```

必须实现：

- 统一 `MediaAsset`；
- 头像、封面、案例图、产品图和链接图标共用上传与读取契约；
- 真实 MIME、大小、所有者、用途、对象键和审核状态可追踪；
- 上传接口不得把 `pending_review` 描述为已生效；
- 不再通过遍历目录查找公开头像；
- 替换和删除具备幂等与审计。

### 主验收场景

```text
注册
→ 邮箱验证
→ 登录
→ 创建主页
→ 上传头像
→ 图片状态真实
→ 发布
→ 手机访问公开页
→ 冻结账号
→ 公开页、媒体、AI、表单和 /go 全部拒绝
→ 解冻后恢复原发布意图
```

### 退出条件

- Identity、Profile、Media 的新写入入口唯一；
- 旧头像上传、目录扫描读取和分散公开权限判断标记为 `RETIRED`；
- 浏览器与 API 合约测试全绿；
- 写入 Phase 1 验证报告后才生成 Phase 2 详细计划。

---

## 4. Phase 2：Catalog、编辑器和公开页

### 前置门禁

- Phase 1 公开资源守卫和 MediaAsset 已稳定；
- 旧公开页仍可读取迁移前数据，但新写入只走领域服务。

### 固定交付物

- `Catalog` 领域统一产品和服务所有权、上下架、排序与 AI 推荐开关；
- 页面编辑器只管理组件选择、显示、位置和排序；
- 产品管理不再自动把全部产品追加到公开页；
- 唯一页面模块解释器；
- 唯一公开页渲染器；
- 普通用户后台一级导航固定为：主页、产品与服务、AI 接待、客户线索、经营数据、账户设置；
- 桌面端三栏，手机端显式预览入口；
- Workspace、企业域名、复杂媒体等入口隐藏但不破坏历史数据；
- Dashboard 与 Workbench 双入口关闭，保留必要兼容跳转。

### 首版公开组件

```text
profile
link
image
product
service
ai-chat
contact-form
business-inquiry
```

`business-inquiry` 通过类型区分预约与报价，但共用底层提交服务。

### 主验收场景

```text
登录后台
→ 六项导航无重复
→ 添加产品和服务
→ 页面选择产品卡片
→ 调整排序
→ 手机预览
→ 发布
→ 公开页只显示被选择的产品一次
```

### 退出条件

- 一套编辑器、一套公开渲染器、一套组件解释逻辑；
- 390px 无横向溢出；
- 对应旧 UI 和重复渲染路径标记 `RETIRED`；
- 写入 Phase 2 验证报告后才生成 Phase 3 详细计划。

---

## 5. Phase 3：Reception、CRM、Analytics

### 前置门禁

- Phase 2 的公开页、产品和页面模块已成为唯一展示源；
- Identity、Profile、Media 守卫可被 AI、Lead 和统计复用。

### 固定领域契约

```text
visitorSessionId = 同一访客
conversationId   = 同一多轮对话
requestId        = 单次发送、扣费和重试幂等
```

AI 只能读取：

- 已公开主页资料；
- 允许 AI 推荐的产品和服务；
- 商家明确允许引用的知识资料；
- 当前会话有限历史。

商家知识按不可信内容处理，不能覆盖平台系统规则。价格、库存、承诺等不存在可靠资料时必须明确表示不知道。

Lead 状态固定为：

```text
new | following | won | closed
```

所有留资入口调用一个 `leadService.createLead()`，必须满足：

- 明确同意；
- 至少一种联系方式；
- 明确需求；
- 来源页和组件真实；
- requestId 幂等；
- 产品或服务快照由服务端生成；
- 后续部分更新不得以空值抹除已有联系方式。

统计只保留：

```text
visit | consultation | lead | conversion
```

其中 conversion 只在 Lead 首次进入 `won` 时产生。

### 主验收场景

```text
访客进入公开页
→ AI 连续咨询三轮且保持上下文
→ AI 不知道的信息不编造
→ AI 请求留资前说明用途并取得同意
→ 访客提供联系方式和明确需求
→ 后台真实出现 Lead
→ 添加跟进
→ 首次标记 won
→ visit、consultation、lead、conversion 指标各更新一次
```

### 退出条件

- 两套 AI 客户端退役；
- AI 与普通表单共用唯一 Lead 创建服务；
- Redis 承担生产限流和幂等，高风险写接口在 Redis 不可用时安全失败；
- 旧内存 Map 限流和多套统计口径退役；
- 写入 Phase 3 验证报告后才生成 Phase 4 详细计划。

---

## 6. Phase 4：Billing、Credits、外部服务

### 前置门禁

- Phase 3 的 AI 调用、Lead 和统计已经稳定；
- 在线支付继续关闭；
- 不使用生产支付宝、百炼、邮件或对象存储进行开发测试。

### 固定领域契约

订阅状态：

```text
active | past_due | cancelled | expired
```

计划变更：

```ts
type SubscriptionSchedule = {
  currentPlanCode: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  scheduledPlanCode: string | null;
  scheduledEffectiveAt: Date | null;
};
```

Credits 账本类型：

```text
grant | consume | refund | revoke | adjustment
```

必须实现：

- 余额由账本聚合，禁止绕过 Ledger 直接改余额；
- 支付回调按支付平台交易号和订单号幂等；
- 升级、降级的权益生效时点明确；
- 退款必须等待支付平台确认；
- 退款成功后订单、订阅、权益、原订单赠送 Credits 和审计一致；
- 任一步失败不得返回退款成功；
- 外部服务统一三态：`not_configured | configured_and_passed | configured_but_failed`；
- 敏感配置支持替换、禁用、删除和测试，空值不能隐式保留旧密钥。

### 主验收场景

```text
创建测试订单
→ 模拟支付平台成功回调
→ 套餐在正确时点生效
→ Credits grant 入账
→ AI consume
→ 重复回调不重复授权
→ 模拟退款确认
→ 权益撤销或调整
→ 原订单剩余 Credits revoke
→ 重复退款不重复回收
```

### 退出条件

- 旧本地退款实现退役；
- 支付、订阅和 Credits 具有完整集成测试与审计证据；
- 在线支付仍需 Phase 5 预生产验证后才能启用；
- 写入 Phase 4 验证报告后才生成 Phase 5 详细计划。

---

## 7. Phase 5：旧代码退役与发布验收

### 前置门禁

- Phase 0–4 全部 `READY_FOR_NEXT_PHASE`；
- 所有新写入入口唯一；
- 数据迁移脚本可重复执行且有统计与异常报告。

### 固定交付物

- 删除确认无调用的旧 Route、组件、权限函数和退款实现；
- 数据迁移遵循：扩展、回填、双读验证、切换新写入、停止旧写入、删除旧字段；
- 保留 `/showcase` 和 `/jeepwork`；
- 完整 Playwright 主流程；
- 360px、390px、430px 手机验收；
- 预生产环境数据库备份点与回滚演练；
- 真实外部服务逐项验证，不能用配置存在代替调用通过；
- 最终发布报告记录精确 SHA、CI、迁移、浏览器证据、外部服务状态和残余风险。

### 最终主场景

```text
注册并验证
→ 创建主页
→ 上传头像
→ 添加产品
→ 开启 AI
→ 发布
→ 访客连续咨询
→ 明确同意留资
→ Lead 出现
→ 跟进并成交
→ 四项指标更新
→ 套餐和额度正确
→ 冻结后所有能力关闭
→ 解冻后按原发布意图恢复
```

### 最终状态

只有所有验收项有真实证据时才能标记：

```text
READY_FOR_PRODUCTION_APPROVAL
```

这不等于已经上线。生产部署仍需单独审批、备份、回滚点和上线后冒烟测试。

---

## 8. Agent 组织与文件所有权

每个 Phase 最多使用：

- 1 个总控 Agent：基线、契约、合并、验证报告；
- 2 个开发 Agent：按领域分配互不重叠文件；
- 1 个独立测试 Agent：只写测试、运行验收和复核，不增加功能。

禁止十个 Agent 同时修改核心代码。每个任务必须给出：

```text
TASK_SCOPE
OWNED_FILES
BASE_SHA
COMMITS
TEST_COMMANDS
TEST_RESULTS
RISKS
HANDOFF
```

临时 Agent 分支必须从唯一长期重构分支创建，合并后删除。任何 Agent 不得自行创建第二条长期主线。

---

## 9. 变更审查规则

每个提交必须满足一个可独立审查的目的，推荐提交格式：

```text
test(refactor): lock foundation dependency policy
build(refactor): pin runtime and direct dependencies
ci(refactor): add modular monolith verification gate
feat(shared): add domain result and error contracts
feat(shared): add refactor feature flags
feat(shared): add audit recorder contract
build(refactor): enforce domain dependency direction
docs(refactor): record legacy and schema baselines
```

禁止使用：

```text
update
fix stuff
complete refactor
misc changes
```

每次阶段合并前必须对比基线和最终 SHA，确认没有越过阶段边界的功能扩张。