# Link168 Phase 2 Catalog, Dashboard, and Public Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to execute this plan task by task. Every task requires RED evidence, the smallest implementation that satisfies the contract, a fresh full gate, task-level review, and an isolated merge into `refactor/link168-modular-monolith-r1`.

**Goal:** Turn the existing mixed `Product`/`Link.payloadJson` implementation into one authoritative Catalog, one ordered PageModule write path, and one typed renderer shared by the public page and owner preview.

**Architecture:** Keep the modular monolith and the existing PostgreSQL tables where that preserves data. The Prisma `Product` model remains the persistence model, while the domain names it `CatalogItem`. The Prisma `Link` model remains the ordered persistence record, while the domain names it `PageModule`. Catalog state, ownership, media binding, page-module binding, public assembly, and rendering each have one authority. HTTP routes become thin adapters. Public products are rendered only when an explicit PageModule references a published CatalogItem; the current automatic product append is retired.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, Prisma 7, PostgreSQL 16, Redis 7, Jest 30, GitHub Actions, existing `MediaAsset`, `DomainError`, `Result`, feature flags, and `Link168 Refactor Gate`.

## Global Constraints

- Baseline branch: `refactor/link168-modular-monolith-r1`.
- Phase 1 final merge SHA: `513089d9c59139059a7bbbfbe774a2e7ea7f3e2e`.
- Do not modify or merge `master`.
- Do not connect to a production server, production database, real mail, real AI, payment, or object-storage service.
- Do not delete or weaken `/showcase` or `/jeepwork`.
- Do not introduce microservices, Kafka, Kubernetes, WebSocket customer service, enterprise seats, human handoff, or a second AI Agent.
- Do not implement the final CRM state machine or analytics semantics in this phase; Phase 2 only preserves the existing Lead submission contracts needed by rendered modules.
- Do not implement billing or production deployment.
- Do not allow two domain writers. Compatibility routes may temporarily call the new authoritative service, but may not contain separate validation or direct database writes.
- Do not write both a legacy media URL and a new `MediaAsset` reference for the same new operation.
- Every schema change requires a migration, generated Prisma client update, schema fingerprint update, PostgreSQL-backed tests, and a clean `git diff --check` after `prisma generate`.
- Every task branch must start from the latest green refactor branch and target only that branch.

## Current-State Findings That This Plan Must Close

1. `Product` has stable IDs and ownership, but it does not distinguish products from services, has only `isActive`, and stores its cover as a URL rather than a `MediaAsset` relation.
2. `Link` currently represents links, text, product cards, service cards, offers, booking, quote and contact forms through a free-form `payloadJson` field.
3. `product-card` may bind to a Product, but `service-card`, `shop`, booking and offer can still save arbitrary business data inside JSON.
4. Product CRUD and page-module CRUD perform validation and database writes directly in route files.
5. `LinksPanel.tsx` combines link editing, media uploading, carousel editing, catalog selection and every module-specific form in one component.
6. The public page renders explicit page modules and separately queries every active Product, then appends another products section. This creates two display rules and duplicate product presentation.
7. `PhonePreview` already uses `SharePageRenderer`, but its input is assembled differently from the public page, so shared React code does not yet guarantee shared business semantics.
8. The current primary navigation exposes five legacy entries and keeps Products as a secondary Workbench route; the approved product structure requires Page, Products & Services, AI, Leads, Analytics, and Account/Settings.
9. Generic page media still uses legacy URL/path ownership helpers; Phase 2 migrates Catalog covers only and leaves unrelated legacy page media explicitly `MIGRATING`, not silently rewritten.

## Target Domain Contracts

### CatalogItem

```ts
export type CatalogItemKind = "product" | "service";
export type CatalogItemStatus = "draft" | "published" | "archived";

export type CatalogItem = Readonly<{
  id: string;
  ownerUserId: string;
  kind: CatalogItemKind;
  status: CatalogItemStatus;
  name: string;
  category: string | null;
  description: string | null;
  priceText: string | null;
  coverAssetId: string | null;
  legacyCoverUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  sortOrder: number;
  allowAiRecommendation: boolean;
}>;
```

Rules:

- New CatalogItems default to `draft`.
- Only `published` items may appear in a public PageDocument or be recommended by AI later.
- `archived` replaces destructive user-facing deletion when an item has historical Leads or PageModules.
- A Product card must bind to `kind=product`; a Service card must bind to `kind=service`.
- Every mutation verifies ownership in the authoritative service.
- New cover writes use `coverAssetId`; `coverImageUrl` becomes read-only legacy input during migration and is never updated by the new service.

### PageModule

```ts
export type CatalogModuleType = "product-card" | "service-card";

export type PageModule = Readonly<{
  id: string;
  profileId: string;
  type: string;
  position: number;
  isActive: boolean;
  catalogItemId: string | null;
  schemaVersion: number;
  presentation: Readonly<Record<string, unknown>>;
}>;
```

Rules:

- `Link` remains the Prisma persistence model, but all new writes pass through `PageModuleService`.
- `catalogItemId` is a real foreign key; Product and Service cards may not store an arbitrary item ID only inside JSON.
- Catalog facts such as name, kind, price and cover are resolved from Catalog at read time. PageModule payload stores presentation-only configuration.
- If a bound item is not published, not owned by the profile owner, archived or missing, the public assembler omits the module and the owner preview returns a typed warning.
- `shop` and free-form `service-card` become legacy input only; new UI cannot create them.

### PageDocument

```ts
export type PageDocument = Readonly<{
  profile: PublicProfileView;
  modules: readonly PageModuleView[];
  warnings: readonly PageAssemblyWarning[];
}>;
```

- The public page and owner preview use the same Prisma assembler and the same `PublicPageRenderer`.
- Owner preview may include inactive/draft modules with explicit preview badges.
- Public assembly includes only active modules and published CatalogItems.
- There is no automatic `products` array appended after the ordered module list.

---

## Task 1: Define Catalog and PageModule Persistence Contracts

**Files:**

- Create: `src/domains/catalog/catalog-item.ts`
- Create: `src/domains/page/page-module.ts`
- Create: `tests/refactor/phase2/catalog-page-persistence.test.ts`
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260720_catalog_page_module_authority/migration.sql`
- Modify generated Prisma files under `src/generated/prisma/`
- Modify: `docs/superpowers/reports/2026-07-19-schema-fingerprint.json`

- [ ] **Step 1: Write RED domain and PostgreSQL migration tests.**

Tests must assert:

- `CatalogItemKind` accepts only `product | service`.
- `CatalogItemStatus` accepts only `draft | published | archived`.
- Existing rows with `is_active=true` migrate to `status=published`; false migrates to `status=archived`.
- `Product.isActive` is removed from Prisma after the migration; `status` is authoritative.
- `Product.kind` defaults to `product` for legacy rows.
- `Product.coverAssetId` and `Link.catalogItemId` are real UUID foreign keys.
- `Link.schemaVersion` defaults to `1`.
- Deleting a Product sets a PageModule binding to null rather than deleting the module.
- A MediaAsset assigned as a Catalog cover cannot be assigned as the current cover of two CatalogItems.

Run:

```bash
npm test -- --runInBand tests/refactor/phase2/catalog-page-persistence.test.ts
```

Expected RED: missing domain files and missing Prisma fields.

- [ ] **Step 2: Implement pure domain parsers and invariants.**

Required exports:

```ts
parseCatalogItemKind(value: unknown): Result<CatalogItemKind, DomainError>
parseCatalogItemStatus(value: unknown): Result<CatalogItemStatus, DomainError>
canPublishCatalogItem(item: CatalogItem): Result<true, DomainError>
assertCatalogModuleKind(moduleType: CatalogModuleType, itemKind: CatalogItemKind): void
```

- [ ] **Step 3: Apply the expand/backfill/cutover migration.**

Migration order:

```sql
ADD kind/status/cover_asset_id/archived_at;
BACKFILL kind='product';
BACKFILL status from is_active;
ADD link.catalog_item_id and link.schema_version;
ADD constraints, indexes and foreign keys;
DROP products.is_active only after backfill;
```

Keep `cover_image_url` as a legacy read-only column in Phase 2. Do not write both it and `cover_asset_id`.

- [ ] **Step 4: Regenerate Prisma and update the fingerprint.**

```bash
npx prisma validate
npx prisma generate
node scripts/refactor/schema-fingerprint.mjs --write
```

- [ ] **Step 5: Run targeted and full gates.**

```bash
npm test -- --runInBand tests/refactor/phase2/catalog-page-persistence.test.ts
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build
git diff --check
```

- [ ] **Step 6: Commit.**

```text
feat(catalog): define CatalogItem and PageModule persistence
```

---

## Task 2: Build the Authoritative Catalog Repository and Service

**Files:**

- Create: `src/domains/catalog/catalog-repository.ts`
- Create: `src/domains/catalog/catalog-service.ts`
- Create: `src/domains/catalog/catalog-validation.ts`
- Create: `src/infrastructure/catalog/prisma-catalog-repository.ts`
- Create: `tests/refactor/phase2/catalog-service.test.ts`
- Create: `tests/refactor/phase2/catalog-repository.test.ts`

- [ ] **Step 1: Write RED service and PostgreSQL tests.**

Cover:

- owner-scoped create/read/update/archive/reorder;
- new item defaults to draft;
- publish requires a valid name, kind, safe CTA URL and approved cover when a cover exists;
- cross-user access returns `NOT_FOUND`, not an ownership leak;
- service-card/product-card kind mismatch is rejected;
- published to archived removes the item from public reads;
- reorder accepts exactly the owner’s complete non-archived ID set once each;
- concurrent reorder/update does not create duplicate sort positions;
- archive is blocked from physical deletion when Leads or PageModules reference the item.

- [ ] **Step 2: Implement repository ports and Prisma adapter.**

Required service surface:

```ts
listCatalogItems(ownerUserId: string, filter?: CatalogFilter)
createCatalogItem(ownerUserId: string, input: CreateCatalogItemInput)
updateCatalogItem(ownerUserId: string, itemId: string, patch: UpdateCatalogItemInput)
publishCatalogItem(ownerUserId: string, itemId: string)
archiveCatalogItem(ownerUserId: string, itemId: string)
reorderCatalogItems(ownerUserId: string, orderedIds: readonly string[])
getPublishedCatalogItemForProfile(profileId: string, itemId: string)
```

All transactions live in the repository/service layer, not routes.

- [ ] **Step 3: Run tests and gates.**

```bash
npm test -- --runInBand tests/refactor/phase2/catalog-service.test.ts tests/refactor/phase2/catalog-repository.test.ts
npm run check:boundaries
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build
git diff --check
```

- [ ] **Step 4: Commit.**

```text
feat(catalog): add authoritative catalog service
```

---

## Task 3: Move Catalog Covers onto MediaAsset

**Files:**

- Create: `src/infrastructure/media/catalog-cover-pipeline.ts`
- Create: `src/infrastructure/media/catalog-cover-read.ts`
- Create: `src/app/api/dashboard/catalog/[id]/cover/route.ts`
- Create: `src/app/api/catalog-media/[assetId]/route.ts`
- Create: `tests/refactor/phase2/catalog-cover-pipeline.test.ts`
- Create: `tests/refactor/phase2/catalog-cover-route.test.ts`
- Create: `scripts/refactor/backfill-catalog-cover-assets.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write RED tests.**

Required behavior:

- upload writes one exact `storageKey`, creates one MediaAsset with purpose `catalog-cover`, moderates before assignment, and assigns it only to an owned CatalogItem;
- approved covers are public only when the item is published and its profile is publicly accessible;
- pending covers are owner-preview only and use `private, no-store`;
- rejected upload never replaces the current cover;
- replacement deletes or marks the old exact asset according to the existing MediaAsset lifecycle;
- storage failure restores the previous assignment;
- delete clears the item relation and marks the exact asset deleted;
- the backfill is dry-run by default, requires `--apply`, reads only environment `DATABASE_URL`, is idempotent, and reports missing/duplicate/external URLs.

- [ ] **Step 2: Implement the pipeline using existing MediaAsset lifecycle primitives.**

Do not use `collectManagedMediaUrls` or recursive path discovery for new operations.

- [ ] **Step 3: Add command.**

```json
{
  "backfill:catalog-covers": "node scripts/refactor/backfill-catalog-cover-assets.mjs"
}
```

- [ ] **Step 4: Run targeted and full gates.**

```bash
npm test -- --runInBand tests/refactor/phase2/catalog-cover-pipeline.test.ts tests/refactor/phase2/catalog-cover-route.test.ts
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build
git diff --check
```

- [ ] **Step 5: Commit.**

```text
feat(media): bind catalog covers to MediaAssets
```

---

## Task 4: Replace Direct Product Route Writes with CatalogService

**Files:**

- Create: `src/app/api/dashboard/catalog/route.ts`
- Create: `src/app/api/dashboard/catalog/[id]/route.ts`
- Create: `src/app/api/dashboard/catalog/reorder/route.ts`
- Modify: `src/app/api/dashboard/products/route.ts`
- Modify: `src/app/api/dashboard/products/[id]/route.ts`
- Modify: `src/app/api/dashboard/products/reorder/route.ts`
- Create: `src/infrastructure/catalog/catalog-http.ts`
- Create: `tests/refactor/phase2/catalog-api.test.ts`
- Create: `tests/refactor/phase2/catalog-single-writer.test.ts`

- [ ] **Step 1: Write RED API tests.**

Assert status codes and DTOs for draft creation, product/service kinds, update, publish, archive, reorder, cross-user access, invalid CTA and cover states.

- [ ] **Step 2: Implement thin `/api/dashboard/catalog` adapters.**

Routes may parse HTTP JSON and map DomainErrors, but may not import `db` or duplicate Catalog validation.

- [ ] **Step 3: Convert legacy Product endpoints into compatibility adapters.**

During Tasks 4–10 they may call the same CatalogService so existing callers remain green. They must:

- contain no direct Prisma call;
- emit `Deprecation: true` and `Sunset` headers;
- map legacy `isActive` to `status` only at the HTTP edge;
- never write `coverImageUrl`.

This is one domain writer, not dual writing.

- [ ] **Step 4: Add static single-writer checks.**

The test must fail if any Product/Catalog route imports `@/lib/db` or performs `db.product.*`.

- [ ] **Step 5: Run gates and commit.**

```bash
npm test -- --runInBand tests/refactor/phase2/catalog-api.test.ts tests/refactor/phase2/catalog-single-writer.test.ts
npm run check:boundaries
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build
git diff --check
```

```text
refactor(catalog): route all catalog writes through one service
```

---

## Task 5: Build the Authoritative PageModule Service and Catalog Binding

**Files:**

- Create: `src/domains/page/page-module-repository.ts`
- Create: `src/domains/page/page-module-service.ts`
- Create: `src/domains/page/page-module-payload.ts`
- Create: `src/infrastructure/page/prisma-page-module-repository.ts`
- Modify: `src/app/api/dashboard/links/route.ts`
- Modify: `src/app/api/dashboard/links/[id]/route.ts`
- Modify: `src/app/api/dashboard/links/reorder/route.ts`
- Retire from writes: `src/lib/products/binding.ts`
- Create: `tests/refactor/phase2/page-module-service.test.ts`
- Create: `tests/refactor/phase2/page-module-api.test.ts`
- Create: `tests/refactor/phase2/page-module-single-writer.test.ts`

- [ ] **Step 1: Write RED domain and API tests.**

Required cases:

- create/update/toggle/delete/reorder is profile-owner scoped;
- product-card requires a published owned `kind=product` CatalogItem;
- service-card requires a published owned `kind=service` CatalogItem;
- a CatalogItem from another owner cannot be bound;
- Catalog facts are not copied into payload for new writes;
- payload contains presentation configuration only and is versioned;
- inactive modules remain visible to owner preview and absent publicly;
- switching away from a catalog module clears `catalogItemId` atomically;
- module reorder uses a complete duplicate-free owned ID set;
- routes no longer perform direct `db.link` writes.

- [ ] **Step 2: Implement PageModuleService.**

Required write contract:

```ts
createPageModule(ownerUserId, profileId, input)
updatePageModule(ownerUserId, moduleId, patch)
setPageModuleVisibility(ownerUserId, moduleId, active)
reorderPageModules(ownerUserId, orderedIds)
removePageModule(ownerUserId, moduleId)
```

- [ ] **Step 3: Keep legacy payload support read-only.**

Existing `shop`, unbound `service-card`, and snapshot-only `product-card` records may still render through a compatibility parser until Task 11. The new HTTP writer must reject creating those legacy shapes.

- [ ] **Step 4: Run gates and commit.**

```bash
npm test -- --runInBand tests/refactor/phase2/page-module-service.test.ts tests/refactor/phase2/page-module-api.test.ts tests/refactor/phase2/page-module-single-writer.test.ts
npm run check:boundaries
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build
git diff --check
```

```text
refactor(page): add authoritative PageModule service
```

---

## Task 6: Assemble One Canonical PageDocument

**Files:**

- Create: `src/domains/page/page-document.ts`
- Create: `src/domains/page/page-assembly-policy.ts`
- Create: `src/infrastructure/page/prisma-page-document.ts`
- Modify: `src/infrastructure/profile/prisma-public-profile-access.ts`
- Modify: `src/lib/dashboard-data.ts`
- Create: `tests/refactor/phase2/page-document-assembler.test.ts`
- Create: `tests/refactor/phase2/page-document-visibility.test.ts`

- [ ] **Step 1: Write RED PostgreSQL tests.**

Verify:

- public document includes only active modules;
- owner-preview document includes inactive modules with `previewState`;
- published Product/Service bindings hydrate from Catalog;
- draft/archived/missing/cross-owner Catalog bindings are omitted publicly and produce owner-preview warnings;
- ordering is exactly `Link.position`;
- catalog name/price/cover changes appear without rewriting PageModule payload;
- no `Product.findMany` automatic append occurs;
- assembler failure is fail-closed for public access.

- [ ] **Step 2: Implement typed discriminated PageModuleView unions.**

Example:

```ts
type PageModuleView =
  | { type: "link"; id: string; position: number; link: SafeLinkView }
  | { type: "catalog-card"; id: string; position: number; item: PublicCatalogItemView; cardKind: "product" | "service" }
  | { type: "offer"; id: string; position: number; presentation: OfferView }
  | { type: "form"; id: string; position: number; formKind: "quote" | "contact" | "booking"; presentation: FormView }
  | { type: "legacy"; id: string; position: number; legacyType: string; payload: unknown };
```

- [ ] **Step 3: Extend Dashboard data with a saved owner PageDocument.**

`getDashboardData` returns `pageDocument`; it must not separately make the client rebuild business semantics from raw links.

- [ ] **Step 4: Run gates and commit.**

```bash
npm test -- --runInBand tests/refactor/phase2/page-document-assembler.test.ts tests/refactor/phase2/page-document-visibility.test.ts
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build
git diff --check
```

```text
feat(page): assemble one canonical PageDocument
```

---

## Task 7: Make Public Page and Preview Use One Typed Renderer

**Files:**

- Create: `src/components/public-page/PublicPageRenderer.tsx`
- Create: `src/components/public-page/PublicPageModuleRenderer.tsx`
- Create: `src/components/public-page/PublicCatalogCard.tsx`
- Create: `src/components/public-page/PublicInteractionForm.tsx`
- Modify: `src/app/[username]/page.tsx`
- Modify: `src/components/public-profile/PublicProfileClientWrapper.tsx`
- Modify: `src/components/PhonePreview.tsx`
- Modify: `src/components/share/SharePageRenderer.tsx`
- Modify: `src/components/share/SharePageWithContact.tsx`
- Retire: `src/components/share/PublicProductsSection.tsx`
- Create: `tests/refactor/phase2/shared-renderer.test.tsx`
- Create: `tests/refactor/phase2/no-auto-product-append.test.ts`

- [ ] **Step 1: Write RED renderer tests.**

Use `react-dom/server` for deterministic render tests. Assert the same PageDocument produces the same ordered module IDs and Catalog content in public and preview modes.

- [ ] **Step 2: Introduce `PublicPageRenderer`.**

It accepts `PageDocument`, interaction callbacks and render mode only. It does not accept a separate `products` prop or raw Prisma objects.

- [ ] **Step 3: Cut over the public page.**

Remove the direct `db.product.findMany` block from `src/app/[username]/page.tsx`. Load one public PageDocument after access resolution.

- [ ] **Step 4: Cut over PhonePreview.**

PhonePreview becomes a shell around the same renderer. Marketing examples may use a fixture PageDocument; Dashboard preview uses the server-assembled owner document.

- [ ] **Step 5: Retire automatic Product section.**

Delete `PublicProductsSection` after all imports are removed. A source-contract test must fail if the public page or wrapper regains an independent products query/prop.

- [ ] **Step 6: Run gates and commit.**

```bash
npm test -- --runInBand tests/refactor/phase2/shared-renderer.test.tsx tests/refactor/phase2/no-auto-product-append.test.ts
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build
git diff --check
```

```text
refactor(page): share one typed public renderer
```

---

## Task 8: Replace the Products Workbench with a Catalog Dashboard

**Files:**

- Create: `src/components/catalog/CatalogClient.tsx`
- Create: `src/components/catalog/CatalogList.tsx`
- Create: `src/components/catalog/CatalogEditor.tsx`
- Create: `src/components/catalog/CatalogCoverField.tsx`
- Create: `src/components/catalog/catalog-api.ts`
- Create: `src/components/catalog/catalog-types.ts`
- Modify: `src/app/workbench/products/page.tsx`
- Retire: `src/components/workbench/ProductsClient.tsx`
- Modify: `src/components/layout/console-navigation.ts`
- Modify: `src/components/dashboard-v1/DashboardFrame.tsx`
- Create: `tests/refactor/phase2/catalog-dashboard-contract.test.ts`
- Create: `tests/refactor/phase2/navigation-contract.test.ts`

- [ ] **Step 1: Write RED UI contract tests.**

Assert:

- the Catalog UI distinguishes Product and Service;
- new items begin as Draft and require explicit Publish;
- status text is Draft/Published/Archived, not inferred from a legacy boolean;
- upload result shows truthful approved/pending/rejected state;
- sort and visibility errors roll back optimistic state;
- six approved entries are exposed in this order: Page, Products & Services, AI, Leads, Analytics, Account/Settings;
- `/console` remains reachable but is not a competing primary editor entry;
- ordinary navigation never exposes Jeepwork or Showcase.

- [ ] **Step 2: Implement CatalogClient against `/api/dashboard/catalog`.**

Do not import generated Prisma types into client components. Use explicit transport DTOs.

- [ ] **Step 3: Convert `/workbench/products` to a thin server shell.**

The page may read through CatalogService/Repository but may not query `db.product` directly.

- [ ] **Step 4: Update desktop and mobile navigation.**

Desktop may show all six. Mobile bottom navigation shows Page, Catalog, Leads, AI and More; More contains Analytics and Account.

- [ ] **Step 5: Run gates and commit.**

```bash
npm test -- --runInBand tests/refactor/phase2/catalog-dashboard-contract.test.ts tests/refactor/phase2/navigation-contract.test.ts
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build
git diff --check
```

```text
feat(dashboard): add first-class Catalog workspace
```

---

## Task 9: Split the Page Editor and Use Typed Catalog Bindings

**Files:**

- Create: `src/components/page-editor/PageModulesPanel.tsx`
- Create: `src/components/page-editor/PageModuleList.tsx`
- Create: `src/components/page-editor/PageModuleEditor.tsx`
- Create: `src/components/page-editor/editors/LinkEditor.tsx`
- Create: `src/components/page-editor/editors/CatalogBindingEditor.tsx`
- Create: `src/components/page-editor/editors/OfferEditor.tsx`
- Create: `src/components/page-editor/editors/InteractionFormEditor.tsx`
- Create: `src/components/page-editor/editors/LegacyModuleEditor.tsx`
- Create: `src/components/page-editor/page-module-api.ts`
- Create: `src/components/page-editor/page-module-types.ts`
- Modify: `src/components/dashboard-v1/DashboardV1Client.tsx`
- Modify: `src/components/dashboard-v1/types.ts`
- Modify: `src/components/dashboard-v1/dashboard-api.ts`
- Modify: `src/components/dashboard-v1/link-state.ts`
- Retire or reduce to compatibility wrapper: `src/components/dashboard-v1/LinksPanel.tsx`
- Create: `tests/refactor/phase2/page-editor-contract.test.ts`
- Create: `tests/refactor/phase2/catalog-binding-editor.test.ts`

- [ ] **Step 1: Write RED tests for typed client contracts.**

Required rules:

- Product card selection lists only published Product items;
- Service card selection lists only published Service items;
- the editor sends `catalogItemId` as a first-class field;
- the editor does not copy Catalog name/price/cover into JSON;
- no new `shop` or free-form service-card can be created;
- a legacy unresolved module is labeled `需要迁移` and can be replaced or removed, not silently rewritten;
- save messages use `已保存` unless the page is actually published; creating a module must not claim `已保存并公开` when the profile is private.

- [ ] **Step 2: Split the monolith.**

`LinksPanel.tsx` must no longer contain upload, carousel, product, service, offer, booking, quote and contact form implementations in one file. Keep files focused and under the repository’s practical review size.

- [ ] **Step 3: Use PageModule API and PageDocument response.**

After every successful write, consume the server-returned PageDocument or refetch it. Do not locally hydrate Catalog facts.

- [ ] **Step 4: Run gates and commit.**

```bash
npm test -- --runInBand tests/refactor/phase2/page-editor-contract.test.ts tests/refactor/phase2/catalog-binding-editor.test.ts
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build
git diff --check
```

```text
refactor(dashboard): split editor and bind CatalogItems by ID
```

---

## Task 10: Implement Explicit Mobile Preview and Responsive Editor Acceptance

**Files:**

- Create: `src/components/page-editor/MobilePreviewSheet.tsx`
- Modify: `src/components/dashboard-v1/DashboardFrame.tsx`
- Modify: `src/components/dashboard-v1/DashboardV1Client.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `playwright.config.ts`
- Create: `tests/e2e/phase2-dashboard-mobile.spec.ts`
- Modify: `.github/workflows/mvp-closeout.yml`
- Create: `tests/refactor/phase2/mobile-preview-contract.test.ts`

- [ ] **Step 1: Write RED structural test.**

Assert the desktop third column remains desktop-only and mobile has an explicit Preview action/sheet rather than hidden permanent content.

- [ ] **Step 2: Add pinned Playwright dependency and configuration.**

Use an exact version and update the lockfile. CI installs Chromium only for the dedicated browser step.

- [ ] **Step 3: Implement MobilePreviewSheet.**

Requirements:

- opened explicitly from Page editor;
- full-height sheet or route-level overlay;
- renders the saved PageDocument through `PublicPageRenderer`;
- closes with button, Escape and browser back behavior;
- no editor data loss;
- clear label that only saved content is shown.

- [ ] **Step 4: Add authenticated browser acceptance at 360, 390 and 430 px.**

Verify:

- no document-level horizontal overflow;
- Catalog can create a draft Product and Service;
- Page editor can bind each to a module;
- explicit preview shows modules in saved order;
- draft item does not appear publicly;
- published item appears once, not twice;
- bottom navigation exposes the approved mobile structure.

Use only a non-production PostgreSQL fixture and mock external services.

- [ ] **Step 5: Run gates and commit.**

```bash
npm test -- --runInBand tests/refactor/phase2/mobile-preview-contract.test.ts
npx playwright test tests/e2e/phase2-dashboard-mobile.spec.ts
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build
git diff --check
```

```text
feat(dashboard): add explicit mobile page preview
```

---

## Task 11: Backfill Catalog Bindings and Retire Legacy Writers

**Files:**

- Create: `scripts/refactor/backfill-page-module-catalog-bindings.mjs`
- Create: `tests/refactor/phase2/page-module-binding-backfill.test.ts`
- Modify: `package.json`
- Modify: `src/app/api/dashboard/products/route.ts`
- Modify: `src/app/api/dashboard/products/[id]/route.ts`
- Modify: `src/app/api/dashboard/products/reorder/route.ts`
- Modify: `src/lib/products/binding.ts`
- Modify: `docs/superpowers/refactor/legacy-inventory.json`
- Create: `tests/refactor/phase2/legacy-writer-retirement.test.ts`

- [ ] **Step 1: Write RED PostgreSQL backfill tests.**

Backfill rules:

- default dry-run; writes require `--apply`;
- use only environment `DATABASE_URL`; reject CLI database overrides;
- product-card with an owned valid `productId` binds `Link.catalogItemId`;
- service-card with an owned valid `serviceId` binds only when item kind is service;
- snapshot-only product/service cards, `shop`, cross-owner IDs, missing IDs and kind conflicts are reported for manual migration and never guessed;
- second apply changes zero records;
- payload presentation fields remain, Catalog fact snapshots are removed only after a valid binding is committed;
- no files or MediaAssets are deleted.

- [ ] **Step 2: Add command.**

```json
{
  "backfill:page-catalog-bindings": "node scripts/refactor/backfill-page-module-catalog-bindings.mjs"
}
```

- [ ] **Step 3: Retire legacy write entry points.**

After Tasks 8–10 have switched all internal callers:

- legacy Product GET may remain for one compatibility release if required;
- legacy Product POST/PUT/DELETE/reorder return `410 Gone` with the new Catalog endpoint;
- `src/lib/products/binding.ts` becomes read-compatibility only or is deleted if no imports remain;
- tests prohibit direct Product/Link writes outside the new infrastructure adapters.

- [ ] **Step 4: Update inventory states.**

Mark new domain and infrastructure paths `KEEP`, old Product writers and `PublicProductsSection` `RETIRED`, and unresolved generic media paths `MIGRATING`.

- [ ] **Step 5: Run gates and commit.**

```bash
npm test -- --runInBand tests/refactor/phase2/page-module-binding-backfill.test.ts tests/refactor/phase2/legacy-writer-retirement.test.ts
npm run check:boundaries
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build
git diff --check
```

```text
build(refactor): backfill bindings and retire legacy catalog writers
```

---

## Task 12: Verify the Complete Phase 2 Chain and Record the Gate

**Files:**

- Create: `tests/refactor/phase2/phase2-verification.test.ts`
- Create: `scripts/refactor/run-phase2-verification.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/mvp-closeout.yml`
- Create runtime report: `docs/superpowers/reports/2026-07-20-phase-2-verification.json`
- Create final record: `docs/superpowers/reports/2026-07-20-phase-2-final-gate.md`

**Required scenario:**

```text
verified owner
→ create draft Product and draft Service
→ upload approved Catalog covers
→ publish both CatalogItems
→ create Product and Service PageModules by real foreign key
→ reorder modules
→ owner preview shows saved ordered document
→ public page shows each bound item exactly once
→ catalog edit updates public rendering without rewriting PageModule payload
→ unpublish/archive item removes it publicly and warns owner preview
→ private/frozen/deactivated profile exposes no page or catalog media
→ mobile 360/390/430 editor and explicit preview have no horizontal overflow
→ legacy binding backfill dry-run/apply/apply is deterministic and idempotent
```

- [ ] **Step 1: Add scenario-level RED test before patching any remaining integration defect.**

- [ ] **Step 2: Resolve only defects exposed by the scenario.**

Do not add Phase 3 AI/CRM behavior or Phase 4 billing.

- [ ] **Step 3: Add `verify:phase2`.**

Ordered commands:

```text
npm ci
node scripts/refactor/verify-baseline.mjs
npm run check:dependencies
npm run check:boundaries
node scripts/refactor/schema-fingerprint.mjs --check
npx prisma validate
npx prisma generate
npx prisma migrate deploy
npm run typecheck
npm run lint
npm test -- --runInBand
npx playwright test tests/e2e/phase2-dashboard-mobile.spec.ts
npm run build
git diff --check
```

- [ ] **Step 4: Run in a clean checkout with PostgreSQL 16 and Redis 7.**

The machine report records exact SHA, Node/npm/PostgreSQL/Redis versions, every command exit code, Jest suite/test counts, Playwright project counts, dependency warnings and Build warnings.

- [ ] **Step 5: Merge implementation, then create a reports-only final gate PR.**

The final report PR must contain only the JSON report and Markdown gate record and must pass the complete standard gate against the already merged implementation tree.

Final status format:

```text
PHASE=2
STATUS=READY_FOR_NEXT_PHASE
FINAL_SHA=<exact report merge SHA>
VERIFIED_IMPLEMENTATION_SHA=<exact implementation SHA>
WORKFLOW=Link168 Refactor Gate
PRODUCTION_CHANGES=none
MASTER_CHANGES=none
USER_VISIBLE_BEHAVIOR_CHANGES=typed Catalog and explicit ordered public modules on refactor branch only
NEXT_PLAN=docs/superpowers/plans/2026-07-20-link168-phase-3-reception-crm-analytics.md
```

- [ ] **Step 6: Commit implementation verification.**

```text
test(refactor): verify complete Phase 2 chain
```

Only after the report-only final gate is merged may Phase 3 be planned against the actual green tree.

## Plan Self-Review Checklist

- [x] Covers Catalog ownership, lifecycle, product/service kinds, ordering and AI-recommendation eligibility.
- [x] Establishes one Catalog writer and one PageModule writer.
- [x] Reuses Phase 1 MediaAsset lifecycle for Catalog covers.
- [x] Removes public automatic Product append and duplicate rendering.
- [x] Uses one PageDocument assembler for public page and owner preview.
- [x] Uses one typed React renderer for public and preview modes.
- [x] Splits the oversized page editor and eliminates free-form Product/Service creation for new writes.
- [x] Defines explicit mobile preview and browser acceptance at 360/390/430 px.
- [x] Preserves legacy data through deterministic, idempotent backfills without guessing.
- [x] Keeps AI reception, final CRM, billing, production and enterprise expansion out of Phase 2.
- [x] Preserves `/showcase`, `/jeepwork`, the unique refactor branch and all production safety boundaries.
- [x] Contains no TODO, TBD, placeholder implementation decision or unresolved interface name.
