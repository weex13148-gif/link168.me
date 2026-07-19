# Link168 模块化单体全面重构设计

- 状态：APPROVED FOR PLANNING
- 日期：2026-07-19
- 仓库：`weex13148-gif/link168.me`
- 基线分支：`master`
- 已知基线提交：`5e8831b12e7528a4956ecae6953ad694609c3a20`
- 唯一长期重构分支：`refactor/link168-modular-monolith-r1`

## 1. 背景与问题定义

Link168 已经从数字名片 MVP 扩张为包含账号、页面编辑器、公开主页、产品与服务、AI 接待、CRM、统计、会员、订单、支付、媒体审核、超级管理员和企业能力的中大型 SaaS 半成品。当前主要问题不是单个页面样式，而是重复实现、状态口径冲突、权限判断分散、功能入口过多、业务链路无法完整验收。

本次选择“全面重构”，但不采用推倒重写。重构采用模块化单体和绞杀者迁移：保留可复用数据与能力，将业务规则逐步迁入清晰的领域模块，再逐条替换旧页面和旧 API。

## 2. 目标

首个可发布版本只交付一条完整经营闭环：

```text
创建商业主页
→ 展示产品与服务
→ AI 接待访客
→ 访客明确同意后留资
→ 创建 Lead
→ 商家跟进
→ 标记成交
→ 查看基础经营数据
```

重构必须实现：

1. 一个普通用户后台；
2. 一个页面编辑器；
3. 一个公开主页渲染器；
4. 一个 AI 接待客户端和服务入口；
5. 一个 Lead 创建入口；
6. 一个账号状态守卫；
7. 一个公开资源守卫；
8. 一个套餐权益服务；
9. 一个媒体资产生命周期；
10. 一套访问、咨询、线索、成交指标口径。

## 3. 非目标

本轮不建设或扩展：

- 微服务、Kubernetes、Kafka；
- 企业客服坐席、人工接管、会话分配、WebSocket；
- Workspace、企业成员、企业域名、企业共享额度；
- SMS、Webhook、微信支付；
- 多种 AI Agent；
- 高级短链接、高级导出、复杂营销自动化；
- 音乐、复杂视频、弹窗图片、复杂轮播等非核心组件；
- 生产数据库试错和真实支付调用。

这些能力可以保留旧代码或数据，但不进入首版导航、营销承诺和默认组件库。

## 4. 总体架构

继续使用模块化单体：

```text
Link168
├── Web
│   ├── 营销官网
│   ├── 唯一用户后台
│   ├── 唯一公开主页
│   └── Jeepwork 超级后台
├── Core Domains
│   ├── Identity
│   ├── Profile
│   ├── Catalog
│   ├── Reception
│   ├── CRM
│   ├── Analytics
│   ├── Billing
│   └── Media
└── Infrastructure
    ├── PostgreSQL
    ├── Redis
    ├── 阿里百炼
    ├── 阿里云邮件
    ├── OSS/COS
    └── 支付宝
```

建议目录：

```text
src/
├── app/                     # 路由和页面，只处理协议适配与展示
├── domains/
│   ├── identity/
│   ├── profile/
│   ├── catalog/
│   ├── reception/
│   ├── crm/
│   ├── analytics/
│   ├── billing/
│   └── media/
├── infrastructure/
│   ├── database/
│   ├── redis/
│   ├── mail/
│   ├── ai/
│   ├── storage/
│   └── payment/
├── components/
└── shared/
```

API Route 不再直接编排复杂 Prisma 查询。Route 负责认证输入、参数校验、调用领域服务和序列化响应。领域服务负责权限、状态、事务、幂等、审计、缓存失效和业务事件。

## 5. 旧代码处置

旧代码按三种状态管理：

- `KEEP`：已经验证，可直接复用；
- `MIGRATING`：调用逐步切换到新领域服务；
- `RETIRED`：入口关闭，等待删除。

禁止新旧写入逻辑同时启用。读取可以短期兼容旧数据，但任何业务动作只能存在一个权威写入口。

## 6. 产品范围与页面信息架构

### 6.1 普通用户后台

只保留六个一级入口：

1. **主页**：资料、头像、封面、页面组件、主题、预览、发布；
2. **产品与服务**：产品、服务、排序、上下架、AI 推荐开关；
3. **AI 接待**：启停、助手信息、知识资料、快捷问题、对话、额度；
4. **客户线索**：Lead、来源、联系方式、跟进、状态；
5. **经营数据**：访问、咨询、线索、成交和近 7 天趋势；
6. **账户设置**：邮箱、密码、设备、套餐、额度、隐私、注销。

桌面端采用左侧导航、中间工作区、右侧手机预览。手机端不保留永久预览栏，改为显式“预览主页”入口，避免横向溢出和编辑区过度拥挤。

### 6.2 公开主页

首版只支持：

- 个人或企业信息；
- 普通链接；
- 图片或案例；
- 产品卡片；
- 服务卡片；
- AI 接待；
- 联系表单；
- 预约或报价。

预约和报价共用“业务咨询”底层提交服务，通过类型区分，不维护两套独立 Lead 写入逻辑。

### 6.3 必须退役的重复实现

- Dashboard 与 Workbench 双后台；
- 两套公开页 AI 客户端；
- 产品自动追加与产品组件重复展示；
- 旧 `admin` 普通管理员角色入口；
- 未经支付平台确认即本地标记退款成功的逻辑；
- 绕过统一公开资源守卫的接口；
- 上传返回成功但资源不可见的假成功状态。

## 7. 领域边界与状态机

### 7.1 Identity

用户主状态只保留：

```text
active | deactivated
```

风险和限制使用独立记录：

```text
EMAIL_UNVERIFIED | ADMIN_FREEZE | SECURITY_RISK | BANNED
```

统一产生 `AccountCapabilities`：

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

普通用户与超级管理员共享底层账号状态判断。系统超级管理员身份不可被删除、冻结、封禁或降级；相关操作必须由领域规则显式拒绝并写入审计。

### 7.2 Profile

`Profile.isPublic` 是唯一发布意图：

```text
新注册：isPublic = false
邮箱未验证：禁止发布
主动发布：isPublic = true，写入 publishedAt
主动下架：isPublic = false
```

冻结或封禁时不修改 `isPublic`，由公开资源守卫临时阻止访问。解除限制后恢复用户原发布意图。

公开访问必须同时满足：

```text
Profile.isPublic
AND User.accountStatus = active
AND emailVerified = true
AND 无公开访问限制
AND 资源属于该 Profile
```

主页、媒体、AI、联系表单、短链和 `/go` 必须使用同一公开资源守卫。

### 7.3 Media

统一 `MediaAsset` 生命周期：

```text
uploading → pending_review → approved → rejected → deleted
```

关键字段包括 owner、profile、purpose、storageProvider、objectKey、真实 MIME、大小、审核状态、审核供应商、原因和时间戳。

头像、封面、案例图、产品图和链接图标全部走同一上传、审核、读取、替换和删除流程。数据库只保存资产 ID 或稳定对象键，不再通过扫描目录寻找文件。

接口必须返回真实状态：待审核、已生效、未通过。禁止将“文件写入成功”描述为“公开图片已生效”。

### 7.4 Catalog

产品和服务各自具有稳定 ID、所有者、公开状态、排序和 AI 推荐开关。产品管理只负责业务数据；页面编辑器只负责选择、显示、位置和排序。公开页禁止自动追加所有产品。

### 7.5 Reception

标识职责固定：

- `visitorSessionId`：同一访客；
- `conversationId`：同一多轮对话；
- `requestId`：一次发送和扣费幂等。

AI 只能读取已公开主页资料、允许推荐的产品、允许引用的知识资料和当前会话有限历史。商家资料按不可信内容处理，必须与系统规则分隔，不能覆盖平台约束。AI 不知道价格、库存、承诺等事实时必须明确说明不知道。

对话首版只有 `active` 和 `closed`，不加入客服坐席和人工接管。

### 7.6 CRM

Lead 状态统一为：

```text
new | following | won | closed
```

所有来源调用一个 `leadService.createLead()`。创建必须满足：

- 访客明确同意留资；
- 至少一种联系方式；
- 存在明确需求；
- 来源页和来源组件真实；
- 请求幂等；
- 产品或服务快照不可伪造。

AI、联系表单、产品咨询、预约和报价不得直接写 Lead 表。后续部分更新不得用空值覆盖已存在联系方式。

### 7.7 Analytics

只保留四项指标：

```text
visit | consultation | lead | conversion
```

规则：

- `visit`：非机器人有效主页访问；
- `consultation`：有效联系方式点击、业务咨询提交或 AI 有效咨询；
- `lead`：真实 Lead 创建成功；
- `conversion`：Lead 首次进入 `won`。

所有事件有稳定幂等键。客户端不能通过任意 visitorId 或随机后缀刷高指标。所有 Dashboard 查询同一事件口径。

### 7.8 Billing

订阅状态：

```text
active | past_due | cancelled | expired
```

当前套餐和计划变更分离：

```ts
{
  currentPlanCode,
  currentPeriodStart,
  currentPeriodEnd,
  scheduledPlanCode,
  scheduledEffectiveAt
}
```

升级、降级必须按明确规则在当前或下个周期生效，不能只修改 `planCode` 造成权益提前或提前丢失。

AI Credits 完全账本化：

```text
grant | consume | refund | revoke | adjustment
```

余额是账本聚合结果，禁止绕过 Ledger 直接增减。退款只有在支付平台确认成功后才能改变订单和权益，并必须回收原订单赠送 Credits、记录审计。任一步失败都不能对用户返回“退款成功”。

## 8. 基础设施原则

- PostgreSQL 16 作为权威业务数据存储；
- Redis 用于生产限流、幂等和短期会话辅助；Redis 故障时，高风险写接口必须安全失败，不得静默退化为单进程内存限流；
- 阿里百练、邮件、存储和支付宝通过适配器接口接入；
- 外部服务状态统一为 `not_configured`、`configured_and_passed`、`configured_but_failed`；
- 敏感配置使用数据库加密，主加密密钥只在环境变量；
- 支持替换、禁用、删除和测试；空字段不能隐式保留旧密钥；
- 禁止在前端、日志和公开错误中暴露供应商密钥、模型配置和原始响应。

## 9. 迁移策略

采用绞杀者迁移：

```text
旧 Route → 新 Domain Service → 现有数据库或新扩展表
```

数据库迁移遵循：

```text
扩展 → 回填 → 双读验证 → 切换新写入 → 停止旧写入 → 删除旧字段
```

迁移脚本必须可重复执行，有迁移前后统计、异常记录和显式失败，不允许静默跳过异常数据。

## 10. 功能开关

重构阶段使用：

```ts
{
  newDashboard: false,
  newProfileDomain: false,
  newMediaPipeline: false,
  newAiReception: false,
  newLeadPipeline: false,
  newBilling: false
}
```

开发环境允许单独开启；测试环境按阶段开启；预生产全部开启；生产只在验收后开启。任何时刻新旧写入只能有一套启用。

## 11. 实施阶段

### Phase 0：基线冻结与骨架

- 固定 Node.js 22、PostgreSQL 16；
- 建立完整 CI；
- 建立领域目录、共享错误、结果对象、审计和功能开关；
- 建立旧代码状态清单和数据库迁移基线；
- 不改变用户可见业务行为。

### Phase 1：Identity、Profile、Media

跑通注册、验证、登录、创建主页、上传头像、发布和公开访问。完成账号守卫、原子 Token 消费、默认不公开、统一公开资源守卫和 MediaAsset 生命周期。

### Phase 2：Catalog、编辑器和公开页

完成产品服务领域、唯一页面模块、唯一编辑器、唯一公开页、新六项导航和手机布局；关闭双后台和产品重复展示。

### Phase 3：Reception、CRM、Analytics

完成稳定多轮会话、AI 商家知识边界、额度幂等、明确同意留资、统一 Lead、跟进成交、四项指标和 Redis 生产级保护。

### Phase 4：Billing、Credits、外部服务

完成套餐生效时点、账本、支付回调、退款补偿、外部服务三态和安全配置管理。在线支付在该阶段验收通过前保持关闭。

### Phase 5：退役与发布验收

删除确认无调用的旧 Route、重复组件和旧权限逻辑；执行数据迁移和全链路预生产验收；形成最终上线报告。

## 12. 测试与验证

### 单元测试

覆盖状态迁移、权限、幂等、额度、Lead 条件、统计事件和媒体生命周期。

### 集成测试

使用真实 PostgreSQL 16 和 Redis，覆盖事务、并发 Token、支付回调幂等、Credits 补偿、限流和迁移脚本。

### API 合约测试

固定 HTTP 状态码、错误码、字段白名单、权限边界、幂等键和敏感信息隔离。

### Playwright 主场景

```text
注册并验证
→ 创建主页
→ 上传头像
→ 添加产品
→ 发布
→ 访客 AI 三轮咨询
→ 明确同意留资
→ 后台出现 Lead
→ 添加跟进
→ 标记成交
→ 指标更新
```

### 手机验收

至少覆盖 390px 宽度、无横向溢出、导航、表单、图片上传、AI 输入框与软键盘、预览和实际公开页一致。

### 全量门禁

```text
npm ci
npx prisma validate
npx prisma generate
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build
git diff --check
```

所有命令退出码必须为 0。

## 13. 阶段完成标准

每个阶段必须同时满足：

- 代码完成；
- 自动测试通过；
- 浏览器场景通过；
- 数据库状态正确；
- 错误状态已验证；
- 对应旧入口已关闭；
- 文档已更新；
- CI 绿色。

允许的项目状态只有：

```text
IN_PROGRESS
BLOCKED
VERIFIED
READY_FOR_NEXT_PHASE
READY_FOR_PRODUCTION_APPROVAL
```

禁止以“基本完成”“大部分可用”“理论上可以”替代验收。

## 14. 安全与发布约束

- 不直接修改或覆盖 `master`；
- 不 force push；
- 不连接或修改生产数据库；
- 不调用真实支付和生产外部服务完成开发测试；
- 不把密钥写入仓库；
- 不伪造外部服务成功；
- 不删除 `/showcase` 和 `/jeepwork`；
- 超级管理员必须遵守统一账号能力判断，同时系统所有者身份必须受不可变保护；
- 重构完成前只能标记 `NOT READY FOR PRODUCTION`。

## 15. 风险与控制

1. **范围再次扩张**：任何新增页面、组件、套餐和领域必须拒绝或另立未来版本。
2. **新旧双写**：功能开关确保单一写入；CI 加结构性测试锁定。
3. **数据迁移遗漏**：迁移前后统计、异常清单和可重复脚本。
4. **外部服务不稳定**：适配器、三态健康检查和安全失败。
5. **重构长期不交付**：每个 Phase 都以可运行用户场景收口，不以目录重排作为完成。
6. **多 Agent 冲突**：一个总控、最多两个开发 Agent、一个独立测试 Agent，实行文件所有权。

## 16. 最终验收定义

只有以下条件全部满足，才允许进入生产审批：

- 注册、验证、登录和密码重置状态一致；
- 账号冻结、封禁、注销能阻止所有对应能力；
- 主页默认私有，发布和下架正确；
- 头像上传、审核、替换、读取和删除闭环；
- 产品与服务不重复展示；
- AI 三轮以上对话保持上下文；
- AI 只基于商家授权数据回答；
- AI 留资具备明确同意、联系方式和明确需求；
- 所有留资入口真实创建 Lead；
- Lead 跟进和 `won` 转化更新统一指标；
- 套餐权益、Credits、到期、变更和退款一致；
- 公开接口、举报、联系表单和 AI 具备生产级防刷；
- 六项后台导航和公开页在桌面、390px 手机均通过；
- 全量 CI 和 Playwright 绿色；
- 预生产外部服务验证有真实证据。

在此之前，项目状态固定为：

```text
NOT READY FOR PRODUCTION
```
