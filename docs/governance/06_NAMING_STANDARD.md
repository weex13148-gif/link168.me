# Link168 V2 命名标准

**文件名：** `docs/governance/06_NAMING_STANDARD.md`  
**版本：** v1.0  
**生效日期：** 2026-07-12  
**性质：** 工程治理附件  
**上位规则：** `PRODUCT_CONSTITUTION.md` v1.6、`PRD.md` v2.0-rc8、`PROJECT_RULES.md` v1.0-rc3

> 本标准统一产品、页面、代码、数据库和Agent沟通中的名称。它不得改变产品宪法已经确定的产品身份、套餐结构和信息架构。

---

## 1. 品牌名称

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
- link168（在正式品牌文案中）
- 链接168

中文品牌辅助表达可以使用：

```text
Link168 链接一路发
```

但产品正式名称仍为 `Link168`。

---

## 2. 产品定位用语

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

---

## 3. 用户后台一级名称

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
| 客户 | `customers` / `leads` | `/console/customers` 或兼容的 `/console/leads` |
| AI | `ai` | `/console/ai` |
| 我的 | `me` / `account` | `/console/account` 及二级入口 |

禁止新增第六个一级名称。产品、数据、会员、推广、企业空间等必须进入上述五类中的组件或二级页面。

---

## 4. 后台名称

### 用户后台

正式名称：

```text
Console / 用户后台 / 控制台
```

正式路由前缀：

```text
/console
```

### 平台后台

正式名称：

```text
Jeepwork / 平台后台
```

正式路由前缀：

```text
/jeepwork
```

### 企业空间

正式名称：

```text
企业空间
```

代码领域名称：

```text
workspace
```

禁止把企业空间称为平台后台，也禁止企业管理员自动获得Jeepwork权限。

---

## 5. 旧名称处理

以下名称只允许用于历史兼容、迁移说明或现存路径，不得继续作为新产品心智：

- Dashboard
- Workbench
- `/dashboard`
- `/workbench`
- `/admin`（旧平台后台）
- Enterprise AI 独立产品线

处理方式：

1. 新功能进入 `/console` 或 `/jeepwork`。
2. 旧路径保留兼容跳转或适配层。
3. 文档说明时必须标注“旧路径”或“兼容路径”。
4. 不得为了命名统一直接删除仍有依赖的旧代码。

---

## 6. 套餐名称

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

## 7. AI名称

正式六大AI Agent：

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
- 把六大Agent写成免费版默认权益

---

## 8. 身份与账号名称

正式概念：

| 概念 | 代码语义 | 说明 |
|---|---|---|
| Link168主账号 | `User` | 内部不可变User ID是唯一主账号标识 |
| 外部身份 | `ExternalIdentity` | 邮箱、微信、企业微信、飞书、钉钉等绑定身份 |
| 个人空间 | `personal workspace` 或个人域 | 用户个人名片、会员和个人数据 |
| 企业空间 | `Workspace` | 企业租户和企业资产容器 |
| 企业成员 | `WorkspaceMember` | User在企业空间中的成员身份 |
| 待激活企业成员 | `PendingWorkspaceMember` | 同步后尚未首次授权激活的成员 |

禁止：

- 直接把OpenID、UnionID、邮箱或手机号称为系统用户ID
- 把企业通讯录同步对象直接称为已注册用户
- 把外部成员标识暴露到公开页面

---

## 9. 客户与线索名称

对用户显示：

- 客户
- 新客户
- 客户线索
- 跟进记录
- 来源
- 感兴趣产品

代码可按现有模型使用 `Lead`，但页面一级名称固定为“客户”。

建议状态：

- 新线索
- 已联系
- 跟进中
- 已成交
- 无效

不得把“访问记录”直接称为“客户”，只有真实留资或符合正式判定规则的对象才进入客户/线索域。

---

## 10. 产品与服务名称

用户可理解名称：

```text
产品与服务
```

代码领域：

```text
catalog
```

单个实体可以按实际类型显示“产品”或“服务”。禁止在同一页面随机混用商品、项目、内容、资源等多个概念，除非PRD明确区分。

---

## 11. 路由命名

### 规则

- 使用小写英文和连字符。
- 路由表达用户任务，不表达内部技术实现。
- 用户侧统一在 `/console` 下。
- 平台侧统一在 `/jeepwork` 下。
- 企业成员和管理员页面统一在 `/console/enterprise` 下。
- API路由按领域命名，不继续扩张 `/api/dashboard` 和 `/api/workbench`。

### 推荐示例

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

禁止：

- `/new-dashboard-v2`
- `/final-workbench`
- `/admin2`
- `/test-ai`
- `/demo-payment`
- 使用中文拼音和英文混杂的正式路由

---

## 12. 代码文件与符号命名

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

### 类型

- TypeScript类型：PascalCase
- 枚举或常量集合：PascalCase或集中常量对象
- 数据库字段：遵循现有Prisma风格，不为局部任务大规模重命名

### API响应

统一使用可识别的错误代码和用户可读信息，不直接向用户暴露堆栈、数据库错误和第三方密钥信息。

---

## 13. 数据库命名

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

- `uid` 同时表示多种系统ID
- `money` 不说明单位
- `count` 不说明统计对象
- `status2`、`typeNew`、`tempFlag`

---

## 14. 文档命名

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
```

不得创建：

- PRODUCT_CONSTITUTION_FINAL.md
- PRD_NEW.md
- PRD_FINAL_FINAL.md
- 第二份持续整改报告
- 大量重复日报和临时说明Markdown

历史文档必须明确归档，不得与当前正式文件并列作为开发依据。

---

## 15. 用户可见语言

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

未完成能力应：

- 隐藏入口
- 禁用并给出真实可理解原因
- 降级
- 由服务端返回正式错误状态

错误文案必须说明用户下一步，不得显示内部堆栈和第三方原始报错。

---

## 16. 命名变更规则

命名变更前必须确认：

1. 是否改变产品心智。
2. 是否影响路由、API、数据库、权限、埋点和历史链接。
3. 是否需要兼容跳转或别名。
4. 是否会破坏公开名片、支付回调或外部集成。
5. 是否需要同步PRD、代码地图和文档索引。

禁止为了“看起来整齐”一次性全仓重命名并制造不可控diff。
