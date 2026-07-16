# Link168 Production Deployment Gate

Status: NOT APPROVED FOR DEPLOYMENT
Candidate base: `5e8831b12e7528a4956ecae6953ad694609c3a20`

This file defines evidence required before a separate production-deployment approval. It does not authorize deployment.

## Repository gate

- [ ] Exact integration SHA recorded.
- [ ] PR to `master` is mergeable and scope-reviewed.
- [ ] `master` or exact release candidate has full CI evidence.
- [ ] `npm ci` succeeds using the committed lock file.
- [ ] `npx prisma validate` succeeds.
- [ ] `npx prisma generate` succeeds.
- [ ] All migrations deploy to clean PostgreSQL 16.
- [ ] TypeScript succeeds.
- [ ] ESLint succeeds.
- [ ] Jest full suite succeeds.
- [ ] Production build succeeds.
- [ ] Standalone server starts and serves `/`, `/api/health` and static assets.
- [ ] `git diff --check` succeeds.

## Server read-only gate

- [ ] Production directory confirmed.
- [ ] Current deployed SHA and working-tree status recorded.
- [ ] Node 22 and npm versions recorded.
- [ ] PM2 process name, working directory, start command, port and instance count recorded.
- [ ] Nginx config and upstream target recorded.
- [ ] Disk, memory and build space sufficient.
- [ ] PostgreSQL client tools and `pg_dump` available.
- [ ] Production database target confirmed without printing credentials.
- [ ] Pending migrations listed.
- [ ] Existing `CONFIG_ENCRYPTION_KEY` presence confirmed; value never printed or replaced.
- [ ] Required environment variables confirmed by name only.

## Backup and rollback gate

- [ ] Database backup completed and file is non-empty.
- [ ] Backup permissions restricted.
- [ ] Previous application SHA recorded.
- [ ] Previous runtime artifact or reproducible checkout available.
- [ ] Rollback steps written and owner identified.

## Business safety gate

- [ ] Refund cannot be represented as completed without payment-provider confirmation.
- [ ] Expired membership cannot continue paid entitlements.
- [ ] Free users cannot trigger real AI calls.
- [ ] AI high-risk questions cannot create unauthorized promises.
- [ ] Public prices, checkout amount and order amount agree.
- [ ] Agreements and refund/AI notices are available before purchase.

## Post-deploy smoke gate

- [ ] `/api/health` returns 200 and database `ok`.
- [ ] Homepage CSS, logo and images load.
- [ ] Register/login/session behavior works under HTTPS.
- [ ] Dashboard save/publish/public page works.
- [ ] AI enable/disable and component removal take effect.
- [ ] Preset reply does not consume credit.
- [ ] Real AI response is labelled as AI-generated.
- [ ] Lead creation works.
- [ ] Refund UI shows truthful state.
- [ ] Membership expiry behavior verified.
- [ ] Report flow and `/showcase` work.
- [ ] `/jeepwork` rejects non-super-admin users.
- [ ] 360/390/430 px browser smoke passes.

## Decision rule

Any unchecked P0 item means the release must be described as `not yet production verified`. A temporary safety downgrade must state the disabled function, owner and deadline.
