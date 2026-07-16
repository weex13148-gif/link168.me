# Link168 P0/P1/P2 Release Risk Closeout Scope

Status: Active execution baseline
Date: 2026-07-16
Repository: `weex13148-gif/link168.me`
Base branch: `master`
Base SHA: `5e8831b12e7528a4956ecae6953ad694609c3a20`
Integration branch: `integration/release-risk-closeout-20260716`

## Governing principle

先阻断事故，再完善体系。每一条规则必须落到页面、字段、按钮、日志、测试、合同或证据，不以文档存在代替真实闭环。

## P0 — before production release

1. Master CI and deployment gates
   - Full verification on `master` pushes and release integration PRs.
   - PostgreSQL 16 migration verification.
   - Standalone runtime smoke for `/`, `/api/health`, CSS and brand assets.
   - Production environment preflight without printing secret values.
2. Refund safety
   - No local-only action may represent money as successfully refunded.
   - Real provider-confirmed refund, or safe disabled/pending-only workflow.
   - Order, refund record, entitlement and payment result remain consistent.
3. Membership expiry
   - Idempotent automatic downgrade.
   - Request-time entitlement expiry enforcement.
   - Audit records and no user-content deletion.
4. AI high-risk boundaries
   - Fixed handling for pricing, refunds, delivery promises, income guarantees, legal/medical/financial conclusions, privacy deletion, infringement and secret requests.
   - No supplier/model disclosure to customer or visitor clients.
   - Preset replies do not consume AI credits.
5. Public legal, pricing and purchase rules
   - Operator identity, ICP, contact/report channels and agreements visible before purchase.
   - Price, checkout, order and actual charge consistent.
   - No fabricated original price, countdown, users, outcomes or guaranteed conversion claims.

## P1 — after P0 GREEN, before broad promotion

- Remove unreachable platform `admin` UI and conflicting copy; keep platform backend `super_admin` only.
- Resolve AI public-config cache policy and verify immediate disable/removal behavior.
- Re-run 360/390/430 px browser E2E with screenshots and logs.
- User-content rights declaration, report snapshot, takedown, appeal and audit evidence.
- Pin core dependency versions; add secret, dependency and migration safety checks.

## P2 — separate governance/document stream

- Rebuild constitution, PRD, project rules, document index and release status from current `master`.
- Archive or close stale PR #27 and PR #41; do not merge them directly.
- Mark completed implementation plans as historical records.
- Build IP, account, supplier, contract and evidence registers.
- Company governance tasks: shareholder, supervisor, address, tax, bank/payment and public/private fund separation.

## Frozen / excluded

- Enterprise customer-service seats, realtime takeover, assignment, WebSocket and supervisor performance.
- New enterprise-card system or broad CRM expansion.
- Large architectural rewrite.
- Major dependency upgrades.
- Direct production deployment without a separate owner approval.
- Fake success for Bailian, mail, Alipay or storage.

## Merge policy

- No direct commits to `master`.
- Each P0 domain uses an isolated branch and Draft PR into the integration branch.
- Production code requires a failing test or explicit failing gate before implementation.
- Integration requires full CI and conflict review.
- Production deployment remains a separate approved phase.
