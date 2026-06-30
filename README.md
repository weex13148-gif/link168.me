# Link168

Link168 is a personal digital identity homepage and QR-code marketing tool for Chinese users.

Brand slogan:

- Link168 链接一路发
- 一个人，一个链接，连接全网

## V0.1 Scope

V0.1 only supports the core path:

1. Register
2. Log in
3. Create one public profile
4. Edit profile information
5. Add, edit, and delete links
6. Visit the public profile by username
7. Submit reports through the report center
8. Review basic reports in the admin area

Users can aggregate WeChat official accounts, Xiaohongshu, Douyin, WeChat Channels, website links, product links, consultation bookings, and other destinations into one public page.

## Tech Stack

- Next.js App Router
- Tailwind CSS
- Prisma
- PostgreSQL
- Self-built register and login flow
- bcrypt password hashing
- HttpOnly Cookie Session

## Pages

- `/` V0.1 entry page
- `/register` register page
- `/login` login page
- `/dashboard` user dashboard
- `/[username]` public profile route
- `/report` report center
- `/admin/reports` basic admin report area

## Product Rules

- Brand name: Link168
- Official URL: `https://link168.me`
- Free plan: one profile and one username
- Free public profiles must show a clickable `Powered by Link168` brand footer
- Logo asset: `public/brand/link168-logo.png`
- Logo should be rendered through a clickable `BrandLogo` component that returns to `/`
- V0.1 does not include membership, payment, AI, complex analytics, a template marketplace, or real WeChat login
- VLink is only a functional layout reference. Do not copy its brand, images, copy, or colors.

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
