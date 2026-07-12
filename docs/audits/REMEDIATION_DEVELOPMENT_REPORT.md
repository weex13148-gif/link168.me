# Link168 V2 后续整改开发报告

**版本：** v1.8  
**更新日期：** 2026-07-12  
**状态：** 持续更新；A邮箱身份主线已完成，B Console兼容收口开发中  
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

### 4.1 正式规则

- 邮箱注册用户需要完成邮箱验证。
- 注册未满30天时，未验证邮箱不触发30天限制。
- 注册达到30天仍未验证时，用户仍可登录后台完成验证。
- 受限用户的公开主页暂停展示，发布和其他敏感写入由服务端拒绝。
- 邮箱验证成功后，只解除`EMAIL_UNVERIFIED`限制。
- 管理员冻结、封禁和安全风险限制不得被邮箱验证解除。
- 密码重置成功后，所有旧Session立即失效。
- Session创建失败不得记录为登录成功。
- 邮件或第三方服务失败不得伪造成功。

### 4.2 完成状态

A主线已经完成以下验收：

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

### 5.3 第一批文件锁

```text
src/components/layout/console-route-policy.ts
src/components/layout/console-route-policy.test.ts
src/components/layout/console-navigation.ts
src/components/layout/ConsoleShell.tsx
src/components/workbench/WorkbenchShell.tsx
src/components/dashboard-v1/DashboardFrame.tsx
src/app/console/card/page.tsx
src/app/console/customers/page.tsx
src/app/console/ai/page.tsx
src/app/console/ai/[assistant]/page.tsx
src/app/console/ai/reception/page.tsx
src/app/console/ai/knowledge/page.tsx
src/app/console/account/page.tsx
package.json
.github/workflows/governance.yml
docs/audits/REMEDIATION_DEVELOPMENT_REPORT.md
```

### 5.4 实施计划

1. 用纯路由策略模块定义五项顺序和旧路径归类。
2. 先写测试锁定五项顺序、嵌套路由选中和Jeepwork排除。
3. 共享导航只导出五个用户一级入口。
4. ConsoleShell和WorkbenchShell统一桌面侧栏、手机底栏和激活逻辑。
5. 为四个主要分类及AI二级页建立不复制业务逻辑的适配页。
6. 名片编辑器内部七个标签移动到页面内横向工具条；手机底栏改为五个一级入口。
7. 运行导航策略测试、认证回归、Lint、TypeScript和生产构建。
8. 第二批再处理首页快捷入口、360–430px逐页视觉检查、空状态和错误状态细节。

### 5.5 第一批当前状态

已写入代码：

- 五分类路由策略和测试。
- 共享五项导航配置。
- Console、Workbench和Dashboard三套Shell导航收口。
- 正式`/console/*`兼容适配页。
- 普通用户导航移除Jeepwork。
- 名片内部标签与手机一级底栏分离。
- CI新增`test:console-nav`。

待验证：

- Prisma Client和现有migration。
- 导航策略测试。
- 认证回归测试。
- Lint与TypeScript。
- 生产构建和Next.js路由编译。
- 360px、390px、430px真实浏览器布局。

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

## 7. 后续顺序

B第一批构建通过后：

1. 修复Console首页仍暴露的旧模块直达入口。
2. 对360px、390px、430px逐页检查横向溢出。
3. 统一加载、空状态和错误状态。
4. 冻结五分类导航文件。
5. 再进入C企业邮箱邀请和Workspace隔离。

未经老板新的明确批准，不提前开发微信、企业微信、飞书或钉钉。
