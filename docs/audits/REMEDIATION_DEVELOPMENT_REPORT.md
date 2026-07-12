# Link168 V2 后续整改开发报告

**版本：** v1.9  
**更新日期：** 2026-07-12  
**状态：** 持续更新；A邮箱身份主线已完成，B Console第一批已完成开发与CI验收  
**依据：** `PRODUCT_CONSTITUTION.md` v1.6、`PRD.md` v2.0-rc8、`PROJECT_RULES.md` v1.0-rc3

---

## 1. 报告用途

本文件是Link168唯一持续整改报告，记录正式决策、代码差距、开发进度和验收证据。

```text
老板最新决定
→ 产品宪法
→ PRD
→ 工程规则
→ 本报告
→ 代码与部署结果
```

代码存在、静态检查、临时数据库验收、真实第三方服务验证和生产验证必须分开表述。

---

## 2. 当前V2正式范围

V2核心闭环：

```text
邮箱注册和登录
→ 创建经营名片
→ 发布和分享
→ 访客访问与留资
→ 客户跟进
→ 数据分析
→ 会员和支付宝
→ AI经营能力
→ 企业空间与站内成员管理
```

当前正式边界：

- V2只开放邮箱注册和登录。
- 普通微信注册、登录和绑定退出V2。
- 企业微信、飞书和钉钉连接退出V2。
- 企业成员采用Link168站内邮箱邀请。
- 账号合并、最后登录身份解绑、多平台成员去重暂不处理。
- 企业管理员不能查看成员AI对话正文。
- 已有未来代码和数据结构保留、隐藏或关闭，不因暂缓而删除。

---

## 3. 五分类用户后台

用户后台一级分类固定为：

1. 首页
2. 名片
3. 客户
4. AI
5. 我的

其他功能全部使用组件、卡片、快捷入口或二级页面，不增加第六个一级入口。

---

## 4. A主线：邮箱身份闭环

A主线已经完成：

- 30天邮箱边界和公开主页限制。
- 验证码按User ID隔离和旧凭证兼容。
- 邮箱验证与密码重置原子单次消费。
- 重置密码后旧Session、旧密码失效。
- Session故障不记录假成功，注册账号可以恢复登录。
- PostgreSQL 16临时数据库、migration、Lint、TypeScript、生产构建和真实API集成测试通过。

尚未执行但不阻塞后续开发：阿里云邮件真实投递、生产数据库迁移、生产服务器部署和生产域名浏览器冒烟。

---

## 5. B主线：Console五分类兼容收口

### 5.1 已批准方案

2026-07-12老板选择方案1：兼容适配收口。

正式一级入口：

```text
/console
/console/card
/console/customers
/console/ai
/console/account
```

实施原则：

- 正式入口使用`/console/*`。
- 第一阶段不搬迁成熟业务代码，适配页直接复用现有Dashboard和Workbench页面。
- `/dashboard`与`/workbench/*`继续兼容，不删除、不强制失效。
- 旧路径通过统一路由策略归入对应一级分类，保持正确选中状态。
- 桌面侧栏和手机底栏只能出现首页、名片、客户、AI、我的五项。
- 普通用户导航不得出现`/jeepwork`。
- 名片编辑器内部标签属于名片二级工具，不得继续占用手机一级底栏。
- 不修改Prisma Schema、migration、支付、AI权限、企业数据或生产配置。

### 5.2 旧路径归类

| 一级分类 | 正式路径 | 兼容路径 |
|---|---|---|
| 首页 | `/console` | `/workbench` |
| 名片 | `/console/card` | `/dashboard`、产品、短链、分析、旧名片管理 |
| 客户 | `/console/customers` | `/workbench/leads` |
| AI | `/console/ai` | AI助手、AI服务、知识库 |
| 我的 | `/console/account` | 账户、会员、企业、通知 |

`/jeepwork`及其子路由不属于任何用户Console分类。

### 5.3 第一批已完成实现

- 新增纯路由策略模块，集中定义五项顺序、正式路径和兼容路径。
- 新增导航策略测试，锁定五项顺序、嵌套路由选中和Jeepwork排除。
- 共享导航配置只导出五个用户一级入口。
- ConsoleShell、WorkbenchShell和DashboardFrame统一桌面侧栏和手机底栏。
- 新增`/console/card`、`/console/customers`、`/console/ai`、`/console/account`适配页。
- 新增AI助手、访客AI接待和知识库的Console适配入口。
- 适配页直接复用成熟业务页面，没有复制业务服务或数据库逻辑。
- 名片编辑器内部七个标签移入页面内横向工具条。
- 普通用户共享导航中移除Jeepwork。
- 所有外层容器增加`min-w-0`或`overflow-x-hidden`，降低360–430px横向溢出风险。

### 5.4 第一批自动化验收

验证草稿PR：`#29 ci: verify B console five-section navigation`  
成功运行：`29187365414`  
结论：`success`

以下步骤全部成功：

```text
PostgreSQL 16临时容器初始化
→ npm ci
→ npx prisma generate
→ npx prisma migrate deploy
→ npm run governance:check
→ npm run test:auth
→ npm run test:console-nav
→ npm run lint
→ npm run typecheck
→ npm run build
→ 启动Next.js生产构建
→ 邮箱认证真实API回归测试
```

构建已确认新路径可以被Next.js编译：

```text
/console/card
/console/customers
/console/ai
/console/ai/[assistant]
/console/ai/reception
/console/ai/knowledge
/console/account
```

### 5.5 第一批未执行边界

- 未修改Prisma Schema和migration。
- 未删除`/dashboard`或`/workbench/*`。
- 未修改支付、AI权限、会员、企业数据和Workspace隔离。
- 未接入微信、企业微信、飞书或钉钉。
- 未连接生产数据库、真实密钥和生产服务器。
- 尚未执行360px、390px、430px真实浏览器截图和交互验收。

---

## 6. 自动化命令

```bash
npm run governance:check
npm run test:auth
npm run test:console-nav
npm run lint
npm run typecheck
npm run build
```

完整`npm run check`已经包含认证和Console导航策略测试。

---

## 7. B第二批顺序

1. 修复Console首页仍暴露的旧模块直达入口，统一进入五个正式分类。
2. 对360px、390px、430px逐页检查横向溢出。
3. 统一加载、空状态和错误状态。
4. 检查旧路径页面是否存在重复壳层、重复底栏或错误选中。
5. B主线最终验收后冻结五分类导航文件。
6. 再进入C企业邮箱邀请和Workspace隔离。

未经老板新的明确批准，不提前开发微信、企业微信、飞书或钉钉。
