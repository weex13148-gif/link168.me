# PROJECT_RULES

## Brand

- Brand name: Link168
- Product name: Link168
- Official URL: `https://link168.me`
- Brand slogan: `Link168 链接一路发`
- Supporting slogan: `一个人，一个链接，连接全网`
- Free footer text: `Powered by Link168`
- Footer click target: `/`
- Logo asset: `public/brand/link168-logo.png`
- Logo component: clickable `BrandLogo`, returning to `/`

## Product Positioning

Link168 is a personal digital identity homepage and QR-code marketing tool for Chinese users.
Users can create one public homepage that aggregates WeChat official accounts, Xiaohongshu, Douyin, WeChat Channels, website links, product links, consultation bookings, and similar destinations.

## V0.1 Free Plan Rules

1. One user can create one profile.
2. One user can own one username.
3. The public profile must show the Link168 brand footer.
4. The brand footer is fixed to the profile footer area.
5. The brand footer links to `/`.
6. Free users cannot hide, delete, or edit the brand footer.

## Technical Direction

1. Next.js App Router is the application framework.
2. Prisma is the ORM.
3. PostgreSQL is the database.
4. Register and login are self-built.
5. Sessions use HttpOnly Cookie.
6. Passwords must be stored as bcrypt hashes.

## Deployment Rules

1. Prefer Aliyun ECS for deployment.
2. Do not prioritize Vercel, Supabase, or other overseas services.
3. During HTTP public IP testing, use `COOKIE_SECURE=false`.
4. After the official HTTPS domain is live, use `COOKIE_SECURE=true`.

## Security Rules

1. Do not commit `.env`, `.env.local`, or `.env.production`.
2. Do not commit database passwords, `SESSION_SECRET`, or `ADMIN_SECRET`.
3. Admin APIs require `ADMIN_SECRET` or equivalent protection.

## V0.1 Forbidden Scope

1. Pro membership
2. Payments
3. AI features
4. Complex analytics
5. Custom themes
6. Custom QR codes
7. Template marketplace
8. Real WeChat login integration
9. Fake buttons for unavailable features

## UI Direction

1. Home, login, and register pages should gradually move toward a green and gold Link168 brand style with panda IP elements.
2. VLink may be used only as a functional layout reference.
3. Do not copy VLink brand, images, copy, or colors.
