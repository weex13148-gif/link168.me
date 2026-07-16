# Link168 Release Risk Closeout File Ownership

Status: Active
Integration branch: `integration/release-risk-closeout-20260716`
Stage-zero parent SHA: `abb382fe9c38adc9dd7058ca8b9d73085ad834c8`

## Total control

The integration controller owns:

- Baseline and branch integrity
- Cross-domain conflict review
- Integration CI
- Final release evidence
- No product-scope expansion

## P0-A — CI and deployment gates

Branch: `agent/p0-ci-deploy-gates-20260716`

Primary ownership:

- `.github/workflows/**`
- `scripts/release/**`
- `scripts/db/**` only for preflight/verification changes
- `package.json` scripts only when required for release verification
- Release-gate tests

Must not modify payment, membership, AI business rules or public copy.

## P0-B — refund safety

Branch: `agent/p0-refund-safety-20260716`

Primary ownership:

- Refund APIs and services
- Alipay refund integration or safe pending/disabled fallback
- Refund/order state tests
- Refund-related admin UI

Must not alter public plan pricing, unrelated membership entitlement rules or deployment workflows.

## P0-C — membership expiry

Branch: `agent/p0-membership-expiry-20260716`

Primary ownership:

- Membership expiry service
- Entitlement request-time checks
- Protected cron endpoint
- Expiry audit and tests

Must not implement refund execution or alter AI supplier configuration.

## P0-D — AI high-risk boundaries

Branch: `agent/p0-ai-risk-boundaries-20260716`

Primary ownership:

- `src/lib/ai/**`
- AI customer-service API behavior
- AI safety/risk tests and minimal audit records

Must not implement enterprise seats, realtime human takeover or expose supplier/model details.

## P0-E — public legal, pricing and purchase rules

Branch: `agent/p0-public-legal-pricing-20260716`

Primary ownership:

- Public marketing/pricing pages
- Legal metadata and agreement visibility
- Purchase confirmation copy and legal-link tests
- Unsupported-claim removal

Must not change actual payment/refund transaction logic.

## Shared-file policy

Potential shared files:

- `package.json`
- `src/lib/billing/**`
- test configuration
- shared legal metadata

Rules:

1. The branch with primary ownership edits first.
2. Other branches avoid the file or coordinate through a follow-up integration commit.
3. No branch replaces a large file without first reading the current integration version.
4. Integration controller resolves conflicts with behavior-preserving minimal edits.

## Required branch report

Every P0 branch must report:

- Exact parent SHA
- Files changed
- RED evidence
- GREEN evidence
- Final head SHA
- Remaining risks
- Whether it is safe to merge
