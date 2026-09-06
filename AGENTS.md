# Link168 开发入口

## 恢复开发

先核对真实 Git 状态，再读 `docs/DEVELOPMENT_STATUS.md` 和其中指向的现有执行计划。
状态表只记录施工进度与证据，不定义产品。已完成任务不得仅因会话更换而重做。
历史报告、计划中的基线 SHA、一次性执行限制只适用于其注明的轮次；不得静默扩展为永久规则。
遇到限制冲突，以用户最新明确决定和下列权威顺序裁决，并记录具体差异。

## 权威读取顺序

进入仓库后按以下顺序读取：

1. 用户最新、明确、可追溯的决定；
2. `00_CURRENT_GUIDANCE_INDEX.md`；
3. `CURRENT_PRODUCT_AUTHORITY.md`；
4. `OWNER_DECISION_REGISTER.md`；
5. `DEVELOPMENT_EXECUTION_RULES.md`；
6. `MVP_ACCEPTANCE_TESTS.md`；
7. `LINK168_UI_DESIGN_SYSTEM.md`；
8. `LINK168_MVP_PAGE_AND_INTERACTION_SPEC.md`；
9. `CHINA_PRODUCTION_COMPLIANCE_GATE.md`；
10. `PROJECT_RULES.md`。

视觉与交互参考为 `LINK168_UI_REFERENCE.pdf` 和
`LINK168_INTERACTION_REFERENCE.pdf`。`PRODUCT_DESIGN_CODEX_HANDOFF_AUDIT.pdf`
只证明开发包的交付就绪度，不是产品权威。固定品牌资产位于
`assets/link168-logo-system/`；原始 R2 来源校验为 `R2_PACKAGE_ORIGINAL_CHECKSUMS.sha256`，当前权威文件与固定参考资产校验为 `CURRENT_AUTHORITY_CHECKSUMS.sha256`。`PACKAGE_CHECKSUMS.sha256` 仅为弃用兼容指针。

判断“当前代码已经实现什么”必须回到当前 HEAD、运行时、Schema、测试和浏览器证据；
这些事实不能反向改变 OWNER 已确认的目标规则。未在本轮运行验证的能力不得写成已通过。

`01_PRODUCT_DOCS/PRODUCT_CONSTITUTION.md`、`01_PRODUCT_DOCS/PRD.md`、
`docs/PRICING_AND_ENTITLEMENTS.md` 和其他旧资料只作 Historical Reference，
不得作为施工依据。

## 当前施工现场

- 唯一施工分支：`codex/controlled-clean-rebuild-20260814`；
- 基线来源：`master` 的 `0cca526c4670d6153dd78852054911e02bd748d8`；
- `recovery/direct-goal-closeout-20260722` 与
  `codex/ui-convergence-recovery-20260811` 只作历史证据；
- 普通开发不创建新分支、worktree、backup 或 recovery 分支；
- 每次任务开始重新读取真实 HEAD 和工作区状态，不把文档中的 SHA 当永久事实。

技术栈：Next.js App Router、React、TypeScript、Prisma、PostgreSQL、Jest。

核心闭环：商业主页 → Visitor AI → Lead → Handoff。

改动前先定位现有实现并保留用户已有修改。不要复制第二套业务逻辑，不要新增平行后台。
不要删除 `/jeepwork`、支付、AI、邮件、会员或企业结构；未配置的外部能力必须安全失败。

完成前运行与改动相关的真实验证。代码、Prisma 或构建改动通常包括：

```bash
npx prisma validate
npx prisma generate
npm run lint
npm run typecheck
npm test -- --runInBand
npm run build
git diff --check
```

不得使用 Mock、假数据、空接口、固定成功响应或跳过失败制造完成状态。数据库、Provider、
支付、邮件、存储或域名环境阻塞时，说明真实原因和 OWNER 需要执行的具体动作。

Development completion ≠ Production compliance approval。任何 Agent 在声称“可以正式上线”、
`PRODUCTION READY` 或“中国合规已完成”前，必须逐项验证
`CHINA_PRODUCTION_COMPLIANCE_GATE.md`；Build、Unit Test 或 Acceptance 通过不能替代真实生产合规证据。
