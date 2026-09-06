# Link168

Link168（链接一路发）是个人 / 团队的 AI 商业主页平台。当前核心闭环是：

> 商业主页 → Visitor AI → Lead → Handoff

## 当前开发入口

恢复开发时先读 [`docs/DEVELOPMENT_STATUS.md`](docs/DEVELOPMENT_STATUS.md)，核对实际 HEAD 与当前任务。
历史审计结果仅对应注明日期，不代表当前版本已经通过业务或生产验收。

当前唯一施工分支为 `codex/controlled-clean-rebuild-20260814`。

现役文字合同按顺序为：

1. `00_CURRENT_GUIDANCE_INDEX.md`
2. `CURRENT_PRODUCT_AUTHORITY.md`
3. `OWNER_DECISION_REGISTER.md`
4. `DEVELOPMENT_EXECUTION_RULES.md`
5. `MVP_ACCEPTANCE_TESTS.md`
6. `LINK168_UI_DESIGN_SYSTEM.md`
7. `LINK168_MVP_PAGE_AND_INTERACTION_SPEC.md`
8. `CHINA_PRODUCTION_COMPLIANCE_GATE.md`

视觉与流程参考：

- `LINK168_UI_REFERENCE.pdf`
- `LINK168_INTERACTION_REFERENCE.pdf`

配套材料：

- `PRODUCT_DESIGN_CODEX_HANDOFF_AUDIT.pdf`：非权威交付审核记录；
- `assets/link168-logo-system/`：OWNER 固定品牌资产；
- `R2_PACKAGE_ORIGINAL_CHECKSUMS.sha256`：不可变的原始 R2 来源校验；
- `CURRENT_AUTHORITY_CHECKSUMS.sha256`：当前权威文件与固定参考资产校验；
- `PACKAGE_CHECKSUMS.sha256`：弃用兼容指针，不再承载两种校验职责；
- `PROJECT_RULES.md`：工程、安全和交付红线；
- `AGENTS.md`：开发代理最短入口。

旧 Product Constitution、旧 PRD 和旧价格合同仅作 Historical Reference。它们的历史全文由 Git
保留，不得覆盖当前文件。

## 2026-08-13 当前代码事实

本节记录审计时的实现事实，不重新定义产品：

- R2 ZIP 外部 SHA-256 与校验文件一致，包内 `23/23` 项哈希通过；
- R2 原 ZIP SHA-256 为 `c8beca007e619d3bb14b94e9319a299102af838bc3230d8a0ebc1fdbbd903b82`；
- 外部交付审核 PDF 与仓库内 `PRODUCT_DESIGN_CODEX_HANDOFF_AUDIT.pdf` 字节级一致；
- R3 reconciliation 前 `MVP_ACCEPTANCE_TESTS.md` 已核实为 `182` 个唯一验收 ID；旧 `176` 统计遗漏 `AT-A11Y-*` 与 `AT-E2E-*`；R3 新增 27 项后已重新统计为 `209` unique、`0` duplicate；
- `/console`、`/jeepwork` 边界存在；旧 `/dashboard`、`/workbench` 运行时重定向，`/admin` 返回 404；
- Owner / Admin / Member 的 Lead 服务端读取范围已有代码和 Jest 证据，真实数据库隔离尚未验证；
- lint、typecheck、production build 通过；Jest `48/48` suites、`535/535` tests 通过；
- Prisma validate 未完成；当前环境的 `DATABASE_URL` / 数据库凭据不可用于真实验证；
- 真实 AI、支付、邮件、短信、存储、DNS / 自定义域尚未完成本轮真实成功路径验证；
- 当前代码仍未统一正式 Lead 条件、三级分配、三状态、Draft / Preview / Publish、共同 Published
  Business Facts、最新套餐点数规则和唯一浏览器 Golden Path；
- 360px 首页实测存在横向滚动，响应式验收尚未通过。

因此，当前状态是“开发包可用于施工，产品代码尚未达到 MVP 完成条件”。

## 仍需 OWNER 确认或提供

真正仍需 OWNER 决定的事项：

- 已知运营主体为“合肥市造梦哈勃文化传媒有限公司”；仍需提供正式联系方式、适用法域、争议处理、Privacy / Terms 生效日期与版本；
- 实际 AI、支付、邮件、短信、存储供应商及数据出境情况；
- 各类数据的固定保存期限，以及永久删除 / 法定保留的最终边界。

以下不是新的产品选择题，但需要 OWNER 在真实验收前提供或完成：

- 可连接的隔离 PostgreSQL 测试数据库及测试账号；
- AI Provider、支付宝沙箱 / 商户、邮件、短信、存储和域名的受控测试配置；
- 涉及真实合同、收款、退款、发票、生产密钥或生产发布时的单独授权。

除上述事项外，本轮未发现必须新增的普通产品、UI、交互或套餐决策。

## 本地运行

需要 Node.js、npm 和 PostgreSQL。Windows 请使用 `npm.cmd`。

```bash
copy .env.example .env.local
npm ci
npx prisma generate
npx prisma migrate deploy
npm run dev
```

只在本地隔离环境填写 `.env.local`，不要提交真实密钥或数据库凭据。

## 质量门禁

```bash
npx prisma validate
npx prisma generate
npm run lint
npm run typecheck
npm test -- --runInBand
npm run build
git diff --check
```

构建或单元测试通过不能替代真实数据库、浏览器、权限和 Provider 验收。

Development completion ≠ Production compliance approval。功能与 Acceptance 完成后，仍必须通过
`CHINA_PRODUCTION_COMPLIANCE_GATE.md`，并取得真实 Provider、数据流、安全环境、法律文本及适用许可 / 备案 / 登记 / 公示证据，才能声称 `PRODUCTION READY` 或可以正式面向中国用户上线。
