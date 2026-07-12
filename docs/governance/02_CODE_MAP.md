# Link168 V2 代码地图

**文件名：** `docs/governance/02_CODE_MAP.md`  
**版本：** v1.2  
**生效日期：** 2026-07-12  
**性质：** 工程治理附件  
**上位规则：** `PRODUCT_CONSTITUTION.md` v1.6、`PRD.md` v2.0-rc8、`PROJECT_RULES.md` v1.0-rc3

> 本文件说明代码位置、领域归属、测试位置和治理入口，不创造新的产品规则。发生冲突时，以上位正式文件为准。

---

## 1. 当前正式代码基线

- 仓库：`weex13148-gif/link168.me`
- 正式V2分支：`codex/link168-v2-direction`
- 正式本地工作区：`D:\77.me\branches\link168-v2-direction`
- 技术栈：Next.js App Router、React、TypeScript、Prisma、PostgreSQL、Node.js
- 架构：模块化单体
- 用户侧唯一主入口：`/console`
- 平台侧唯一管理后台：`/jeepwork`
- 公开经营名片：`/[username]`

旧`master`、旧工作区、归档副本和历史审计副本不作为V2当前代码事实。

---

## 2. 仓库顶层地图

```text
link168.me/
├─ PRODUCT_CONSTITUTION.md       # 唯一产品宪法
├─ PRD.md                        # 当前功能、页面、流程、价格与验收
├─ PROJECT_RULES.md              # Git、Agent、安全、数据库与部署规则
├─ DOCUMENT_INDEX.md             # 正式文档版本和优先级索引
├─ README.md                     # 分支入口和强制阅读顺序
├─ package.json                  # 依赖与工程命令
├─ package-lock.json             # 锁定依赖
├─ tsconfig.json                 # TypeScript配置
├─ next.config.ts                # Next.js配置
├─ eslint.config.mjs             # ESLint配置
├─ postcss.config.mjs            # 样式构建配置
├─ prisma.config.ts              # Prisma配置
├─ .env.example                  # 环境变量名称示例，不含真实密钥
├─ .github/
│  ├─ CODEOWNERS                 # 真实GitHub审批所有者
│  ├─ pull_request_template.md   # 模块、风险、验证和回滚模板
│  └─ workflows/
│     └─ governance.yml          # 治理、邮箱认证、构建与临时数据库验收
├─ src/
│  ├─ app/                       # 页面、布局、路由和Route Handler
│  ├─ components/                # 可复用UI与业务展示组件
│  ├─ features/                  # 按业务能力组织的功能编排
│  ├─ lib/                       # 服务端领域服务、适配器和公共库
│  ├─ types/                     # 跨模块稳定共享类型
│  └─ proxy.ts                   # 请求代理或兼容入口
├─ prisma/
│  ├─ schema.prisma              # 数据模型事实来源
│  └─ migrations/                # 数据库迁移历史
├─ scripts/
│  ├─ db/                        # 数据库校验、备份、恢复和迁移脚本
│  ├─ ai-test/                   # AI专项测试脚本
│  ├─ governance/                # 治理一致性检查脚本
│  ├─ auth-integration-test.mjs  # 邮箱认证真实API与临时PostgreSQL验收
│  └─ smoke-test.*               # 核心烟测
├─ tests/                        # 如存在，用于跨模块或端到端测试
├─ public/
│  └─ brand/                     # Link168品牌资源
└─ docs/
   ├─ governance/                # 工程治理附件
   ├─ audits/                    # 检查证据与唯一持续整改报告
   ├─ reference-images/          # 产品参考图
   ├─ DEVELOPMENT_DIRECTION_20260707.md
   ├─ PRD_Link168_V2_DIRECTION_20260707.md
   └─ CURATED_CODE_MANIFEST.md
```

不得提交：`.env*`、`node_modules`、`.next`、运行期上传目录、密钥、构建缓存和本地临时报告。

不存在的`tests/`、`config/`、`docker/`等目录不得为了“结构完整”空建。真实新增顶层目录前必须说明用途、Owner和更新本文件。

---

## 3. 测试代码放置规则

允许三种方式：

1. **就近测试：** 与业务文件同目录，使用`*.test.ts`、`*.test.tsx`、`*.spec.ts`或`*.spec.tsx`。
2. **集中测试：** 跨模块或端到端测试放在根`tests/`或现有专项测试目录。
3. **可重复验收脚本：** 需要启动应用、连接临时数据库或执行多接口流程时，放在现有`scripts/`中并由CI调用。

规则：

- Agent07负责测试策略和验收，不代表只有Agent07可以编写测试。
- 开发Agent应为自己修改的业务能力补相关测试。
- 测试不得包含真实生产密钥、真实客户数据和不可控外部调用。
- 不允许为通过测试复制一套独立业务逻辑。
- 邮箱认证集成测试只能使用临时PostgreSQL、测试账号和关闭的真实邮件发送。
- 新增测试框架或顶层测试目录需要更新本地图和开发规则。

---

## 4. 路由地图

### 4.1 访客与公开侧

| 路由 | 领域 | 主要职责 |
|---|---|---|
| `/` | public / growth | 官网价值、注册登录和模板入口 |
| `/register`、`/login` | identity | V2邮箱注册、密码登录和账号恢复 |
| `/[username]` | card | 公开经营名片、产品、联系方式、留资和访客AI接待 |
| `/templates` | card-components | 模板浏览与选择 |
| `/templates/[id]` | card-components | 模板详情与移动端预览 |
| `/s/[code]`或`/go/[code]` | analytics / channel | 短链跳转、来源和归因 |
| `/report` | governance | 用户举报入口 |

### 4.2 用户侧`/console`

一级分类永久固定：

```text
首页 / 名片 / 客户 / AI / 我的
```

| 一级分类 | 路由方向 | 承载内容 |
|---|---|---|
| 首页 | `/console` | 经营总览、名片状态、数据摘要、待办、最近客户、快捷操作 |
| 名片 | `/console/card`及二级页面 | 资料、组件、产品、主题、模板、预览、发布、二维码、短链 |
| 客户 | `/console/customers`、`/console/leads`等 | 线索、状态、跟进、来源、转化 |
| AI | `/console/ai`及二级页面 | 六大AI、访客AI、知识库、额度、记录、加量包 |
| 我的 | `/console/account`、会员和企业入口等 | 会员、订单、支付、账号安全、通知、推广、企业空间、设置 |

其他功能只能作为组件、快捷入口或二级页面，不增加第六个一级导航。

### 4.3 企业空间

| 路由方向 | 角色 | 主要职责 |
|---|---|---|
| `/console/enterprise/member` | 企业成员 | 授权资料、分配客户、企业AI额度 |
| `/console/enterprise/admin` | 企业管理员 | 本企业成员、品牌、产品、知识库、客户、域名、额度和审计 |

企业空间按`workspaceId`、角色和资源范围进行服务端隔离。V2成员接入采用Link168站内邮箱邀请，不依赖企业协作平台同步。

### 4.4 平台后台

| 路由 | 主要职责 |
|---|---|
| `/jeepwork` | 平台运营总览 |
| `/jeepwork/users` | 用户治理、冻结、会员处理 |
| `/jeepwork/orders` | 订单、退款和对账 |
| `/jeepwork/reports` | 举报、审核和申诉 |
| `/jeepwork/ai-usage` | AI用量、成本、风险和额度 |
| `/jeepwork/system-health` | 系统健康、任务和异常 |

普通用户和企业管理员不自动获得Jeepwork权限。

---

## 5. 目录与领域映射

十四个领域来自产品宪法。当前代码可能分散在`src/app`、`src/components`、`src/features`、`src/lib`和`prisma`，后续迁移不得破坏现有闭环。

| 领域 | 主要能力 | 典型位置 |
|---|---|---|
| `identity` | User、Session、邮箱登录、账号安全 | `src/app`、`src/features`、`src/lib`、`prisma` |
| `social-identity` | 微信和企业协作身份绑定；V2暂缓，已有未来结构保留 | `src/features`、`src/lib`、`prisma` |
| `card` | 名片、发布、公开页、联系方式 | `src/app`、`src/components`、`src/features` |
| `card-components` | 页面组件、模板、主题、统一渲染 | `src/components`、`src/features` |
| `catalog` | 产品与服务 | `src/app`、`src/features`、`prisma` |
| `crm` | 轻量客户线索和跟进 | `src/app`、`src/features`、`prisma` |
| `analytics` | 访问、点击、短链、来源、转化 | `src/lib`、`src/features`、`prisma` |
| `billing` | 套餐、订单、支付宝、退款、会员 | `src/app/api`、`src/lib`、`prisma` |
| `redemption` | 卡密生成、兑换和批次 | `src/lib`、`prisma`、`/jeepwork` |
| `channel` | 推广、归因、佣金和结算 | `src/features`、`src/lib`、`prisma` |
| `ai-platform` | 六大AI、知识库、额度、扣点、回补 | `src/app`、`src/features`、`src/lib/ai`、`prisma` |
| `workspace` | 企业空间、成员、权限、企业资产 | `src/features`、`src/lib`、`prisma` |
| `enterprise-integration` | 企业连接器、组织同步、成员生命周期；V2暂缓，结构保留 | `src/features`、`src/lib`、`prisma` |
| `governance` | Jeepwork、举报、审计、安全、系统健康 | `src/app/jeepwork`、`src/lib`、`prisma` |

通知、配置、文件存储、监控和Console首页属于平台支撑或聚合能力，具体边界见`03_MODULE_BOUNDARY.md`，不新增为宪法外的核心领域。

---

## 6. 兼容区与迁移区

可能仍有可复用代码但不再是V2新功能目标入口：

- `/dashboard`
- `/workbench`
- `/api/dashboard`
- `/api/workbench`
- `src/components/dashboard*`
- `src/components/workbench`

处理规则：

1. 确认是否被`/console`复用或依赖。
2. 新能力只进入`/console`对应领域。
3. 旧路径优先保留兼容跳转或适配层。
4. 未完成迁移前不得直接删除旧路径、字段或模型。
5. 删除需依赖、数据、migration和生产影响评估，并取得老板批准。

旧`/admin`不作为V2平台后台；平台后台统一使用`/jeepwork`。

`/showcase`不得在普通首页提供入口。相关历史模型和migration不得未经专项审批直接删除。

---

## 7. 数据模型地图

数据库事实以`prisma/schema.prisma`和正式migration为准，主要对象包括：

- User、Session、ExternalIdentity
- Profile、Link、ProfileModule、Template、Theme
- Product / Service
- Lead、客户状态和跟进记录
- ProfileVisit、LinkClick、ShortLink、ShortLinkClick
- Order、MembershipSubscription、Payment、Refund
- AI账户、套餐额度、购买点数批次、企业共享额度和流水
- Workspace、WorkspaceMember、权限和企业资产
- EnterpriseIntegration、ExternalDepartment、ExternalMember、PendingWorkspaceMember
- RedemptionCode、推广归属、佣金和结算
- Report、AdminAuditLog、系统健康和安全日志

任何页面不得把自身状态当作会员、权限、订单或额度权威来源。

---

## 8. 第三方能力地图

| 能力 | 当前方向 | 边界 |
|---|---|---|
| 邮件 | 阿里云邮件推送 | 服务端调用，失败不得伪装成功；CI只使用关闭邮件的临时环境 |
| AI | 阿里云百炼 | 服务端鉴权、扣点、成本、回补 |
| 支付 | 支付宝 | 订单、签名、回调、金额、幂等真实校验 |
| 数据库 | 阿里云PostgreSQL | 生产只允许正式migration流程；CI使用临时PostgreSQL 16 |
| 网站服务 | 腾讯云主服务器 | 部署由Agent08按授权执行 |
| 企业协作 | 企业微信、飞书、钉钉 | V2不接入，已有未来结构保留，不作为当前运行依赖 |

真实密钥不得进入仓库、前端、PRD、Agent报告或明文日志。

---

## 9. 文件归属规则

- 页面和Route Handler：`src/app`
- 可复用视觉与交互组件：`src/components`
- 领域功能编排：`src/features`
- 服务端领域服务、第三方适配和基础库：`src/lib`
- 跨模块稳定类型：`src/types`
- 数据模型与迁移：`prisma`
- 可重复维护和测试脚本：`scripts`
- GitHub审批和CI：`.github`
- 品牌资源：`public/brand`
- 正式规则：根目录四份正式文件
- 工程治理附件：`docs/governance`
- 唯一持续整改状态：`docs/audits/REMEDIATION_DEVELOPMENT_REPORT.md`

禁止把业务规则散落到页面文案、组件常量和重复配置中。

---

## 10. 代码地图更新流程

以下变化必须同步本文件：

- 新增、删除或调整顶层目录
- 新增或调整核心领域
- `/console`或`/jeepwork`信息架构变化
- 重要目录迁移
- 数据模型权威来源变化
- 第三方能力接入方式变化
- 旧兼容入口正式退出
- 测试目录或CI结构变化

流程：

```text
提出目录或结构变化
→ 说明用途、Owner和影响
→ Agent01/03复核
→ 涉及产品范围时由Agent02核对并交老板批准
→ 修改代码和本地图
→ npm run governance:check
```

普通样式、文案和局部组件调整不需要更新代码地图。
