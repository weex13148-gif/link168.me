# Wave 1 verification evidence — 2026-07-18

## Scope and runtime

- Branch baseline: `fa45799ae184863d5d0a8d236410f93d822e9f0e`.
- Final Wave 1 application HEAD under test: `4ab561032e08f836c69842ec31ef660123a6e69f`.
- A fresh Prisma generation exposed an already-migrated `AiServiceConfig.quickActionsJson` field missing from the tracked generated client. The focused generated-client refresh is `e79515e78ea908e26caaf80e61a67df5b9dd67a1`.
- Visual regression correction: `4bc1f38a2bb7419e1f6bb284f201e53d19867529` moved the anchor reset into Tailwind's base layer, so utility link colors retain precedence. A focused regression test failed before the change and passed after it.
- Final review correction `21b223eb276843b76d77bfb22d0a10f44af0eaf4` made every ordinary-user profile creation path private by default, preserved publication state during ordinary saves, normalized the ordinary plan facts to Free / Plus / Pro, and removed unverified Enterprise, price, and payment claims.
- Browser verification then exposed private profile content in HTML metadata. `758a9ad726a6bfc9fc8432487f6ae099439850f1` closes that leak for unpublished and access-restricted profiles; its three-test contract was RED before the correction and GREEN after it.
- The final public-resource audit found that `/api/avatar/[username]` could still serve an unpublished avatar with a public cache header. `47481f8157f43dbdaa6c1d77596c669c855adceb` now returns 404 to anonymous unpublished/restricted requests, permits owner preview only with `private, no-store`, and uses public caching only for a genuinely public, verified, unrestricted profile. Its focused contract recorded three RED failures and four GREEN tests.
- Legacy files under `public/uploads/avatars` were a second bypass around that route. `4ab561032e08f836c69842ec31ef660123a6e69f` makes the Next proxy rewrite every safe historical avatar path to a controlled legacy route that resolves the owning profile and reuses the same publication, email-verification, restriction, moderation, and cache checks. The expanded focused contract includes the rewrite, unpublished block, published access, and unverified-email block.
- Node `v24.14.0`; npm `11.9.0`; Prisma client `7.8.0`.
- `npm ci` completed successfully using the dedicated scratch npm cache.
- Final full-repository gates ran at exact HEAD `4ab561032e08f836c69842ec31ef660123a6e69f`; the auditable command log is `/tmp/link168-wave1-root-final-gates.log`.
- Disposable local PostgreSQL reported `PostgreSQL 16.14 on x86_64-pc-linux-gnu` from `SELECT version()`.

The disposable PostgreSQL process used the downloaded PostgreSQL 16.14 binary and a container-only UID/ownership-query shim because this container rejects `runuser`, `setpriv`, and `chown` identity changes. It validates SQL/migration compatibility only; it is not a production process-permission validation. No production database or configuration was used.

## Repository gates

All commands below were freshly run at that exact final application HEAD against the disposable PostgreSQL environment, with non-production environment variables. The log header records Node, npm, Prisma, PostgreSQL, exact HEAD, commands, each exit code, and final overall exit 0. `npx prisma generate` left no tracked generated-client diff.

| Command | Result |
| --- | --- |
| `npx prisma validate` | exit 0 |
| `npx prisma generate` | exit 0 |
| `npx prisma migrate deploy` | exit 0; applied the repository's 21 existing migrations; no Wave 1 migration was added |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm test -- --runInBand` | exit 0; 34 suites / 420 tests passed |
| `npm run build` | exit 0 |
| `npm run release:preflight` | exit 0 |
| `npm run release:smoke` | exit 0; standalone homepage, health, static, and brand assets passed |
| `git diff --check` | exit 0 |

The build emitted a non-failing Turbopack tracing warning for `next.config.ts` and the dashboard link-icon route.

## Authenticated Chromium journey

At exact final application HEAD `4ab561032e08f836c69842ec31ef660123a6e69f`, an authenticated disposable demo user completed 29 browser assertions. Browser console errors: 0. Page errors: 0. The headless test runtime loaded temporary Noto Sans SC assets so Chinese screenshot text is readable; the application bundle and dependencies were unchanged.

- One shared shell was found on `/console`, `/dashboard`, `/workbench/leads`, `/workbench/ai`, and `/workbench/account`.
- At 360, 390, and 430 CSS-pixel widths, the sole fixed global bar had exactly 首页 / 名片 / 客户 / AI / 我的 and no horizontal overflow.
- `/dashboard` exposed `aria-label="名片编辑步骤"`; the mobile page had one fixed global navigation bar.
- Setting `link168_onboarding_progress` to `reception` could not bypass the incomplete server profile: the wizard returned to the server-required business step.
- Existing wizard/API saves for business data, the creator template, and a contact value survived refresh and were observable in the preview/page and dashboard API result.
- The free reception page included “预设回复”; the ordinary-user AI page did not contain Enterprise/企业版 or a numeric paid-quota claim.
- `/workbench/ai-service`, `/workbench/ai/reception`, and `/workbench/ai/legacy` each finished at `/workbench/ai`.
- On desktop `/console`, the release CTA text “下一步：预览并发布名片” and active “首页” navigation label both had distinct computed foreground and background colors.

## Fresh registration and explicit publication journey

A separate empty PostgreSQL 16.14 database received all 21 migrations, then exact application HEAD `4ab561032e08f836c69842ec31ef660123a6e69f` completed 54 assertions with zero browser console/page errors in the final standalone build. The raw result is `/tmp/link168-wave1-registration-evidence.json`.

- Chromium submitted the real `/register` form and observed the real `/api/auth/register` success plus `/verify-email` redirect and session cookie.
- The newly created profile had the generated placeholder username and `is_public = false`.
- Because external mail delivery and historical production files are outside this local gate, the test-only setup set `users.email_verified = true` and attached one controlled legacy `avatar_url` fixture. The profile publication field was never changed directly.
- Saving the permanent username, business details, creator template, and a public contact each preserved `is_public = false`.
- Before explicit publication, an anonymous request received the “该主页暂未公开” state; its HTML and metadata contained none of the saved display name, bio, or contact value.
- A real file existed at the historical static path. Before publication, its authenticated owner received the bytes with `private, no-store, max-age=0`, while an anonymous request received 404 and no file bytes.
- Refreshing the preview and clicking “预览无误” both preserved the private state.
- Clicking “立即发布” was the first action to set `is_public = true`; subsequent anonymous requests contained the saved public display name/contact and could read the controlled legacy avatar. The global API policy kept the observed avatar response at the stricter `private, no-store, max-age=0` policy.

## Screenshots

| Path | Authenticated URL | Viewport | SHA-256 |
| --- | --- | --- | --- |
| `wave-1-screenshots/desktop-console.png` | `/console` | 1280×900 | `3a5a9ad3c95d0eb1294f38cac594d8286120eb848e6ec97ecdeac87a9b889a89` |
| `wave-1-screenshots/mobile-360-dashboard.png` | `/dashboard` | 360×844 | `0366a3cce1d1f6c4096bd1a9bb315c63623517ed655d39bdc76c2d6273286ad6` |
| `wave-1-screenshots/mobile-390-leads.png` | `/workbench/leads` | 390×844 | `8d282865298304991b6f5fa57eb230c515a4fd758f97b4d4e9c8346bcae6cfb4` |
| `wave-1-screenshots/mobile-430-ai.png` | `/workbench/ai` | 430×844 | `c49893126ff9ff5c21fc348aa071347b9e9d43c4d634294738e3594baa993fc5` |

## Remaining risks

- Lead five-state migration: not implemented; Wave 3.
- Single AI Provider and real Bailian verification: not implemented; Wave 4.
- Final price/quota/refund decision and real Alipay: not authorized; Wave 5 plus owner decision.
- Production mail, object storage, database and deployment: not verified.
- Production reverse-proxy/static-server configuration must route `/uploads/avatars/*` through the Next proxy; a separate Nginx/CDN alias that bypasses Next was not available to verify in this container.
