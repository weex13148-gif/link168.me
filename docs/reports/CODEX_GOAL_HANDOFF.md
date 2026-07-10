# Codex 目标模式交接文档

> 生成时间：2026-07-06
> 阶段：两轮开发完成 → Codex 目标模式最终检测与修复
> 配套文档：docs/reports/ROUND1_INTEGRATION_REPORT.md、docs/reports/ROUND2_INTEGRATION_REPORT.md、docs/baseline/LINK168_ISSUE_LEDGER.md

---

## 一、两轮已完成能力

### 第一轮：核心业务链路稳定

| 缺陷 | 描述 | 完成状态 |
|------|------|---------|
| D1 | Onboarding 页面登录守卫 | ✅ 未登录访问 /onboarding 重定向 /login?next=/onboarding |
| D2 | 密码长度统一 ≥8 位 | ✅ register + reset-password + AuthCard 前端同步 |
| D3 | vCard 错误信息泄露账号状态 | ✅ 统一返回 "Profile not found" |
| D4 | vCard revalidate=0 与 force-dynamic 叠加 | ✅ 删除 revalidate=0 |
| D5 | vCard username 未 trim() | ✅ 使用 trim().toLowerCase() |
| D6 | vCard contactVisibility=private 不返回 404 | ✅ private 直接返回 404 |
| D7 | 链接图标审核状态持久化 | ✅ 写入侧（links POST/PATCH 持久化 pending_manual_review）+ 读取侧（公开页过滤 pending/rejected） |
| D8 | products CRUD 缺失 revalidatePath | ✅ POST/PUT/DELETE 调用 revalidatePublicProfileByUser |
| D9 | AI 额度 plans.ts 与 permissions.ts 不一致 | ✅ permissions.ts 从 plans.ts 派生（前序工作完成） |
| D13 | reorder 非事务批量更新 | ✅ 使用 db.$transaction |
| D15 | Offer 有效期仅前端校验 | ✅ 服务端校验 validUntil > now |
| D16 | 短链接不检查 owner 冻结/封禁状态 | ✅ 跳转前调用 getActiveRestrictions + canShowPublicProfile |
| D17 | /api/avatar/[username] 缺少 nosniff 头 | ✅ 响应头增加 X-Content-Type-Options: nosniff |

### 第二轮：UI 与产品结构收口

| 缺陷/任务 | 描述 | 完成状态 |
|-----------|------|---------|
| D10 | 三后台并存无重定向 | ✅ /workbench 根页面 redirect /console；/console 唯一首页；/dashboard 唯一装修器 |
| D11 | DashboardFrame 导航未接入共享配置 | ✅ 引用 SHARED_NAV_ITEMS，保留原 primaryItems |
| D12 | WorkbenchShell 移动端无底部导航 | ✅ lg:hidden < 1024px 显示底部 5 项导航 |
| D20 | /admin 6 个页面未隐藏 | ✅ 所有导航中无 /admin 链接，页面保留未删除 |
| UI-1 | 保存状态三态 | ✅ Header 已保存/未保存/保存中/保存失败 |
| UI-2 | 主页公开状态 | ✅ AppearancePanel 绿色/灰色徽章 |
| UI-3 | 公开页入口 | ✅ 分享主页→ShareModal 可达查看/复制/二维码 |
| UI-4 | Onboarding 文案 | ✅ 8 步中文化，无英文占位符 |
| UI-5 | 验证提醒文案 | ✅ 保留 30 天宽限说明 |
| UI-6 | 手机预览入口 | ✅ DashboardFrame 右侧栏"实时预览" |
| UI-7 | 首页四大能力 | ✅ #capabilities 区块突出智能名片/AI接待/线索收集/数据分析 |
| UI-8 | 套餐数据统一 | ✅ 首页/pricing/membership 三处从 plans.ts 读取 |
| UI-9 | 组件分类中文化 | ✅ 9 个分类中文化 |
| UI-10 | 上传/外链区分 | ✅ "上传本地文件"vs"填写外部图片链接" |
| UI-11 | 空状态/错误状态 | ✅ 统一中文 |
| UI-12 | D14 频率限制标注 | ✅ 首页 #contact 标注 3次/60秒 + 5分钟去重 |

---

## 二、未完成问题

### 待 Codex 修复

| 问题 | 说明 | 优先级 |
|------|------|--------|
| changePassword 密码长度 6 位残留 | src/lib/auth.ts changePassword、src/app/api/auth/change-password/route.ts、src/app/account/security/page.tsx、src/components/dashboard-v1/AccountPanel.tsx 仍为 6 位，D2 仅统一了 register/reset-password | 中 |
| ai-chat sourcePage 一致性 | src/lib/ai/commercial-agent.ts 中 sourcePage 为静态字符串 "public-profile"，其他入口为 /{username} | 低 |
| DashboardFrame SaveStatus 图标增强 | 当前为圆点，建议改为 Loader2/Check/AlertTriangle | 低 |
| DashboardFrame Header 直接入口 | "查看公开页"当前在 HomePanel/SharePanel，建议在 Header 增加直接按钮 | 低 |
| DashboardFrame 手机预览文案标注 | 右侧"实时预览"入口建议增加"手机预览"文案 | 低 |

### 待浏览器验收（360/375/390/430px）

| 验收点 | 说明 |
|--------|------|
| 无横向滚动 | 四个宽度下检查 |
| 按钮遮挡 | 底部导航不遮挡内容 |
| 字体错位 | 中文字体显示正常 |
| 间距混乱 | 响应式间距合理 |
| 卡片溢出 | 卡片内容不溢出容器 |

---

## 三、外部 API 待服务器测试项

| API | 配置入口 | 本地行为 | 待测试内容 |
|-----|---------|---------|-----------|
| 阿里云邮件推送 | src/lib/mail.ts（SMTP 双源：DB + env） | 未配置返回 SMTP_NOT_CONFIGURED | 注册验证邮件、密码重置邮件真实发送 |
| 阿里百炼 AI | src/lib/ai/gateway.ts（env BAILIAN_*） | 未配置安全失败 | AI 接待、AI Lead capture 真实对话 |
| 支付宝收款 | src/lib/billing/payments.ts（env ALIPAY_*） | 沙箱测试可用 | 真实支付创建、回调验签、订单状态同步 |
| 退款支付宝接口（D18） | src/lib/billing/orders.ts processRefund | 仅更新本地状态 | 真实退款调用支付宝接口 |
| 自动到期 cron（D19） | src/api/internal/membership-expiry | 无自动触发 | 服务器 cron 配置 + 真实到期降级 |

---

## 四、Codex 可以修复的范围

### 代码修复
1. changePassword 密码长度统一为 ≥8 位（src/lib/auth.ts + change-password API + 前端页面）
2. ai-chat sourcePage 改为 /{username}（src/lib/ai/commercial-agent.ts）
3. DashboardFrame SaveStatus 图标增强（Loader2/Check/AlertTriangle）
4. DashboardFrame Header 增加"查看公开页"直接按钮
5. DashboardFrame 手机预览入口增加"手机预览"文案
6. 360/375/390/430px 浏览器验收与溢出修复
7. 已知 Turbopack NFT list 警告（next.config.ts → links/icon route）

### 部署后测试
1. 邮件 API 真实联调（注册验证、密码重置）
2. 百炼 API 真实联调（AI 接待、AI Lead capture）
3. 支付宝真实支付联调（创建订单、回调验签、订单同步）
4. 退款支付宝接口实现（D18）
5. 自动到期 cron 配置（D19）

### 静态检查
1. TypeScript 复查
2. ESLint 复查
3. Production build 复查
4. git diff --check 复查

---

## 五、Codex 禁止触碰范围

### 禁止修改
- prisma/**（除非有未应用的 migration 需要 deploy）
- src/lib/mail.ts（邮件密钥与发送逻辑）
- src/lib/email-verification.ts（发送逻辑）
- src/lib/billing/plans.ts（仅可读取，不可修改价格与权益）
- src/lib/billing/payments.ts（支付创建逻辑）
- src/lib/billing/orders.ts（订单逻辑，除 D18 退款接口外）
- src/app/api/jeepwork/**（管理后台 API）
- src/app/jeepwork/**（管理后台页面）
- src/app/showcase/**（展示页）
- src/app/api/showcase/**（展示页 API）
- .env、.env.local、.env.production（任何环境变量文件）
- 任何密钥文件
- next.config.ts（除非修复 NFT 警告且不影响生产）
- package.json、package-lock.json（除非必要依赖）

### 禁止操作
- 禁止合并 master 分支
- 禁止部署腾讯云正式服务器
- 禁止上传真实密钥
- 禁止删除多 Agent、会员、企业和支付结构
- 禁止删除 /showcase、/jeepwork
- 禁止删除旧 PRD、审计报告和历史文档
- 禁止在服务器执行 npm install、npm run build
- 禁止 git commit、push（除非老板批准）
- 禁止删除数据库和环境变量
- 禁止创建服务器备份
- 禁止恢复旧版本

---

## 六、最终验收清单

### 代码检查
- [ ] TypeScript 通过（npx tsc --noEmit）
- [ ] ESLint 通过（npm run lint）
- [ ] Production build 通过（npm run build）
- [ ] git diff --check 通过
- [ ] Prisma validate 通过

### 功能验收（浏览器）
- [ ] 首页 1440px 截图：四大能力 + 套餐 + 联系入口
- [ ] 首页 390px 截图：四大能力 + 套餐 + 联系入口（无横向滚动）
- [ ] 注册流程：≥8 位密码 + 邮箱验证 + Onboarding 8步
- [ ] 登录流程：≥6 位密码（老用户兼容）
- [ ] Onboarding 守卫：未登录访问 /onboarding 重定向 /login
- [ ] Dashboard：保存三态 + 公开状态徽章 + 公开页入口
- [ ] /console：作为管理首页正常
- [ ] /workbench：根页面跳转 /console
- [ ] /workbench/leads 等子页面：保留可访问
- [ ] /dashboard：作为名片装修器正常
- [ ] 移动端底部导航：5 项可见，不遮挡内容
- [ ] 公开主页 1440px：vCard 下载 + 图标审核过滤 + 短链接 owner 检查
- [ ] 公开主页 390px：无横向滚动
- [ ] /pricing：套餐数据与 plans.ts 一致
- [ ] /workbench/membership：套餐数据与 plans.ts 一致
- [ ] 组件分类中文化
- [ ] 上传本地文件 vs 外链区分

### 外部 API（待部署后）
- [ ] 邮件发送：注册验证 + 密码重置
- [ ] 百炼 AI：AI 接待 + AI Lead capture
- [ ] 支付宝：创建订单 + 回调验签 + 订单同步
- [ ] 退款：调用支付宝接口（D18）
- [ ] 自动到期 cron：配置 + 真实降级（D19）

### 安全验收
- [ ] vCard 错误信息不泄露账号状态
- [ ] vCard contactVisibility=private 返回 404
- [ ] 短链接 owner 冻结/封禁返回 404
- [ ] avatar 响应头含 nosniff
- [ ] 图标审核 pending/rejected 不显示原图

---

## 七、两轮开发文件清单汇总

### 第一轮修改文件（13 个）
1. src/app/onboarding/page.tsx（D1）
2. src/app/api/auth/register/route.ts（D2）
3. src/components/AuthCard.tsx（D2 前端）
4. src/app/api/public/[username]/vcard/route.ts（D3/D4/D5/D6）
5. src/app/s/[slug]/route.ts（D16）
6. src/app/api/avatar/[username]/route.ts（D17）
7. src/app/[username]/page.tsx（D7 读取侧）
8. src/app/api/dashboard/products/route.ts（D8）
9. src/app/api/dashboard/products/[id]/route.ts（D8）
10. src/app/api/dashboard/links/reorder/route.ts（D13）
11. src/app/api/dashboard/links/route.ts（D7 写入侧 + D15）
12. src/app/api/dashboard/links/[id]/route.ts（D7 写入侧 + D15）

### 第二轮修改文件（9 个）
1. src/app/workbench/page.tsx（D10）
2. src/components/dashboard-v1/DashboardFrame.tsx（D11）
3. src/components/workbench/WorkbenchShell.tsx（D12）
4. src/components/dashboard-v1/AppearancePanel.tsx（UI-2）
5. src/components/dashboard-v1/DashboardV1Client.tsx（UI-5）
6. src/components/onboarding/OnboardingWizard.tsx（UI-4）
7. src/app/page.tsx（UI-1/UI-8/UI-12）
8. src/components/dashboard-v1/AddModuleDrawer.tsx（UI-9）
9. src/components/dashboard-v1/LinksPanel.tsx（UI-10/UI-11）

### 本轮生成文档（6 个）
1. docs/baseline/LINK168_CURRENT_BASELINE.md
2. docs/baseline/LINK168_ISSUE_LEDGER.md
3. docs/baseline/AGENT_FILE_OWNERSHIP.md
4. docs/baseline/LINK168_DOCUMENT_STATUS_INDEX.md（更新）
5. docs/reports/ROUND1_INTEGRATION_REPORT.md
6. docs/reports/ROUND2_INTEGRATION_REPORT.md
7. docs/reports/CODEX_GOAL_HANDOFF.md（本文件）

---

*交接文档结束，等待 Codex 目标模式最终检测与修复*
