# Link168 SaaS Mainline Program Roadmap

**Status:** Approved; development branch created and verified on 2026-07-18

**Product specification:** `docs/superpowers/specs/2026-07-18-link168-saas-product-mainline-design.md`

**Repository:** `weex13148-gif/link168.me`

**Safety baseline:** PR #52 head `fa45799ae184863d5d0a8d236410f93d822e9f0e`

**Development branch:** `integration/saas-mainline-v1-20260718`

The branch currently points exactly to `fa45799ae184863d5d0a8d236410f93d822e9f0e`; no implementation commit, merge or deployment has been made yet.

## Outcome

Build one understandable, testable and safely degradable SaaS mainline for service-based solo entrepreneurs:

`professional card → preset or AI reception → real Lead → lightweight follow-up → won conversion`

The program reuses the existing PostgreSQL data, domain logic, security boundaries, entitlement ledger, order safety and release gates. It rebuilds the user-facing product shell and converges duplicate routes and business sources without destructive deletion.

## Why this is a program, not one oversized implementation plan

The approved specification covers seven business modules whose code ownership and failure modes differ. A single implementation plan would make review and rollback too coarse. Work is therefore divided into seven sequential, independently reviewable waves. Every wave must have its own implementation plan written against the exact head produced by the preceding wave.

Only Wave 1 is expanded into an implementation-ready plan now. Later wave plans are written after the previous wave passes its gate, so their file paths, signatures and tests describe the code that actually exists at that time.

## Current code map

| Area | Current source of truth | Main conflict to resolve |
| --- | --- | --- |
| User navigation | `src/components/layout/console-navigation.ts` | Five labels exist, but Dashboard still renders an independent shell and mobile editor navigation |
| User shell | `src/components/layout/ConsoleShell.tsx` | Canonical candidate; currently exposes secondary functions as near-peer navigation and renders a sixth mobile “more” item |
| Card editor | `src/components/dashboard-v1/**` | Mature editor state, but `DashboardFrame.tsx` duplicates global navigation |
| Onboarding | `src/components/onboarding/**` | Eight-step flow exists, but order differs from the approved flow and contact/reception are not canonical steps |
| Public card | `src/app/[username]/page.tsx`, `src/components/share/SharePageRenderer.tsx` | Renderer exists; layout and component exposure must be narrowed to the professional-card mainline |
| Lead | `src/app/api/workbench/leads/**`, `src/components/workbench/LeadsClient.tsx` | Current new statuses conflict with `pending/following_up/quoted/won/invalid` |
| AI | `src/lib/ai/**`, `src/app/api/workbench/ai/**` | Multiple provider and assistant paths must converge behind one platform adapter |
| Billing | `src/lib/billing/**`, `src/app/api/payments/**` | Hard-coded price/quota values are not approved; production payment remains closed |
| Release | `.github/workflows/**`, `scripts/release/**`, `docs/release-closeout/**` | Existing gates are useful, but branch filters and public-beta journeys need the new mainline |

## Wave sequence

### Wave 1 — Mainline foundation, one shell and first-use flow

**Delivers:** canonical product facts, five-navigation shell, Dashboard/Workbench convergence, approved onboarding order, legacy-route compatibility and a branch-specific CI gate.

**Must not change:** Prisma schema, Lead state values, AI provider behavior, price numbers, payment execution or production infrastructure.

**Gate:** one authenticated shell is visible across 首页/名片/客户/AI/我的; mobile bottom navigation contains exactly five items; onboarding data persists through existing APIs; full repository test/build gates pass.

**Detailed plan:** `docs/superpowers/plans/2026-07-18-link168-mainline-foundation-shell-plan.md`

### Wave 2 — Professional card and public conversion surface

**Delivers:** structured professional-card content, approved component catalogue, touch/keyboard ordering, mobile preview, one public renderer, fixed contact/reception actions and truthful intent events.

**Primary files:**

- `src/components/dashboard-v1/**`
- `src/features/profile-modules/**`
- `src/components/PhonePreview.tsx`
- `src/components/share/**`
- `src/app/[username]/page.tsx`
- `src/app/api/dashboard/links/**`
- `src/app/api/public/**`

**Gate:** create/edit/sort/hide/delete survives refresh; preview and public renderer agree at 360/390/430 px; a click is an intent event, never a Lead.

### Wave 3 — Real Lead and lightweight follow-up

**Delivers:** the five approved states, compatibility mapping for historical states, transactional follow-up history, next-follow-up reminders, source/product snapshots and owner isolation.

**Primary files:**

- `prisma/schema.prisma`
- a new additive migration under `prisma/migrations/`
- `src/lib/leads/**`
- `src/app/api/workbench/leads/**`
- `src/components/workbench/LeadsClient.tsx`
- `src/app/workbench/leads/page.tsx`
- Lead-producing public APIs and components

**Gate:** new records use only `pending/following_up/quoted/won/invalid`; historical raw status remains auditable; status plus note changes are atomic; cross-owner access fails; refresh retains every change.

### Wave 4 — Preset reception and one real-AI boundary

**Delivers:** Free preset replies without model or credit use, Plus/Pro real-AI gate, one provider interface, Bailian adapter, business-data reuse, stable errors, idempotent credit usage and safe compensation.

**Primary files:**

- `src/lib/ai/**`
- `src/app/api/dashboard/ai-service-config/route.ts`
- `src/app/api/public/[username]/ai-reception-config/route.ts`
- `src/app/api/workbench/ai/chat/route.ts`
- `src/components/ai/**`
- `src/components/share/modules/AiChatModule.tsx`

**Gate:** preset replies make zero provider calls and consume zero credits; successful real AI is labelled; provider failure preserves the card/contact/Lead form; provider secrets and raw errors never enter user DTOs.

### Wave 5 — Plans, entitlement truth and payment readiness

**Delivers:** public Free/Plus/Pro only, hidden Enterprise structures, one plan definition source, official Alipay SDK boundary, truthful disabled purchase state and a production-readiness evidence checklist.

**Primary files:**

- `src/lib/billing/**`
- `src/app/pricing/page.tsx`
- `src/app/api/billing/**`
- `src/app/api/payments/alipay/**`
- `src/app/api/pay/**`
- `src/components/admin/PaymentDiagnosticsPanel.tsx`
- `THIRD_PARTY_NOTICES.md`

**Gate:** no unapproved numeric price/quota can activate a purchase; Enterprise is absent from public navigation and purchase APIs; callbacks cannot grant entitlement without verified order/amount/signature; real payment remains closed until a separate owner decision.

### Wave 6 — Operating metrics and homepage decisions

**Delivers:** real visit, intent, Lead, won and retention events; owner-scoped aggregation; homepage completion, recent Lead and next-follow-up cards; no demo growth values.

**Primary files:**

- `src/lib/analytics/**`
- `src/app/api/dashboard/analytics/route.ts`
- `src/app/api/public/[username]/visit/route.ts`
- `src/app/api/public/links/[linkId]/click/route.ts`
- `src/app/console/page.tsx`
- `src/app/workbench/analytics/page.tsx`

**Gate:** every displayed metric can be traced to a server event and owner-scoped query; click counts and Lead counts remain distinct; won Lead transitions drive conversion.

### Wave 7 — Public-beta release and rollback proof

**Delivers:** production-readiness report, external-service status matrix, browser journeys, clean PostgreSQL migration proof, backup/restore rehearsal, rollback instructions and Draft PR to `master`.

**Primary files:**

- `.github/workflows/**`
- `scripts/release/**`
- `scripts/db/**`
- `docs/release-closeout/2026-07-18/**`
- end-to-end/browser test configuration introduced in this wave

**Gate:** repository, browser, security, database, backup and rollback evidence all pass. Payment and real AI are described as production verified only if real provider evidence exists. Deployment and merge still require separate approval.

## Cross-wave rules

1. Work starts from the exact recorded head; a dirty or ambiguous worktree stops execution.
2. No destructive migration, data reset, historical-route deletion or Enterprise-structure deletion is authorized.
3. Each production behavior starts with a failing test and ends with targeted tests plus the full gate.
4. A wave changes only its listed ownership area unless an interface change is explicitly recorded in its plan.
5. Old routes use redirects, thin wrappers or feature flags until a separately approved removal plan exists.
6. External services report `configured`, `unconfigured`, `degraded` or `failed`; they never fabricate success.
7. No copied third-party code enters the repository before license/source review and `THIRD_PARTY_NOTICES.md` entry.
8. A successful CI run proves repository behavior only; it does not prove production payment, Bailian, mail, storage or deployment.

## Branch and PR path

```text
PR #52 head fa45799…
  → integration/saas-mainline-v1-20260718
  → Wave 1–7 reviewed commits
  → Draft PR to master
  → separate merge approval
  → separate deployment approval
```

PR #52 remains unchanged as the source baseline. The new mainline branch does not authorize merging PR #52 or deploying any environment.

## Program completion test

The program is complete only when a service-based solo entrepreneur can register, publish and share a professional card; a visitor can receive a truthful preset/AI reception or submit real contact details and a need; the owner can follow up and mark a win; and every external-service failure safely preserves the core card and contact path.
