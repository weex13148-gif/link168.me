# Link168 访客经营主页、装修与 Showcase 退役实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 退役 `/showcase`，并把 `/[username]` 与后台预览重做为手机优先、AI 接待优先且只有一个主动作的经营主页。

**Architecture:** 保持 `PublicProfileClientWrapper -> SharePageWithContact -> SharePageRenderer` 为唯一公开页链路，`PhonePreview` 继续复用同一个 `SharePageRenderer`。主题 JSON 只向后兼容增加 `avatarMode`，AI、联系、Lead、隐私和审核继续使用现有真实 API 与数据库；Showcase 只删除路由和专属代码，Prisma 历史表、迁移和已有数据不做破坏性处理。

**Tech Stack:** Next.js 16 App Router、React 19、TypeScript 6、Prisma 7、PostgreSQL、Jest 30、React Testing Library。

## Global Constraints

- 当前唯一收口分支是 `recovery/direct-goal-closeout-20260722`。
- 保留 `/[username]`、企业域名公开页、`/jeepwork`、支付、会员、AI、邮件和企业结构。
- `/showcase`、三个受众子页、公开 API 和专属管理入口必须退出构建；旧地址返回标准 404，不做重定向。
- Showcase Prisma 表、迁移、审计日志标签、上传目录和已有数据不删除。
- `PhonePreview` 与公开页继续共用 `SharePageRenderer`；不得创建第二套访客页业务逻辑。
- AI 只在真实开通、启用且存在有效 `ai-chat` 模块时成为主动作；失败时安全降级到联系/留资。
- 联系方式只有在 `contactVisibility === "public"` 时展示。
- `cardOpacity` 范围为 0–100，`buttonRadius` 和 `moduleGap` 范围为 0–32px。
- 不改价格、AI 额度、支付规则和权益口径。
- 第三方审核未配置时保存为 `pending_manual_review`，界面标记“待配置验证”，不得伪造审核通过。
- 保留用户已有的 `next-env.d.ts` 修改，不纳入本计划提交。

## File Structure

### 删除的现役 Showcase 代码

- `src/app/showcase/page.tsx`
- `src/app/showcase/judge/page.tsx`
- `src/app/showcase/investor/page.tsx`
- `src/app/showcase/government/page.tsx`
- `src/app/api/showcase/**/route.ts`
- `src/app/jeepwork/showcase/page.tsx`
- `src/app/jeepwork/competition-center/page.tsx`
- `src/app/jeepwork/competition-ai-debug/page.tsx`
- `src/app/api/jeepwork/showcase/route.ts`
- `src/app/api/jeepwork/competition-center/**/route.ts`
- `src/app/api/jeepwork/competition-ai-debug/route.ts`
- `src/app/api/jeepwork/competition-files/**/route.ts`
- `src/components/showcase/*.tsx`
- `src/lib/showcase.ts`
- `src/lib/showcase-config.ts`
- `src/lib/showcase-v2.ts`
- `src/lib/showcase-v2-shared.ts`
- `tests/showcase-admin-closeout.test.ts`

### 新建的经营主页聚焦文件

- `src/components/share/public-profile-types.ts`：公开/预览共享 DTO 和渲染模式。
- `src/components/share/PublicProfileHero.tsx`：封面、头像/Logo、身份和分享动作。
- `src/components/share/PublicContactActions.tsx`：vCard 与公开联系方式。
- `src/components/share/PublicModuleList.tsx`：模块间距和公开/预览空状态。
- `src/components/share/PublicProfileStickyAction.tsx`：页面唯一吸底主动作。
- `src/components/dashboard-v1/RangeControl.tsx`：可键盘操作的范围控件。
- `src/components/theme/wallpapers.ts`：六张内置壁纸的唯一清单。
- `src/lib/public-avatar.ts`：头像审核状态到公开 URL 的纯函数。
- `tests/showcase-retirement.test.ts`：退役边界回归测试。
- `tests/theme-customization.test.ts`：主题兼容与范围测试。
- `tests/appearance-panel.test.tsx`：壁纸、范围控件和公开 switch 交互测试。
- `tests/public-profile-redesign.test.tsx`：公开/预览、AI 和唯一 CTA 测试。
- `tests/avatar-moderation-closeout.test.ts`：头像审核记录与同步测试。
- `docs/superpowers/reports/2026-07-23-public-profile-design-qa.md`：响应式和视觉验收凭证。

---

### Task 1: 退役 `/showcase` 公开功能和专属后台

**Files:**
- Create: `tests/showcase-retirement.test.ts`
- Delete: 上述“删除的现役 Showcase 代码”清单
- Modify: `src/app/sitemap.ts`
- Modify: `src/app/robots.ts`
- Modify: `src/app/jeepwork/page.tsx`
- Modify: `src/lib/jeepwork-navigation.ts`
- Modify: `src/lib/admin-governance/permissions.ts`
- Modify: `src/lib/ai/entitlement-guard.ts`
- Modify: `src/lib/observability/ai-metrics.ts`

**Interfaces:**
- Consumes: Next.js 文件路由、`WORKSPACE_RESERVED_SLUGS` 和现有 Jeepwork 导航数组。
- Produces: 不包含 Showcase 页面/API 的构建输入；继续保留 `showcase` 用户名保留字，保证动态 `/<username>` 不会重新占用旧地址。

- [ ] **Step 1: 写退役失败测试**

```ts
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { WORKSPACE_RESERVED_SLUGS } from "@/lib/domains";

const root = process.cwd();
const retiredPaths = [
  "src/app/showcase",
  "src/app/api/showcase",
  "src/app/jeepwork/showcase",
  "src/app/jeepwork/competition-center",
  "src/app/jeepwork/competition-ai-debug",
  "src/app/api/jeepwork/showcase",
  "src/app/api/jeepwork/competition-center",
  "src/app/api/jeepwork/competition-ai-debug",
  "src/app/api/jeepwork/competition-files",
  "src/components/showcase",
  "src/lib/showcase.ts",
  "src/lib/showcase-config.ts",
  "src/lib/showcase-v2.ts",
  "src/lib/showcase-v2-shared.ts",
];

describe("showcase retirement", () => {
  test.each(retiredPaths)("%s is absent", (relativePath) => {
    expect(existsSync(path.join(root, relativePath))).toBe(false);
  });

  test("active discovery surfaces do not publish the retired route", () => {
    const active = [
      "src/app/sitemap.ts",
      "src/app/robots.ts",
      "src/app/jeepwork/page.tsx",
      "src/lib/jeepwork-navigation.ts",
      "src/lib/admin-governance/permissions.ts",
    ].map((file) => readFileSync(path.join(root, file), "utf8")).join("\n");
    expect(active).not.toMatch(/\/showcase|competition-center|competition-ai-debug/);
  });

  test("the retired public slug remains reserved", () => {
    expect(WORKSPACE_RESERVED_SLUGS.has("showcase")).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试并确认因现役文件存在而失败**

Run: `npm test -- tests/showcase-retirement.test.ts --runInBand`

Expected: FAIL，至少报告 `src/app/showcase` 仍存在。

- [ ] **Step 3: 删除 Showcase 路由、专属 UI、专属服务和旧反向测试**

使用 `apply_patch` 删除文件结构清单中的源码和 `tests/showcase-admin-closeout.test.ts`。不要删除以下内容：

```text
prisma/schema.prisma 中 Showcase* / CompetitionFile 模型
prisma/migrations/20260624_add_showcase_v2/migration.sql
uploads/competition-files/**
src/lib/admin-audit-log.ts 中历史 action 常量
src/app/jeepwork/audit/page.tsx 中历史 action 中文标签
src/lib/domains.ts 和 src/app/api/auth/username/route.ts 中的 showcase 保留字
```

- [ ] **Step 4: 清理现役发现入口和专属预算代码**

在 `src/app/sitemap.ts` 删除 `${appUrl}/showcase` 项；在 `src/app/robots.ts` 的三个 `allow` 数组中删除 `"/showcase"`。从 `JEEPWORK_NAV_GROUPS` 删除整个 `external-showcase` 组，从 Jeepwork 首页删除 `/jeepwork/showcase` 卡片和 `/showcase 当前状态` 占位，从治理权限允许列表删除比赛中心路径。

从 `AIUsageType` 删除：

```ts
| "showcase_demo"
```

并把未登录守卫恢复为所有用量类型统一拒绝。删除 `src/lib/observability/ai-metrics.ts` 中 `SHOWCASE_DEMO_BUDGET`、`ShowcaseBudgetState`、`showcaseBudget`、`assertShowcaseDemoBudget`、`consumeShowcaseDemoBudget` 和 `getShowcaseDemoBudgetSnapshot`；其他 AI 指标保持不变。

- [ ] **Step 5: 运行退役测试和旧符号检查**

Run: `npm test -- tests/showcase-retirement.test.ts tests/domains.test.ts tests/console-navigation.test.ts tests/jeepwork-visible-routes.test.ts --runInBand`

Expected: PASS。

Run: `rg -n '/showcase|api/showcase|competition-center|competition-ai-debug|showcase_demo' src tests -g '*.ts' -g '*.tsx' -g '!src/generated/**'`

Expected: 只允许用户名保留字、历史审计标签或明确的退役测试断言；不存在路由、导航、fetch 或 import。

- [ ] **Step 6: 提交退役变更**

```bash
git add -u -- src/app/showcase src/app/api/showcase src/app/jeepwork/showcase src/app/jeepwork/competition-center src/app/jeepwork/competition-ai-debug src/app/api/jeepwork/showcase src/app/api/jeepwork/competition-center src/app/api/jeepwork/competition-ai-debug src/app/api/jeepwork/competition-files src/components/showcase src/lib/showcase.ts src/lib/showcase-config.ts src/lib/showcase-v2.ts src/lib/showcase-v2-shared.ts tests/showcase-admin-closeout.test.ts
git add -- src/app/sitemap.ts src/app/robots.ts src/app/jeepwork/page.tsx src/lib/jeepwork-navigation.ts src/lib/admin-governance/permissions.ts src/lib/ai/entitlement-guard.ts src/lib/observability/ai-metrics.ts tests/showcase-retirement.test.ts
git commit -m "refactor: retire public showcase feature"
```

---

### Task 2: 扩展兼容主题合同并加入六张内置壁纸

**Files:**
- Create: `src/components/theme/wallpapers.ts`
- Create: `public/wallpapers/mist-forest.webp`
- Create: `public/wallpapers/warm-paper.webp`
- Create: `public/wallpapers/jade-gradient.webp`
- Create: `public/wallpapers/sand-dunes.webp`
- Create: `public/wallpapers/blue-mountain.webp`
- Create: `public/wallpapers/ink-leaves.webp`
- Create: `tests/theme-customization.test.ts`
- Modify: `src/components/theme/types.ts`
- Modify: `src/components/theme/normalize.ts`
- Modify: `src/components/theme/presetThemes.ts`

**Interfaces:**
- Consumes: 已存储的 `Profile.customTheme` JSON。
- Produces: `AvatarMode = "portrait" | "logo"`、带默认值的 `CustomTheme.avatarMode`、`BUILT_IN_WALLPAPERS`。

- [ ] **Step 1: 写主题兼容失败测试**

```ts
import { normalizeCustomTheme, validateCustomTheme } from "@/components/theme/normalize";
import { BUILT_IN_WALLPAPERS } from "@/components/theme/wallpapers";

describe("public profile custom theme", () => {
  test("legacy JSON defaults to portrait and accepts zero gaps", () => {
    const result = normalizeCustomTheme(null, JSON.stringify({ moduleGap: 0 }));
    expect(result.avatarMode).toBe("portrait");
    expect(result.moduleGap).toBe(0);
  });

  test("invalid ranges and avatar mode are deterministic", () => {
    const result = validateCustomTheme({
      cardOpacity: 101,
      buttonRadius: -1,
      moduleGap: 40,
      avatarMode: "banner",
    });
    expect(result.sanitized.cardOpacity).toBe(100);
    expect(result.sanitized.buttonRadius).toBe(0);
    expect(result.sanitized.moduleGap).toBe(32);
    expect(result.sanitized.avatarMode).toBe("portrait");
  });

  test("six project-owned wallpapers use local webp paths", () => {
    expect(BUILT_IN_WALLPAPERS).toHaveLength(6);
    for (const item of BUILT_IN_WALLPAPERS) expect(item.src).toMatch(/^\/wallpapers\/[a-z-]+\.webp$/);
  });
});
```

- [ ] **Step 2: 运行测试并确认缺少新合同**

Run: `npm test -- tests/theme-customization.test.ts --runInBand`

Expected: FAIL，报告 `wallpapers` 模块或 `avatarMode` 不存在。

- [ ] **Step 3: 增加主题类型和归一化规则**

在 `types.ts` 增加并写入默认值：

```ts
export type AvatarMode = "portrait" | "logo";

export interface CustomTheme {
  backgroundType: BackgroundType;
  backgroundValue: string;
  textColor: string;
  cardStyle: CardStyle;
  cardOpacity: number;
  buttonStyle: ButtonStyle;
  buttonRadius: number;
  avatarFrame: AvatarFrame;
  avatarMode: AvatarMode;
  moduleGap: number;
}

export const defaultCustomTheme: CustomTheme = {
  backgroundType: "gradient",
  backgroundValue: "linear-gradient(135deg, #DDE8CD 0%, #F7F1E7 100%)",
  textColor: "#2B241E",
  cardStyle: "solid",
  cardOpacity: 100,
  buttonStyle: "solid",
  buttonRadius: 16,
  avatarFrame: "circle",
  avatarMode: "portrait",
  moduleGap: 8,
};
```

在 `normalize.ts` 接受 `portrait|logo`，非法值回退 `portrait`，并把 `moduleGap` 的下限从 8 改为 0。为 `presetThemes.ts` 的全部 `CustomTheme` 对象补 `avatarMode: "portrait"`。

- [ ] **Step 4: 定义壁纸清单**

```ts
export type BuiltInWallpaper = { id: string; label: string; src: string; fallback: string };

export const BUILT_IN_WALLPAPERS: BuiltInWallpaper[] = [
  { id: "mist-forest", label: "晨雾森林", src: "/wallpapers/mist-forest.webp", fallback: "linear-gradient(135deg,#DDE8CD,#F7F1E7)" },
  { id: "warm-paper", label: "暖纸微光", src: "/wallpapers/warm-paper.webp", fallback: "linear-gradient(135deg,#F2E7D8,#FFFDF8)" },
  { id: "jade-gradient", label: "青玉流光", src: "/wallpapers/jade-gradient.webp", fallback: "linear-gradient(135deg,#C7D9C0,#EEF4E7)" },
  { id: "sand-dunes", label: "浅金沙丘", src: "/wallpapers/sand-dunes.webp", fallback: "linear-gradient(135deg,#EAD9BD,#FFF4E5)" },
  { id: "blue-mountain", label: "远山青蓝", src: "/wallpapers/blue-mountain.webp", fallback: "linear-gradient(135deg,#C8D8DD,#EDF3F2)" },
  { id: "ink-leaves", label: "墨绿枝叶", src: "/wallpapers/ink-leaves.webp", fallback: "linear-gradient(135deg,#284737,#DDE8CD)" },
];
```

- [ ] **Step 5: 分别生成六张无文字壁纸**

逐张调用图片生成能力，使用 4:3 横向构图、无 Logo、无人脸、无文字，并分别保存到上面的六个目标路径。六条生成描述固定为：

```text
晨雾森林：soft misty evergreen forest, warm ivory light, subtle depth, premium calm business backdrop, low contrast center
暖纸微光：warm handmade ivory paper texture, soft window light, subtle beige fibers, elegant minimal business backdrop
青玉流光：abstract jade green translucent layers, gentle flowing light, premium Chinese contemporary minimalism
浅金沙丘：minimal pale sand dunes at sunrise, soft warm shadows, quiet spacious composition
远山青蓝：layered distant blue-green mountains in morning haze, restrained ink-wash influence, modern premium backdrop
墨绿枝叶：dark forest green botanical shadows on warm cream, subtle leaves at edges, clear low-detail center
```

每次保存后读取目标图片验证格式可解码；不从视觉参考图裁切。

- [ ] **Step 6: 运行主题测试并提交**

Run: `npm test -- tests/theme-customization.test.ts --runInBand`

Expected: PASS。

```bash
git add src/components/theme/types.ts src/components/theme/normalize.ts src/components/theme/presetThemes.ts src/components/theme/wallpapers.ts public/wallpapers tests/theme-customization.test.ts
git commit -m "feat: add compatible profile theme controls"
```

---

### Task 3: 实现壁纸库、动态范围控件和公开 switch

**Files:**
- Create: `src/components/dashboard-v1/RangeControl.tsx`
- Create: `tests/appearance-panel.test.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tsconfig.test.json`
- Modify: `src/components/dashboard-v1/AppearancePanel.tsx`
- Modify: `src/components/dashboard-v1/DashboardV1Client.tsx`

**Interfaces:**
- Consumes: `BUILT_IN_WALLPAPERS`、`CustomTheme`、现有保存请求。
- Produces: `RangeControl`、`AppearancePreviewState` 和只在保存成功后成为正式状态的公开 switch。

- [ ] **Step 1: 安装并配置 DOM 测试依赖**

Run:

```bash
npm install --save-dev --save-exact jest-environment-jsdom@30.4.1 @testing-library/react@16.3.2 @testing-library/jest-dom@7.0.0 @testing-library/user-event@14.6.1
```

Expected: `package.json` 和 `package-lock.json` 更新且安装成功。

把 `tsconfig.test.json` 的 include 改为：

```json
["tests/**/*.ts", "tests/**/*.tsx", "src/**/*.ts", "src/**/*.tsx"]
```

- [ ] **Step 2: 写范围、壁纸和 switch 失败测试**

```tsx
/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppearancePanel } from "@/components/dashboard-v1/AppearancePanel";

const baseProps = {
  theme: "自然绿",
  template: "business",
  customThemes: [],
  customTheme: null,
  isPublic: true,
  language: "zh",
  contactVisibility: "public",
  saving: false,
  onSave: jest.fn(async () => true),
  onSaveCustom: jest.fn(async () => true),
  onSaveSystem: jest.fn(async () => true),
  onPreviewChange: jest.fn(),
  onUpgrade: jest.fn(),
};

test("custom controls update preview and save exact values", async () => {
  const user = userEvent.setup();
  render(<AppearancePanel {...baseProps} />);
  await user.click(screen.getByRole("button", { name: "自定义" }));
  const opacity = screen.getByRole("slider", { name: "卡片透明度" });
  opacity.focus();
  await user.keyboard("{ArrowLeft}");
  expect(baseProps.onPreviewChange).toHaveBeenCalled();
  expect(screen.getByText("晨雾森林")).toBeInTheDocument();
});

test("public switch keeps the saved state when persistence fails", async () => {
  const user = userEvent.setup();
  const onSaveSystem = jest.fn(async () => false);
  render(<AppearancePanel {...baseProps} onSaveSystem={onSaveSystem} />);
  await user.click(screen.getByRole("button", { name: "系统设置" }));
  await user.click(screen.getByRole("switch", { name: "公开主页" }));
  await user.click(screen.getByRole("button", { name: "保存设置" }));
  expect(screen.getByRole("switch", { name: "公开主页" })).toBeChecked();
});
```

- [ ] **Step 3: 运行测试并确认新交互不存在**

Run: `npm test -- tests/appearance-panel.test.tsx --runInBand`

Expected: FAIL，报告 `onPreviewChange` 或 slider/switch 查询失败。

- [ ] **Step 4: 创建可访问范围控件**

```tsx
type RangeControlProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (value: number) => void;
};

export function RangeControl({ label, value, min, max, unit = "", onChange }: RangeControlProps) {
  return (
    <label className="grid gap-2">
      <span className="flex items-center justify-between text-sm font-black">
        <span>{label}</span><output>{value}{unit}</output>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer accent-[var(--ui-brand)]"
      />
    </label>
  );
}
```

- [ ] **Step 5: 在 AppearancePanel 接入壁纸、三个范围控件和 avatarMode**

为 props 增加：

```ts
export type AppearancePreviewState = {
  themeName: string;
  template: string;
  customTheme: string | null;
};

onPreviewChange: (state: AppearancePreviewState) => void;
```

选择内置壁纸时写入：

```ts
setCustomDraft((current) => validateCustomTheme({
  ...current,
  backgroundType: "image",
  backgroundValue: wallpaper.src,
}));
```

渲染三个 `RangeControl`：

```tsx
<RangeControl label="卡片透明度" value={customDraft.cardOpacity} min={0} max={100} unit="%" onChange={(value) => update("cardOpacity", value)} />
<RangeControl label="按钮圆角" value={customDraft.buttonRadius} min={0} max={32} unit="px" onChange={(value) => update("buttonRadius", value)} />
<RangeControl label="模块间距" value={customDraft.moduleGap} min={0} max={32} unit="px" onChange={(value) => update("moduleGap", value)} />
```

头像模式使用 `portrait|logo` 单选按钮。所有草稿变化调用 `onPreviewChange`，只在 `onSaveCustom` 返回 `true` 时重置 dirty 状态。

- [ ] **Step 6: 用语义 switch 替换 checkbox 并处理保存失败回滚**

```tsx
<button
  type="button"
  role="switch"
  aria-label="公开主页"
  aria-checked={systemDraft.isPublic}
  onClick={() => setSystemDraft((current) => ({ ...current, isPublic: !current.isPublic }))}
  className={`relative h-7 w-12 rounded-full transition-colors duration-200 motion-reduce:transition-none ${systemDraft.isPublic ? "bg-[var(--ui-brand)]" : "bg-[var(--ui-line)]"}`}
>
  <span className={`absolute top-1 size-5 rounded-full bg-white transition-transform duration-200 motion-reduce:transition-none ${systemDraft.isPublic ? "translate-x-6" : "translate-x-1"}`} />
</button>
```

保存系统设置时先保存 `const previous = { isPublic, language, contactVisibility }`；若 `await onSaveSystem(systemDraft)` 返回 `false`，立即 `setSystemDraft(previous)`。

- [ ] **Step 7: 把装修草稿接入同一个 PhonePreview**

在 `DashboardV1Client` 增加 `appearancePreview` state。`activeTab === "appearance"` 时把草稿传给现有 `PhonePreview`，离开该 tab 时回退到 `core.profile` 的已保存值；不得创建第二个预览渲染器。

- [ ] **Step 8: 运行交互测试并提交**

Run: `npm test -- tests/theme-customization.test.ts tests/appearance-panel.test.tsx --runInBand`

Expected: PASS。

```bash
git add package.json package-lock.json tsconfig.test.json src/components/dashboard-v1/RangeControl.tsx src/components/dashboard-v1/AppearancePanel.tsx src/components/dashboard-v1/DashboardV1Client.tsx tests/appearance-panel.test.tsx
git commit -m "feat: add live profile appearance controls"
```

---

### Task 4: 重构唯一公开渲染器为经营主页结构

**Files:**
- Create: `src/components/share/public-profile-types.ts`
- Create: `src/components/share/PublicProfileHero.tsx`
- Create: `src/components/share/PublicContactActions.tsx`
- Create: `src/components/share/PublicModuleList.tsx`
- Create: `tests/public-profile-redesign.test.tsx`
- Delete: `src/components/share/ShareActions.tsx`
- Delete: `src/components/share/QrSharePanel.tsx`
- Modify: `src/components/share/SharePageRenderer.tsx`
- Modify: `src/components/share/SharePageWithContact.tsx`
- Modify: `src/components/PhonePreview.tsx`
- Modify: `src/components/dashboard-v1/DashboardV1Client.tsx`
- Modify: `src/components/public-profile/PublicProfileClientWrapper.tsx`
- Modify: `src/app/[username]/page.tsx`

**Interfaces:**
- Consumes: 现有 Profile/Link/Product DTO、`CustomTheme`、现有模块渲染函数。
- Produces: `PublicProfileRenderMode = "public" | "preview"` 和公开/预览完全共用的身份、联系、模块结构。

- [ ] **Step 1: 写共享结构失败测试**

```tsx
/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { SharePageRenderer } from "@/components/share/SharePageRenderer";

const identity = {
  profileId: "00000000-0000-0000-0000-000000000001",
  username: "owner",
  displayName: "林溪",
  bio: "帮助本地商家把咨询变成可跟进的客户线索",
  avatarUrl: null,
  company: "林溪经营工作室",
  jobTitle: "经营顾问",
  links: [],
};

test("public mode hides empty modules and internal test usernames", () => {
  render(<SharePageRenderer {...identity} renderMode="public" />);
  expect(screen.queryByText("暂无公开内容")).not.toBeInTheDocument();
  expect(screen.queryByText("@owner")).not.toBeInTheDocument();
  expect(screen.getByText("经营顾问 · 林溪经营工作室")).toBeInTheDocument();
});

test("preview mode exposes the owner editing hint", () => {
  render(<SharePageRenderer {...identity} renderMode="preview" />);
  expect(screen.getByText("添加服务、案例或咨询组件")).toBeInTheDocument();
});

test("logo mode does not crop a wide brand mark", () => {
  render(<SharePageRenderer {...identity} avatarUrl="/brand.webp" customTheme={JSON.stringify({ avatarMode: "logo" })} renderMode="public" />);
  expect(screen.getByRole("img", { name: "林溪 的企业标志" })).toHaveClass("object-contain");
});
```

- [ ] **Step 2: 运行测试并确认旧身份卡和空状态不符合规范**

Run: `npm test -- tests/public-profile-redesign.test.tsx --runInBand`

Expected: FAIL，报告 `renderMode`、公开空状态或 Logo 模式不存在。

- [ ] **Step 3: 建立共享渲染类型**

```ts
export type PublicProfileRenderMode = "public" | "preview";

export type PublicProfileIdentity = {
  profileId?: string;
  username: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
  city?: string | null;
  address?: string | null;
  website?: string | null;
  contactVisibility?: string;
};
```

`SharePageRendererProps` 继承 `PublicProfileIdentity` 并增加 `renderMode?: PublicProfileRenderMode`；默认值为 `public`。

- [ ] **Step 4: 实现封面与身份组件**

`PublicProfileHero` 接收 identity、`CustomTheme`、二维码和分享回调。图片主题只应用到 180–220px 封面，正文保持暖米白；`portrait` 使用圆形 `object-cover`，`logo` 使用宽容器 `object-contain`。姓名下只显示 `[jobTitle, company].filter(Boolean).join(" · ")`，不显示 `@username`；bio 为空时公开模式不渲染占位文案。图片背景同时设置本地壁纸清单中的 `fallback`（自定义上传使用正式默认渐变）和 `backgroundImage`，加载失败时仍显示确定性渐变而不是破图。

组件根节点使用：

```tsx
<section className="w-full overflow-hidden bg-[#FFFDF8]">
  <div className="relative min-h-[200px] overflow-hidden" style={coverStyle}>{headerActions}</div>
  <div className="relative -mt-10 px-5 pb-5">{identityBlock}</div>
</section>
```

- [ ] **Step 5: 实现联系动作与模块容器**

`PublicContactActions` 仅当 `contactVisibility === "public"` 时渲染电话、邮件和微信；vCard 始终可用。电话先经过 `sanitizePhoneNumber`，网站先经过 `sanitizePublicUrl`，非法值不渲染可点击动作。

`PublicModuleList` 接口：

```ts
type PublicModuleListProps = {
  renderMode: "public" | "preview";
  gap: number;
  items: Array<{ id: string; node: ReactNode }>;
};
```

公开模式 items 为空时返回 `null`；预览模式显示“添加服务、案例或咨询组件”。模块容器使用 `display: grid` 和 `style={{ gap }}`，保证 `gap = 0` 仍然生效。

- [ ] **Step 6: 让 SharePageRenderer 只编排聚焦组件**

保留现有 `sanitizeHref`、模块 payload 校验和所有真实模块组件，不复制请求逻辑。把每个 link 映射为 `{ id, node }` 交给 `PublicModuleList`，顺序严格使用传入数组；business 模板采用新 Hero，creator/conversion 复用同一身份、空状态和联系规则。

卡片透明度和按钮圆角分别应用为：

```ts
const cardOpacity = Math.max(0, Math.min(100, custom.cardOpacity)) / 100;
const sharedStyle = {
  "--profile-card-opacity": String(cardOpacity),
  "--profile-button-radius": `${custom.buttonRadius}px`,
} as React.CSSProperties;
```

- [ ] **Step 7: 补齐后台预览真实 DTO**

扩展 `PhonePreviewProps` 和调用处，传入 `company`、`jobTitle`、公开 `phone/email/wechat/address/website`、`renderMode="preview"` 和完整 `customTheme`。`DashboardV1Client` 不再使用“阿宝的名片”等演示业务数据覆盖已登录用户数据；空字段保持空，由预览模式显示编辑引导。

`PublicProfileClientWrapper` 只保留 `MobileOptimizer`、预览返回入口和 `SharePageWithContact`：删除固定的 `ShareActions`、失效的第二个 `QrSharePanel` 及其本地 state。二维码和分享弹窗统一由 `SharePageWithContact` 通过 Hero 右上角次要动作打开；随后删除两个无人使用的组件文件。

- [ ] **Step 8: 运行共享渲染测试并提交**

Run: `npm test -- tests/public-profile-redesign.test.tsx tests/profile-module-closeout.test.ts tests/mobile-layout.test.ts --runInBand`

Expected: PASS。

```bash
git add -u -- src/components/share/ShareActions.tsx src/components/share/QrSharePanel.tsx
git add src/components/share/public-profile-types.ts src/components/share/PublicProfileHero.tsx src/components/share/PublicContactActions.tsx src/components/share/PublicModuleList.tsx src/components/share/SharePageRenderer.tsx src/components/share/SharePageWithContact.tsx src/components/PhonePreview.tsx src/components/dashboard-v1/DashboardV1Client.tsx src/components/public-profile/PublicProfileClientWrapper.tsx src/app/[username]/page.tsx tests/public-profile-redesign.test.tsx
git commit -m "feat: rebuild public profile as business homepage"
```

---

### Task 5: 收口 AI 接待、联系表单和唯一吸底主动作

**Files:**
- Create: `src/components/share/PublicProfileStickyAction.tsx`
- Delete: `src/components/share/PublicAiAssistant.tsx`
- Modify: `src/components/share/modules/AiChatModule.tsx`
- Modify: `src/components/share/SharePageRenderer.tsx`
- Modify: `src/components/share/SharePageWithContact.tsx`
- Modify: `tests/public-profile-redesign.test.tsx`
- Modify: `tests/ai-reception-ui-closeout.test.ts`

**Interfaces:**
- Consumes: `/api/public/[username]/ai-reception-config`、`/api/ai/customer-service`、`/api/contact`。
- Produces: `onAvailabilityChange(available: boolean)`、`onOpenContact()` 和唯一的 `PublicProfileStickyAction`。

- [ ] **Step 1: 增加 AI/联系失败测试**

```tsx
import { SharePageWithContact } from "@/components/share/SharePageWithContact";
import userEvent from "@testing-library/user-event";

test("one sticky action changes from contact to AI only after config is available", async () => {
  const publicPropsWithAiLink = {
    profileId: "00000000-0000-0000-0000-000000000001",
    username: "owner",
    displayName: "林溪",
    bio: "帮助本地商家把咨询变成客户线索",
    avatarUrl: null,
    links: [{ id: "ai-1", title: "AI 接待", componentType: "ai-chat", payload: "{}" }],
    themeName: "自然绿",
  };
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    if (String(input).includes("ai-reception-config")) {
      return new Response(JSON.stringify({ success: true, config: { enabled: true, assistantName: "经营助手", welcomeMessage: "您好", quickActions: [], allowReport: true } }), { status: 200 });
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }) as jest.Mock;
  render(<SharePageWithContact {...publicPropsWithAiLink} />);
  expect(screen.getAllByRole("button", { name: /开始咨询|联系我/ })).toHaveLength(1);
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "开始咨询" }));
  expect(screen.getByRole("textbox", { name: "AI 咨询问题" })).toHaveFocus();
});

test("AI config failure leaves contact as the only primary action", async () => {
  const publicPropsWithAiLink = {
    profileId: "00000000-0000-0000-0000-000000000001",
    username: "owner",
    displayName: "林溪",
    bio: null,
    avatarUrl: null,
    links: [{ id: "ai-1", title: "AI 接待", componentType: "ai-chat", payload: "{}" }],
    themeName: "自然绿",
  };
  global.fetch = jest.fn(async () => new Response(JSON.stringify({ success: false, error: "AI 接待暂未开启。" }), { status: 404 })) as jest.Mock;
  render(<SharePageWithContact {...publicPropsWithAiLink} />);
  expect(await screen.findByRole("button", { name: "联系我" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "开始咨询" })).not.toBeInTheDocument();
});

test("contact failure keeps input and Escape closes the dialog", async () => {
  const user = userEvent.setup();
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    if (String(input).endsWith("/api/contact")) return new Response(JSON.stringify({ success: false, error: "服务暂时不可用" }), { status: 503 });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }) as jest.Mock;
  render(<SharePageWithContact profileId="00000000-0000-0000-0000-000000000001" username="owner" displayName="林溪" bio={null} avatarUrl={null} links={[]} themeName="自然绿" />);
  await user.click(screen.getByRole("button", { name: "联系我" }));
  await user.type(screen.getByRole("textbox", { name: "姓名" }), "陈先生");
  await user.type(screen.getByRole("textbox", { name: "邮箱、电话或微信" }), "13800138000");
  await user.click(screen.getByRole("button", { name: "提交联系信息" }));
  expect(await screen.findByText("服务暂时不可用")).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "姓名" })).toHaveValue("陈先生");
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试并确认当前多悬浮按钮失败**

Run: `npm test -- tests/public-profile-redesign.test.tsx --runInBand`

Expected: FAIL，当前页面同时存在联系按钮和 AI 浮动入口。

- [ ] **Step 3: 让内嵌 AiChatModule 上报真实可用状态**

为 `AiChatModule` 增加：

```ts
type Props = {
  username: string;
  mode?: "customer-service" | "sales-agent";
  onAvailabilityChange?: (available: boolean) => void;
  onOpenContact?: () => void;
};
```

配置成功且 `config.enabled` 时调用 `onAvailabilityChange?.(true)`；404、403、503、网络错误和卸载时调用 `false`。输入框增加 `aria-label="AI 咨询问题"` 和 `data-ai-reception-input={username}`。不可用状态和聊天 footer 都提供调用 `onOpenContact` 的“联系本人”按钮；额度不足、Provider 失败和网络失败只显示真实错误，不伪造回复或扣点成功。

- [ ] **Step 4: 创建唯一吸底动作**

```tsx
export function PublicProfileStickyAction({ kind, onClick }: {
  kind: "ai" | "contact";
  onClick: () => void;
}) {
  const label = kind === "ai" ? "开始咨询" : "联系我";
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E8DCCB] bg-[#FFFDF8]/95 p-3 backdrop-blur safe-area-pb">
      <button type="button" onClick={onClick} aria-label={label} className="mx-auto flex min-h-12 w-full max-w-md items-center justify-center rounded-[var(--profile-button-radius,16px)] bg-[#31543D] px-5 text-sm font-black text-white">
        {label}
      </button>
    </div>
  );
}
```

- [ ] **Step 5: 删除并行浮动主动作并接入真实降级**

`SharePageWithContact` 删除左侧固定“联系”和默认自动渲染的 `PublicAiAssistant` 浮动按钮。保存 `aiAvailable` state：只有存在 `ai-chat` link 且 `AiChatModule` 上报 `true` 时 sticky kind 为 `ai`；点击后执行：

```ts
document.querySelector<HTMLInputElement>(`[data-ai-reception-input="${props.username}"]`)?.focus();
```

其余状态一律 kind 为 `contact` 并打开现有 `ContactForm`。删除没有合法可用条件、重复维护会话状态的 `PublicAiAssistant.tsx`，确保公开页只有内嵌 `AiChatModule` 一套 AI 请求逻辑。

更新 `tests/ai-reception-ui-closeout.test.ts`：公共聊天应包含 `onOpenContact` 和“联系本人”，但仍不得包含伪造的 `transferredToHuman` 状态；renderer 断言改为检查 `AiChatModule` 同时接收 `username`、`onAvailabilityChange` 和 `onOpenContact`。

- [ ] **Step 6: 验证 Lead 真实落库合同不退化**

Run: `npm test -- tests/public-profile-redesign.test.tsx tests/profile-module-closeout.test.ts tests/ai-reception-ui-closeout.test.ts tests/ai-reception-api-closeout.test.ts --runInBand`

Expected: PASS，`/api/contact` 成功仍要求真实 `leadId`，AI 失败仍安全降级。

- [ ] **Step 7: 提交 AI/联系收口**

```bash
git add -u -- src/components/share/PublicAiAssistant.tsx
git add src/components/share/PublicProfileStickyAction.tsx src/components/share/modules/AiChatModule.tsx src/components/share/SharePageRenderer.tsx src/components/share/SharePageWithContact.tsx tests/public-profile-redesign.test.tsx tests/ai-reception-ui-closeout.test.ts
git commit -m "feat: unify public AI and contact actions"
```

---

### Task 6: 补齐头像审核记录、后台复核同步和公开隐藏

**Files:**
- Create: `src/lib/public-avatar.ts`
- Create: `tests/avatar-moderation-closeout.test.ts`
- Modify: `src/app/api/dashboard/avatar/route.ts`
- Modify: `src/app/api/jeepwork/moderation/route.ts`
- Modify: `src/app/[username]/page.tsx`
- Modify: `src/components/dashboard-v1/types.ts`
- Modify: `src/lib/dashboard-data.ts`
- Modify: `src/components/dashboard-v1/ProfilePanel.tsx`
- Modify: `src/components/dashboard-v1/DashboardV1Client.tsx`

**Interfaces:**
- Consumes: `Profile.avatarModerationStatus`、`ContentModerationRecord(contentType="avatar", contentRef=profile.id)`。
- Produces: `resolvePublicAvatarUrl(input): string | null`，以及审核记录和 Profile 状态的事务同步。

- [ ] **Step 1: 写纯函数和事务失败测试**

```ts
import { resolvePublicAvatarUrl } from "@/lib/public-avatar";
import { readFileSync } from "node:fs";
import path from "node:path";

test.each(["pending", "pending_manual_review", "rejected"])("%s avatar is hidden", (status) => {
  expect(resolvePublicAvatarUrl({ avatarUrl: "/api/avatar/owner", avatarModerationStatus: status, updatedAt: new Date("2026-07-23T00:00:00Z") })).toBeNull();
});

test.each(["approved", "legacy_approved"])("%s avatar is public", (status) => {
  expect(resolvePublicAvatarUrl({ avatarUrl: "/api/avatar/owner", avatarModerationStatus: status, updatedAt: new Date("2026-07-23T00:00:00Z") })).toContain("/api/avatar/owner?");
});

test("avatar upload and admin review declare paired transaction writes", () => {
  const upload = readFileSync(path.join(process.cwd(), "src/app/api/dashboard/avatar/route.ts"), "utf8");
  const review = readFileSync(path.join(process.cwd(), "src/app/api/jeepwork/moderation/route.ts"), "utf8");
  expect(upload).toContain("db.$transaction");
  expect(upload).toContain("tx.profile.update");
  expect(upload).toContain("tx.contentModerationRecord.upsert");
  expect(review).toContain("tx.contentModerationRecord.update");
  expect(review).toContain("tx.profile.update");
  expect(review).toContain("revalidatePublicProfileByUser");
});
```

- [ ] **Step 2: 运行测试并确认上传没有审核记录**

Run: `npm test -- tests/avatar-moderation-closeout.test.ts --runInBand`

Expected: FAIL，报告 `public-avatar` 不存在或未调用 `contentModerationRecord.upsert`。

- [ ] **Step 3: 实现公开头像纯函数**

```ts
const PUBLIC_AVATAR_STATUSES = new Set(["approved", "legacy_approved"]);

export function resolvePublicAvatarUrl(input: {
  avatarUrl: string | null;
  avatarModerationStatus: string | null;
  updatedAt: Date;
}) {
  if (!input.avatarUrl || !PUBLIC_AVATAR_STATUSES.has(input.avatarModerationStatus || "")) return null;
  return `${input.avatarUrl.split("?")[0]}?v=${input.updatedAt.getTime()}`;
}
```

`src/app/[username]/page.tsx` 的 metadata 和页面正文都调用此函数，不再直接暴露 pending/rejected URL。

- [ ] **Step 4: 上传时事务性写 Profile 和审核记录**

文件成功落盘后执行：

```ts
let moderationResult: Awaited<ReturnType<typeof moderateImageContent>>;
try {
  moderationResult = await moderateImageContent({
    size: file.size,
    mimeType: detectedMime,
    fileName: originalName,
  });
} catch {
  moderationResult = {
    ok: false,
    status: "pending_manual_review",
    reason: "待配置验证",
    provider: "local",
  };
}
const moderationStatus = moderationResult.status;
if (moderationStatus === "rejected") {
  return NextResponse.json({ success: false, error: "该图片未能通过内容安全审核，请更换其他图片。" }, { status: 400 });
}

const updatedProfile = await db.$transaction(async (tx) => {
  const updated = await tx.profile.update({
    where: { id: profile.id },
    data: { avatarUrl, avatarModerationStatus: moderationStatus },
  });
  await tx.contentModerationRecord.upsert({
    where: { contentType_contentRef: { contentType: "avatar", contentRef: profile.id } },
    create: {
      id: crypto.randomUUID(),
      contentType: "avatar",
      contentRef: profile.id,
      status: moderationStatus,
      riskLevel: moderationResult.riskLevel || null,
      reason: moderationResult.reason || (moderationStatus === "pending_manual_review" ? "待配置验证" : null),
      provider: moderationResult.provider || "local",
    },
    update: {
      status: moderationStatus,
      riskLevel: moderationResult.riskLevel || null,
      reason: moderationResult.reason || (moderationStatus === "pending_manual_review" ? "待配置验证" : null),
      provider: moderationResult.provider || "local",
      reviewedAt: null,
      reviewerId: null,
    },
  });
  return updated;
});
```

保留现有文件回滚和旧头像清理逻辑。

- [ ] **Step 5: 管理员复核时事务同步 Profile**

先读取记录；当 `contentType === "avatar"` 时把 `contentRef` 当 profile id。在一个 transaction 中更新审核记录和 `Profile.avatarModerationStatus`，返回 `profile.userId` 后调用 `revalidatePublicProfileByUser(userId)`。非 avatar 记录沿用现有更新路径。

```ts
const current = await db.contentModerationRecord.findUnique({ where: { id: body.id } });
if (!current) return NextResponse.json({ success: false, error: "审核记录不存在" }, { status: 404 });

const result = await db.$transaction(async (tx) => {
  const record = await tx.contentModerationRecord.update({
    where: { id: body.id },
    data: { status: body.status, reason: body.reason || null, reviewedAt: new Date(), reviewerId: admin?.id || null },
  });
  if (record.contentType !== "avatar") return { record, userId: null as string | null };
  const profile = await tx.profile.update({
    where: { id: record.contentRef },
    data: { avatarModerationStatus: body.status },
    select: { userId: true },
  });
  return { record, userId: profile.userId };
});
if (result.userId) await revalidatePublicProfileByUser(result.userId);
```

在 `DashboardProfile` 和 `toProfileDto` 增加 `avatar_moderation_status`。`ProfilePanel` 显示“已通过 / 待人工审核（待配置验证）/ 未通过”，并把旧“上传成功后会立即同步到公开主页”改为“审核通过后公开展示”。`DashboardV1Client` 只有在状态为 `approved|legacy_approved` 时把头像传给 `PhonePreview`，因此预览与公开页都不会暴露待审核原图。

- [ ] **Step 6: 运行审核和媒体测试并提交**

Run: `npm test -- tests/avatar-moderation-closeout.test.ts tests/media-lifecycle.test.ts tests/security-closeout.test.ts --runInBand`

Expected: PASS。

```bash
git add src/lib/public-avatar.ts src/lib/dashboard-data.ts src/components/dashboard-v1/types.ts src/components/dashboard-v1/ProfilePanel.tsx src/components/dashboard-v1/DashboardV1Client.tsx src/app/api/dashboard/avatar/route.ts src/app/api/jeepwork/moderation/route.ts src/app/[username]/page.tsx tests/avatar-moderation-closeout.test.ts
git commit -m "fix: close avatar moderation lifecycle"
```

---

### Task 7: 修复后台三栏、重复保存状态和手机导航

**Files:**
- Modify: `src/components/dashboard-v1/DashboardFrame.tsx`
- Modify: `tests/mobile-layout.test.ts`

**Interfaces:**
- Consumes: `DashboardFrame` 现有 props 和 `SaveState`。
- Produces: 224px 导航、弹性中栏、350–370px 预览栏；每个断点只显示一个保存状态。

- [ ] **Step 1: 增加布局失败断言**

在 `tests/mobile-layout.test.ts` 增加：

```ts
test("dashboard has one save status and non-wrapping mobile labels", () => {
  const source = read("src/components/dashboard-v1/DashboardFrame.tsx");
  expect((source.match(/<SaveStatus/g) || [])).toHaveLength(1);
  expect(source).toContain("whitespace-nowrap");
  expect(source).toContain("minmax(0,1fr)");
  expect(source).toContain("224px");
});
```

- [ ] **Step 2: 运行测试并确认重复状态失败**

Run: `npm test -- tests/mobile-layout.test.ts --runInBand`

Expected: FAIL，当前源码包含两个 `<SaveStatus`。

- [ ] **Step 3: 修复 DashboardFrame**

把 `SaveStatus` 改为单个响应式实例，文字在手机和桌面都来自同一 config。三栏网格使用：

```tsx
<div className={`ui-admin-container grid gap-5 py-5 lg:gap-6 lg:py-7 ${previewOpen ? "lg:grid-cols-[224px_minmax(0,1fr)_minmax(350px,370px)]" : "lg:grid-cols-[224px_minmax(0,1fr)_44px]"}`}>
```

中栏保持 `min-w-0`，侧栏按钮文字使用 `truncate`。手机导航每个 label 包在 `<span className="whitespace-nowrap leading-none">`，按钮使用 `min-w-0 flex-1 px-1`，避免 360px 宽度互相挤压。

- [ ] **Step 4: 运行布局测试并提交**

Run: `npm test -- tests/mobile-layout.test.ts tests/console-navigation.test.ts --runInBand`

Expected: PASS。

```bash
git add src/components/dashboard-v1/DashboardFrame.tsx tests/mobile-layout.test.ts
git commit -m "fix: stabilize dashboard responsive layout"
```

---

### Task 8: 完成视觉验收、全量门禁和知识收口

**Files:**
- Create: `docs/superpowers/reports/2026-07-23-public-profile-design-qa.md`

**Interfaces:**
- Consumes: 已选视觉参考 `docs/superpowers/assets/2026-07-23-public-profile-ai-reception-reference.png`。
- Produces: 可复核的响应式截图结论和全部仓库门禁结果。

- [ ] **Step 1: 启动本地应用并准备真实测试数据**

Run: `npm run dev`

Expected: 本地开发服务器启动，无编译错误。使用现有测试账号创建一个公开 Profile：已批准头像、职位/企业、一句业务价值、公开电话/微信、第一位 `ai-chat` 模块和至少一个服务模块；不写伪造生产数据。

- [ ] **Step 2: 验证 390×844 公开页**

在浏览器设置 390×844，检查并记录：封面 180–220px、身份无悬浮白卡、首屏可见 AI 接待、只有一个 sticky CTA、无“暂无公开内容”、Logo 模式不裁切、AI 失败可转联系。与视觉参考逐项比对。

同时验证退役地址：

```powershell
curl.exe -s -o NUL -w "%{http_code}" http://localhost:3000/showcase
curl.exe -s -o NUL -w "%{http_code}" http://localhost:3000/showcase/judge
curl.exe -s -o NUL -w "%{http_code}" http://localhost:3000/showcase/investor
curl.exe -s -o NUL -w "%{http_code}" http://localhost:3000/showcase/government
curl.exe -s -o NUL -w "%{http_code}" http://localhost:3000/api/showcase/content
```

Expected: 五条命令都输出 `404`。

- [ ] **Step 3: 验证后台和响应式断点**

在 1440×1024 检查 224px 导航、中栏不被覆盖、350–370px 预览、一个保存状态、壁纸与 slider 实时预览；在 360、390、768px 检查底部导航不换行、无横向滚动和控制台错误。

- [ ] **Step 4: 写设计 QA 凭证**

报告必须使用以下结构，并只在全部检查真实通过后填写 `final result: passed`：

```md
# Public Profile Design QA — 2026-07-23

- reference: `docs/superpowers/assets/2026-07-23-public-profile-ai-reception-reference.png`
- public viewport: 390x844
- dashboard viewport: 1440x1024
- responsive viewports: 360px, 390px, 768px
- showcase routes: standard 404
- console errors: none
- broken images: none
- duplicate primary CTA: none
- pending third-party checks: 图片自动审核未配置时保持 pending_manual_review（待配置验证）

final result: passed
```

- [ ] **Step 5: 运行全部规定门禁**

依次运行，任何一步失败都修复根因后从该步重新执行：

```bash
npx prisma validate
npx prisma generate
npm run lint
npm run typecheck
npm test -- --runInBand
npm run build
git diff --check
```

Expected: 全部退出码为 0；构建路由清单中没有 `/showcase`、`/showcase/judge`、`/showcase/investor`、`/showcase/government` 或 `/api/showcase/*`。

- [ ] **Step 6: 提交 QA 与最终修正**

```bash
git add docs/superpowers/reports/2026-07-23-public-profile-design-qa.md
git diff --cached --check
git commit -m "test: verify public profile redesign closeout"
```

- [ ] **Step 7: 最终工作区审计**

Run: `git status --short --branch`

Expected: 只允许用户原有的 `next-env.d.ts` 修改；如有其他文件，逐个判断并报告，不覆盖、不清理用户改动。
