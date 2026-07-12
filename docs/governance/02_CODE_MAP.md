# Link168 V2 代码地图

**文件名：** `docs/governance/02_CODE_MAP.md`  
**版本：** v1.3  
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
├─ PRODUCT_CONSTITUTION.md
├─ PRD.md
├─ PROJECT_RULES.md
├─ DOCUMENT_INDEX.md
├─ README.md
├─ package.json
├─ package-lock.json
├─ tsconfig.json
├─ next.config.ts                # 安全头与旧用户路径兼容跳转
├─ prisma.config.ts
├─ .env.example
├─ .github/
│  ├─ CODEOWNERS
│  ├─ pull_request_template.md
│  └─ workflows/
│     └─ governance.yml          # 治理、认证、Console、构建与浏览器验收
├─ src/
│  ├─ app/
│  │  ├─ console/                # 五分类正式用户入口、二级适配页和状态页
│  │  ├─ dashboard/              # 旧名片入口，保留兼容
│  │  ├─ workbench/              # 旧业务页面，保留兼容与复用
│  │  └─ jeepwork/               # 平台管理后台
│  ├─ components/
│  │  ├─ layout/                 # Console共享导航和路由策略
│  │  ├─ dashboard-v1/           # 名片编辑器及内部工具标签
│  │  └─ workbench/              # 旧业务Shell兼容层
│  ├─ features/
│  ├─ lib/
│  ├─ types/
│  └─ proxy.ts
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
├─ scripts/
│  ├─ db/
│  ├─ ai-test/
│  ├─ governance/
│  ├─ auth-integration-test.mjs       # 邮箱认证真实API验收
│  ├─ console-integration-test.mjs    # Console正式路由和旧路径跳转验收
│  ├─ console-mobile-browser-test.cjs # 360/390/430px Chromium验收
│  └─ smoke-test.*
├─ public/
│  └─ brand/
└─ docs/
   ├─ governance/
   ├─ audits/
   ├─ reference-images/
   ├─ DEVELOPMENT_DIRECTION_20260707.md
   ├─ PRD_Link168_V2_DIRECTION_20260707.md
   └─ CURATED_CODE_MANIFEST.md
```

不得提交：`.env*`、`node_modules`、`.next`、运行期上传目录、真实密钥、构建缓存和本地临时报告。

---

## 3. 测试代码放置规则

允许三种方式：

1. **就近测试：** 与业务文件同目录，使用`*.test.ts`、`*.test.tsx`、`*.spec.ts`或`*.spec.tsx`。
2. **集中测试：** 跨模块或端到端测试放在根`tests/`或现有专项测试目录。
3. **可重复验收脚本：** 需要启动应用、连接临时数据库或执行多接口和浏览器流程时，放在`scripts/`并由CI调用。

规则：

- 测试不得包含真实生产密钥、真实客户数据和不可控外部调用。
- 不允许为通过测试复制一套独立业务逻辑。
- 邮箱和Console集成测试使用临时PostgreSQL、测试账号和关闭的真实邮件发送。
- 移动端验收使用CI临时安装的Playwright与Chromium，不写入项目依赖或锁文件。
- 浏览器截图属于短期CI证据，不提交到正式仓库。
- Agent07负责测试策略和验收，不代表只有Agent07可以编写测试。

---

## 4. 路由地图

### 4.1 访客与公开侧

| 路由 | 领域 | 主要职责 |
|---|---|---|
| `/` | public / growth | 官网价值、注册登录和模板入口 |
| `/register`、`/login` | identity | V2邮箱注册、密码登录和账号恢复 |
| `/[username]` | card | 公开经营名片、产品、联系方式、留资和访客AI接待 |
| `/templates`、`/templates/[id]` | card-components | 模板浏览、详情和移动端预览 |
| `/s/[code]`或`/go/[code]` | analytics / channel | 短链跳转、来源和归因 |
| `/report` | governance | 用户举报入口 |

### 4.2 用户侧一级分类

一级分类永久固定：

```text
首页 / 名片 / 客户 / AI / 我的
```

| 分类 | 正式路由 | 承载内容 |
|---|---|---|
| 首页 | `/console` | 经营总览、状态、数据摘要、待办和快捷操作 |
| 名片 | `/console/card` | 名片资料、组件、主题、分享和内部装修工具 |
| 客户 | `/console/customers` | 线索、状态、跟进、来源和转化 |
| AI | `/console/ai` | 六大AI、访客接待、知识库和服务配置 |
| 我的 | `/console/account` | 会员、企业、通知、账号和安全设置 |

普通用户导航不得出现`/jeepwork`。

### 4.3 正式二级路由

| 分类 | 二级路由 | 当前实现 |
|---|---|---|
| 名片 | `/console/card/products` | 复用现有产品与服务页面 |
| 名片 | `/console/card/short-links` | 复用现有短链接页面 |
| 名片 | `/console/card/analytics` | 复用现有数据分析页面 |
| AI | `/console/ai/[assistant]` | 六大AI会话页 |
| AI | `/console/ai/service` | 访客AI服务配置 |
| AI | `/console/ai/reception` | 访客AI接待页面 |
| AI | `/console/ai/knowledge` | 知识库页面 |
| 我的 | `/console/account/membership` | 会员与套餐 |
| 我的 | `/console/account/enterprise` | 企业空间入口 |
| 我的 | `/console/account/notifications` | 通知中心 |

适配页只复用成熟实现，不复制业务服务、权限判断或数据库逻辑。

### 4.4 企业空间

| 路由方向 | 角色 | 主要职责 |
|---|---|---|
| `/console/enterprise/member` | 企业成员 | 授权资料、分配客户、企业AI额度 |
| `/console/enterprise/admin` | 企业管理员 | 本企业成员、品牌、产品、知识库、客户、域名、额度和审计 |

企业空间按`workspaceId`、角色和资源范围进行服务端隔离。V2成员接入采用Link168站内邮箱邀请，不依赖企业协作平台同步。

### 4.5 平台后台

| 路由 | 主要职责 |
|---|---|
| `/jeepwork` | 平台运营总览 |
| `/jeepwork/users` | 用户治理、冻结和会员处理 |
| `/jeepwork/orders` | 订单、退款和对账 |
| `/jeepwork/reports` | 举报、审核和申诉 |
| `/jeepwork/ai-usage` | AI用量、成本、风险和额度 |
| `/jeepwork/system-health` | 系统健康、任务和异常 |

普通用户和企业管理员不自动获得Jeepwork权限。

---

## 5. 旧路径兼容地图

旧页面代码保留，但用户访问以下旧地址时使用临时307跳入正式Console路径：

| 旧地址 | 正式地址 |
|---|---|
| `/dashboard` | `/console/card` |
| `/workbench` | `/console` |
| `/workbench/card` | `/console/card` |
| `/workbench/products` | `/console/card/products` |
| `/workbench/short-links` | `/console/card/short-links` |
| `/workbench/analytics` | `/console/card/analytics` |
| `/workbench/leads` | `/console/customers` |
| `/workbench/ai` | `/console/ai` |
| `/workbench/ai/:assistant` | `/console/ai/:assistant` |
| `/workbench/ai-service` | `/console/ai/service` |
| `/workbench/knowledge` | `/console/ai/knowledge` |
| `/workbench/account` | `/console/account` |
| `/workbench/membership` | `/console/account/membership` |
| `/workbench/enterprise` | `/console/account/enterprise` |
| `/workbench/notifications` | `/console/account/notifications` |

处理规则：

1. 新用户能力只进入`/console`对应分类。
2. 旧业务文件继续作为兼容与复用来源，不直接删除。
3. 删除旧路径或模型前必须完成依赖、数据、migration和生产影响评估，并取得老板批准。
4. 旧`/admin`不作为V2平台后台；平台后台统一使用`/jeepwork`。
5. `/showcase`不得在普通首页提供入口，历史模型和migration不得未经审批删除。

---

## 6. 目录与领域映射

| 领域 | 主要能力 | 典型位置 |
|---|---|---|
| `identity` | User、Session、邮箱登录、账号安全 | `src/app`、`src/lib`、`prisma` |
| `social-identity` | 微信和企业协作身份绑定；V2暂缓，未来结构保留 | `src/features`、`src/lib`、`prisma` |
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
| `enterprise-integration` | 企业连接器；V2暂缓，未来结构保留 | `src/features`、`src/lib`、`prisma` |
| `governance` | Jeepwork、举报、审计、安全和系统健康 | `src/app/jeepwork`、`src/lib`、`prisma` |

通知、配置、文件存储、监控和Console首页属于平台支撑或聚合能力，不新增为宪法外核心领域。

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
| 邮件 | 阿里云邮件推送 | 服务端调用，失败不得伪装成功；CI关闭真实发送 |
| AI | 阿里云百炼 | 服务端鉴权、扣点、成本和回补 |
| 支付 | 支付宝 | 订单、签名、回调、金额和幂等真实校验 |
| 数据库 | 阿里云PostgreSQL | 生产只允许正式migration；CI使用临时PostgreSQL 16 |
| 网站服务 | 腾讯云主服务器 | 部署由Agent08按授权执行 |
| 浏览器验收 | Playwright Chromium | CI临时安装，不写项目依赖，覆盖360/390/430px |
| 企业协作 | 企业微信、飞书、钉钉 | V2不接入，未来结构保留 |

真实密钥不得进入仓库、前端、PRD、Agent报告或明文日志。

---

## 9. 文件归属规则

- 页面和Route Handler：`src/app`
- 可复用视觉与交互组件：`src/components`
- 领域功能编排：`src/features`
- 服务端领域服务和基础库：`src/lib`
- 跨模块稳定类型：`src/types`
- 数据模型与迁移：`prisma`
- 可重复维护和测试脚本：`scripts`
- GitHub审批和CI：`.github`
- 品牌资源：`public/brand`
- 正式规则：根目录四份正式文件
- 工程治理附件：`docs/governance`
- 唯一持续整改状态：`docs/audits/REMEDIATION_DEVELOPMENT_REPORT.md`

---

## 10. 代码地图更新流程

以下变化必须同步本文件：

- 新增、删除或调整顶层目录
- 新增或调整核心领域
- `/console`或`/jeepwork`信息架构变化
- 正式或兼容路由变化
- 数据模型权威来源变化
- 第三方能力接入方式变化
- 测试目录、浏览器验收或CI结构变化

流程：

```text
提出目录或结构变化
→ 说明用途、Owner和影响
→ Agent01/03复核
→ 涉及产品范围时由Agent02核对并交老板批准
→ 修改代码和本地图
→ npm run governance:check
```
