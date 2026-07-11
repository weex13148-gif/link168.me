# Link168 V2 代码地图

**文件名：** `docs/governance/02_CODE_MAP.md`  
**版本：** v1.0  
**生效日期：** 2026-07-12  
**性质：** 工程治理附件  
**上位规则：** `PRODUCT_CONSTITUTION.md` v1.6、`PRD.md` v2.0-rc8、`PROJECT_RULES.md` v1.0-rc3

> 本文件只说明代码位置、领域归属和入口关系，不创造新的产品规则。发生冲突时，以上位正式文件为准。

---

## 1. 当前正式代码基线

- 仓库：`weex13148-gif/link168.me`
- 正式 V2 分支：`codex/link168-v2-direction`
- 正式本地工作区：`D:\77.me\branches\link168-v2-direction`
- 技术栈：Next.js App Router、React、TypeScript、Prisma、PostgreSQL、Node.js
- 架构：模块化单体
- 用户侧唯一主入口：`/console`
- 平台侧唯一管理后台：`/jeepwork`
- 公开经营名片：`/[username]`

旧 `master`、旧工作区、归档副本、历史审计副本不作为 V2 当前代码事实。

---

## 2. 仓库顶层地图

```text
link168.me/
├─ PRODUCT_CONSTITUTION.md       # 唯一产品宪法，最高产品规则
├─ PRD.md                        # 当前功能、页面、流程、价格与验收
├─ PROJECT_RULES.md              # Git、Agent、安全、数据库与部署规则
├─ DOCUMENT_INDEX.md             # 正式文档版本和优先级索引
├─ README.md                     # 分支入口说明
├─ package.json                  # 依赖与工程命令
├─ package-lock.json             # 锁定依赖
├─ tsconfig.json                 # TypeScript 配置
├─ next.config.ts                # Next.js 配置
├─ eslint.config.mjs             # ESLint 配置
├─ postcss.config.mjs            # 样式构建配置
├─ prisma.config.ts              # Prisma 配置
├─ .env.example                  # 环境变量名称示例，不含真实密钥
├─ src/
│  ├─ app/                       # 页面、路由、Route Handler、布局
│  ├─ components/                # 可复用 UI 与业务展示组件
│  ├─ features/                  # 按业务能力组织的功能模块
│  ├─ lib/                       # 服务端能力、领域服务、第三方适配与公共库
│  ├─ types/                     # 跨模块共享类型
│  └─ proxy.ts                   # 请求代理或兼容入口
├─ prisma/
│  ├─ schema.prisma              # 数据模型事实来源
│  └─ migrations/                # 数据库迁移历史
├─ scripts/
│  ├─ db/                        # 数据库校验、备份、恢复与维护脚本
│  ├─ ai-test/                   # AI 专项测试脚本
│  └─ smoke-test.*               # 核心烟测
├─ public/
│  └─ brand/                     # Link168 品牌资源
└─ docs/
   ├─ governance/                # 本轮工程治理附件
   ├─ audits/                    # 仓库检查证据与唯一持续整改报告
   ├─ reference-images/          # 产品参考图
   ├─ DEVELOPMENT_DIRECTION_20260707.md
   ├─ PRD_Link168_V2_DIRECTION_20260707.md
   └─ CURATED_CODE_MANIFEST.md
```

不得提交：`.env*`、`node_modules`、`.next`、运行期上传目录、密钥、构建缓存和本地临时报告。

---

## 3. 路由地图

### 3.1 访客与公开侧

| 路由 | 领域 | 主要职责 |
|---|---|---|
| `/` | growth / public | 官网价值说明、注册登录和模板入口 |
| `/register`、`/login` | identity | 邮箱注册登录及未来微信授权入口 |
| `/[username]` | card | 公开经营名片、产品、联系方式、留资和访客 AI 接待 |
| `/templates` | card-components | 模板浏览与选择 |
| `/templates/[id]` | card-components | 模板详情与移动端预览 |
| `/s/[code]` 或 `/go/[code]` | analytics / channel | 短链跳转、访问来源和归因 |
| `/report` | governance | 用户举报入口 |

### 3.2 用户侧 `/console`

用户后台一级分类永久固定为：

```text
首页 / 名片 / 客户 / AI / 我的
```

| 一级分类 | 路由方向 | 承载内容 |
|---|---|---|
| 首页 | `/console` | 经营总览、名片状态、数据摘要、待办、最近客户和快捷操作 |
| 名片 | `/console/card` 及二级页面 | 资料、组件、产品、主题、模板、预览、发布、二维码和短链 |
| 客户 | `/console/customers`、`/console/leads` 等二级页面 | 线索、客户状态、跟进记录、来源和转化分析 |
| AI | `/console/ai` 及二级页面 | 六大 AI Agent、访客 AI、知识库、额度、记录和加量包 |
| 我的 | `/console/account`、`/console/membership`、企业入口等 | 会员、订单、支付、身份绑定、通知、推广、企业空间和设置 |

其他功能必须作为组件卡片、快捷入口或二级页面存在，不得增加第六个一级导航。

### 3.3 企业空间

| 路由方向 | 角色 | 主要职责 |
|---|---|---|
| `/console/enterprise/member` | 企业成员 | 查看授权企业资料、处理分配客户、使用企业 AI 额度 |
| `/console/enterprise/admin` | 企业管理员 | 管理本企业成员、品牌、产品、知识库、客户池、域名、额度和审计 |

企业空间必须按 `workspaceId`、角色和资源范围进行服务端隔离。

### 3.4 平台后台

| 路由 | 角色 | 主要职责 |
|---|---|---|
| `/jeepwork` | 平台管理员 | 平台运营总览 |
| `/jeepwork/users` | 客服/系统管理员 | 用户治理、冻结和会员处理 |
| `/jeepwork/orders` | 财务管理员 | 订单、退款和对账 |
| `/jeepwork/reports` | 内容审核员 | 举报、审核和申诉 |
| `/jeepwork/ai-usage` | AI/系统管理员 | AI 用量、成本、风险和额度 |
| `/jeepwork/system-health` | 系统管理员 | 系统健康、任务和异常 |

普通用户导航不得展示 `/jeepwork`。企业管理员也不自动获得平台后台权限。

---

## 4. 核心领域地图

下列领域名称来自产品宪法第十章，属于目标逻辑边界。当前代码可能仍分散在 `src/app`、`src/components`、`src/features` 和 `src/lib`，后续迁移不得破坏现有闭环。

| 领域 | 主要能力 | 典型代码位置 |
|---|---|---|
| `identity` | User、Session、邮箱注册登录、账号安全 | `src/app`、`src/features`、`src/lib`、`prisma` |
| `social-identity` | 微信、企业微信、飞书、钉钉身份绑定 | `src/features`、`src/lib`、`prisma` |
| `card` | 经营名片、发布、公开页、联系方式 | `src/app`、`src/components`、`src/features` |
| `card-components` | 页面组件、模板、主题、统一渲染 | `src/components`、`src/features` |
| `catalog` | 产品与服务、上下架、展示和咨询 | `src/app`、`src/features`、`prisma` |
| `crm` | 客户线索、状态、跟进和分配 | `src/app`、`src/features`、`prisma` |
| `analytics` | 访问、点击、短链、来源和转化 | `src/lib`、`src/features`、`prisma` |
| `billing` | 套餐、订单、支付宝、退款和会员 | `src/app/api`、`src/lib`、`prisma` |
| `redemption` | 卡密生成、兑换和批次 | `src/lib`、`prisma`、`/jeepwork` |
| `channel` | 推广员、渠道、归因、佣金和结算 | `src/features`、`src/lib`、`prisma` |
| `ai-platform` | 六大 Agent、知识库、额度、扣点和回补 | `src/app`、`src/features`、`src/lib/ai`、`prisma` |
| `workspace` | 企业空间、成员、权限和企业资产 | `src/features`、`src/lib`、`prisma` |
| `enterprise-integration` | 企业协作连接器、组织同步和成员生命周期 | `src/features`、`src/lib`、`prisma` |
| `governance` | Jeepwork、举报、审计、安全和系统健康 | `src/app/jeepwork`、`src/lib`、`prisma` |

---

## 5. 当前兼容区与迁移区

以下路径或命名可能仍有可复用代码，但不再是 V2 新功能的目标入口：

- `/dashboard`
- `/workbench`
- `/api/dashboard`
- `/api/workbench`
- `src/components/dashboard*`
- `src/components/workbench`

处理规则：

1. 先确认是否被 `/console` 复用或依赖。
2. 新能力只进入 `/console` 对应领域。
3. 旧路径优先保留兼容跳转或适配层。
4. 未完成迁移前不得直接删除旧路径、字段或模型。
5. 删除必须经过依赖、数据、迁移和生产影响评估，并取得老板批准。

旧 `/admin` 不作为 V2 平台后台；平台后台统一使用 `/jeepwork`。

`/showcase` 不得在普通首页提供入口。相关历史模型和迁移不得未经专项审批直接删除。

---

## 6. 数据模型地图

数据库事实以 `prisma/schema.prisma` 和正式 migration 为准。主要业务对象包括：

- `User`、Session 与外部身份
- `Profile`、Link、ProfileModule 与模板主题
- Product / Service
- Lead、客户状态与跟进记录
- ProfileVisit、LinkClick、ShortLink、ShortLinkClick
- Order、MembershipSubscription、退款与支付记录
- AI 账户、套餐额度、购买点数批次、企业共享额度和流水
- Workspace、WorkspaceMember、权限和企业资产
- EnterpriseIntegration、ExternalDepartment、ExternalMember、PendingWorkspaceMember
- RedemptionCode、推广渠道、佣金和结算
- Report、AdminAuditLog、系统健康与安全日志

任何页面不得直接把自身状态当作会员、权限、订单或额度的权威来源。

---

## 7. 第三方能力地图

| 能力 | 当前方向 | 边界 |
|---|---|---|
| 邮件 | 阿里云邮件推送 | 服务端调用，失败不得伪装成功 |
| AI | 阿里云百炼 | 服务端统一鉴权、扣点、成本和失败回补 |
| 支付 | 支付宝 | 订单、签名、回调、金额和幂等必须真实校验 |
| 数据库 | 阿里云 PostgreSQL | 生产只允许正式 migration 流程 |
| 网站服务 | 腾讯云主服务器 | 部署由服务器 Agent 按授权执行 |
| 企业协作 | 企业微信、飞书、钉钉 | 通过统一连接层和平台适配器接入 |

真实密钥不得进入仓库、前端、PRD、Agent报告或明文日志。

---

## 8. 文件归属规则

- 页面和 Route Handler：`src/app`
- 可复用视觉与交互组件：`src/components`
- 领域功能编排：`src/features`
- 服务端领域服务、第三方适配和基础库：`src/lib`
- 跨模块稳定类型：`src/types`
- 数据模型与迁移：`prisma`
- 可重复执行的维护和测试脚本：`scripts`
- 品牌资源：`public/brand`
- 正式规则：仓库根目录四份正式文件
- 工程治理附件：`docs/governance`
- 唯一持续整改状态：`docs/audits/REMEDIATION_DEVELOPMENT_REPORT.md`

禁止把业务规则散落到页面文案、组件常量和重复配置中。

---

## 9. 代码地图更新条件

发生以下变化时必须同步更新本文件：

- 新增或调整一级领域
- `/console` 或 `/jeepwork` 信息架构变化
- 重要目录迁移
- 数据模型权威来源变化
- 第三方能力接入方式变化
- 旧兼容入口正式退出

普通样式、文案、局部组件调整不需要更新代码地图。
