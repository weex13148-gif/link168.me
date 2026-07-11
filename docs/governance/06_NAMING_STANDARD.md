# Link168 V2 命名标准

**文件名：** `docs/governance/06_NAMING_STANDARD.md`  
**版本：** v1.1  
**生效日期：** 2026-07-12  
**性质：** 工程治理附件  
**上位规则：** `PRODUCT_CONSTITUTION.md` v1.6、`PRD.md` v2.0-rc8、`PROJECT_RULES.md` v1.0-rc3

> 本标准统一产品、页面、代码、数据库和Agent沟通中的名称。它不得改变产品宪法已经确定的产品身份、套餐结构和信息架构。

---

## 1. 核心术语表

| 术语 | 正式含义 | 不得混淆为 |
|---|---|---|
| Link168 | 产品正式名称 | Link 168、Link1688、LINK168 |
| Console / 用户后台 | 普通用户和企业成员使用的产品后台，正式路由前缀为`/console` | Jeepwork、Workspace、旧Dashboard或Workbench |
| Jeepwork / 平台后台 | 平台运营、审核、财务、系统和超级管理员使用的后台，正式路由前缀为`/jeepwork` | 企业空间、用户后台、开发Agent控制台 |
| Workspace / 企业空间 | 一个企业租户及其成员、品牌、客户、知识库、AI额度和企业资产的隔离容器 | Jeepwork或普通用户后台 |
| 开发Agent | Agent01–Agent08，代表开发过程中的职责角色 | 产品六大AI Agent、平台管理员、超级管理员或GitHub账号 |
| 产品AI Agent | 财税、法务、市场调研、设计、社媒运营、销售顾问六项用户产品能力 | 开发Agent01–Agent08 |
| 平台管理员 | Jeepwork中的真实产品角色 | Agent01–Agent08 |
| 平台超级管理员 | Jeepwork中的最高平台权限角色 | 项目总控Agent或老板身份本身 |
| User | Link168内部主账号，使用不可变User ID | 邮箱、手机号、OpenID、UnionID |
| ExternalIdentity | 邮箱、微信、企业微信、飞书、钉钉等外部登录或组织身份 | Link168主账号 |
| WorkspaceMember | User在某一Workspace中的企业成员身份 | 平台管理员或个人会员 |
| 会员 | Plus、Pro、企业版或企业Pro等付费权益状态 | 所有注册用户或企业成员的统称 |
| 客户 | 用户界面中的客户与线索总称 | 仅访问过页面但没有形成线索的访客 |
| Lead | 代码和数据模型中的客户线索实体 | 英文页面唯一显示词或完整CRM系统 |
| `crm`领域 | 轻量客户线索、状态、跟进和分配领域 | 完整CRM产品线 |
| 访客AI接待 | 名片访客使用、由名片主人权益支持的AI接待能力 | 六大经营Agent、通用聊天站 |
| P0/P1/P2 | 产品或开发优先级 | 生产事故SEV等级 |
| SEV-1/2/3 | 生产安全与可用性事件等级 | 产品功能优先级 |

---

## 2. 品牌名称

正式品牌名称：

```text
Link168
```

正式域名：

```text
link168.me
```

禁止作为正式名称：

- Link 168
- Link1688
- LINK168
- link168（正式品牌文案中）
- 链接168

中文品牌辅助表达可以使用：

```text
Link168 链接一路发
```

但产品正式名称仍为`Link168`。

---

## 3. 产品定位用语

正式定位：

> Link168 是面向自媒体、小商家、一人公司和轻量经营团队的 AI SaaS 经营名片工具与商业基础设施平台。

对外简化表达可以使用：

- AI经营名片
- 经营名片与客户转化工具
- 一张名片连接展示、获客、客户和AI

禁止把Link168描述为：

- 完整CRM
- 完整ERP
- 通用AI聊天站
- 私域群发工具
- 多级分销平台
- 比赛Demo
- 教学案例

`crm`作为代码领域名只代表轻量客户线索与跟进能力，不代表Link168要扩张为完整CRM。

---

## 4. 用户后台一级名称

用户后台一级分类固定为：

1. 首页
2. 名片
3. 客户
4. AI
5. 我的

英文或代码语义建议：

| 中文 | 代码语义 | 主入口 |
|---|---|---|
| 首页 | `home` / `overview` | `/console` |
| 名片 | `card` | `/console/card` |
| 客户 | `customers` / `leads` | `/console/customers`或兼容的`/console/leads` |
| AI | `ai` | `/console/ai` |
| 我的 | `me` / `account` | `/console/account`及二级入口 |

禁止新增第六个一级名称。产品、数据、会员、推广、企业空间等必须进入上述五类中的组件或二级页面。

---

## 5. 后台与空间名称

### 5.1 用户后台

正式名称：

```text
Console / 用户后台 / 控制台
```

正式路由前缀：

```text
/console
```

### 5.2 平台后台

正式名称：

```text
Jeepwork / 平台后台
```

正式路由前缀：

```text
/jeepwork
```

### 5.3 企业空间

正式名称：

```text
Workspace / 企业空间
```

Workspace是企业租户和企业资产容器，不是一个独立的第三套后台。企业成员和企业管理员仍从`/console`进入对应企业空间页面。

---

## 6. 旧名称与兼容名称

以下名称只允许用于历史兼容、迁移说明、旧路径和现存代码，不得继续作为新产品心智：

- Dashboard
- Workbench
- `/dashboard`
- `/workbench`
- `/admin`（旧平台后台）
- Enterprise AI独立产品线

处理方式：

1. 新功能进入`/console`或`/jeepwork`。
2. 旧路径保留兼容跳转或适配层。
3. 文档说明时必须标注“旧路径”“历史名称”或“兼容路径”。
4. 不得因为命名标准直接删除仍有依赖的旧代码。
5. CI不得简单扫描并禁止`dashboard`、`workbench`等单词，因为合法兼容代码和历史说明仍需要这些词。

---

## 7. 套餐名称

正式五档名称：

| 中文显示 | 推荐内部键 |
|---|---|
| 免费版 | `free` |
| Plus | `plus` |
| Pro | `pro` |
| 企业版 | `enterprise` |
| 企业Pro | `enterprise_pro` |

内部键必须在唯一套餐配置中集中定义，不得在页面、组件和API中散落硬编码。

历史别名只能用于读取旧订单、旧会员或数据迁移，不能继续生成新订单。

禁止新建：

- 会员基础版作为第六档
- Enterprise Pro Plus
- Internal Test作为对外套餐
- 不在五档结构中的公开销售套餐

---

## 8. AI名称

正式六大产品AI Agent：

| 中文名称 | 推荐代码键 |
|---|---|
| 财税助手 | `finance_tax` |
| 法务助手 | `legal` |
| 市场调研助手 | `market_research` |
| 设计助手 | `design` |
| 社媒运营助手 | `social_media` |
| 销售顾问 | `sales_advisor` |

统一上层名称：

- AI工作台
- AI额度
- AI加量包
- 访客AI接待
- 企业共享AI额度
- AI使用记录

禁止混用：

- AI钱包、Token余额、算力币等容易引起误解的名称
- 把点数描述为可提现、可转让或虚拟货币
- 把六大AI Agent写成免费版默认权益
- 使用“AI Reception”作为正式中文页面名称；英文技术说明可对应“访客AI接待”

---

## 9. 身份与账号名称

| 概念 | 代码语义 | 说明 |
|---|---|---|
| Link168主账号 | `User` | 内部不可变User ID是唯一主账号标识 |
| 外部身份 | `ExternalIdentity` | 邮箱、微信、企业微信、飞书、钉钉等绑定身份 |
| 个人空间 | personal scope | 用户个人名片、会员和个人数据 |
| 企业空间 | `Workspace` | 企业租户和企业资产容器 |
| 企业成员 | `WorkspaceMember` | User在企业空间中的成员身份 |
| 待激活企业成员 | `PendingWorkspaceMember` | 同步后尚未首次授权激活的成员 |

禁止：

- 直接把OpenID、UnionID、邮箱或手机号称为系统用户ID
- 把企业通讯录同步对象直接称为已注册用户
- 把外部成员标识暴露到公开页面
- 把“企业会员”与“企业成员”混为同一个概念

---

## 10. 客户与线索名称

用户界面使用：

- 客户
- 新客户
- 客户线索
- 跟进记录
- 来源
- 感兴趣产品

代码和模型可以使用单数`Lead`表示实体、复数`leads`表示集合或路由。页面一级分类固定为“客户”。

建议状态：

- 新线索
- 已联系
- 跟进中
- 已成交
- 无效

不得把访问记录直接称为客户；只有真实留资或符合正式服务端判定规则的对象才进入客户领域。

---

## 11. 优先级与事件等级

### 产品和开发优先级

- **P0：** 阻塞当前真实主闭环、上线或关键安全边界，必须优先完成。
- **P1：** 主闭环稳定后进入的重要增强，不能抢占未完成P0。
- **P2：** 后续优化、规模化或体验增强，不作为当前版本阻塞项。

### 生产事件等级

- **SEV-1：** 数据泄露、跨企业访问、支付错账、大面积不可用等重大事件。
- **SEV-2：** 核心能力部分不可用或明显影响一批用户。
- **SEV-3：** 非核心、局部或可绕过的问题。

不得用P0/P1表示生产事故严重度。

---

## 12. 路由和API命名

### 规则

- 使用小写英文和连字符。
- 路由表达用户任务，不表达临时实现状态。
- 用户侧统一在`/console`下。
- 平台侧统一在`/jeepwork`下。
- 企业成员和管理员页面统一在`/console/enterprise`下。
- API按领域命名，不继续扩张`/api/dashboard`和`/api/workbench`。
- 对外API路径变更必须遵守`09_SECURITY_DATA_OPERATIONS.md`的兼容与弃用规则。

推荐：

```text
/console/card
/console/customers
/console/ai
/console/ai-packs
/console/membership
/console/account
/console/enterprise/member
/console/enterprise/admin
/jeepwork/orders
/jeepwork/reports
/jeepwork/ai-usage
```

禁止新建：

- `/new-dashboard-v2`
- `/final-workbench`
- `/admin2`
- `/test-ai`
- `/demo-payment`

---

## 13. 代码文件与符号命名

### React组件

```text
PascalCase.tsx
```

示例：

- `BusinessCardPreview.tsx`
- `CustomerSummaryCard.tsx`
- `AiCreditOverview.tsx`

### hooks

```text
useXxx.ts
```

### 服务和领域模块

```text
kebab-case.ts
```

示例：

- `membership-service.ts`
- `ai-credit-ledger.ts`
- `workspace-access.ts`

### 类型和变量

- TypeScript类型、接口、枚举：PascalCase
- 函数和变量：camelCase
- 常量：在现有代码风格允许时使用UPPER_SNAKE_CASE
- 环境变量：UPPER_SNAKE_CASE并包含明确服务或领域前缀
- 数据库字段：遵循现有Prisma风格，不为局部任务大规模重命名

API响应使用稳定错误代码和用户可读信息，不直接暴露堆栈、数据库错误和第三方密钥信息。

---

## 14. 数据库命名

- Prisma模型使用单数PascalCase。
- 关系字段表达对象含义，不使用模糊缩写。
- 外部平台字段必须带平台或外部语义，避免与Link168内部ID混淆。
- 金额、点数、额度和时间字段必须明确单位。
- 状态字段必须有集中枚举或唯一规则来源。

推荐：

- `userId`
- `workspaceId`
- `externalIdentityId`
- `amountFen`
- `creditPoints`
- `expiresAt`
- `refundedAt`

禁止模糊字段：

- `uid`同时表示多种系统ID
- `money`不说明单位
- `count`不说明统计对象
- `status2`、`typeNew`、`tempFlag`

---

## 15. Git、提交与版本号

### 分支

- 正式V2分支固定为`codex/link168-v2-direction`。
- Agent不得自行创建分支；只有老板或明确授权流程允许时才能创建。
- 获得授权后的临时分支名称应表达任务，不得使用`final-final`、`new2`等模糊名称。

### 提交信息

推荐使用：

```text
docs: ...
fix: ...
feat: ...
refactor: ...
test: ...
chore: ...
```

提交信息必须描述真实变更，不得写“全部完成”“最终修复”等无法验证的结论。

### 文档版本

- 产品宪法：`v主版本.次版本`
- PRD与未最终收口文件：可使用`v主版本.次版本-rc序号`
- 治理附件：`v主版本.次版本`
- 仅文本澄清、未改变规则含义：次版本递增
- 改变职责、冻结范围或重大流程：主版本或经索引明确记录的重大次版本递增

版本更新必须同步`DOCUMENT_INDEX.md`。

---

## 16. 文档命名

正式根目录文件固定：

```text
PRODUCT_CONSTITUTION.md
PRD.md
PROJECT_RULES.md
DOCUMENT_INDEX.md
```

治理附件使用编号和大写下划线：

```text
02_CODE_MAP.md
03_MODULE_BOUNDARY.md
04_VERSION_FREEZE.md
05_AGENT_GOVERNANCE.md
06_NAMING_STANDARD.md
07_ARCHITECTURE_DECISIONS.md
08_DEVELOPMENT_RULES.md
09_SECURITY_DATA_OPERATIONS.md
```

不得创建：

- `PRODUCT_CONSTITUTION_FINAL.md`
- `PRD_NEW.md`
- `PRD_FINAL_FINAL.md`
- 第二份持续整改报告
- 大量重复日报和临时说明Markdown

历史文档必须明确归档，不得与当前正式文件并列作为开发依据。

---

## 17. 用户可见语言

普通用户页面禁止出现：

- 开发中
- 待接入
- 即将开放
- Demo
- Mock
- 测试功能
- Agent报告
- 临时页面
- 技术债说明

未完成能力应隐藏、禁用、降级或由服务端返回正式错误状态。

---

## 18. 命名变更规则

命名变更前必须确认：

1. 是否改变产品心智。
2. 是否影响路由、API、数据库、权限、埋点和历史链接。
3. 是否需要兼容跳转或别名。
4. 是否会破坏公开名片、支付回调或外部集成。
5. 是否需要同步PRD、代码地图、ADR和文档索引。

禁止为了“看起来整齐”一次性全仓重命名并制造不可控diff。
