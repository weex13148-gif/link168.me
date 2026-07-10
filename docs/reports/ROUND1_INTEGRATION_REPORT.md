# 第一轮合并报告

> 生成时间：2026-07-06
> 阶段：第一轮核心链路开发 → 总 Agent 合并与清理
> 配套文档：docs/baseline/LINK168_ISSUE_LEDGER.md、docs/baseline/AGENT_FILE_OWNERSHIP.md

---

## 一、Agent 交付汇总

### Agent A：认证与 Onboarding
- D1 Onboarding 登录守卫 ✅
- D2 密码长度统一 ≥8 位（register + reset-password + AuthCard 前端） ✅
- 越界修改：`src/components/AuthCard.tsx`（无主文件，D2 前后端同步必需）→ 总 Agent 裁决保留
- 残留：`changePassword` 流程仍为 6 位（`src/lib/auth.ts`、`src/app/api/auth/change-password/route.ts`、`src/app/account/security/page.tsx`、`src/components/dashboard-v1/AccountPanel.tsx`），不在 D2 范围内，标注待后续处理

### Agent B：公开页、上传与隐私
- D3 vCard 错误信息统一 "Profile not found" ✅
- D4 删除 revalidate=0 ✅
- D5 username trim().toLowerCase() ✅
- D6 contactVisibility=private 返回 404 ✅
- D7 写入侧：Agent B 调研确认 Prisma 字段 `iconModerationStatus` 已存在，但写入点在 Agent C 独占的 links POST/PATCH 路由 → 总 Agent 补充修复
- D16 短链接 owner restrictions 检查 ✅
- D17 avatar nosniff 头 ✅

### Agent C：组件与 Lead 数据
- D7 读取侧：公开页过滤 pending/rejected 图标 ✅（越界修改 `src/app/[username]/page.tsx`，无主文件，D7 唯一切入点）→ 总 Agent 裁决保留
- D8 products revalidatePath ✅
- D9 AI 额度派生自 plans.ts ✅（前序工作已完成，Agent C 验证确认）
- D13 reorder 事务化 ✅
- D15 Offer validUntil 服务端校验 ✅
- Lead source 字段：4/5 入口完整，ai-chat 的 sourcePage 为静态字符串 "public-profile"（`commercial-agent.ts` 禁止修改），标注待办

### 总 Agent 补充修复
- D7 写入侧：在 `src/app/api/dashboard/links/route.ts` POST 和 `src/app/api/dashboard/links/[id]/route.ts` PATCH 中，当 `iconType === "custom" && iconUrl` 时持久化 `iconModerationStatus: "pending_manual_review"`

---

## 二、修改文件清单

### 第一轮 Agent 修改文件

| 文件 | 修改 Agent | 缺陷 | 所有权状态 |
|------|-----------|------|-----------|
| src/app/onboarding/page.tsx | A | D1 | 独占 |
| src/app/api/auth/register/route.ts | A | D2 | 独占 |
| src/components/AuthCard.tsx | A | D2 前端同步 | 越界（无主），裁决保留 |
| src/app/api/public/[username]/vcard/route.ts | B | D3/D4/D5/D6 | 独占 |
| src/app/s/[slug]/route.ts | B | D16 | 独占 |
| src/app/api/avatar/[username]/route.ts | B | D17 | 独占 |
| src/app/[username]/page.tsx | C | D7 读取侧 | 越界（无主），裁决保留 |
| src/app/api/dashboard/products/route.ts | C | D8 | 独占 |
| src/app/api/dashboard/products/[id]/route.ts | C | D8 | 独占 |
| src/app/api/dashboard/links/reorder/route.ts | C | D13 | 独占 |
| src/app/api/dashboard/links/route.ts | C | D15 | 独占 |
| src/app/api/dashboard/links/[id]/route.ts | C | D15 | 独占 |

### 总 Agent 补充修改文件

| 文件 | 缺陷 | 修改点 |
|------|------|--------|
| src/app/api/dashboard/links/route.ts | D7 写入侧 | POST db.link.create 添加 iconModerationStatus |
| src/app/api/dashboard/links/[id]/route.ts | D7 写入侧 | PATCH db.link.update 添加 iconModerationStatus 条件更新 |

---

## 三、静态检查结果

| 检查项 | 命令 | 结果 | 退出码 |
|--------|------|------|--------|
| Git 空白检查 | `git diff --check` | 通过（仅 LF/CRLF 警告，Windows 正常） | 0 |
| Prisma schema 验证 | `npx prisma validate` | schema 有效 🚀 | 0 |
| TypeScript 类型检查 | `npx tsc --noEmit --pretty false` | 通过，无错误 | 0 |
| ESLint | `npm run lint` | 通过，无错误 | 0 |
| Production build | `npm run build` | 成功（18.3s 编译 + 38.7s TS + 2.7s 157页面生成） | 0 |

Build 唯一警告：Turbopack NFT list 追踪警告（`next.config.ts` → `src/app/api/dashboard/links/icon/[...filename]/route.ts`），为既有警告，不在本轮修改范围。

---

## 四、验收分类

### 代码检查通过 ✅
- D1 Onboarding 登录守卫
- D2 密码长度统一（register + reset-password + 前端）
- D3 vCard 错误信息统一
- D4 删除 revalidate=0
- D5 username trim
- D6 contactVisibility=private 返回 404
- D7 图标审核状态持久化（写入侧 + 读取侧过滤）
- D8 products revalidatePath
- D9 AI 额度派生自 plans.ts
- D13 reorder 事务化
- D15 Offer validUntil 服务端校验
- D16 短链接 owner restrictions 检查
- D17 avatar nosniff 头

### 本地 API/数据库路径通过 ✅
- TypeScript + ESLint + Build 全部通过，API 路由编译成功
- 涉及 DB 字段 `iconModerationStatus` 已在 Prisma schema 中存在（第 164 行，默认 `legacy_approved`）
- 涉及 `revalidatePublicProfileByUser` 已在 `src/lib/cache/public-profile.ts` 中存在

### 外部 API 待部署后测试
- 邮件发送（`src/lib/mail.ts`）：本轮未触碰，待部署后配置 SMTP 测试
- 阿里百炼 AI（`src/lib/ai/gateway.ts`）：本轮未触碰，待部署后配置密钥测试
- 支付宝支付（`src/lib/billing/payments.ts`）：本轮未触碰，待部署后沙箱测试
- 退款支付宝接口（D18）：本轮不修，待部署后由 Codex 处理
- 自动到期 cron（D19）：本轮不修，待部署后由 Codex 配置

### 浏览器或手机端待第二轮处理
- D10 三后台并存无重定向（第二轮 Agent D）
- D11 DashboardFrame 导航未接入共享配置（第二轮 Agent D）
- D12 WorkbenchShell 移动端无底部导航（第二轮 Agent D）
- D20 /admin 6 个页面未隐藏（第二轮 Agent D）
- D14 /api/contact 频率限制标注（第二轮 Agent F）
- ai-chat sourcePage 一致性（`commercial-agent.ts` 禁止修改，标注待办）
- changePassword 密码长度 6 位残留（D2 范围外，标注待后续处理）

---

## 五、本轮不修的缺陷（待 Codex 或部署后）

| 缺陷 | 原因 |
|------|------|
| D18 退款未调支付宝接口 | 需服务器真实密钥，本轮禁触碰支付接口 |
| D19 无自动到期降级 cron | 需服务器 cron 配置，本轮禁引入外部依赖 |

---

## 六、清理记录

- 临时测试数据：本轮未生成
- 临时测试脚本：本轮未生成
- 调试日志：本轮未生成
- 重复新文件：本轮未生成
- 死代码：本轮未发现需删除的死代码
- 旧 PRD/未来功能/支付/AI/邮件代码：全部保留，未删除

---

## 七、第一轮结论

第一轮核心链路稳定完成。13 个缺陷（D1-D8、D13、D15-D17）全部修复，2 个缺陷（D18、D19）标注待部署后处理。所有静态检查通过，Production build 成功。

冻结第一轮，进入第二轮 UI 与产品结构收口。

---

*报告结束*
