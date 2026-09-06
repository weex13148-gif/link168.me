# Link168 Multi-Agent Development Board

> Operational coordination document only. It is not CURRENT Product Authority and must not redefine OD, IF, or Acceptance semantics. IA is the only writer.

## Integration

```text
integration branch: codex/controlled-clean-rebuild-20260814
integration worktree: C:\Users\bifuc\.codex\worktrees\a056\link1688
baseline: 960e615fe2b1b59b9ae1712d0d3723e938c2e7c4
MULTI_AGENT_BASE_SHA: 682d9beb242374179f8cb51bac3810397e8e8644
```

## Shared Contract

The first stable shared code contract is `src/lib/current/contracts.ts`.

- All current-domain services return `CurrentResult<T>` and use `CurrentErrorCode`.
- Authenticated operations carry `CurrentActorContext` with explicit scope and role.
- Page publication is represented by `CurrentPublicationSnapshot` and `CurrentPublishedFacts`.
- Public Page and Visitor AI may read only `readPublishedFacts`; no current-domain consumer may read Draft through a public boundary.
- Lead creation requires `source`, `originPageId`, `workspaceId`, `contact`, and `commercialIntent`; statuses are only `new`, `contacted`, `closed`.
- Billing ownership is explicit through `CurrentBillingOwner` and is never inferred from a User-only subscription.
- Provider adapters expose explicit unavailable states and must never synthesize success.

## File Ownership Matrix

| Agent | Primary write scope | Forbidden direct writes |
| --- | --- | --- |
| IA | `MULTI_AGENT_DEVELOPMENT_BOARD.md`, shared config, integration-only conflict fixes | domain implementation while an Agent owns it |
| A1 Core/Data | `prisma/schema.prisma`, `prisma/migrations/**`, `src/lib/current/domain/**`, `src/lib/current/data/**`, `src/lib/current/repositories/**`, shared contract evolution | Page UI, AI prompt/UI, Team/Billing UI |
| A2 Page/UI | `src/app/console/onboarding/**`, `src/app/console/pages/**`, `src/components/current-page/**`, `src/app/[username]/**` only where required for CURRENT renderer | Prisma, published-facts semantics, Lead, Team ownership, Billing |
| A3 AI/Lead | `src/lib/current/ai/**`, `src/lib/current/leads/**`, `src/app/api/current/visitor/**`, `src/app/api/current/leads/**` | Prisma schema, Page UI, Team/Billing ownership |
| A4 Team/Billing/Lifecycle | `src/lib/current/team/**`, `src/lib/current/billing/**`, `src/lib/current/lifecycle/**`, `src/lib/current/jeepwork/**`, `src/app/jeepwork/current/**`, related APIs | Prisma schema, Page UI, AI/Lead implementation |

Shared files (`package.json`, global config, `src/lib/current/contracts.ts`, middleware, auth entry, global layouts) are IA-controlled. An Agent must report a cross-domain change instead of editing another Agent's scope.

## Fixed Agents

| Agent | Branch | Worktree | Status |
| --- | --- | --- | --- |
| A1 | `codex/rebuild-a1-core-data` | `C:\Users\bifuc\.codex\worktrees\link168-a1-core-data` | integrated: `4cc2b82878a6318b5e859f9cf26844a4e3a1290f` |
| A2 | `codex/rebuild-a2-page-ui` | `C:\Users\bifuc\.codex\worktrees\link168-a2-page-ui` | integrated: `6ec9c14` |
| A3 | `codex/rebuild-a3-ai-lead` | `C:\Users\bifuc\.codex\worktrees\link168-a3-ai-lead` | integrated: `229c553b78088b3f9e3d962b690603499886ed9a` |
| A4 | `codex/rebuild-a4-team-billing` | `C:\Users\bifuc\.codex\worktrees\link168-a4-team-billing` | integrated: `83f89db` + `00b4f1f101dd3754fa95491ea39cd93566702a68` |

## Integration Order

```text
A1 → A2 → A3 → A4
```

IA may adjust the order only when the actual dependency graph requires it and must record the reason here before integration.

## Guardrails

- No test API keys, live provider calls, provider sandbox calls, or production credentials.
- No new unit, integration, or E2E tests; existing tests are evidence only and are not rewritten to hide failures.
- No DB-1 migration, reset, seed, schema modification, or business-data modification.
- No whole legacy branch merge, large cherry-pick, rebase, or legacy Workbench/Dashboard product restoration.
- Agents must return a structured handoff with branch, base SHA, final SHA, files, authority references, static verification, runtime-unverified items, and integration readiness.
