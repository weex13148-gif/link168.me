# Link1688

Mobile-first personal links app for `link168.me`.

## V0.1 Scope

V0.1 only supports the core path:

1. Register
2. Log in
3. Create one public profile
4. Add, edit, and delete links
5. Visit the public profile by username

## Tech Stack

- Next.js App Router
- Tailwind CSS
- Prisma, PostgreSQL, bcrypt, and server-side sessions

## Pages

- `/` V0.1 entry page
- `/register` register page
- `/login` login page
- `/dashboard` user dashboard
- `/[username]` public profile route

## Product Rules

- Brand name: Link1688
- Official URL: `https://link168.me`
- Free plan: one profile and one username
- Free public profiles must show a clickable `Powered by Link1688` brand footer
- V0.1 does not include membership, payment, analytics, theme marketplace, or admin pages

## Local Setup

Create `.env.local` from `.env.example`:

```bash
DATABASE_URL=postgresql://user:password@host:5432/link168
ADMIN_SECRET=replace-with-a-random-secret-at-least-32-characters
```

Install dependencies and run:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.
