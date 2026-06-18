# link168.me 技术架构说明（骨架）

版本：v0.1 MVP Draft
更新日期：2026-06-18

> 说明：本文档为技术架构的**骨架版本**，仅基于实际代码与依赖如实描述，**不虚构架构，不夸大能力**。后续由开发/架构负责人补齐更详细的章节、时序图、部署图。

---

## 1. 技术选型

| 层级 | 选型 | 依据文件 |
|------|------|---------|
| 应用框架 | Next.js（App Router）+ React | `package.json` dependencies |
| 语言 | TypeScript | `package.json`、`tsconfig.json` |
| 样式 | Tailwind CSS | `package.json`、`src/app/globals.css` |
| ORM | Prisma | `package.json`、`prisma/schema.prisma` |
| 数据库 | PostgreSQL | `prisma/schema.prisma` 的 datasource |
| 邮件 | nodemailer | `package.json`、`src/lib/mail.ts` |
| 二维码 | react-qr-code | `package.json` |
| 图标 | lucide-react | `package.json` |
| 鉴权 | 自建 Session + HttpOnly Cookie + bcrypt | `src/lib/auth.ts`、`src/lib/admin-auth.ts`、`prisma/schema.prisma` |
| 部署 | Node.js 应用，优先阿里云 ECS（线上使用 PM2 等进程管理） | `package.json` scripts、部署原则文档 |

## 2. 核心目录结构

```
link.me/
├── docs/                         ← 产品、技术、规划文档（本目录）
├── prisma/
│   ├── schema.prisma             ← 数据模型
│   └── migrations/               ← 迁移脚本
├── public/
│   └── brand/                    ← 品牌 Logo
├── src/
│   ├── app/
│   │   ├── page.tsx              ← 首页
│   │   ├── layout.tsx            ← 根布局
│   │   ├── globals.css           ← 全局样式
│   │   ├── register/             ← 注册
│   │   ├── login/                ← 登录
│   │   ├── forgot-password/      ← 忘记密码
│   │   ├── reset-password/       ← 重置密码
│   │   ├── verify-email/         ← 邮箱验证
│   │   ├── dashboard/            ← 用户 Dashboard
│   │   ├── [username]/           ← 公开主页
│   │   ├── report/               ← 举报中心
│   │   ├── admin/reports/        ← 管理员后台
│   │   ├── enterprise-ai/        ← 企业 AI（展示预览）
│   │   ├── help/ terms/ privacy/ ← 帮助与法律页（如有）
│   │   └── api/                  ← 所有 API 路由
│   │       ├── auth/**
│   │       ├── dashboard/**
│   │       ├── reports/route.ts
│   │       └── admin/**
│   ├── components/               ← UI 组件
│   ├── generated/prisma/         ← Prisma 生成的 client
│   └── lib/                      ← 工具模块：auth / db / handle / mail / ...
├── .env.example                  ← 环境变量示例（不包含真实值）
├── PROJECT_RULES.md              ← 产品与品牌规则
├── ROADMAP.md / SPRINT.md        ← 早期路线文档
└── package.json / tsconfig.json / next.config.ts / eslint.config.mjs
```

## 3. 数据模型总览

核心表（详见 `prisma/schema.prisma`）：

- **User** — 用户：email、passwordHash、role、isSystem、emailVerified
- **Profile** — 用户主页：username（唯一）、displayName、bio、avatarUrl、theme、isPublic
- **Link** — 链接：title、url、description、iconUrl、position、isActive
- **Session** — 登录会话：tokenHash、expiresAt、userAgent、ipAddress
- **Report** — 举报：reportUrl、reportType、reportReason、contact、imageUrl、status
- **PasswordResetToken** / **EmailVerificationToken** — 密码重置与邮箱验证 Token
- **LoginAttempt** — 登录尝试：email、ipAddress、success、locked、lockUntil

## 4. 鉴权数据流

1. 用户注册 → 密码以 bcrypt 哈希 → 写入 User
2. 用户登录 → 比对 bcrypt → 生成随机 Session Token
3. Session Token 的哈希写入 `Session` 表（同时记录 userAgent / ipAddress）
4. 浏览器通过 **HttpOnly Cookie** 持有 Session Token 的原始值
5. 访问受保护路由（如 `/dashboard`、`/api/dashboard/**`）时：
   - 读取 Cookie
   - 在服务端通过 tokenHash 查找 Session
   - 校验 Session 未过期且对应用户存在
6. 管理员 API 额外校验 `ADMIN_SECRET` / 角色
7. 登录尝试写入 `LoginAttempt`，用于反撞库/限制暴力登录

## 5. API 结构与示例

所有 API 路由位于 `src/app/api/**/route.ts`，按职责分为四大类：

| 类别 | 前缀 | 说明 |
|------|------|------|
| 认证 | `/api/auth/**` | register / login / logout / me / sessions / change-password / forgot-password / reset-password / verify-email |
| 用户内容 | `/api/dashboard/**` | 主页资料、头像、链接 CRUD |
| 举报 | `/api/reports` | 用户提交举报 |
| 管理员 | `/api/admin/**` | 管理员查看举报、管理员操作（受保护） |

**示例：添加一条链接**
- 路由：`POST /api/dashboard/links`
- 请求体（示意）：`{ title, url, description?, iconUrl? }`
- 响应：新建 Link 对象的 id / title / url / position / isActive 等

**示例：访问公开主页**
- 路由：`GET /[username]`
- 行为：查询 `username` 对应 `Profile`（要求 `isPublic=true`）+ 关联 `Link`（要求 `isActive=true`）
- 展示：头像、显示名、简介、有序链接列表 + `Powered by link168` 品牌 Footer

## 6. 环境变量约定

- `.env.example` 保留在仓库，仅列出变量名，**不写真实值**
- `.env.local` / `.env.production` 被 `.gitignore` 排除，**不得提交**
- 典型变量：DATABASE_URL、ADMIN_SECRET、SESSION_SECRET、COOKIE_SECURE、NEXT_PUBLIC_* 等
- 密钥来源：生产环境由运维配置，部署/重启时由 Node 进程读取

## 7. 已实现 vs 规划功能（粗粒度）

- ✅ 注册 / 登录 / 登出 / Dashboard / 链接 CRUD / 公开主页 / 举报 / 管理员查看
- ⚠️ 半完成：忘记密码 / 邮箱验证（依赖 SMTP）、二维码生成与下载、主题系统
- 📌 规划：会员 / 支付、真实数据统计、超级管理员、模板市场、自定义二维码、微信登录
- 🖼 展示预览：企业 AI 页面

## 8. 待补齐的架构文档（下一个版本应写）

- 8.1 完整架构图（浏览器 / Next.js / Prisma / PostgreSQL / SMTP）
- 8.2 API 接口清单（每个 API 的 method / 请求 / 响应 / 权限要求）
- 8.3 数据库 ER 图（从 Schema 自动生成）
- 8.4 安全与密钥管理（详见 `docs/tech/07-SECURITY_AND_KEYS.md`）
- 8.5 部署与回滚（详见 `docs/tech/06-DEPLOYMENT.md`）

---

*本骨架版本主要用于比赛说明与交接。后续版本需由负责的开发者补齐详细时序图、接口列表与性能指标。*
