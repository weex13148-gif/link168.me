# Public Profile Design QA — 2026-07-26

- public profile: `/ui-audit-20260722`
- public viewport visually inspected: 390 × 844
- dashboard: authenticated local test account, mobile editor visually inspected
- responsive viewports: 360 px, 390 px, 768 px and 1440 px covered by layout regression tests and responsive source rules
- retired `/showcase` scope: no route in the production build manifest; retirement regression tests pass
- third-party state: AI provider and automatic image moderation remain **待配置验证**

## Visual evidence

At 390 × 844, the database-backed public profile rendered:

- a full-width cover area with the identity section integrated into the page rather than a floating white card;
- the approved logo/avatar without cropping;
- the profile name, introduction and vCard action;
- the `ai-chat` module before the service module and within the first viewport;
- the explicit safe fallback “AI 接待暂未开启 / 联系本人” because no real AI provider is configured;
- exactly one sticky primary “联系我” action;
- no “暂无公开内容” placeholder and no horizontal overflow.

The authenticated dashboard rendered the restored profile and two public modules, with a single top save-state indicator, mobile bottom navigation and no horizontal overflow in the inspected mobile viewport. The desktop structure remains the tested three-column editor layout (224 px navigation, flexible editor and 350–370 px preview). A second desktop screenshot could not be captured after the browser automation connection stalled, so desktop acceptance is supported by the existing responsive regression suite and the successful production build rather than a new screenshot.

## Functional evidence

- Local PostgreSQL, the existing test profile and the local login account were restored after restart.
- A service card was saved through the dashboard UI.
- A local-only Pro test entitlement was attached without creating a payment or order.
- An AI reception module was created and moved before the service module.
- Public AI availability failed safely when the provider was not configured and exposed the contact fallback.
- A membership inconsistency was found and fixed: valid legacy paid subscriptions are now recognized consistently by the dashboard and by paid-module create/edit APIs.
- The production route manifest contains no `/showcase` or `/api/showcase/*` route.

## Result

`final result: passed for local closeout`

The implemented SaaS flow is locally runnable and the public-profile closeout is accepted. Production payment, email, AI and automatic moderation still require real credentials and controlled production verification; no success was fabricated for those integrations.

## Repository gates

- `npx prisma validate`: passed.
- `npx prisma generate`: passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test -- --runInBand`: passed, 36 suites / 456 tests.
- `npm run build`: passed; 142 static pages generated and no showcase route appears in the route manifest.
- `git diff --check`: passed after the final report update.

## Dependency audit

`npm audit --omit=dev` reports three high and one moderate advisory in the Prisma CLI dependency chain (`prisma` → `@prisma/dev` → `find-my-way` / `valibot`). The registry proposes a Prisma downgrade to 7.8.0. No forced downgrade was applied during closeout because it changes the schema toolchain and requires a separate compatibility review.

The Next.js build rewrote `next-env.d.ts`; the pre-existing user-owned development-types reference was restored afterward and remains intentionally uncommitted.
