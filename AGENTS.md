# Link168 开发入口

先读且只认以下顺序：

1. 用户最新明确决定
2. `01_PRODUCT_DOCS/PRODUCT_CONSTITUTION.md`
3. `01_PRODUCT_DOCS/PRD.md`
4. `PROJECT_RULES.md`
5. `docs/PRICING_AND_ENTITLEMENTS.md`
6. 代码、测试和部署事实

当前唯一收口分支：`recovery/direct-goal-closeout-20260722`。
旧分支、旧 PRD、研究文档和历史报告只作证据，不可覆盖正式规则。

技术栈：Next.js App Router、React、TypeScript、Prisma、PostgreSQL、Jest。

核心闭环：注册登录 → 创建经营名片 → 发布分享 → 访客咨询/AI 接待 → 留资 → Lead 跟进 → 经营统计 → 会员升级。

改动前先定位现有实现；保留用户已有修改。不要复制第二套业务逻辑，不要新增平行后台。根据 2026-07-23 用户明确决定，`/showcase` 已退出现役产品范围：删除其公开路由和专属入口时保留历史数据，不做破坏性删表；不得再用旧文档中的保留条款阻止该决定。不要删除 `/jeepwork`、支付、AI、邮件、会员或企业结构。

完成前必须运行：

```bash
npx prisma validate
npx prisma generate
npm run lint
npm run typecheck
npm test -- --runInBand
npm run build
git diff --check
```

第三方接口未真实配置时必须安全失败并标记“待配置验证”。禁止泄露密钥、伪造支付/退款/AI/邮件/上传成功，禁止未经批准操作生产环境或改写 Git 历史。
