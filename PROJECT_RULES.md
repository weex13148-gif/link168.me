# Link168 工程与安全规则

> 版本：v1.1
> 生效日期：2026-07-31
> 状态：正式生效

本文件只规定工程、安全和交付红线。产品方向以
`01_PRODUCT_DOCS/PRODUCT_CONSTITUTION.md` 为最高长期规则，当前需求以
`01_PRODUCT_DOCS/PRD.md` 为准，价格与 AI 额度以
`docs/PRICING_AND_ENTITLEMENTS.md` 和 `src/lib/billing/plans.ts` 为准。

## 1. 唯一主线

- 当前收口主线：`recovery/direct-goal-closeout-20260722`。
- `master` 只接收经过门禁、复审和明确批准的发布变更。
- 旧分支、旧 worktree、旧 PRD、研究资料、审计过程文档和独立演示站不属于现役产品资产；不得反向覆盖当前正式规则。
- 本地收口完成后，只保留一条真实 SaaS 收口主线和一个工作区；不为临时过程保留备份分支、stash 或嵌套仓库。
- 不 force-push，不删除 Release Tag，不改写共享 Git 历史。

## 2. 必须通过的门禁

提交前至少执行：

```bash
npm ci
npx prisma validate
npx prisma generate
npm run lint
npm run typecheck
npm test -- --runInBand
npm run build
git diff --check
```

代码存在、页面可见或构建成功都不等于业务已完成。核心闭环还必须通过真实数据库和浏览器验收；第三方接口未配置时只能标记为“待配置验证”。

## 3. 密钥与数据

- 禁止提交 `.env*`、密码、Session/Admin 密钥、支付/邮件/AI/存储密钥和生产数据库凭据。
- 敏感配置只放服务端环境或受控配置中心，不进入客户端 Bundle、URL、日志和文档。
- 不读取、修改或删除生产数据，除非先说明范围、完成备份并获得明确批准。
- 生产迁移只使用已在隔离数据库验证的 migration；严禁生产执行 `prisma migrate reset`。
- 用户联系方式、AI 对话、订单、额度、退款和审计日志按敏感数据处理。

## 4. 权限与外部服务

- 平台最高权限只保留 `super_admin`；企业管理员不能获得平台权限。
- 所有 Workspace、Lead、知识库、媒体、订单和额度操作必须服务端校验归属。
- AI、邮件、支付、退款、存储和内容审核未配置时必须安全失败，不伪造成功。
- 真实退款成功前不得显示“已退款”；支付回调、额度扣减与退款必须幂等。

## 5. 部署边界

- 先本地/隔离环境验证，再只读检查服务器，最后经明确批准执行上传、migration、重启或配置变更。
- 生产必须使用 HTTPS、安全 Cookie、强密钥、持久化上传目录和共享限流存储。
- 发布后必须验证健康检查、注册登录、公开名片、留资、后台线索、支付回调与降级行为。

## 6. 历史规则退役

2026-06-20 的 TRAE 比赛登记、四份比赛台账和“两批五 Agent”编排已结束，不再作为开发前置条件。其历史材料只作追溯，不得阻塞当前唯一主线。
