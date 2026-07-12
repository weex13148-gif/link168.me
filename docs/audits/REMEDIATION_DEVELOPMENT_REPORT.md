# Link168 V2 后续整改开发报告

**版本：** v2.0  
**更新日期：** 2026-07-12  
**状态：** 持续更新；A邮箱身份与B Console主线已完成开发和自动化验收  
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

代码存在、静态检查、临时数据库验收、自动化浏览器验收、真实第三方服务验证和生产验证必须分开表述。

---

## 2. 当前V2正式范围

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

当前边界：

- V2只开放邮箱注册和登录。
- 普通微信注册、登录和绑定退出V2。
- 企业微信、飞书和钉钉连接退出V2。
- 企业成员采用Link168站内邮箱邀请。
- 账号合并、最后登录身份解绑、多平台成员去重暂不处理。
- 企业管理员不能查看成员AI对话正文。
- 已有未来代码和数据结构保留、隐藏或关闭，不因暂缓而删除。

---

## 3. A主线：邮箱身份闭环

**状态：开发和自动化验收完成。**

已完成：

- 注册满30天未验证后仍可登录受限后台。
- 公开主页和敏感操作按邮箱验证状态进行服务端限制。
- 验证码按User ID隔离，并兼容历史凭证。
- 邮箱验证和密码重置令牌原子单次消费。
- 邮箱验证只解除`EMAIL_UNVERIFIED`，不解除其他冻结或封禁。
- 重置密码后旧Session和旧密码失效。
- Session创建失败不记录虚假登录成功。
- 注册完成但Session失败的账号可以恢复登录。
- 临时PostgreSQL 16、migration、Lint、TypeScript、生产构建和真实API集成测试通过。

尚未执行：阿里云邮件真实投递、生产数据库迁移、生产服务器部署和生产域名冒烟。

---

## 4. B主线：Console五分类兼容收口

### 4.1 正式一级入口

用户后台固定为：

```text
首页  /console
名片  /console/card
客户  /console/customers
AI    /console/ai
我的  /console/account
```

其他能力只能进入组件、快捷入口或二级页面，不增加第六个一级入口。

### 4.2 已完成实现

#### 五分类与共享导航

- 新增统一路由策略，集中定义五项顺序、正式路径和旧路径归类。
- ConsoleShell、WorkbenchShell和DashboardFrame统一为同一套五项桌面导航与手机底栏。
- 手机底栏固定为：首页、名片、客户、AI、我的。
- 普通用户共享导航彻底移除Jeepwork。
- 名片编辑器内部七个装修标签移到页面内工具条，不再占用一级底栏。

#### 正式主路径和二级路径

已建立并通过构建：

```text
/console
/console/card
/console/card/products
/console/card/short-links
/console/card/analytics
/console/customers
/console/ai
/console/ai/[assistant]
/console/ai/service
/console/ai/reception
/console/ai/knowledge
/console/account
/console/account/membership
/console/account/enterprise
/console/account/notifications
```

适配页复用现有成熟业务实现，没有复制服务、权限或数据库逻辑。

#### 旧路径兼容

以下旧地址继续有效，并使用临时307跳转进入正式Console路径：

```text
/dashboard
/workbench
/workbench/card
/workbench/products
/workbench/short-links
/workbench/analytics
/workbench/leads
/workbench/ai
/workbench/ai/:assistant
/workbench/ai-service
/workbench/knowledge
/workbench/account
/workbench/membership
/workbench/enterprise
/workbench/notifications
```

旧业务文件和历史数据结构没有删除。

#### Console首页与状态页面

- 首页所有用户入口统一使用`/console/*`，不再直接跳向`/dashboard`或`/workbench/*`。
- 首页只展示五个正式分类。
- 产品总数改为真实`count`，最近产品列表仍只展示3条。
- 新增统一加载态和可恢复错误态。
- 页面外层增加`min-w-0`、换行和横向溢出保护。

### 4.3 测试与CI

#### 导航策略测试

```text
src/components/layout/console-route-policy.test.ts
```

锁定：

- 五项顺序和正式路径。
- 正式嵌套路由选中状态。
- 旧路径所属分类。
- Jeepwork不属于任何用户Console分类。

#### 登录态路由烟测

```text
scripts/console-integration-test.mjs
```

验证：

- 五个一级页面在登录态返回200。
- 正式二级路径在登录态返回200。
- Console首页只包含正式Console入口。
- 旧Dashboard和Workbench路径跳向正确正式地址。
- 普通用户页面不暴露Jeepwork。

#### 真实移动端浏览器验收

```text
scripts/console-mobile-browser-test.cjs
```

测试环境：

```text
GitHub Actions Ubuntu Runner
Node.js 22
PostgreSQL 16临时数据库
Next.js生产构建
Playwright 1.55.0临时安装
Chromium无头浏览器
MAIL_ENABLED=false
无生产密钥
```

测试宽度：

```text
360px
390px
430px
```

测试页面：

```text
/console
/console/card
/console/customers
/console/ai
/console/account
```

每个页面均验证：

- HTTP 200且登录态有效。
- 文档宽度不超过视口，不存在文档级横向溢出。
- 手机底栏恰好为首页、名片、客户、AI、我的。
- 不存在指向Jeepwork的普通用户链接。
- 保存全页截图作为短期CI证据。

### 4.4 最终验收证据

最终草稿验证PR：`#33 ci: rerun final B mobile console validation`  
最终成功运行：`29188134805`  
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
→ 临时安装Playwright和Chromium
→ 邮箱认证真实API回归
→ Console登录态路由烟测
→ 360/390/430px真实Chromium移动端验收
→ 上传移动端截图与浏览器日志
```

证据产物：

```text
名称：console-mobile-evidence
Artifact ID：8258673568
大小：4,201,341 bytes
保留至：2026-07-19
```

前一次PR #32的浏览器步骤在打开页面前因临时Playwright模块解析失败而失败；应用迁移、测试、Lint、TypeScript和构建当时均已通过。CI工具加载方式修复后，PR #33完整通过，因此PR #33是B主线权威验收结果。

### 4.5 明确未执行

- 未修改Prisma Schema或新增migration。
- 未删除旧Dashboard、Workbench或未来业务结构。
- 未修改支付、AI额度、会员核心、Workspace隔离或企业成员模型。
- 未接入微信、企业微信、飞书或钉钉。
- 未连接生产数据库、真实密钥或生产服务器。
- 未部署到生产域名。

---

## 5. 当前自动化命令

```bash
npm run governance:check
npm run test:auth
npm run test:console-nav
npm run lint
npm run typecheck
npm run build
```

GitHub Actions还会执行认证API、Console路由和真实移动端Chromium验收。

---

## 6. 下一主线

A和B完成后，下一项正式任务为：

> **C：企业邮箱邀请、成员权限和Workspace隔离。**

C主线开始前必须先检查现有Workspace、WorkspaceMember、邀请接口和资源查询是否完整按`workspaceId`隔离；不得提前接入企业微信、飞书或钉钉。
