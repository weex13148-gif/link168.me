# ROADMAP

## Product Direction

Link168 is a personal digital identity homepage and QR-code marketing tool for Chinese users.
The official domain is `link168.me`.

Brand slogans:

- Link168 链接一路发
- 一个人，一个链接，连接全网

## Phase 1: V0.1 MVP

- Register
- Log in
- Create one profile
- Edit display name, username, and bio
- Add links
- Edit links
- Delete links
- Publicly visit a profile by username
- Show `Powered by Link168` on free public profiles
- Report center
- Basic admin report review
- Clickable logo through `BrandLogo`

## Phase 2: Brand And QR Marketing

- Green and gold Link168 visual style
- Panda IP brand elements
- QR-code sharing and marketing workflows
- Public profile polish
- Lightweight visit and conversion signals

## Phase 3: Commercial Features

- User management
- Content moderation
- Violation handling
- System settings
- Pro membership
- Payment system
- Advanced analytics
- Template marketplace

## Explicitly Out Of V0.1

- Enterprise plan
- Team collaboration
- Automated marketing
- Membership and payment
- AI features
- Complex analytics
- Template marketplace
- Real WeChat login integration
- Open API
- Referral rewards
- Coupons

## Technical And Deployment Direction

- Next.js + Prisma + PostgreSQL + self-built register/login + HttpOnly Cookie Session.
- Prefer Aliyun ECS for deployment.
- Do not prioritize Vercel, Supabase, or other overseas services.
- During HTTP public IP testing, use `COOKIE_SECURE=false`.
- After the official HTTPS domain is live, use `COOKIE_SECURE=true`.
