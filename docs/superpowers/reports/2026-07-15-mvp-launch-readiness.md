# Link168 MVP P0/P1 发布就绪报告

**日期：** 2026-07-15

**结论：** `READY_FOR_PRODUCTION_APPROVAL`

**仓库：** `weex13148-gif/link168.me`

**唯一 MVP 开发主线：** `integration/mvp-closeout-r1`

**不可变基线：** `48bde488885a08f3cd47ae8d8f7be4aad01ca903`

**已验证 P0/P1 代码 SHA：** `11afec7193d7569e2b31a8761dfe3b4bfbc51567`

**GitHub Actions：** `MVP Closeout` run `29389532425`，精确 SHA 全部成功
**生产边界：** `master` 仅用于生产发布；`codex/link168-v2-direction` 仅作历史参考。

## P0 完成情况

| 项目 | 主要修改文件 | 测试 | 远程提交 | 结果与遗留风险 |
|---|---|---|---|---|
| AI 来源感知补偿 | `src/lib/ai/permissions.ts`、`src/lib/billing/entitlements/index.ts`、AI 调用方 | `tests/ai-credit-compensation.test.ts`、`tests/ai-closeout.test.ts` | `143f960` | plan/credit 原来源、operationKey、幂等退款和净套餐用量均通过；未调用真实百炼。 |
| 企业 Host fail-closed | `src/lib/workspace-public-host.ts`、`src/lib/workspace-public-request.ts`、`src/lib/workspace-routing-proof.ts`、`src/proxy.ts`、`src/app/%5F_w/**` | `tests/domains.test.ts`、`tests/security-closeout.test.ts`、`tests/proxy-host-preservation.test.ts`、`tests/single-mainline-regression.test.ts` | `4ef3b83`、`bde3dc`、`844421` | 缺失、未知、未验证、平台、跨租户、停用 Host 均 fail-closed；真实企业 DNS/HTTPS 待老板配置后验证。 |
| Node.js 22 CI | `package.json`、`.github/workflows/mvp-closeout.yml` | `tests/single-mainline-regression.test.ts` | `425adaa` | Node 22、PostgreSQL 16 及全部硬门禁已在精确 SHA 全绿。 |
| 平台 Logo | `src/lib/link-icons.ts`、编辑器/预览/公开页、本地 `public/platform-logos/**` | `tests/profile-module-closeout.test.ts` | `10ba61d` | 9 个平台白名单、本地资源、自动/手动模式和持久化通过；不表示官方合作。 |
| quote/contact-form | 组件注册表、编辑器、公开渲染、`src/app/api/contact/route.ts` | `tests/profile-module-closeout.test.ts` | `587d583` | CRUD、排序、隐藏恢复、权限和真实测试 Lead 通过；未发送真实外部通知。 |
| 四项真实指标 | `src/lib/analytics/**`、访问/咨询事件 API、统计 API | `tests/analytics-closeout.test.ts`、`tests/analytics-event-recording.test.ts` | `09badc5` | visits/consultations/leads/conversions 均取自真实测试事件并隔离租户；不含演示或随机数据。 |

## P1 完成情况

| 项目 | 主要修改文件 | 测试 | 远程提交 | 结果与遗留风险 |
|---|---|---|---|---|
| 媒体生命周期 | 媒体 API、`src/lib/owned-media.ts`、`src/lib/owned-media-lifecycle.ts` | `tests/media-lifecycle.test.ts` | `e094c28` | 所有权、共享/外部 URL 保护和真实失败状态通过；真实对象存储待老板配置后验证。 |
| 产品绑定与排序 | 产品/组件 API、`src/lib/products/binding.ts`、后台选择器 | `tests/product-binding-order.test.ts` | `42bd31e` | 仅绑定自有已上架产品、服务端校验、排序持久化和 Lead 快照通过。 |
| Jeepwork 导航闭环 | `src/lib/jeepwork-navigation.ts`、管理权限与壳层 | `tests/jeepwork-visible-routes.test.ts` | `0349cbe` | 可见入口均有真实页面且仅 super_admin；普通 admin 与 Workspace 管理员被拒绝。 |
| 外部服务状态 | `src/lib/external-service-readiness.ts`、Jeepwork 设置/健康/支付页面 | `tests/external-readiness.test.ts` | `800ba40` | 仅真实证据可显示 `configured_and_passed`；未配置和失败不会显示绿色。 |

## 完整验证

| 门禁 | 结果 |
|---|---|
| Node.js / npm | `v22.23.1` / `11.9.0` |
| PostgreSQL | `16.14`，本地非生产数据库 `link168_gate` |
| `npm ci` | 退出码 0，安装 730 个包 |
| Prisma validate / generate / migrate deploy | 全部退出码 0；20 个 migration，无待执行 migration |
| TypeScript / ESLint | 全部退出码 0 |
| Jest | 18/18 suites、319/319 tests，通过且无 skip/todo |
| Build | 退出码 0；161 个静态页面 |
| `git diff --check` | 退出码 0 |
| GitHub Actions | run `29389532425`；`verify` Job 及全部 Step 为 `success` |

Build 仍报告一条非阻断 warning：Turbopack 在 `next.config.ts` 的 NFT tracing 中发现 unexpected file，导入链到 `src/app/api/dashboard/links/icon/[...filename]/route.ts`。本轮未修复，也未将其描述为 error。

## Gate 6 预生产验收

- 生产模式黑盒脚本完成 63 个检查点：注册/会话、名片发布与下线、组件 CRUD/排序/隐藏恢复、quote/contact-form/Product Lead 与快照、租户隔离、真实测试事件指标、免费 AI 拒绝、企业 Host 和 super_admin 边界。
- 公开页在 360px、390px、430px 下均 HTTP 200，无横向溢出、越界元素、控制台错误或失败资源。
- `/showcase` 与 `/jeepwork` 保留；可见 Jeepwork 导航未出现“开发中”“Demo”“Mock”“即将开放”。
- AI 未配置及免费用户无 AI 权益时，名片和联系闭环仍可用。

## 待老板配置后验证

- 阿里百炼真实连接；
- 阿里云邮件真实发送；
- 支付宝真实查单、验签及支付链路；
- 对象存储真实上传、替换、删除；
- 真实企业域名、DNS 与 HTTPS；
- 生产服务器与生产数据库。

以上项目均未在本轮伪造为通过。本轮未修改 `master`，未连接生产服务器，未修改生产数据库，未部署生产，也未调用真实生产外部服务。
