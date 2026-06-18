# link168.me 项目现状说明

版本：v0.1 Internal Beta（内测版）
计划发布日期：2026-07-01
更新日期：2026-06-18

> **产品优先，比赛第二。** TRAE 创业比赛是阶段性加速器，产品真实上线和内测才是主线。**7月1日内测版只做真实可用的最小闭环，不为了比赛炫技而添加无用功能。**

---

## 1. 项目基本信息

| 项目 | 内容 |
|------|------|
| 产品名称 | link168.me |
| 产品定位 | 面向中文创作者、小商家、课程咨询者、社群运营者、个人 IP 和中小企业的「数字身份主页 + 二维码营销 + AI 助力成长工具」 |
| 官方域名 | `https://link168.me` |
| 下一版本 | **v0.1 Internal Beta（内测版），计划 2026-07-01 发布** |
| 项目阶段 | 持续运营产品的早期迭代。TRAE 创业比赛是阶段性加速器，产品真实上线和内测才是主线。 |
| 产品 Slogan | 一个人，一个链接，连接全网 |
| 视觉方向 | 暖白、简洁、高级、可信、中文创作者友好的艺术商务风格 |

## 2. 本地项目路径

```
D:\link168\link.me
```

主要目录：
- 业务代码：`src/app/`（页面路由）、`src/components/`（组件）、`src/lib/`（工具）
- 数据模型：`prisma/schema.prisma`
- 品牌资源：`public/brand/`
- 文档：`docs/`（本目录）
- 已有项目文件：`README.md`、`PROJECT_RULES.md`、`ROADMAP.md`、`SPRINT.md`

## 3. 当前线上状态

| 项目 | 状态 |
|------|------|
| 官方域名 `https://link168.me` | 已持有 |
| 线上版本 | **当前线上版本不等于 7月1日内测版**。线上为历史版本，尚未部署本地最新 Trae 改动 |
| HTTPS 证书 | 线上已有（具体由运维配置） |
| 是否可对外演示 | 可演示，但**比赛材料和对外宣传应以 7月1日内测版口径为准**，演示录制以本地 `npm run dev` 为准 |
| 7月1日部署计划 | **7月1日前会有一次老板确认后的手动部署**，将最新代码发布为内测版 |

## 4. 当前服务器状态摘要

| 项目 | 说明 |
|------|------|
| 部署方式 | Node.js + PM2 托管的 Next.js 服务（线上现状如此，具体由运维维护） |
| 线上版本 | **当前线上版本不等于 7月1日内测版**。尚未部署本地最新 Trae 改动 |
| 最近一次服务器故障 | 刚恢复过一次 PM2 故障 |
| 自动部署策略 | **禁止自动部署**，任何线上改动必须由老板确认 |
| 7月1日部署计划 | **7月1日前会有一次老板确认后的手动部署**，发布 link168.me v0.1 内测版 |
| 部署命令 | 本轮文档**不包含部署命令**，具体部署步骤由 `docs/tech/06-DEPLOYMENT.md` 的骨架与运维共同制定 |
| 服务器密钥/密码 | **不在任何文档中出现**，只由老板与运维掌握 |

## 5. 当前代码状态

### 5.1 主要技术栈（以实际文件为准）

- **框架**：Next.js（App Router）+ React（依赖版本见 [`package.json`](../package.json)）
- **语言**：TypeScript
- **样式**：Tailwind CSS
- **数据库**：PostgreSQL
- **ORM**：Prisma（Schema 见 [`prisma/schema.prisma`](../prisma/schema.prisma)）
- **邮件**：nodemailer（API 存在，SMTP 配置需补齐）
- **二维码**：react-qr-code（依赖已安装，完整使用流程按实际实现状态标注）
- **图标**：lucide-react
- **鉴权**：自建 Session + HttpOnly Cookie + bcrypt 密码哈希

### 5.2 路由与 API 简要清单（按目录存在情况）

页面路由（`src/app/*/page.tsx`）：
- `/` 首页
- `/register` 注册
- `/login` 登录
- `/forgot-password` 忘记密码
- `/reset-password` 重置密码
- `/verify-email` 邮箱验证
- `/dashboard` 用户 Dashboard
- `/[username]` 公开主页
- `/report` 举报中心
- `/admin/reports` 管理员举报后台
- `/enterprise-ai` / `/enterprise-ai/dashboard` **展示预览页面**

API 路由（`src/app/api/**/route.ts`）：
- `/api/auth/register`、`/api/auth/login`、`/api/auth/logout`、`/api/auth/me`
- `/api/auth/forgot-password`、`/api/auth/reset-password`
- `/api/auth/verify-email`、`/api/auth/verify-email/confirm`
- `/api/auth/sessions`
- `/api/auth/change-password`
- `/api/dashboard`、`/api/dashboard/avatar`
- `/api/dashboard/links`、`/api/dashboard/links/[id]`
- `/api/reports`
- `/api/admin/reports`、`/api/admin/reports/[id]`
- `/api/admin/users/reset-password`

### 5.3 数据模型现状（Schema 字段摘要）

- `User`：id、email、passwordHash、emailVerified、role、isSystem、createdAt、updatedAt
- `Profile`：id、userId、username、displayName、bio、avatarUrl、theme、isPublic、createdAt、updatedAt
- `Link`：id、profileId、title、url、description、iconUrl、position、isActive、createdAt、updatedAt
- `Session`：id、userId、tokenHash、expiresAt、userAgent、ipAddress、lastActive、createdAt
- `Report`：id、reportUrl、reportType、reportReason、contact、imageUrl、status、createdAt
- `PasswordResetToken` / `EmailVerificationToken`：用于密码重置与邮箱验证
- `LoginAttempt`：登录尝试记录（用于反撞库/限制暴力登录）

完整 Schema 见 [`prisma/schema.prisma`](../prisma/schema.prisma)。

## 6. 已完成模块

1. 用户注册（bcrypt 密码哈希）
2. 用户登录/登出（Session Token + HttpOnly Cookie）
3. Dashboard 基本信息编辑（用户名、显示名、简介、头像）
4. 链接管理（新增、编辑、删除、激活）
5. 公开主页访问（`/[username]`）
6. 举报中心提交
7. 管理员举报后台（列表 + 详情）
8. 核心数据模型设计与 Prisma Schema
9. 密码重置 / 邮箱验证的表单与 API 骨架
10. 登录尝试记录（LoginAttempt，用于反撞库策略）

## 7. 半完成模块

1. **忘记密码 / 重置密码**：API 与页面存在，**但邮件发送依赖 SMTP 配置**，未配置前邮件发送链路不完整
2. **邮箱验证**：同上，需要完整的邮件发送链路
3. **管理员工作流**：列表/详情可查看，但**完整的状态流转、处理结论、冻结/封禁**属于规划功能
4. **二维码生成**：依赖存在，部分页面可用，但**完整的一键生成/下载/移动端扫码流程**需要按实际代码标注
5. **主题系统**：Schema 已预留 theme 字段，默认主题生效，多主题/自定义为规划功能

## 8. 未完成模块

1. **会员与支付**：无真实支付接口
2. **企业 AI**：页面存在但**无真实 AI 接口**，属于展示预览
3. **数据统计**：无点击/曝光/访客采集
4. **超级管理员后台**：已规划，未实现
5. **微信/手机号登录**：仅支持邮箱
6. **自定义主题 / 模板市场**
7. **自定义二维码样式 / 短链**
8. **团队协作 / 多用户同主页**
9. **开放 API / 第三方接入**

## 9. 当前风险

| 风险 | 等级 | 说明 |
|------|--------|------|
| 线上版本与本地版本不一致 | 中 | 线上还没部署本地最新 Trae 改动，比赛演示应以本地为准 |
| PM2 曾发生故障 | 中 | 已恢复，后续部署必须由老板确认 |
| SMTP 邮件发送未完整配置 | 低 | 找回密码 / 邮箱验证流程无法 100% 自动化 |
| 尚无完整数据统计与点击采集 | 中 | 比赛演示阶段对"数据能力"的展示需谨慎描述 |
| 企业 AI 仅为展示预览 | 中 | 不得在比赛中夸大 AI 能力 |
| 支付/会员尚未实现 | 中 | 商业化只能以"规划"名义描述 |

## 10. 下一步最重要的 5 件事（面向 7月1日内测版发布）

1. **补齐邮件发送链路**：确认 SMTP 配置，让忘记密码/邮箱验证完整闭环
2. **整理公开主页视觉系统**：确保暖白、简洁、高级、中文友好的艺术商务风格落地
3. **完善二维码生成/下载流程**：把"主页 URL → 二维码 → 下载/保存"做完整
4. **完善举报状态流转**：从"管理员查看"升级为"状态可改、可备注、可关闭"
5. **准备内测版上线的服务器与部署确认**：与老板确认 7月1日前的一次手动部署

## 11. 内测版 Go-Live Checklist（7月1日前逐项确认）

| 类别 | 检查项 | 负责人/说明 | 完成状态 |
|------|--------|-------------|---------|
| 产品 | PRD 冻结，不再新增内测版范围外的功能 | 产品/老板 | ☐ |
| 产品 | 功能完成度报告更新到最新，每个模块的状态核实 | 产品/开发 | ☐ |
| 代码 | 本地 `npm run dev` 可稳定跑通 MVP 全流程 | 开发 | ☐ |
| 代码 | 所有 `console.log` 敏感信息、调试代码清理 | 开发 | ☐ |
| 安全 | `ADMIN_SECRET` 使用独立的强随机值，不提交到 Git | 运维/老板 | ☐ |
| 安全 | `SESSION_SECRET` 使用独立的强随机值 | 运维/老板 | ☐ |
| 安全 | 数据库密码不硬编码、不提交 Git | 运维/老板 | ☐ |
| 安全 | `COOKIE_SECURE=true`（HTTPS 环境） | 运维 | ☐ |
| 部署 | **与老板确认部署时机**（禁止自动部署） | 老板 | ☐ |
| 部署 | PM2 配置与重启方案确认（上次故障后需复核） | 运维 | ☐ |
| 数据库 | Prisma migrate deploy 成功执行 | 开发/运维 | ☐ |
| 数据库 | 数据库备份方案确认 | 运维 | ☐ |
| 邮件 | SMTP 配置正确，找回密码邮件可收发 | 开发/运维 | ☐ |
| 域名/HTTPS | `https://link168.me` 证书有效 | 运维 | ☐ |
| 内测运营 | 邀请用户名单准备（优先小商家、课程咨询者、自媒体人、个人 IP） | 产品/运营 | ☐ |
| 内测运营 | 反馈收集渠道确认（举报中心/邮件） | 产品 | ☐ |
| 内测运营 | 内测版欢迎文案准备 | 产品 | ☐ |
| 内测运营 | 上线后 Smoke Test 清单确认（见下方 §12） | 产品/开发 | ☐ |
| 比赛材料 | 比赛 PPT/视频中的功能口径与本文件一致，不夸大未完成能力 | 产品 | ☐ |

## 12. 内测版 Smoke Test 清单（上线后 30 分钟内完成）

1. 访问 `https://link168.me` 首页 → 正常加载
2. 注册新账号 → 邮箱密码注册成功 → bcrypt 存储
3. 登录 → Session + HttpOnly Cookie 生效
4. 进入 Dashboard → 编辑用户名/显示名/简介/头像 → 保存成功
5. 添加 3 条链接 → 标题/URL/描述 → 保存成功
6. 编辑 1 条链接 → 修改后保存
7. 删除 1 条链接 → 确认后删除
8. 访问 `https://link168.me/用户名` → 公开主页正常显示
9. 公开主页点击链接 → 跳转正确
10. 生成公开主页二维码 → 扫码后可访问
11. 提交举报 → 内容入库
12. 管理员查看举报列表 → 正常
13. 品牌 Footer `Powered by link168` 存在且可点击回首页

## 13. 比赛前建议优先级

> **产品优先，比赛第二。** 比赛材料服务真实上线，不夸大未完成功能。

| 优先级 | 建议事项 | 说明 |
|--------|---------|------|
| P0 | 确保本地 `npm run dev` 可稳定运行 MVP 全流程 | 比赛演示主要依赖本地 |
| P0 | 补齐 PRD / 完成度报告 / 参赛规划三类文档 | 即本目录当前正在补齐的 4 个核心文档 |
| P0 | 截图关键页面（注册/登录/Dashboard/公开主页/举报/管理员后台） | 供 PPT、视频、提交使用 |
| P1 | 补齐 SMTP / 邮箱验证 / 忘记密码真实链路 | 让演示更完整 |
| P1 | 完善公开主页视觉细节 + 移动端效果 | 提升评委观感 |
| P1 | 完善二维码生成与下载 | 让"二维码营销"卖点有实物 |
| P2 | 补齐超级管理员后台基本功能（规划范围，不要夸大） | 为复赛/决赛准备 |
| P2 | 轻量点击数据采集（仅采集必要字段，合规前提下） | 为"数据能力"做基础 |

---

*服务器部署/密钥/敏感配置不在本文件中，统一由老板与运维决策，文档仅记录原则与注意事项。*
