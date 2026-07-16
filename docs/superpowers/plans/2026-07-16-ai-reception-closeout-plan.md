# Link168 AI 客服 MVP 收口 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 AI 接待收口为系统端控制底层 AI、客户端控制经营配置、访客端不暴露供应商，并补齐快捷按钮与预设自动回复闭环。

**Architecture:** `AppConfig` 继续作为系统端供应商与平台策略唯一来源；`AiServiceConfig` 成为客户 AI 接待经营配置唯一来源。公开页通过只读公开 DTO 获取客户配置，快捷按钮中的本地动作不调用模型，只有 `send_message` 进入现有商业 Agent 权益、幂等、扣费与退款链路。

**Tech Stack:** Next.js App Router、TypeScript、React、Prisma 7、PostgreSQL 16、Jest、GitHub Actions。

## Global Constraints

- 开发分支固定为 `codex/ai-reception-closeout-20260716`，不得直接修改 `master`。
- 系统端控制供应商、安全、权限、额度和成本。
- 客户端控制助手形象、业务资料、快捷按钮和自动回复。
- 客户端与访客端不得显示供应商、模型、App ID、Workspace ID、API Key、Base URL、Token 或供应商原始错误。
- 免费用户不得产生真实 AI 调用。
- 企业客服坐席、人工接管、会话分配、WebSocket 和客服主管后台继续冻结。
- 所有生产代码必须先有失败测试。
- 不调用真实百炼，不连接生产服务器或生产数据库。

---

## File Map

- Create: `tests/ai-reception-config-closeout.test.ts` — 客户配置 DTO、校验、品牌隔离与公开动作测试。
- Create: `src/lib/ai/reception-config.ts` — 客户配置默认值、白名单校验、公开 DTO、快捷动作解析。
- Modify: `prisma/schema.prisma` — `AiServiceConfig.quickActionsJson`。
- Create: `prisma/migrations/20260716070000_ai_reception_quick_actions/migration.sql` — 新增可空文本字段。
- Create: `src/app/api/dashboard/ai-service-config/route.ts` — 当前登录用户 GET/PUT。
- Create: `src/app/api/public/[username]/ai-reception-config/route.ts` — 公开只读 DTO。
- Modify: `src/components/ai/ReceptionConfigClient.tsx` — 客户配置与快捷动作编辑器。
- Modify: `src/components/share/modules/AiChatModule.tsx` — 读取公开配置并执行本地动作或发送预设问题。
- Modify: `src/components/share/SharePageRenderer.tsx` — `ai-chat` 组件只负责摆放，不再把组件 payload 当作真实经营配置。
- Modify: `src/components/dashboard/LinksPanel.tsx` — AI 组件编辑处去除重复的名称、欢迎语和语气字段，改为配置入口说明。
- Modify: `src/lib/ai/commercial-agent.ts` — 对外错误去供应商品牌化，继续读取 `AiServiceConfig`。
- Modify: `tests/profile-module-closeout.test.ts` — 锁定 AI 组件只负责位置与显示。

---

### Task 1: RED — 锁定客户配置和公开 DTO 规则

**Files:**
- Create: `tests/ai-reception-config-closeout.test.ts`
- Test: `tests/ai-reception-config-closeout.test.ts`

**Interfaces:**
- Produces expected API for `normalizeAiReceptionConfig`, `parseAiReceptionQuickActions`, `toPublicAiReceptionConfig`.

- [ ] **Step 1: Write failing unit tests**

```ts
import {
  normalizeAiReceptionConfig,
  parseAiReceptionQuickActions,
  toPublicAiReceptionConfig,
} from "@/lib/ai/reception-config";

test("客户配置白名单不接受供应商字段", () => {
  const normalized = normalizeAiReceptionConfig({
    enabled: true,
    assistantName: "阿宝顾问",
    aiProvider: "bailian",
    aiApiKey: "secret",
  });
  expect(normalized).toEqual(expect.objectContaining({ enabled: true, assistantName: "阿宝顾问" }));
  expect(normalized).not.toHaveProperty("aiProvider");
  expect(normalized).not.toHaveProperty("aiApiKey");
});

test("公开 DTO 不泄露供应商和内部字段", () => {
  const dto = toPublicAiReceptionConfig({
    enabled: true,
    assistantName: "阿宝顾问",
    welcomeMessage: "你好",
    tone: "friendly",
    allowProductRecommendation: true,
    collectLead: true,
    allowReport: true,
    allowTransferToHuman: false,
    privacyNoticeText: null,
    providerMode: "mock",
    quickActionsJson: "[]",
  });
  expect(dto).not.toHaveProperty("providerMode");
  expect(JSON.stringify(dto)).not.toMatch(/bailian|qwen|openai|deepseek|apiKey/i);
});

test("快捷动作最多六个并过滤禁用项", () => {
  const actions = parseAiReceptionQuickActions(JSON.stringify([
    { id: "1", label: "价格", type: "auto_reply", value: "价格以页面为准", enabled: true, position: 2 },
    { id: "2", label: "隐藏", type: "auto_reply", value: "hidden", enabled: false, position: 1 },
  ]), { publicOnly: true });
  expect(actions).toHaveLength(1);
  expect(actions[0]?.label).toBe("价格");
});
```

- [ ] **Step 2: Commit tests only**

```bash
git add tests/ai-reception-config-closeout.test.ts
git commit -m "test: define AI reception configuration boundary"
```

- [ ] **Step 3: Open or update Draft PR against `integration/mvp-closeout-r1`**

Expected: `MVP Closeout` runs and fails because `@/lib/ai/reception-config` does not exist.

- [ ] **Step 4: Record RED evidence**

Record workflow run ID, failing job ID and exact failure message in the PR body.

---

### Task 2: GREEN — 配置领域模型、Prisma 字段和 migration

**Files:**
- Create: `src/lib/ai/reception-config.ts`
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260716070000_ai_reception_quick_actions/migration.sql`
- Test: `tests/ai-reception-config-closeout.test.ts`

**Interfaces:**
- Produces:
  - `AiReceptionTone = "friendly" | "professional" | "concise"`
  - `AiReceptionQuickActionType = "auto_reply" | "send_message" | "open_url" | "copy_text" | "call_phone"`
  - `normalizeAiReceptionConfig(input: unknown): AiReceptionConfigPatch`
  - `parseAiReceptionQuickActions(value: string | null | undefined, options?: { publicOnly?: boolean }): AiReceptionQuickAction[]`
  - `serializeAiReceptionQuickActions(actions: AiReceptionQuickAction[]): string`
  - `toPublicAiReceptionConfig(config: AiReceptionConfigRecord): PublicAiReceptionConfig`

- [ ] **Step 1: Implement strict normalization**

Rules: assistant name 1–30, welcome 1–200, privacy 0–300, allowed tone whitelist, maximum six actions, label 1–20, value max 1000, stable ordering, HTTPS public URL only, telephone sanitization, no script protocols.

- [ ] **Step 2: Add Prisma field**

```prisma
quickActionsJson String? @map("quick_actions_json")
```

- [ ] **Step 3: Add migration**

```sql
ALTER TABLE "ai_service_configs"
ADD COLUMN "quick_actions_json" TEXT;
```

- [ ] **Step 4: Commit minimal implementation**

```bash
git add src/lib/ai/reception-config.ts prisma/schema.prisma prisma/migrations/20260716070000_ai_reception_quick_actions/migration.sql
git commit -m "feat: add AI reception configuration model"
```

- [ ] **Step 5: Verify targeted tests and Prisma in CI**

Expected: new tests pass; Prisma validate, generate and migration deploy pass.

---

### Task 3: RED/GREEN — 客户配置 GET/PUT API

**Files:**
- Modify: `tests/ai-reception-config-closeout.test.ts`
- Create: `src/app/api/dashboard/ai-service-config/route.ts`

**Interfaces:**
- GET returns `{ success: true, config }` for current user only.
- PUT accepts only fields from `normalizeAiReceptionConfig` and uses `db.aiServiceConfig.upsert`.

- [ ] **Step 1: Add failing route tests**

Test unauthenticated 401, own-record isolation, default disabled config, valid upsert, provider fields ignored, invalid actions rejected with 400.

- [ ] **Step 2: Commit RED and verify expected failure in CI**

```bash
git add tests/ai-reception-config-closeout.test.ts
git commit -m "test: require customer AI reception config API"
```

- [ ] **Step 3: Implement route**

Use `getCurrentUserFromCookies`, `db.aiServiceConfig.findUnique`, `normalizeAiReceptionConfig`, `serializeAiReceptionQuickActions`, and `NextResponse`. Never call `getConfig()` or expose `AppConfig`.

- [ ] **Step 4: Commit GREEN**

```bash
git add src/app/api/dashboard/ai-service-config/route.ts
git commit -m "feat: add customer AI reception config API"
```

---

### Task 4: RED/GREEN — 公开配置 API 和供应商品牌隔离

**Files:**
- Modify: `tests/ai-reception-config-closeout.test.ts`
- Create: `src/app/api/public/[username]/ai-reception-config/route.ts`

**Interfaces:**
- Returns only `PublicAiReceptionConfig`.
- Requires public profile, verified owner, enabled AI config and active `ai-chat` component.

- [ ] **Step 1: Add failing tests**

Cover missing profile 404, private profile 404, unverified owner 403, disabled config 404, missing active component 404, sorted enabled actions, no provider/model leakage.

- [ ] **Step 2: Commit RED and verify CI failure**

- [ ] **Step 3: Implement public route**

Query profile with owner verification, `aiServiceConfig`, and active link type `ai-chat`; return generic platform messages only.

- [ ] **Step 4: Commit GREEN**

```bash
git add src/app/api/public/[username]/ai-reception-config/route.ts
git commit -m "feat: expose safe public AI reception config"
```

---

### Task 5: RED/GREEN — 客户端配置界面与快捷按钮编辑器

**Files:**
- Modify: `tests/ai-reception-config-closeout.test.ts`
- Modify: `src/components/ai/ReceptionConfigClient.tsx`

**Interfaces:**
- Client loads and saves `/api/dashboard/ai-service-config`.
- Quick actions support add, edit, delete, enable, disable, move up and move down.
- No provider or model fields appear.

- [ ] **Step 1: Add structural failing tests**

Assert component source contains quick action operations and does not contain provider/model/API Key labels.

- [ ] **Step 2: Commit RED and verify CI failure**

- [ ] **Step 3: Implement editor**

Keep maximum six actions. Generate UUID client-side. Render type selector, label, value and enabled state. Validate before save and show Chinese error messages.

- [ ] **Step 4: Commit GREEN**

```bash
git add src/components/ai/ReceptionConfigClient.tsx
git commit -m "feat: add customer AI quick action editor"
```

---

### Task 6: RED/GREEN — 公开聊天快捷动作

**Files:**
- Modify: `tests/ai-reception-config-closeout.test.ts`
- Modify: `src/components/share/modules/AiChatModule.tsx`
- Modify: `src/components/share/SharePageRenderer.tsx`

**Interfaces:**
- `AiChatModule` fetches `/api/public/${username}/ai-reception-config`.
- `auto_reply` appends assistant text locally.
- `send_message` invokes existing `sendMessage(value)`.
- `open_url`, `copy_text`, `call_phone` execute safe browser actions.

- [ ] **Step 1: Add failing tests**

Assert local reply path does not call AI endpoint, send-message path does, disabled actions are absent, and source contains no vendor terms.

- [ ] **Step 2: Commit RED and verify CI failure**

- [ ] **Step 3: Implement public behavior**

Use generic loading and unavailable states. Do not show provider/model/error body. Keep existing requestId and commercial Agent route.

- [ ] **Step 4: Stop using component payload as assistant configuration**

`SharePageRenderer` passes only `username`; legacy payload may remain stored but does not override service config.

- [ ] **Step 5: Commit GREEN**

```bash
git add src/components/share/modules/AiChatModule.tsx src/components/share/SharePageRenderer.tsx
git commit -m "feat: add AI reception quick actions to public profiles"
```

---

### Task 7: RED/GREEN — 名片编辑器去除重复 AI 配置

**Files:**
- Modify: `tests/profile-module-closeout.test.ts`
- Modify: `src/components/dashboard/LinksPanel.tsx`

**Interfaces:**
- AI component editor controls placement, visibility, sorting and deletion only.
- Business configuration link points to `/workbench/ai/reception`.

- [ ] **Step 1: Add failing regression test**

Require the AI component section to show a configuration entry link and forbid duplicate assistantName/greeting/tone inputs.

- [ ] **Step 2: Commit RED and verify CI failure**

- [ ] **Step 3: Replace fields with explanatory panel**

Copy: `助手名称、欢迎语、业务资料和快捷回复请在“访客 AI 接待”中统一配置。`

- [ ] **Step 4: Commit GREEN**

```bash
git add tests/profile-module-closeout.test.ts src/components/dashboard/LinksPanel.tsx
git commit -m "fix: make AI service config the single customer source"
```

---

### Task 8: 错误文案去品牌化与全量回归

**Files:**
- Modify: `tests/ai-reception-config-closeout.test.ts`
- Modify: `src/lib/ai/commercial-agent.ts`
- Modify only when required: `src/lib/ai/provider-error.ts`

**Interfaces:**
- Public errors are stable generic Chinese messages.
- Provider details remain server-side only.

- [ ] **Step 1: Add failing tests for public error messages**

Require not configured, provider failed, quota exhausted and disabled responses to avoid vendor terms and raw error text.

- [ ] **Step 2: Commit RED and verify failure**

- [ ] **Step 3: Implement generic mapping**

Use:
- `AI 接待暂未开启。`
- `当前主页暂未开通 AI 接待。`
- `当前主页的 AI 服务额度已用完。`
- `AI 服务暂不可用，请稍后再试。`
- `AI 接待暂时不可用，本次未消耗额度。`

- [ ] **Step 4: Commit GREEN**

```bash
git add tests/ai-reception-config-closeout.test.ts src/lib/ai/commercial-agent.ts src/lib/ai/provider-error.ts
git commit -m "fix: hide AI provider details from customers"
```

---

### Task 9: Full verification and release evidence

**Files:**
- Modify: PR body only unless a factual readiness document is needed.

- [ ] **Step 1: Run full GitHub Actions gate**

Expected all success:
- npm ci
- Prisma validate
- Prisma generate
- Prisma migrate deploy on PostgreSQL 16
- TypeScript
- ESLint
- Jest
- production build
- git diff --check

- [ ] **Step 2: Inspect workflow job steps and logs**

Confirm no skipped tests, no migration error, no TypeScript or build error.

- [ ] **Step 3: Compare branch with master**

Confirm only AI reception scope, tests, migration, design and plan changed.

- [ ] **Step 4: Retarget Draft PR to `master` after GREEN**

Keep Draft. Do not merge without explicit owner approval.

- [ ] **Step 5: Report exact evidence**

Report branch HEAD, commits, workflow run ID, job ID, changed files, tests and remaining production-only validation: real Bailian configuration and live browser acceptance.
