# Link168 Mainline Foundation and Single Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the approved SaaS mainline on a clean branch, make 首页/名片/客户/AI/我的 use one authenticated product shell, and replace the first-use flow with the eight confirmed steps without changing database schema or external-service behavior.

**Architecture:** Keep the existing modular monolith and PostgreSQL data. Add a framework-free product-facts module, derive React navigation from it, keep `ConsoleShell` as the only global user shell, reduce `DashboardFrame` to an editor-internal frame, and persist onboarding fields through existing dashboard APIs. Existing `/dashboard` and `/workbench/*` URLs remain compatible while sharing one visual and authorization boundary.

**Tech Stack:** Next.js App Router, React, TypeScript strict mode, Prisma 7, PostgreSQL 16, Jest 30, Node.js 22, GitHub Actions.

## Global Constraints

- Work only on `integration/saas-mainline-v1-20260718`, created from exact commit `fa45799ae184863d5d0a8d236410f93d822e9f0e`.
- Do not modify `master`, merge PR #52, deploy, touch production configuration, or run a production migration.
- Do not reset PostgreSQL, rewrite historical data, remove old routes, delete Enterprise structures or introduce a second source of truth.
- Ordinary-user primary navigation is exactly `首页 / 名片 / 客户 / AI / 我的` in that order on desktop and mobile.
- Onboarding order is exactly `验证邮箱 → 用户名 → 身份/业务定位/服务对象 → 专业模板 → 联系方式 → 手机预览 → 发布 → 预设或付费 AI 接待`.
- Free preset reception is labelled “预设回复”; it never calls a model or consumes model credit.
- Free/Plus/Pro may be named. Exact paid price, quota, billing cycle and refund terms remain unapproved.
- Enterprise structures remain in code/data for future compatibility but stay out of ordinary-user navigation and current acquisition copy.
- No new runtime dependency and no copied third-party code is allowed in this wave.
- Every production behavior starts with a failing test and ends with targeted verification plus a focused commit.
- Repository tests do not prove Bailian, Alipay, mail, object storage, production database or deployment readiness.

**Execution preflight resolution:** On 2026-07-18 the owner selected both recommended options: use an isolated worktree, and execute the original Tasks 1 and 2 as one RED→GREEN review unit. The failing RED state must be observed and recorded but is not committed as a standalone task result.

---

## File Structure

### Create

- `docs/superpowers/specs/2026-07-18-link168-saas-product-mainline-design.md` — approved authority copied verbatim into the repository.
- `docs/superpowers/roadmaps/2026-07-18-link168-saas-mainline-program.md` — seven-wave delivery map.
- `docs/superpowers/plans/2026-07-18-link168-mainline-foundation-shell-plan.md` — this plan.
- `src/lib/product/mainline.ts` — framework-free navigation and display compatibility facts.
- `src/lib/onboarding/readiness.ts` — pure onboarding readiness calculation.
- `tests/mainline-product-contract.test.ts` — branch, docs, shell and visibility contracts.
- `tests/onboarding-mainline.test.ts` — onboarding order, readiness and persistence contracts.

### Modify

- `README.md`, `docs/CURRENT_MVP.md`, `.github/workflows/mvp-closeout.yml`.
- `src/components/layout/console-navigation.ts`, `src/components/layout/ConsoleShell.tsx`.
- `src/components/dashboard-v1/DashboardFrame.tsx`, `DashboardV1Client.tsx`, `src/app/dashboard/page.tsx`.
- `src/app/console/page.tsx`, `src/app/workbench/account/page.tsx`.
- `src/app/workbench/ai/page.tsx`, `ai/reception/page.tsx`, `ai/[assistant]/page.tsx`, `ai-service/page.tsx`.
- `src/components/onboarding/onboarding-store.ts`, `OnboardingWizard.tsx`, `src/app/onboarding/page.tsx`.
- `tests/console-navigation.test.ts`, `legacy-routes.test.ts`, `mobile-layout.test.ts`, `single-mainline-regression.test.ts`.

## Stable Interfaces

```ts
export type MainlineNavId = "home" | "card" | "customers" | "ai" | "me";

export type MainlinePrimaryRoute = {
  id: MainlineNavId;
  label: "首页" | "名片" | "客户" | "AI" | "我的";
  href:
    | "/console"
    | "/dashboard"
    | "/workbench/leads"
    | "/workbench/ai"
    | "/workbench/account";
};

export const MAINLINE_PRIMARY_ROUTES: readonly MainlinePrimaryRoute[];
export function toMainlinePlanLabel(
  value: string | null | undefined,
): "Free" | "Plus" | "Pro";
export function isFuturePlanCode(value: string | null | undefined): boolean;
```

```ts
export type OnboardingStep =
  | "verify-email"
  | "username"
  | "business"
  | "template"
  | "contact"
  | "preview"
  | "publish"
  | "reception";

export type OnboardingSnapshot = {
  emailVerified: boolean;
  username: string | null;
  displayName: string | null;
  jobTitle: string | null;
  bio: string | null;
  template: string | null;
  phone: string | null;
  email: string | null;
  wechat: string | null;
  isPublic: boolean;
};

export type OnboardingReadiness = {
  nextStep: OnboardingStep;
  completedSteps: readonly OnboardingStep[];
};

export function getOnboardingReadiness(
  snapshot: OnboardingSnapshot,
): OnboardingReadiness;
```

---

### Task 1: Establish the approved authority through a complete RED→GREEN cycle

**Files:**

- Create: `tests/mainline-product-contract.test.ts`
- Modify: `tests/single-mainline-regression.test.ts`

**Interfaces:** Produces the contract and product facts consumed by Tasks 2–3 and 6–7.

- [ ] **Step 1: Confirm the exact clean baseline**

```bash
git status --short --branch
git rev-parse HEAD
git branch --show-current
```

Expected:

```text
## integration/saas-mainline-v1-20260718...origin/integration/saas-mainline-v1-20260718
fa45799ae184863d5d0a8d236410f93d822e9f0e
integration/saas-mainline-v1-20260718
```

Stop if the worktree is dirty or either identifier differs.

- [ ] **Step 2: Write the failing product contract**

Create `tests/mainline-product-contract.test.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import {
  MAINLINE_PRIMARY_ROUTES,
  isFuturePlanCode,
  toMainlinePlanLabel,
} from "@/lib/product/mainline";

const root = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

describe("approved SaaS mainline contract", () => {
  test("ordinary users have exactly five primary routes", () => {
    expect(MAINLINE_PRIMARY_ROUTES).toEqual([
      { id: "home", label: "首页", href: "/console" },
      { id: "card", label: "名片", href: "/dashboard" },
      { id: "customers", label: "客户", href: "/workbench/leads" },
      { id: "ai", label: "AI", href: "/workbench/ai" },
      { id: "me", label: "我的", href: "/workbench/account" },
    ]);
  });

  test("legacy and future plans use approved ordinary-user labels", () => {
    expect(toMainlinePlanLabel("free")).toBe("Free");
    expect(toMainlinePlanLabel("member_basic")).toBe("Plus");
    expect(toMainlinePlanLabel("member_plus")).toBe("Plus");
    expect(toMainlinePlanLabel("plus")).toBe("Plus");
    expect(toMainlinePlanLabel("pro")).toBe("Pro");
    expect(toMainlinePlanLabel("enterprise")).toBe("Pro");
    expect(isFuturePlanCode("enterprise")).toBe(true);
    expect(isFuturePlanCode("enterprise_pro")).toBe(true);
  });

  test("repository documents point to the approved specification", () => {
    const readme = read("README.md");
    const current = read("docs/CURRENT_MVP.md");
    expect(readme).toContain(
      "专业商业名片 + 24 小时接待 + 真实 Lead + 轻量跟进",
    );
    expect(current).toContain(
      "2026-07-18-link168-saas-product-mainline-design.md",
    );
    expect(readme).not.toContain(
      "V0.1 does not include membership, payment, AI",
    );
  });

  test("new mainline branch runs MVP Closeout", () => {
    expect(read(".github/workflows/mvp-closeout.yml")).toContain(
      "integration/saas-mainline-v1-20260718",
    );
  });
});
```

- [ ] **Step 3: Extend the existing branch regression**

Add to the workflow assertion in `tests/single-mainline-regression.test.ts`:

```ts
expect(workflow).toContain("integration/saas-mainline-v1-20260718");
```

- [ ] **Step 4: Verify RED without committing a failing branch**

```bash
npm test -- --runInBand tests/mainline-product-contract.test.ts tests/single-mainline-regression.test.ts
```

Expected: FAIL because `src/lib/product/mainline.ts` and the authority references do not exist. Record the expected failure in the task report, then continue directly to the GREEN steps below.

---

#### Task 1 GREEN continuation: Add canonical product facts, approved documents and branch CI

**Files:**

- Create: `src/lib/product/mainline.ts`
- Create: the approved spec, roadmap and this plan under `docs/superpowers/`
- Modify: `README.md`, `docs/CURRENT_MVP.md`, `.github/workflows/mvp-closeout.yml`

**Interfaces:** Produces every product interface listed above. The module imports no framework, Prisma, billing code or icons.

- [ ] **Step 1: Implement product facts**

Create `src/lib/product/mainline.ts`:

```ts
export type MainlineNavId = "home" | "card" | "customers" | "ai" | "me";

export type MainlinePrimaryRoute = {
  id: MainlineNavId;
  label: "首页" | "名片" | "客户" | "AI" | "我的";
  href:
    | "/console"
    | "/dashboard"
    | "/workbench/leads"
    | "/workbench/ai"
    | "/workbench/account";
};

export const MAINLINE_PRIMARY_ROUTES = [
  { id: "home", label: "首页", href: "/console" },
  { id: "card", label: "名片", href: "/dashboard" },
  { id: "customers", label: "客户", href: "/workbench/leads" },
  { id: "ai", label: "AI", href: "/workbench/ai" },
  { id: "me", label: "我的", href: "/workbench/account" },
] as const satisfies readonly MainlinePrimaryRoute[];

const PLUS_CODES = new Set([
  "plus",
  "member_basic",
  "member_plus",
  "starter",
]);
const PRO_CODES = new Set([
  "pro",
  "enterprise",
  "enterprise_pro",
  "enterprise_pro_plus",
  "internal_test",
]);
const FUTURE_CODES = new Set([
  "enterprise",
  "enterprise_pro",
  "enterprise_pro_plus",
]);

export function toMainlinePlanLabel(
  value: string | null | undefined,
): "Free" | "Plus" | "Pro" {
  const normalized = (value || "free").trim().toLowerCase();
  if (PLUS_CODES.has(normalized)) return "Plus";
  if (PRO_CODES.has(normalized)) return "Pro";
  return "Free";
}

export function isFuturePlanCode(value: string | null | undefined): boolean {
  return FUTURE_CODES.has((value || "").trim().toLowerCase());
}
```

- [ ] **Step 2: Copy the approved artifacts**

Copy the confirmed specification and roadmap into their repository paths. Verify the spec header contains:

```markdown
**设计状态：** 【已确认】老板于 2026-07-18 确认本书面规格
**代码事实基线：** `weex13148-gif/link168.me` PR #52 的绿色头提交 `fa45799ae184863d5d0a8d236410f93d822e9f0e`
```

- [ ] **Step 3: Replace the obsolete README opening**

```markdown
# Link168

Link168 是面向服务型个体创业者的经营型 SaaS：专业商业名片 + 24 小时接待 + 真实 Lead + 轻量跟进。

当前唯一经营闭环：

`注册 → 建名片 → 发布/分享 → 访客访问 → 预设或 AI 接待 → 真实 Lead → 跟进 → 成交`

## Current authority

- Approved product specification: `docs/superpowers/specs/2026-07-18-link168-saas-product-mainline-design.md`
- Program roadmap: `docs/superpowers/roadmaps/2026-07-18-link168-saas-mainline-program.md`
- Ordinary-user navigation: 首页、名片、客户、AI、我的
- Public plans: Free、Plus、Pro; exact paid price and quota are not approved
- Production status: not yet verified for Bailian, Alipay, mail, object storage, production database or deployment
```

Keep valid setup/security directions below it. Remove only claims that define V0.1 as current.

- [ ] **Step 4: Make CURRENT_MVP a thin authority pointer**

Use this header:

```markdown
# Link168 当前产品主线

**版本：** SaaS Mainline v1（2026-07-18）

**状态：** 已确认，进入分阶段实施

**唯一权威规格：** `docs/superpowers/specs/2026-07-18-link168-saas-product-mainline-design.md`

**实施路线图：** `docs/superpowers/roadmaps/2026-07-18-link168-saas-mainline-program.md`

> Link168 当前只服务“专业商业名片 + 24 小时接待 + 真实 Lead + 轻量跟进”这一条经营闭环。本文只维护当前执行摘要；完整规则以唯一权威规格为准。
```

Move retained old detail under `## Historical context` and label it non-authoritative.

- [ ] **Step 5: Add branch CI**

Add this exact entry under both `on.push.branches` and `on.pull_request.branches` in `.github/workflows/mvp-closeout.yml`:

```yaml
- integration/saas-mainline-v1-20260718
```

- [ ] **Step 6: Verify GREEN and commit**

```bash
npm test -- --runInBand tests/mainline-product-contract.test.ts tests/single-mainline-regression.test.ts
git add README.md docs/CURRENT_MVP.md docs/superpowers src/lib/product/mainline.ts .github/workflows/mvp-closeout.yml
git commit -m "docs: establish approved SaaS mainline authority"
```

Expected: both suites PASS.

---

### Task 2: Derive the five primary navigation entries from product facts

**Files:**

- Modify: `src/components/layout/console-navigation.ts`
- Modify: `tests/console-navigation.test.ts`

**Interfaces:** Preserves existing navigation exports while making labels/hrefs derive from `MAINLINE_PRIMARY_ROUTES`.

- [ ] **Step 1: Add the failing derivation test**

```ts
import { MAINLINE_PRIMARY_ROUTES } from "@/lib/product/mainline";

test("React navigation derives labels and hrefs from product facts", () => {
  expect(
    PRIMARY_NAV_ITEMS.map(({ label, href }) => ({ label, href })),
  ).toEqual(
    MAINLINE_PRIMARY_ROUTES.map(({ label, href }) => ({ label, href })),
  );
});
```

Run:

```bash
npm test -- --runInBand tests/console-navigation.test.ts
```

Expected: FAIL until the component navigation imports canonical facts.

- [ ] **Step 2: Introduce the exact icon view map**

In `src/components/layout/console-navigation.ts`:

```ts
import {
  MAINLINE_PRIMARY_ROUTES,
  type MainlineNavId,
} from "@/lib/product/mainline";

const PRIMARY_VIEW: Record<
  MainlineNavId,
  Pick<
    SharedNavItem,
    "icon" | "tone" | "status" | "group" | "badge" | "badgeTone"
  >
> = {
  home: {
    icon: Home,
    tone: "bg-[#F7F1E7] text-[#3F5F31]",
    status: "live",
    group: "core",
  },
  card: {
    icon: Palette,
    tone: "bg-[#DDE8CD] text-[#3F5F31]",
    status: "live",
    group: "core",
  },
  customers: {
    icon: Users,
    tone: "bg-[#FFE6E2] text-[#B42318]",
    status: "live",
    group: "growth",
  },
  ai: {
    icon: Bot,
    tone: "bg-[#F6E7C8] text-[#8C612E]",
    status: "beta",
    group: "ai",
    badge: "Beta",
    badgeTone: "bg-[#F6E7C8] text-[#8C612E]",
  },
  me: {
    icon: UserCog,
    tone: "bg-[#F5F0E6] text-[#2B241E]",
    status: "live",
    group: "settings",
  },
};

export const PRIMARY_NAV_ITEMS: SharedNavItem[] =
  MAINLINE_PRIMARY_ROUTES.map((route) => ({
    ...route,
    ...PRIMARY_VIEW[route.id],
  }));
```

Keep products, short links, analytics and membership only in `SECONDARY_NAV_ITEMS`. Do not add knowledge, QR code, Enterprise, workspace, Jeepwork or showcase to primary navigation.

- [ ] **Step 3: Verify and commit**

```bash
npm test -- --runInBand tests/console-navigation.test.ts tests/mainline-product-contract.test.ts
git add src/components/layout/console-navigation.ts tests/console-navigation.test.ts
git commit -m "refactor: derive five-item user navigation from product facts"
```

Expected: both suites PASS.

---

### Task 3: Make ConsoleShell the only global user shell

**Files:**

- Modify: `tests/legacy-routes.test.ts`, `tests/mobile-layout.test.ts`
- Modify: `src/components/layout/ConsoleShell.tsx`
- Modify: `src/components/dashboard-v1/DashboardFrame.tsx`, `DashboardV1Client.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Verify: `src/components/workbench/WorkbenchShell.tsx`

**Interfaces:**

- `ConsoleShell` keeps `title`, optional `eyebrow`, optional `subtitle` and `children`.
- `DashboardFrame` keeps editor props but imports no primary navigation and owns no fixed global bottom bar.
- Query `?tab=profile|links|appearance|share|stats|account` may select an editor section.

- [ ] **Step 1: Add RED shell-boundary tests**

Add to `tests/legacy-routes.test.ts`:

```ts
test("dashboard uses ConsoleShell and editor frame has no global nav", () => {
  const dashboard = fs.readFileSync(
    path.join(srcRoot, "app", "dashboard", "page.tsx"),
    "utf8",
  );
  const frame = fs.readFileSync(
    path.join(
      srcRoot,
      "components",
      "dashboard-v1",
      "DashboardFrame.tsx",
    ),
    "utf8",
  );
  expect(dashboard).toContain("ConsoleShell");
  expect(frame).not.toContain("PRIMARY_NAV_ITEMS");
  expect(frame).not.toContain("MODULE_NAV_ITEMS");
  expect(frame).not.toContain('label: "数据中心"');
  expect(frame).not.toContain('label: "账户与安全"');
});
```

Replace the duplicate mobile-bar assertion in `tests/mobile-layout.test.ts`:

```ts
test("only ConsoleShell owns fixed mobile navigation", () => {
  const shell = fs.readFileSync(
    path.join(srcRoot, "components", "layout", "ConsoleShell.tsx"),
    "utf8",
  );
  const editor = fs.readFileSync(
    path.join(
      srcRoot,
      "components",
      "dashboard-v1",
      "DashboardFrame.tsx",
    ),
    "utf8",
  );
  expect(shell).toContain("MOBILE_BOTTOM_NAV.map");
  expect(editor).not.toContain("fixed inset-x-0 bottom-0");
});
```

Run:

```bash
npm test -- --runInBand tests/legacy-routes.test.ts tests/mobile-layout.test.ts
```

Expected: FAIL against the duplicate Dashboard shell.

- [ ] **Step 2: Render exactly five fixed mobile items**

Replace the bottom-nav contents in `ConsoleShell.tsx` with:

```tsx
<div className="mx-auto grid max-w-lg grid-cols-5 gap-1 px-2">
  {MOBILE_BOTTOM_NAV.map((item) => {
    const Icon = item.icon;
    const active = isItemActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex min-h-[56px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[10px] font-black transition ${
          active
            ? "bg-[#DDE8CD] text-[#3F5F31]"
            : "text-[#7A6D5E] hover:bg-[#F7F1E7]"
        }`}
      >
        <Icon aria-hidden className="size-5" />
        {item.label}
      </Link>
    );
  })}
</div>
```

Keep the top-right mobile menu button for secondary functions. Remove the sixth “更多” item from the fixed bar.

- [ ] **Step 3: Reduce DashboardFrame to editor concerns**

In `DashboardFrame.tsx`:

- remove `usePathname`, `PRIMARY_NAV_ITEMS`, `MODULE_NAV_ITEMS` and module-switch markup;
- remove its fixed mobile bottom navigation;
- change its root landmark from `<main>` to `<section>` because it is nested inside `ConsoleShell`’s `<main>`;
- keep save/share/notification/logout actions, card-editor sections and phone preview;
- keep only `home/profile/links/appearance/share` as editor-local sections;
- link data analysis to `/workbench/analytics` and account/security to `/workbench/account` instead of rendering them as editor tabs;
- render editor sections on mobile as this non-fixed row:

```tsx
<nav
  className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden"
  aria-label="名片编辑步骤"
>
  {primaryItems.map(({ key, label, icon: Icon }) => (
    <button
      key={key}
      type="button"
      aria-current={activeTab === key ? "page" : undefined}
      onClick={() => selectTab(key)}
      className="min-h-11 shrink-0 rounded-xl px-3 text-sm font-black"
    >
      <Icon aria-hidden className="mr-2 inline size-4" />
      {label}
    </button>
  ))}
</nav>
```

- [ ] **Step 4: Wrap Dashboard with the canonical shell**

Replace `src/app/dashboard/page.tsx`:

```tsx
import ConsoleShell from "@/components/layout/ConsoleShell";
import DashboardV1Client from "@/components/dashboard-v1/DashboardV1Client";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <ConsoleShell
      eyebrow="Professional Card"
      title="专业名片"
      subtitle="填写业务资料、安排内容、预览手机效果并发布分享。"
    >
      <DashboardV1Client />
    </ConsoleShell>
  );
}
```

In `DashboardV1Client.tsx`, accept `home/profile/links/appearance/share` from `useSearchParams().get("tab")`; invalid values fall back to `home`. Preserve historical deep links by routing `?tab=stats` to `/workbench/analytics` and `?tab=account` to `/workbench/account`. The email-verification CTA and any `HomePanel` account action must also route to `/workbench/account`; do not render `AccountPanel` or `StatsPanel` inside the card editor.

- [ ] **Step 5: Keep WorkbenchShell behavior-free**

Its behavior remains:

```tsx
"use client";

import ConsoleShell from "@/components/layout/ConsoleShell";

export default function WorkbenchShell(
  props: React.ComponentProps<typeof ConsoleShell>,
) {
  return <ConsoleShell {...props} />;
}
```

- [ ] **Step 6: Verify and commit**

```bash
npm test -- --runInBand tests/console-navigation.test.ts tests/legacy-routes.test.ts tests/mobile-layout.test.ts
npm run typecheck
git add src/app/dashboard/page.tsx src/components/layout/ConsoleShell.tsx src/components/dashboard-v1/DashboardFrame.tsx src/components/dashboard-v1/DashboardV1Client.tsx src/components/workbench/WorkbenchShell.tsx tests/legacy-routes.test.ts tests/mobile-layout.test.ts
git commit -m "refactor: use one user shell across card and workbench"
```

Expected: targeted tests and TypeScript PASS.

---

### Task 4: Define server-derived onboarding readiness

**Files:**

- Create: `tests/onboarding-mainline.test.ts`
- Create: `src/lib/onboarding/readiness.ts`
- Modify: `src/components/onboarding/onboarding-store.ts`

**Interfaces:** Produces the onboarding interfaces listed above. Local storage remembers navigation only; profile/API responses remain business truth.

- [ ] **Step 1: Write failing readiness tests**

Create `tests/onboarding-mainline.test.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import {
  ONBOARDING_STEPS,
  getOnboardingReadiness,
} from "@/lib/onboarding/readiness";

const ready = {
  emailVerified: true,
  username: "consultant-li",
  displayName: "李顾问",
  jobTitle: "品牌咨询顾问",
  bio: "帮助小企业建立清晰品牌定位，主要服务初创团队。",
  template: "business",
  phone: null,
  email: "hello@example.com",
  wechat: null,
  isPublic: true,
};

describe("approved onboarding mainline", () => {
  test("step order matches the specification", () => {
    expect(ONBOARDING_STEPS).toEqual([
      "verify-email",
      "username",
      "business",
      "template",
      "contact",
      "preview",
      "publish",
      "reception",
    ]);
  });

  test("email verification blocks first", () => {
    expect(
      getOnboardingReadiness({
        ...ready,
        emailVerified: false,
      }).nextStep,
    ).toBe("verify-email");
  });

  test("temporary username remains incomplete", () => {
    expect(
      getOnboardingReadiness({
        ...ready,
        username: "u_123456789abc",
      }).nextStep,
    ).toBe("username");
  });

  test("business requires identity, positioning and audience copy", () => {
    expect(
      getOnboardingReadiness({
        ...ready,
        bio: null,
      }).nextStep,
    ).toBe("business");
  });

  test("one contact channel is required", () => {
    expect(
      getOnboardingReadiness({
        ...ready,
        phone: null,
        email: null,
        wechat: null,
      }).nextStep,
    ).toBe("contact");
  });

  test("a published profile reaches the reception choice", () => {
    expect(getOnboardingReadiness(ready).nextStep).toBe("reception");
  });

  test("a private completed profile reaches preview before publish", () => {
    expect(
      getOnboardingReadiness({ ...ready, isPublic: false }).nextStep,
    ).toBe("preview");
  });

  test("wizard persists through approved existing APIs", () => {
    const wizard = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/onboarding/OnboardingWizard.tsx",
      ),
      "utf8",
    );
    for (const endpoint of [
      "/api/dashboard",
      "/api/dashboard/username",
      "/api/dashboard/profile",
      "/api/dashboard/appearance",
    ]) {
      expect(wizard).toContain(endpoint);
    }
  });
});
```

Run:

```bash
npm test -- --runInBand tests/onboarding-mainline.test.ts
```

Expected: FAIL because the readiness module does not exist.

- [ ] **Step 2: Implement the pure readiness module**

Create `src/lib/onboarding/readiness.ts`:

```ts
export type OnboardingStep =
  | "verify-email"
  | "username"
  | "business"
  | "template"
  | "contact"
  | "preview"
  | "publish"
  | "reception";

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  "verify-email",
  "username",
  "business",
  "template",
  "contact",
  "preview",
  "publish",
  "reception",
] as const;

export type OnboardingSnapshot = {
  emailVerified: boolean;
  username: string | null;
  displayName: string | null;
  jobTitle: string | null;
  bio: string | null;
  template: string | null;
  phone: string | null;
  email: string | null;
  wechat: string | null;
  isPublic: boolean;
};

export type OnboardingReadiness = {
  nextStep: OnboardingStep;
  completedSteps: readonly OnboardingStep[];
};

const hasText = (value: string | null) => Boolean(value?.trim());

const hasPermanentUsername = (value: string | null) => {
  const username = value?.trim().toLowerCase() || "";
  return (
    Boolean(username) &&
    username !== "yourname" &&
    !/^u_[a-z0-9]{12}$/.test(username) &&
    !/^user-[a-z0-9]{6,}$/.test(username)
  );
};

export function getOnboardingReadiness(
  snapshot: OnboardingSnapshot,
): OnboardingReadiness {
  const checks: Record<OnboardingStep, boolean> = {
    "verify-email": snapshot.emailVerified,
    username: hasPermanentUsername(snapshot.username),
    business:
      hasText(snapshot.displayName) &&
      hasText(snapshot.jobTitle) &&
      hasText(snapshot.bio),
    template: ["business", "creator", "conversion"].includes(
      snapshot.template || "",
    ),
    contact:
      hasText(snapshot.phone) ||
      hasText(snapshot.email) ||
      hasText(snapshot.wechat),
    preview: snapshot.isPublic,
    publish: snapshot.isPublic,
    reception: false,
  };

  const completedSteps = ONBOARDING_STEPS.filter((step) => checks[step]);
  const nextStep =
    ONBOARDING_STEPS.find((step) => !checks[step]) || "reception";
  return { nextStep, completedSteps };
}
```

An already-published profile counts as having passed preview/publish for historical compatibility. Reception remains an explicit choice and is never inferred from plan entitlement alone.

- [ ] **Step 3: Import the canonical step type in the store**

At the top of `src/components/onboarding/onboarding-store.ts`:

```ts
import {
  ONBOARDING_STEPS,
  type OnboardingStep,
} from "@/lib/onboarding/readiness";

export { ONBOARDING_STEPS };
export type { OnboardingStep };
```

Use these labels:

```ts
export const STEP_LABELS: Record<OnboardingStep, string> = {
  "verify-email": "验证邮箱",
  username: "公开地址",
  business: "业务资料",
  template: "专业模板",
  contact: "联系方式",
  preview: "手机预览",
  publish: "发布名片",
  reception: "接待设置",
};
```

Remove the old duplicate union/list. Store only `{ step, updatedAt }`; cached fields are not proof of a successful server save.

- [ ] **Step 4: Verify and commit**

```bash
npm test -- --runInBand tests/onboarding-mainline.test.ts
git add src/lib/onboarding/readiness.ts src/components/onboarding/onboarding-store.ts tests/onboarding-mainline.test.ts
git commit -m "feat: define server-derived onboarding readiness"
```

Expected: readiness tests PASS. The source-persistence assertion already passes against existing endpoints.

---

### Task 5: Rebuild the wizard around the eight approved steps

**Files:**

- Modify: `src/components/onboarding/OnboardingWizard.tsx`
- Modify: `src/app/onboarding/page.tsx`
- Modify: `src/app/api/dashboard/profile/route.ts`
- Modify: `tests/onboarding-mainline.test.ts`

**Interfaces:** Uses only existing dashboard/profile/appearance/username APIs and adds no Prisma field or API route.

- [ ] **Step 1: Add failing truthfulness assertions**

Append:

```ts
test("reception distinguishes preset replies from real AI", () => {
  const wizard = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/components/onboarding/OnboardingWizard.tsx",
    ),
    "utf8",
  );
  expect(wizard).toContain("免费预设接待");
  expect(wizard).toContain(
    "预设回复不调用模型，也不消耗 AI 额度",
  );
  expect(wizard).toContain("Plus / Pro 真实 AI 接待");
  expect(wizard).not.toContain("免费 AI 客服");
});

test("obsolete avatar and first-link steps are gone", () => {
  const store = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/components/onboarding/onboarding-store.ts",
    ),
    "utf8",
  );
  expect(store).not.toContain('"avatar"');
  expect(store).not.toContain('"first-link"');
  expect(store).not.toContain('"checklist"');
});

test("a newly created profile starts private until explicit publish", () => {
  const route = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/app/api/dashboard/profile/route.ts",
    ),
    "utf8",
  );
  expect(route).toContain("isPublic: isPublicValue ?? false");
});
```

Run:

```bash
npm test -- --runInBand tests/onboarding-mainline.test.ts
```

Expected: FAIL against the old wizard.

- [ ] **Step 2: Load server truth before choosing a step**

After GET `/api/dashboard`, map the existing snake-case profile DTO exactly:

```ts
const snapshot: OnboardingSnapshot = {
  emailVerified: Boolean(result.user?.emailVerified),
  username: result.profile?.username ?? null,
  displayName: result.profile?.display_name ?? null,
  jobTitle: result.profile?.job_title ?? null,
  bio: result.profile?.bio ?? null,
  template: result.profile?.template ?? null,
  phone: result.profile?.phone ?? null,
  email: result.profile?.email ?? null,
  wechat: result.profile?.wechat ?? null,
  isPublic: Boolean(result.profile?.is_public),
};
```

Then call `getOnboardingReadiness` and select the earlier of the required server step and a cached navigation step:

```ts
const readiness = getOnboardingReadiness(snapshot);
const cachedIndex = cached.step
  ? ONBOARDING_STEPS.indexOf(cached.step)
  : -1;
const requiredIndex = ONBOARDING_STEPS.indexOf(
  readiness.nextStep,
);
const initialIndex =
  cachedIndex >= 0 && cachedIndex <= requiredIndex
    ? cachedIndex
    : requiredIndex;

setCurrentStep(
  ONBOARDING_STEPS[initialIndex] || readiness.nextStep,
);
```

- [ ] **Step 3: Persist each server-backed step exactly once**

First change the profile-create default in `src/app/api/dashboard/profile/route.ts` so a new onboarding record cannot become public before the publish step:

```ts
isPublic: isPublicValue ?? false,
```

| Step | Request | Success rule |
| --- | --- | --- |
| `verify-email` | POST `/api/auth/verify-email`, then reload dashboard after confirmation | `user.emailVerified === true` |
| `username` | PUT `/api/dashboard/username` `{ username }` | response OK and `success === true` |
| `business` | PUT `/api/dashboard/profile` `{ displayName, jobTitle, bio }` | returned sanitized values |
| `template` | PUT `/api/dashboard/appearance` `{ theme: "Link168 草木默认", template }` | returned template equals choice |
| `contact` | PUT `/api/dashboard/profile` `{ phone, email, wechat, contactVisibility: "public" }` | one returned channel non-empty |
| `preview` | no write; render `PhonePreview` from server response | explicit “预览无误” click |
| `publish` | PUT `/api/dashboard/profile` `{ isPublic: true }` | returned `is_public === true` |
| `reception` | route to `/workbench/ai?mode=preset` or `?mode=real` | explicit truthful choice |

Do not advance on HTTP error, `success !== true`, or missing returned profile.

- [ ] **Step 4: Use the existing profile as shared business data**

The business form contains:

```tsx
<input
  name="displayName"
  aria-label="姓名或品牌名"
  maxLength={40}
/>
<input
  name="jobTitle"
  aria-label="专业定位"
  maxLength={200}
/>
<textarea
  name="bio"
  aria-label="服务对象与业务介绍"
  maxLength={500}
/>
```

Do not create an AI-specific business-introduction field.

- [ ] **Step 5: Make preview and reception truthful**

The final choice includes:

```tsx
<Link href="/workbench/ai?mode=preset">
  配置免费预设接待
</Link>
<p>预设回复不调用模型，也不消耗 AI 额度。</p>
<Link href="/workbench/ai?mode=real">
  了解 Plus / Pro 真实 AI 接待
</Link>
```

Do not show a buy button or numeric quota.

- [ ] **Step 6: Return completed users to 首页**

After a reception choice or “稍后设置”:

```ts
clearOnboardingProgress();
router.replace("/console");
router.refresh();
```

Keep the existing authentication redirect in `src/app/onboarding/page.tsx`.

- [ ] **Step 7: Verify and commit**

```bash
npm test -- --runInBand tests/onboarding-mainline.test.ts
npm run typecheck
git add src/components/onboarding/OnboardingWizard.tsx src/components/onboarding/onboarding-store.ts src/app/onboarding/page.tsx src/app/api/dashboard/profile/route.ts tests/onboarding-mainline.test.ts
git commit -m "feat: align onboarding with the approved SaaS mainline"
```

Expected: onboarding tests and TypeScript PASS.

---

### Task 6: Make AI navigation mean visitor reception

**Files:**

- Modify: `tests/mainline-product-contract.test.ts`
- Modify: `src/app/workbench/ai/page.tsx`
- Modify: `src/app/workbench/ai/reception/page.tsx`
- Modify: `src/app/workbench/ai-service/page.tsx`
- Modify: `src/app/workbench/ai/[assistant]/page.tsx`
- Reuse: `src/components/ai/ReceptionConfigClient.tsx`

**Interfaces:** `/workbench/ai` is the only ordinary-user AI top-level page. Provider, credits and database behavior are unchanged.

- [ ] **Step 1: Add the failing AI page contract**

```ts
test("top-level AI page is visitor reception", () => {
  const page = read("src/app/workbench/ai/page.tsx");
  expect(page).toContain("ReceptionConfigClient");
  expect(page).not.toContain("AI_ASSISTANT_LIST");
  expect(page).not.toContain("企业版无限额度");
  expect(page).not.toContain("六大专业 AI 助手");
  expect(page).not.toMatch(/2000\s*(次|Credits)/);
});
```

Expected after running the suite: FAIL against the assistant catalogue.

- [ ] **Step 2: Render the existing safe reception editor at `/workbench/ai`**

Replace the page body:

```tsx
import { redirect } from "next/navigation";
import WorkbenchShell from "@/components/workbench/WorkbenchShell";
import ReceptionConfigClient from "@/components/ai/ReceptionConfigClient";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  toCustomerAiReceptionConfig,
} from "@/lib/ai/reception-config";

export const runtime = "nodejs";

export default async function WorkbenchAiPage() {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect("/login");

  const [config, profile, productCount] = await Promise.all([
    db.aiServiceConfig.findUnique({
      where: { userId: user.id },
    }),
    db.profile.findUnique({
      where: { userId: user.id },
      select: { username: true },
    }),
    db.product.count({
      where: { userId: user.id, isActive: true },
    }),
  ]);

  return (
    <WorkbenchShell
      eyebrow="AI Reception"
      title="AI 接待"
      subtitle="配置免费预设回复或符合权益的真实 AI 接待；资料不足时引导访客直接联系或留下需求。"
    >
      <ReceptionConfigClient
        initialConfig={toCustomerAiReceptionConfig(config)}
        profileUsername={profile?.username || null}
        productCount={productCount}
      />
    </WorkbenchShell>
  );
}
```

- [ ] **Step 3: Redirect old ordinary-user AI URLs**

Use this body in both `ai/reception/page.tsx` and `ai-service/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function LegacyAiReceptionPage() {
  redirect("/workbench/ai");
}
```

Use this in `ai/[assistant]/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function LegacyAssistantPage() {
  redirect("/workbench/ai");
}
```

Files remain; no route is deleted.

- [ ] **Step 4: Verify and commit**

```bash
npm test -- --runInBand tests/mainline-product-contract.test.ts tests/legacy-routes.test.ts
npm run typecheck
git add src/app/workbench/ai src/app/workbench/ai-service/page.tsx tests/mainline-product-contract.test.ts tests/legacy-routes.test.ts
git commit -m "refactor: make visitor reception the single user AI entry"
```

Expected: targeted tests and TypeScript PASS.

---

### Task 7: Align 首页 and 我的 with the approved mainline

**Files:**

- Modify: `tests/mainline-product-contract.test.ts`
- Modify: `src/app/console/page.tsx`
- Modify: `src/app/workbench/account/page.tsx`

**Interfaces:** Both pages use `toMainlinePlanLabel`; no entitlement data is changed.

- [ ] **Step 1: Add failing copy and decision tests**

```ts
test("home and account avoid future-plan and numeric claims", () => {
  const pages = [
    read("src/app/console/page.tsx"),
    read("src/app/workbench/account/page.tsx"),
  ].join("\n");
  expect(pages).toContain("toMainlinePlanLabel");
  expect(pages).not.toContain("企业版");
  expect(pages).not.toMatch(/188|388|2000\s*(次|Credits)/);
});

test("home prioritizes publication, leads and next action", () => {
  const home = read("src/app/console/page.tsx");
  expect(home).toContain("发布状态");
  expect(home).toContain("最近客户");
  expect(home).toContain("下一步");
  expect(home).not.toContain("今天是经营的好日子");
});
```

- [ ] **Step 2: Use the approved decision order on 首页**

Render:

1. completion/publication with CTA;
2. latest three real Leads;
3. next-follow-up reminders only when backed by existing fields;
4. truthful counts only when backed by current server queries;
5. secondary cards for products, AI reception, analytics and account.

Use:

```ts
const planLabel = toMainlinePlanLabel(
  membership?.planCode,
);
const isPublished = Boolean(profile?.isPublic);
const hasRealLead = latestLeads.length > 0;

const primaryAction = !profile
  ? {
      label: "开始创建专业名片",
      href: "/onboarding",
    }
  : !profile.isPublic
    ? {
        label: "预览并发布名片",
        href: "/dashboard?tab=share",
      }
    : hasRealLead
      ? {
          label: "处理最近客户",
          href: "/workbench/leads",
        }
      : {
          label: "分享名片获得咨询",
          href: "/dashboard?tab=share",
        };
```

If a real metric query is unavailable, omit that metric rather than implying measured zero activity.

- [ ] **Step 3: Use compatibility plan labels on 我的**

```ts
import {
  toMainlinePlanLabel,
} from "@/lib/product/mainline";

const planName = toMainlinePlanLabel(
  membership?.planCode,
);
```

Keep account/security behavior. Replace ordinary-user Enterprise promotion with `未来能力暂未开放`; do not alter stored plan codes or entitlements.

- [ ] **Step 4: Verify and commit**

```bash
npm test -- --runInBand tests/mainline-product-contract.test.ts
npm run typecheck
git add src/app/console/page.tsx src/app/workbench/account/page.tsx tests/mainline-product-contract.test.ts
git commit -m "refactor: align user home and account with SaaS mainline"
```

Expected: tests and TypeScript PASS.

---

### Task 8: Full repository and browser gate for Wave 1

**Files:** Add `docs/release-closeout/2026-07-18/WAVE_1_EVIDENCE.md` only after gathering real evidence.

**Interfaces:** Produces the exact reviewed head used for the Wave 2 plan.

- [ ] **Step 1: Run the clean PostgreSQL gate**

With a disposable PostgreSQL 16 database:

```bash
npm ci
npx prisma validate
npx prisma generate
npx prisma migrate deploy
```

Expected: all exit 0; this wave creates no migration.

- [ ] **Step 2: Run the complete repository gate**

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build
npm run release:preflight
npm run release:smoke
git diff --check
```

Expected: all exit 0, with no skip or force flag.

- [ ] **Step 3: Run authenticated browser journeys**

Start:

```bash
npm run dev
```

With a non-production test user/database, verify:

1. `/console`, `/dashboard`, `/workbench/leads`, `/workbench/ai`, `/workbench/account` show one shell.
2. At 360, 390 and 430 px, the fixed bar contains exactly 首页/名片/客户/AI/我的 and no overflow.
3. Dashboard has editor-local tabs but no second fixed bottom bar.
4. Local-storage edits cannot skip server-required onboarding steps.
5. Saved business, template and contact fields survive refresh and render in phone preview.
6. Free reception copy says “预设回复”; no Enterprise or numeric paid quota appears.
7. Legacy AI URLs land on `/workbench/ai`.

Capture one desktop and three mobile screenshots with URL context in the evidence record.

- [ ] **Step 4: Record remaining risks exactly**

```markdown
- Lead five-state migration: not implemented; Wave 3.
- Single AI Provider and real Bailian verification: not implemented; Wave 4.
- Final price/quota/refund decision and real Alipay: not authorized; Wave 5 plus owner decision.
- Production mail, object storage, database and deployment: not verified.
```

- [ ] **Step 5: Request review and record the head**

```bash
git status --short
git log --oneline fa45799ae184863d5d0a8d236410f93d822e9f0e..HEAD
git rev-parse HEAD
```

Expected: clean worktree, focused Wave 1 commits and an exact head SHA. Invoke `superpowers:requesting-code-review` and address only evidence-backed findings.

- [ ] **Step 6: Push the reviewed branch**

```bash
git push -u origin integration/saas-mainline-v1-20260718
```

Expected: branch CI runs. Do not merge or deploy. Decide whether to open one long-lived Draft PR or per-wave Draft PRs only after Wave 1 review.

## Wave 1 Completion Criteria

Wave 1 is complete only when the branch is clean; all repository gates pass; one authenticated shell serves all five primary entries; mobile has exactly five fixed items; onboarding follows the confirmed order and persists server truth; old AI routes converge safely; no ordinary-user Enterprise or unapproved numeric pricing/quota claim remains in the five primary pages; and external services remain labelled unverified.
