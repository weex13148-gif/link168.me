# Link168

> 面向中文创作者、小商家、自由职业者、一人公司和小型销售团队的 AI 经营名片平台。

Link168 已真实上线、真实部署、真实运营。用户可以免费创建公开经营名片，把个人资料、内容平台、产品服务、联系方式和二维码统一展示给客户；通过产品模块、线索管理、数据分析和 AI 接待助手，把一次访问转化为可跟进的客户线索。平台同时提供会员订阅、支付宝支付、AI 额度、内容治理和管理后台能力。

---

## 当前真实能力

- 注册、登录、邮箱验证、密码重置、会话管理、账号注销
- 公开经营名片 `/[username]`，支持 20 种内容模块、3 套模板、12 个预设主题
- 名片编辑器 `/dashboard`，桌面端侧栏 + 移动端底部导航 + 右侧手机预览
- 经营工作台 `/workbench`，含产品管理、客户线索、数据分析、短链接、AI 工具箱
- 访客侧 AI 接待助手，支持多轮会话、产品推荐、知识库引用、线索收集
- 用户侧经营 AI 工具箱（财税、法务、市场调研、设计、社媒运营）
- 会员订阅（免费版 / Plus / Pro / 企业版），支付宝年付支付闭环
- 平台管理后台 `/jeepwork`，含用户治理、会员管理、订单管理、AI 治理、内容审核、安全审计
- 比赛与路演展示中心 `/showcase`（受控外部展示入口，不等于产品本体）

## 当前运行状态

- 版本：V1 功能扩展期末尾，整体完成度约 80%
- 当前已知问题：双后台心智混乱（`/dashboard` + `/workbench`）、AI 额度定义不一致、企业版功能未实现、退款未调用支付宝接口、到期无自动降级
- V2 改版方向：统一 `/console`、合并双后台、统一 AI 命名、企业工作空间、可信演示闭环

## 技术栈

- Next.js App Router、React、TypeScript、Tailwind CSS
- Prisma、PostgreSQL
- bcrypt、Nodemailer、qrcode、lucide-react
- 阿里云百炼 AI、阿里云邮件推送、支付宝支付

## 本地运行

```bash
# 安装依赖
npm install

# 开发运行
npm run dev

# 质量检查
npm run lint
npm run typecheck
npm run build

# 数据库
npm run db:migrate
npm run db:verify
```

环境变量模板见 `.env.example`。

## 重要路由

| 路由 | 功能 | 状态 |
|------|------|------|
| `/` | 官网首页 | 已实现 |
| `/[username]` | 公开经营名片 | 已实现 |
| `/dashboard` | 名片编辑器 V1 | 已实现（V2 将并入 /console） |
| `/workbench` | 经营工作台 | 已实现（V2 将并入 /console） |
| `/jeepwork` | 平台管理后台 | 已实现 |
| `/showcase` | 外部展示中心 | 已实现（受控访问） |
| `/pricing` | 定价页 | 已实现 |
| `/login`、`/register` | 认证页面 | 已实现 |

## 当前限制

- `/dashboard` 与 `/workbench` 双后台并存，用户路径不统一
- 企业版团队协作功能未实现（无 Workspace/Team 模型）
- 微信支付仅有框架占位，未开放
- 退款只更新本地订单状态，未调用支付宝退款接口
- 到期降级依赖惰性计算，无定时任务
- AI 成本统计只有 Credit 计数，无真实成本计算

## 生产级安全提示

- 密钥、API Key、数据库密码、SMTP 密码、支付私钥绝不写入仓库
- AI 请求必须经由服务端代理，浏览器不接触 API Key
- 支付回调必须验签、校验金额、幂等处理
- 免费用户服务端必须拒绝真实 AI 调用
- 文件上传需校验类型、大小、路径穿越
- 所有管理 API 逐请求鉴权

## 权威文档入口

| 文档 | 路径 | 用途 |
|------|------|------|
| 工程规则 | `PROJECT_RULES.md` | 安全与工程红线 |
| 产品需求 | `PRD.md` | V2 生产级产品需求文档 |
| 版本路线 | `ROADMAP.md` | W1-W11 阶段规划 |
| 当前迭代 | `SPRINT.md` | 当前 Sprint 与代码任务拆分 |
| UI 架构 | `docs/UI_ARCHITECTURE.md` | 信息架构与移动端规范 |
| 用户组件 | `docs/USER_COMPONENT_CATALOG.md` | 20 种模块组件目录 |
| 外部展示 | `docs/SHOWCASE_AND_DEMO.md` | /showcase 可信演示闭环规范 |
| 平台后台 | `docs/JEEPWORK_ADMIN_SPEC.md` | /jeepwork 平台控制平面规范 |
| 套餐权益 | `docs/PRICING_AND_ENTITLEMENTS.md` | 套餐、价格、权益与 AI 额度 |
| 文档索引 | `docs/DOCUMENT_INDEX.md` | 全部文档清单与状态 |
| 代码审计 | `docs/audits/LINK168_LOCAL_CODE_AND_PRD_AUDIT_20260705.md` | 最新代码与功能审计报告 |
| 仓库版本策略 | `docs/REPOSITORY_VERSION_POLICY.md` | Git 分支与版本管理 |
