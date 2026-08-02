# Link168

Link168（链接一路发）是面向个人创业者、小商家和轻量团队的 AI 经营名片 SaaS。它把业务展示、访客咨询、AI 接待、客户留资、线索跟进、经营数据和会员订阅连成一个闭环。

## 当前唯一开发入口

- 当前收口分支：`recovery/direct-goal-closeout-20260722`
- 产品宪法：`01_PRODUCT_DOCS/PRODUCT_CONSTITUTION.md`
- 当前 PRD：`01_PRODUCT_DOCS/PRD.md`
- 价格与 AI 额度：`docs/PRICING_AND_ENTITLEMENTS.md`
- 工程与安全规则：`PROJECT_RULES.md`
- 开发助手入口：`AGENTS.md`

旧分支、旧 PRD、研究文档和历史报告只作参考，不能覆盖以上正式文件。

## 已有产品能力

- 注册、登录、邮箱验证、账号安全和会话管理
- 经营名片、产品/服务、平台链接、图片、二维码和公开页
- 访客访问、咨询、留资、Lead 跟进和经营统计
- AI 接待、知识库、风险降级和转人工
- Free、Plus、Pro、Enterprise、Enterprise Pro 权益
- 支付订单、回调、退款、对账和运营后台
- 企业 Workspace、成员、企业额度和自定义域名基础能力

真实 AI、邮件、支付、退款、对象存储和生产域名仍需在隔离或生产环境配置后验证，代码测试不能替代真实供应商验收。

## 本地运行

需要 Node.js、npm 和 PostgreSQL。Windows 请使用 `npm.cmd`。

```bash
copy .env.example .env.local
npm ci
npx prisma generate
npx prisma migrate deploy
npm run dev
```

将 `.env.local` 中的 `DATABASE_URL`、`SESSION_SECRET`、`ADMIN_SECRET` 和 `CONFIG_ENCRYPTION_KEY` 替换为本地测试值，然后访问 `http://localhost:3000`。不要提交 `.env.local`。

## 质量门禁

```bash
npx prisma validate
npx prisma generate
npm run lint
npm run typecheck
npm test -- --runInBand
npm run build
git diff --check
```

部署与数据库脚本见 `scripts/release/`、`scripts/db/` 和 `.env.example`。
