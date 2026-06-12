# SPRINT

## Sprint 1 Goal

Only complete the Link168 V0.1 MVP path:

`register -> login -> create profile -> edit profile -> add link -> visit public profile -> report center -> basic admin review`

## Allowed In Sprint 1

1. Register with Prisma users and bcrypt password hashes
2. Log in with Prisma users and server-side sessions
3. Redirect unauthenticated `/dashboard` visits to `/login`
4. Create or update one user profile
5. Add links
6. Edit links
7. Delete links
8. Publicly read active links on `/[username]`
9. Show the free-plan `Powered by Link168` footer on public profile pages
10. Submit reports through `/report`
11. Review reports in a basic admin area protected by `ADMIN_SECRET` or equivalent protection
12. Use the clickable `BrandLogo` component with `public/brand/link168-logo.png`

## Not Allowed In Sprint 1

1. Membership system
2. Payment system
3. Enterprise plan
4. AI features
5. Complex analytics
6. Custom themes
7. Template marketplace
8. Real WeChat login integration
9. Share button prototypes
10. Fake feature buttons

## Acceptance Criteria

1. A new user can register.
2. A registered user can log in.
3. Visiting `/dashboard` while logged out sends the user to `/login`.
4. A logged-in user can save a username, display name, and bio.
5. A logged-in user can add a link with title and URL.
6. A logged-in user can edit an existing link.
7. A logged-in user can delete an existing link.
8. Visiting `/{username}` shows the saved profile and active links.
9. The public profile footer shows `Powered by Link168` and links to `/`.
10. The report center accepts report submissions.
11. The basic admin report area is protected.
12. Passwords are stored as bcrypt hashes.
13. Login state uses HttpOnly Cookie Session.

## Deployment And Security Rules

1. Prefer Aliyun ECS for deployment.
2. Do not prioritize Vercel, Supabase, or other overseas services.
3. During HTTP public IP testing, use `COOKIE_SECURE=false`.
4. After the official HTTPS domain is live, use `COOKIE_SECURE=true`.
5. Do not commit `.env`, `.env.local`, or `.env.production`.
6. Do not commit database passwords, `SESSION_SECRET`, or `ADMIN_SECRET`.
