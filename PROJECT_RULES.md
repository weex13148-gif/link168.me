# Link168 工程与安全规则

> 版本：v1.3
> 生效日期：2026-08-13
> 状态：正式生效

本文件只规定工程、安全和交付红线。权威入口为
`00_CURRENT_GUIDANCE_INDEX.md`；产品目标以 `CURRENT_PRODUCT_AUTHORITY.md` 为唯一权威；
OWNER 决策证据见 `OWNER_DECISION_REGISTER.md`；开发方式见
`DEVELOPMENT_EXECUTION_RULES.md`；MVP 完成标准见 `MVP_ACCEPTANCE_TESTS.md`；UI 与页面施工分别见
`LINK168_UI_DESIGN_SYSTEM.md` 和 `LINK168_MVP_PAGE_AND_INTERACTION_SPEC.md`；中国正式生产上线门槛见
`CHINA_PRODUCTION_COMPLIANCE_GATE.md`。

价格、席位、点数和宽限的当前目标以 `CURRENT_PRODUCT_AUTHORITY.md` 第 12 节及
`OWNER_DECISION_REGISTER.md` 的 OD-031 至 OD-039 为准。`src/lib/billing/plans.ts` 是当前实现事实，
不是反向覆盖产品决定的权威。`docs/PRICING_AND_ENTITLEMENTS.md` 只保留历史指针。

## 1. 唯一施工现场

- 当前唯一施工分支：`codex/controlled-clean-rebuild-20260814`；
- 基线来源为 `master` 的 `0cca526c4670d6153dd78852054911e02bd748d8`；
- 后续普通开发不创建新分支、worktree、backup 或 recovery 分支；
- `recovery/direct-goal-closeout-20260722` 与
  `codex/ui-convergence-recovery-20260811` 只作历史证据；
- 不 force-push，不删除 Release Tag，不改写共享 Git 历史；
- 每次任务以真实 HEAD 和工作区状态为准，保留用户已有改动。

## 2. 真实验证

提交前执行与改动相关的真实验证。代码、Prisma 或构建相关改动通常包括：

```bash
npx prisma validate
npx prisma generate
npm run lint
npm run typecheck
npm test -- --runInBand
npm run build
git diff --check
```

代码存在、页面可见、API 返回 200、Mock 通过或 build 通过都不等于业务完成。核心闭环还必须通过
真实数据库、双 Workspace 权限、浏览器 Golden Path 和相应 Provider 验收。无法运行的项目必须说明
真实原因和 OWNER 要执行的动作，不得省略后宣称完成。

## 3. 密钥与数据

- 禁止提交 `.env*`、密码、Session / Admin 密钥及支付、邮件、AI、存储密钥；
- 敏感配置只放服务端环境或受控配置中心，不进入客户端 Bundle、URL、日志和文档；
- 联系方式、AI 对话、Lead、订单、点数、退款、举报和审计日志按敏感数据处理；
- 未经单独批准不读取、修改或删除生产数据；
- 生产 migration 必须先在隔离数据库验证，严禁生产执行 `prisma migrate reset`；
- 删除或不可逆迁移真实数据必须停止并取得明确授权。

## 4. 权限、计费与外部服务

- 平台最高权限与普通 Workspace 权限严格分离；
- 所有 Workspace、Page、Lead、Conversation、知识资料、媒体、订单和点数操作必须服务端校验归属；
- Draft、Internal Notes、私人联系方式、付款凭证和 Provider 密钥不得出现在公开响应；
- AI、邮件、支付、退款、存储、短信和 OAuth 未配置时必须安全失败，不伪造成功；
- 支付回调、点数预扣 / 结算 / 退回、退款、发布、Invite、Lead 创建和企业激活必须幂等；
- 真实退款成功前不得显示“已退款”，前端返回页不得直接激活套餐或点数。

## 5. 文档与历史

- 现役文件及读取顺序由 `00_CURRENT_GUIDANCE_INDEX.md` 定义；
- `R2_PACKAGE_ORIGINAL_CHECKSUMS.sha256` 保留原始 R2 开发包不可变字节校验依据；
- `CURRENT_AUTHORITY_CHECKSUMS.sha256` 校验当前权威文件与固定参考资产；`PACKAGE_CHECKSUMS.sha256` 仅作弃用兼容指针，不得再混用两种职责；
- 旧 Product Constitution、PRD、价格合同、旧设计和研究资料仅作 Historical Reference；
- 历史文件可以保留路径和 Git 追溯，不得在现役索引中与当前权威平级；
- 当前代码事实写成事实，目标规则写成目标，不把任何一方伪装成另一方。

## 6. 部署边界

- 先在本地 / 隔离环境验证，再只读检查服务器；
- 上传、migration、重启、域名、真实密钥、生产发布、真实收款 / 退款 / 开票均需单独授权；
- 生产必须使用 HTTPS、安全 Cookie、强密钥、持久化存储和共享限流；
- 发布后必须重新验证健康检查、注册登录、公开页、AI / Direct Form、Lead、权限、支付与失败降级；
- 未经真实线上验证不得把 merged、deployed 或 live 混写为“已上线”。
- Development completion ≠ Production compliance approval；Build、Unit Test 或 Acceptance 通过不能单独证明中国生产合规；
- 声称“可以正式上线”“PRODUCTION READY”或“中国合规已完成”前，必须逐项验证 `CHINA_PRODUCTION_COMPLIANCE_GATE.md`，并取得真实 Provider、数据流、安全环境和适用法律 / 许可 / 备案证据。
