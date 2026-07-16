# Link168 P0 Acceptance Matrix

Status: In progress
Integration branch: `integration/release-risk-closeout-20260716`

| Domain | Required behavior | Automated evidence | Production evidence | Current status |
|---|---|---|---|---|
| CI | Exact release candidate runs full install, Prisma, TS, lint, Jest, build and diff checks | GitHub Actions run and job IDs | Server rebuild log | Planned |
| Runtime | Standalone server serves homepage, health and static assets | CI smoke | Localhost and domain smoke | Planned |
| Migration | All migrations apply to PostgreSQL 16 | CI service DB | Production status, backup and deploy | CI previously passed; production pending |
| Refund | No local-only refund can claim money returned | Unit/integration tests | Alipay or safe-disabled UI verification | Known gap |
| Membership | Expired plans lose paid entitlements idempotently | Service/API tests | Expiry simulation | Known gap |
| AI risk | Pricing/refund/delivery/income/professional advice follows fixed safe handling | Safety test matrix | Real browser/provider checks | Partial; high-risk hardening pending |
| AI credits | Preset replies consume zero AI credit; free users cannot call real AI | Existing and new tests | Production credit observation | Partial |
| Public AI | Disable/remove component stops public config; no supplier fields leak | Route/UI tests | Browser network inspection | Partial; cache verification pending |
| Pricing | Marketing, checkout, order and payment amounts agree | Source/route tests | Production order comparison | Pending review |
| Legal visibility | Operator, ICP, contact/report, user/privacy/member/refund/AI rules available before purchase | Route/source tests | Browser purchase journey | Partial |
| Truthful states | Payment/refund/AI/save states never fake success | Regression tests | Browser failure simulation | Pending |
| Admin boundary | Platform backend allows only `super_admin` | Auth tests | Non-super-admin login attempt | Backend already enforced; P1 dead UI cleanup later |

## P0-A acceptance

- [ ] Workflow listens to `master` and integration PRs.
- [ ] PostgreSQL 16 migration, TypeScript, lint, tests and build pass.
- [ ] Standalone smoke checks `/`, `/api/health` and static assets.
- [ ] Environment preflight checks names/presence only and never prints values.

## P0-B acceptance

- [ ] Local order mutation alone cannot produce final refunded state.
- [ ] Refund request is idempotent.
- [ ] Provider failure keeps order and entitlement truthful.
- [ ] Refund audit includes actor, reason, amount, request ID and result.

## P0-C acceptance

- [ ] Expired membership downgrades automatically.
- [ ] Request-time entitlement check blocks stale paid access.
- [ ] Repeated downgrade is safe.
- [ ] User content is retained.
- [ ] Audit record explains the downgrade.

## P0-D acceptance

- [ ] L1/L2/L3/L4 risk categories have deterministic behavior.
- [ ] Model cannot promise special price, refund, compensation, delivery time, guaranteed income or professional conclusion.
- [ ] Secret/data-exfiltration requests are rejected and logged minimally.
- [ ] Customer and visitor responses contain no supplier/model/internal key fields.

## P0-E acceptance

- [ ] Operator and ICP information are visible.
- [ ] Contact and report channels are visible.
- [ ] User agreement, privacy, membership, refund and AI notices are reachable before purchase.
- [ ] Price claims are evidence-based and no fake promotion mechanisms exist.
- [ ] Purchase language accurately reflects unverified/disabled external services.

## Completion rule

A domain is complete only when its exact branch SHA, changed files, RED evidence, GREEN evidence and residual risk are recorded in its Draft PR and rechecked after integration.
