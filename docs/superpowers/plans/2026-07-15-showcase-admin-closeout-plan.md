# Link168 Showcase and Jeepwork Closeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修正比赛展示页的主体信息、能力状态和访问会话，并将 Jeepwork 比赛入口与历史 `admin` 角色规则收口到已批准的 MVP 边界。

**Architecture:** 保留现有 `/showcase` 页面与 `/jeepwork` 控制平面，不做大规模重构。静态、必须准确的公司与产品状态集中在 `src/lib/showcase-config.ts`；共享密码会话继续由 `src/lib/showcase.ts` 与 `/api/showcase/session` 管理；后台只调整导航、兼容跳转与角色变更白名单。

**Tech Stack:** Next.js 16 App Router、TypeScript、React、Prisma、bcrypt、Node.js crypto、Jest、GitHub Actions。

## Global Constraints

- 只修改分支 `codex/showcase-admin-closeout-20260715`，不得直接修改 `master`。
- 不部署服务器，不连接或修改生产数据库。
- 不调用阿里百炼、阿里云邮件、支付宝或对象存储生产服务。
- `/showcase` 必须保留并正常部署。
- 平台后台只允许 `super_admin`，历史 `admin` 数据保留但不得继续分配。
- 共享密码成功后长期有效；修改密码后旧 Cookie 自动失效；错误密码尝试不设置应用级次数限制。
- 不把代码接入或自动测试通过描述成生产外部服务已验证。

---

### Task 1: 建立发布收口测试

**Files:**
- Create: `tests/showcase-admin-closeout.test.ts`
- Read: `src/lib/showcase-config.ts`
- Read: `src/app/api/showcase/session/route.ts`
- Read: `src/lib/jeepwork-navigation.ts`
- Read: `src/app/jeepwork/showcase/page.tsx`
- Read: `src/app/api/jeepwork/users/route.ts`
- Read: `src/app/jeepwork/roles/page.tsx`

**Interfaces:**
- Consumes: 现有源码文件文本。
- Produces: 静态发布门禁测试，阻止旧占位、短期 Cookie、双比赛入口和重新分配 `admin` 回归。

- [ ] **Step 1: 写入失败测试**

测试使用 `fs.readFileSync` 读取源码，并验证：

```ts
expect(showcaseConfig).toContain("合肥造梦哈勃文化传媒有限公司");
expect(showcaseConfig).toContain("91340104MADEECUN15");
expect(showcaseConfig).toContain("皖ICP备2026018031号-1");
expect(showcaseConfig).toContain("business@link168.me");
expect(showcaseConfig).not.toMatch(/未备案|待补充主体名称|每日重置数据/);
expect(showcaseConfig).not.toContain('username: "demo"');
expect(sessionRoute).toContain("SHOWCASE_COOKIE_MAX_AGE");
expect(sessionRoute).not.toContain("8 * 60 * 60");
expect(navigation.match(/competition-center/g)?.length).toBe(1);
expect(navigation).not.toContain('href: "/jeepwork/showcase"');
expect(legacyPage).toContain('redirect("/jeepwork/competition-center?tab=files")');
expect(usersRoute).not.toContain('raw === "admin"');
expect(rolesPage).toContain("历史管理员账号");
expect(rolesPage).not.toContain("拥有运营权限");
```

- [ ] **Step 2: 通过 GitHub Actions 验证测试失败**

创建 Draft PR 后等待 Jest 门禁。预期：测试因旧配置、8 小时 Cookie、双入口或 `admin` 白名单而失败。

- [ ] **Step 3: 提交测试**

```bash
git add tests/showcase-admin-closeout.test.ts
git commit -m "test: lock showcase and jeepwork closeout rules"
```

---

### Task 2: 修正 Showcase 主体、状态与演示叙事

**Files:**
- Modify: `src/lib/showcase-config.ts`
- Modify: `src/components/showcase/ShowcaseGate.tsx`
- Modify: `src/components/showcase/ShowcaseModeSelector.tsx`
- Modify: `src/components/showcase/JudgeShowcase.tsx`
- Create: `public/company/zaomeng-hubble-logo.webp`
- Test: `tests/showcase-admin-closeout.test.ts`

**Interfaces:**
- Consumes: `SHOWCASE_PROJECT`、`PRODUCT_CAPABILITIES`、`FIVE_MINUTE_PATH`、`PROGRESS_MILESTONES`、`JUDGE_QA`。
- Produces: 准确公司主体、备案与联系方式；四类真实能力状态；不含演示账号的评委路径。

- [ ] **Step 1: 更新主体配置**

`SHOWCASE_PROJECT` 使用以下固定值：

```ts
company: {
  name: "合肥造梦哈勃文化传媒有限公司",
  unifiedSocialCreditCode: "91340104MADEECUN15",
  legalRep: "齐帅",
  registeredCapital: "人民币 5 万元",
  establishedAt: "2024年4月1日",
  registeredRegion: "安徽省合肥市蜀山区",
  contactEmail: "business@link168.me",
  logoUrl: "/company/zaomeng-hubble-logo.webp",
},
icp: "皖ICP备2026018031号-1",
updatedAt: "2026-07-15",
```

删除 `demoAccount`，不公开用户名、密码或“每日重置”承诺。

- [ ] **Step 2: 修正能力状态**

将需要真实外部服务的能力标为 `pending_validation` 或 `beta`：真实邮件发送、百炼调用、支付宝、对象存储、企业域名和生产环境。注册登录、名片、组件、Lead、基础分析和 Jeepwork 权限保持“代码与自动测试已通过”。

- [ ] **Step 3: 更新体验路径**

核心路径统一为：`/` → `/register` 或 `/login` → `/console` → 名片与组件 → 公开页 → Lead → 分析 → `/jeepwork`。不再将 `/dashboard`、`/enterprise-ai` 或演示账号作为核心叙事。

- [ ] **Step 4: 更新页面文案和公司 Logo**

Showcase Gate 只提示共享密码；Mode Selector 不再声称所有内容都能由后台即时修改；Judge 页展示公司主体卡片，并将“正式支付”“AI 助理”等按真实验证状态表述。

- [ ] **Step 5: 运行测试**

```bash
npm test -- --runInBand tests/showcase-admin-closeout.test.ts
```

预期：主体与文案断言通过。

- [ ] **Step 6: 提交**

```bash
git add src/lib/showcase-config.ts src/components/showcase public/company/zaomeng-hubble-logo.webp tests/showcase-admin-closeout.test.ts
git commit -m "fix(showcase): align competition content with MVP reality"
```

---

### Task 3: 实现长期共享密码会话和密码轮换失效

**Files:**
- Modify: `src/lib/showcase.ts`
- Modify: `src/app/api/showcase/session/route.ts`
- Test: `tests/showcase-admin-closeout.test.ts`

**Interfaces:**
- Produces: `SHOWCASE_COOKIE_MAX_AGE` 常量；`createShowcaseCookieValue(passwordHash)`；`hasValidShowcaseCookie(cookieValue, config)`。
- Cookie 值继续绑定当前 `passwordHash`，密码更新导致签名期望值变化，从而使旧 Cookie 自动失效。

- [ ] **Step 1: 定义长期 Cookie 常量**

```ts
export const SHOWCASE_COOKIE_MAX_AGE = 10 * 365 * 24 * 60 * 60;
```

这是长期持久 Cookie，不表示服务端永远接受；密码轮换后旧值立即失效。

- [ ] **Step 2: 补齐 GET 会话检查**

`GET` 读取 Cookie、加载当前配置并调用 `hasValidShowcaseCookie`：

```ts
export async function GET(request: NextRequest) {
  const config = await getShowcaseConfig();
  const cookieValue = request.cookies.get(SHOWCASE_COOKIE_NAME)?.value;
  const success = config.enabled && hasValidShowcaseCookie(cookieValue, config);
  return NextResponse.json({ success, data: { authenticated: success }, error: null });
}
```

- [ ] **Step 3: POST 使用长期 Cookie**

Cookie 保持 `HttpOnly`、`SameSite=strict`、`Secure` 条件和 `/showcase` 路径，`maxAge` 改为 `SHOWCASE_COOKIE_MAX_AGE`。不添加错误次数限制。

- [ ] **Step 4: 运行测试并提交**

```bash
npm test -- --runInBand tests/showcase-admin-closeout.test.ts
git add src/lib/showcase.ts src/app/api/showcase/session/route.ts tests/showcase-admin-closeout.test.ts
git commit -m "fix(showcase): persist password access until rotation"
```

---

### Task 4: 收口 Jeepwork 比赛入口和历史 admin

**Files:**
- Modify: `src/lib/jeepwork-navigation.ts`
- Replace: `src/app/jeepwork/showcase/page.tsx`
- Modify: `src/app/api/jeepwork/users/route.ts`
- Modify: `src/app/jeepwork/roles/page.tsx`
- Modify: `src/lib/admin-governance/permissions.ts`
- Test: `tests/showcase-admin-closeout.test.ts`
- Test: `tests/jeepwork-visible-routes.test.ts`

**Interfaces:**
- Navigation produces one public admin entry: `/jeepwork/competition-center`。
- `normalizeRole` accepts only `super_admin | user | ""` for PATCH input；GET 仍允许查询历史 `admin`。

- [ ] **Step 1: 合并比赛入口**

从 `JEEPWORK_NAV_GROUPS` 删除 `/jeepwork/showcase`，保留 `/jeepwork/competition-center`，标签为“比赛中心”。

- [ ] **Step 2: 旧路由兼容跳转**

将旧页面替换为服务端跳转：

```ts
import { redirect } from "next/navigation";

export default function LegacyShowcaseAdminPage() {
  redirect("/jeepwork/competition-center?tab=files");
}
```

- [ ] **Step 3: 禁止新分配 admin**

将 PATCH 使用的角色解析限制为：

```ts
function normalizeAssignableRole(raw: unknown): "super_admin" | "user" | "" {
  if (raw === "super_admin" || raw === "user") return raw;
  return "";
}
```

GET 查询历史角色仍可接受 `admin`，以便迁移。

- [ ] **Step 4: 修正角色页面**

历史 `admin` 分组标记为“历史管理员账号”，说明其不能登录平台后台；仅提供“升为超级管理员”或“降为普通用户”，删除“拥有运营权限”的错误文案。

- [ ] **Step 5: 同步权限说明**

`ROLE_LABELS.admin` 改为“历史管理员”，并继续保持 `ROLE_ROUTE_ACCESS.admin = []`。

- [ ] **Step 6: 运行目标测试并提交**

```bash
npm test -- --runInBand tests/showcase-admin-closeout.test.ts tests/jeepwork-visible-routes.test.ts
git add src/lib/jeepwork-navigation.ts src/app/jeepwork/showcase/page.tsx src/app/api/jeepwork/users/route.ts src/app/jeepwork/roles/page.tsx src/lib/admin-governance/permissions.ts tests
git commit -m "fix(jeepwork): unify competition entry and retire admin assignment"
```

---

### Task 5: 完整发布门禁与 PR

**Files:**
- Verify all changed files
- Update: `docs/superpowers/plans/2026-07-15-showcase-admin-closeout-plan.md` checkbox state only when evidence exists

**Interfaces:**
- Produces: 可审阅 Draft PR，目标 `master`，不自动合并。

- [ ] **Step 1: 运行完整门禁**

```bash
npm ci
npx prisma validate
npx prisma generate
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build
git diff --check master...HEAD
```

预期：全部退出码 0；没有 skipped/todo 测试；Build 允许已知非阻断 Turbopack NFT tracing warning，但不得新增错误。

- [ ] **Step 2: 核对差异**

确认没有 `.env`、密钥、生产配置、数据库数据、无关文档或服务器脚本进入提交。

- [ ] **Step 3: 创建 Draft PR**

PR 标题：`fix: close out showcase and jeepwork release rules`。

PR 正文必须列出：主体信息来源、展示状态边界、长期 Cookie 与密码轮换机制、单一比赛入口、历史 `admin` 迁移规则、测试结果，以及“未部署/未验证真实外部服务”。

- [ ] **Step 4: 等待用户批准合并**

不得自动合并 PR，不得部署服务器，不得操作生产数据库。
