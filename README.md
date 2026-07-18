# Link168

Link168 是面向服务型个体创业者的经营型 SaaS：专业商业名片 + 24 小时接待 + 真实 Lead + 轻量跟进。

当前唯一经营闭环：

`注册 → 建名片 → 发布/分享 → 访客访问 → 预设或 AI 接待 → 真实 Lead → 跟进 → 成交`

## Current authority

- Approved product specification: `docs/superpowers/specs/2026-07-18-link168-saas-product-mainline-design.md`
- Program roadmap: `docs/superpowers/roadmaps/2026-07-18-link168-saas-mainline-program.md`
- Ordinary-user navigation: 首页、名片、客户、AI、我的
- Public plans: Free、Plus、Pro; exact paid price and quota are not approved
- Production status: not yet verified for Bailian, Alipay, mail, object storage, production database or deployment

## Deployment Direction

- Prefer Aliyun ECS for deployment.
- Do not prioritize Vercel, Supabase, or other overseas services for the primary deployment path.
- During HTTP public IP testing, set `COOKIE_SECURE=false`.
- After the official HTTPS domain is live, set `COOKIE_SECURE=true`.

## Security Rules

- Do not commit `.env`, `.env.local`, or `.env.production`.
- Do not commit database passwords, `SESSION_SECRET`, or `ADMIN_SECRET`.
- Passwords must be stored as bcrypt hashes.
- Login state must use HttpOnly Cookie.
- Admin APIs require `ADMIN_SECRET` or equivalent protection.

## Local Setup

Create `.env.local` from `.env.example`:

```bash
DATABASE_URL=postgresql://user:password@host:5432/link168
ADMIN_SECRET=replace-with-a-random-secret-at-least-32-characters
SESSION_SECRET=replace-with-a-random-secret-at-least-32-characters
COOKIE_SECURE=false
```

Install dependencies and run:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.
