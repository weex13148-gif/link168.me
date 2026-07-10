# P3 优化项实施规划

> 状态：待确认 | 生成时间：2026-07-09

---

## 实施优先级排序（建议顺序）

按 **风险从低到高 + 收益从高到低** 排序，便于你逐项确认：

| 序号 | 优化项 | 风险 | 工作量 | 收益 |
|------|--------|------|--------|------|
| 1 | AI Chat 消息上限控制 | 极低 | 0.5h | 防止长会话内存溢出 |
| 2 | AI Chat 消息虚拟滚动 | 低 | 1h | 消息多时不卡顿 |
| 3 | Dashboard 数据分层加载 | 中 | 2h | 首屏加载更快 |
| 4 | 头像响应式优化 | 低 | 1.5h | 移动端流量减少 |
| 5 | SharePageRenderer 模块懒加载 | 中 | 2h | 首屏 JS 减少 |
| 6 | 公开名片页 ISR 缓存 | 高 | 3h | TTFB 大幅降低 |
| 7 | Web Vitals 监控接入 | 低 | 2h | 可量化性能基线 |

---

## 逐项方案

---

### 1. AI Chat 消息上限控制

**问题**：`messages` 数组无上限增长，长对话时 `history.slice(-20)` 每次都要遍历整个数组。

**目标**：内存中最多保留 100 条消息，超出时自动丢弃最旧的。

**改动文件**：
- `src/components/ai/AiChatClient.tsx`

**实施方案**：
```tsx
// 发送消息后截断
setMessages((prev) => {
  const next = [...prev, userMsg];
  return next.length > 100 ? next.slice(-100) : next;
});

// 同理在接收 assistant 消息时也要截断
```

**风险**：无。旧消息从内存丢弃后，如需查看完整历史，可通过"加载历史会话"重新从服务端拉取（已有该功能）。

**回滚**：单文件修改，直接 revert 即可。

---

### 2. AI Chat 消息虚拟滚动

**问题**：消息数量 > 50 时，DOM 节点过多导致渲染卡顿。

**目标**：只渲染可视区域消息，DOM 节点恒定。

**改动文件**：
- `src/components/ai/AiChatClient.tsx`

**实施方案**：
引入 `react-window`（已存在项目中或可用 `npm install react-window @types/react-window`）：

```tsx
import { VariableSizeList as List } from 'react-window';

// 用 VariableSizeList 替代原生的消息 map 渲染
// 根据消息内容长度动态计算每行高度
```

**替代方案**（零依赖，推荐）：
不用引入新库，自己实现一个简单的"窗口渲染"：
```tsx
const VISIBLE_COUNT = 25;
const BUFFER = 10;

// 只渲染 visibleStart ~ visibleEnd 范围内的消息
const visibleMessages = messages.slice(
  Math.max(0, messages.length - VISIBLE_COUNT - BUFFER),
  messages.length
);
```
> 因为 AI Chat 是底部追加的，不需要中间滚动，只需控制总 DOM 数即可。这个方案更轻量。

**风险**：低。需确保滚动到底部逻辑仍然有效。

**回滚**：移除切片逻辑，恢复全量渲染。

---

### 3. Dashboard 数据分层加载

**问题**：`core.load()` 一次性串行加载 dashboard + plan，plan 接口阻塞了核心 UI 渲染。

**目标**：先渲染用户资料和链接（核心 UI），plan 权益后台静默加载。

**改动文件**：
- `src/components/dashboard-v1/core-store.ts`
- `src/components/dashboard-v1/DashboardV1Client.tsx`（可能需调整 loading 状态）

**实施方案**：

**Step A**：拆分 `load()` 为两个独立方法
```ts
// core-store.ts
const loadCore = useCallback(async () => {
  setLoading(true);
  // 只加载 dashboard（profile + links）
  const dashboard = await fetchDashboard();
  // ... 设置 profile, user, links
  setLoading(false); // 核心数据就绪，UI 可渲染
}, [...]);

const loadPlan = useCallback(async () => {
  // 后台加载，不阻塞 loading 状态
  const plan = await fetchPlan();
  if (plan.ok) setPlanEntitlements(plan.data);
}, []);
```

**Step B**：`DashboardV1Client` 中并行触发
```tsx
useEffect(() => {
  void core.loadCore();
  void core.loadPlan(); // 不 await，非阻塞
}, []);
```

**Step C**：plan 未加载完成前，使用 `emptyPlan` 兜底，UI 正常显示。

**风险**：中。需确认 UI 在 plan 未返回前不会因为 `emptyPlan` 而显示错误（如"免费版"标签）。

**回滚**：恢复 `load()` 为单一方法。

---

### 4. 头像响应式优化

**问题**：`ProfilePanel.tsx` 使用原生 `<img>`，无尺寸约束和响应式支持。

**目标**：减少移动端不必要的图片下载流量。

**改动文件**：
- `src/components/dashboard-v1/ProfilePanel.tsx`
- `src/app/[username]/page.tsx`（公开页头像）

**实施方案**：

**方案 A**（简单）：为 `<img>` 添加 `srcset` 和 `sizes`
```tsx
<img
  src={avatarUrl}
  srcSet={`${avatarUrl}?w=128 128w, ${avatarUrl}?w=256 256w`}
  sizes="(max-width: 640px) 96px, 144px"
  loading="lazy"
/>
```
> 前提：avatar API 支持 `?w=` 参数裁剪。当前不支持，需要后端配合。

**方案 B**（推荐，无需后端改动）：
头像上传时已压缩到 512x512，直接控制显示尺寸即可。当前 `ProfilePanel` 中头像显示 `size-24`（96px）和 `xl:size-36`（144px），而上传的是 512px。可以在**上传时生成多尺寸版本**（如 128w / 256w），或**接受当前 512px 在移动端略大但可接受的事实**，改为只优化 `loading="lazy"` 和 `decoding="async"`。

**建议实施**：先加 `loading="lazy"` 和 `decoding="async"`，后续再评估是否需要后端生成多尺寸。

**风险**：低。

---

### 5. SharePageRenderer 模块懒加载

**问题**：所有模块组件（CoverImageModule、CarouselModule、BilibiliVideoModule 等 15+ 个）在页面初始化时全部静态导入，即使名片中没有使用该模块，代码也会被打包到首屏 JS。

**目标**：按模块类型动态加载，减少首屏 JS 体积。

**改动文件**：
- `src/components/share/SharePageRenderer.tsx`

**实施方案**：

用 `React.lazy` + `Suspense` 包装各模块：
```tsx
const CoverImageModule = lazy(() => import('@/components/share/modules/CoverImageModule'));
const CarouselModule = lazy(() => import('@/components/share/modules/CarouselModule'));
// ... 其他模块
```

在 `renderNewModule` 中用 `Suspense` 包裹：
```tsx
<div key={item.id}>
  <Suspense fallback={<ModuleFallback message="加载中..." />}>
    <CoverImageModule payload={...} />
  </Suspense>
</div>
```

**风险**：中。需确保：
- 模块加载时序正确，不出现闪烁
- SSR 环境下 `React.lazy` 行为正常（Next.js 15 支持 `next/dynamic`，更推荐）

**推荐用 `next/dynamic` 替代 `React.lazy`**：
```tsx
import dynamic from 'next/dynamic';

const CoverImageModule = dynamic(() => import('@/components/share/modules/CoverImageModule'));
```

**回滚**：恢复静态导入。

---

### 6. 公开名片页 ISR 缓存

**问题**：`export const dynamic = "force-dynamic"` 导致每次请求都实时 SSR，数据库查询每次都执行。

**目标**：公开名片页（读多写少）使用 ISR，减少服务端渲染耗时。

**改动文件**：
- `src/app/[username]/page.tsx`
- 可能需要新增 API 路由用于主动刷新缓存

**实施方案**：

**Step A**：将 `force-dynamic` 改为 ISR
```tsx
// export const dynamic = "force-dynamic";
export const revalidate = 60; // 60 秒 ISR
export const dynamicParams = true;
```

**Step B**：处理动态数据（restrictions）
当前页面会查询 `getActiveRestrictions` 来判断主页是否被冻结/封禁。ISR 缓存后，用户被封禁的状态可能延迟 60 秒才生效。

**方案**：
- **保守方案**：保留 `force-dynamic`，只对 `resolveUsername` 和 `db.profile.findUnique` 使用 `unstable_cache`：
```tsx
import { unstable_cache } from 'next/cache';

const getCachedProfile = unstable_cache(
  async (username: string) => resolveUsername(username),
  ['public-profile'],
  { revalidate: 60 }
);
```
- **激进方案**：全页 ISR，封禁状态延迟 60 秒可接受（管理后台封禁后可通过 `revalidatePath` 主动刷新）。

**建议**：先实施 **保守方案**，风险最小，收益明确。

**风险**：高。如果缓存了被冻结用户的主页，会导致违规内容继续展示。

**回滚**：恢复 `force-dynamic`。

---

### 7. Web Vitals 监控接入

**问题**：无前端性能数据采集，无法量化优化效果。

**目标**：在关键页面采集 LCP、FID、CLS、TTFB。

**改动文件**：
- `src/app/layout.tsx`（或新增 `src/components/performance/VitalsReporter.tsx`）

**实施方案**：

使用 Next.js 内置的 `web-vitals`：
```tsx
// components/performance/VitalsReporter.tsx
'use client';
import { useReportWebVitals } from 'next/web-vitals';

export function VitalsReporter() {
  useReportWebVitals((metric) => {
    // 发送到自有统计端点或控制台
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/analytics/vitals', {
        method: 'POST',
        body: JSON.stringify(metric),
        keepalive: true,
      }).catch(() => {});
    } else {
      console.log('[WebVital]', metric);
    }
  });
  return null;
}
```

在 `layout.tsx` 中挂载：
```tsx
<body>
  <VitalsReporter />
  {children}
</body>
```

**需新增 API**：
- `src/app/api/analytics/vitals/route.ts` —— 接收并存储 vitals 数据到数据库或发送到外部监控（如阿里云 ARMS）。

**风险**：低。仅采集数据，不影响业务逻辑。

**回滚**：移除 `<VitalsReporter />` 组件。

---

## 分批建议

如果你不想一次性全部实施，建议分两批：

**第一批（低风险快收益）**：
- 1. AI Chat 消息上限
- 2. AI Chat 虚拟滚动
- 4. 头像响应式优化
- 7. Web Vitals 监控

**第二批（需测试验证）**：
- 3. Dashboard 数据分层加载
- 5. 模块懒加载
- 6. ISR 缓存

---

## 确认方式

你可以：
1. **全量确认** —— 回复"全部实施"，我按顺序逐个实现
2. **分批确认** —— 回复"先实施第一批"或"先做 1、2、3"
3. **单项确认** —— 回复具体序号，如"先做 6（ISR）"
4. **跳过某项** —— 如"不做 7（监控）"
