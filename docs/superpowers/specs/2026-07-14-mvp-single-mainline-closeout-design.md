# Link168 MVP 单一主线收口设计

日期：2026-07-14  
状态：待用户最终审核  
目标分支：`integration/mvp-closeout-r1`  
当前基线：`b6c5068bd42e73e4517fda3b68aff74046a79839`

## 1. 决策

选择方案 A：将 `integration/mvp-closeout-r1` 提升为 Link168 唯一 MVP 开发主线。

不再继续维护 `codex/link168-v2-direction` 作为并行开发路线。该分支保留为历史参考，禁止继续承接新功能。`master` 继续作为生产发布分支，只接收完成验收的 MVP 版本。

本次收口不重新建第三条主线，不把整个集成分支重新迁移到旧 V2 历史，也不启动新的 TRAE 并行 Agent。

## 2. 收口目标

本阶段只完成以下结果：

1. 修复阻断上线的 AI 额度退款账务问题。
2. 修复企业公开页 Host 缺失时未严格拒绝的问题。
3. 清理 `package.json` 重复脚本。
4. 建立并获得一次真实 GitHub CI 成功记录。
5. 验证第一轮五个 Agent 的合并结果不存在新的 P0 回归。
6. 将 `integration/mvp-closeout-r1` 明确为唯一开发主线。
7. 删除已完成的五条 `agent/closeout-r1-*` 临时分支。

不增加新产品功能，不新增套餐，不扩张 Workspace，不新增 Prisma 模型，不重做 UI，不部署生产环境。

## 3. 唯一主线规则

### 3.1 分支角色

- `integration/mvp-closeout-r1`：唯一 MVP 开发主线。
- `master`：生产发布分支，仅接收已验收版本。
- `codex/link168-v2-direction`：历史参考分支，停止开发，不直接合并。
- `agent/closeout-r1-*`：第一轮临时分支，验证集成完成后删除。

### 3.2 后续开发纪律

- 同一时间只能有一条正式开发主线。
- 临时修复分支默认不超过 2 条；本次优先直接由 GPT Work 总控在现有集成分支修复。
- 临时分支必须从唯一主线创建。
- 合并后立即删除临时分支。
- 禁止创建仅用于重复触发 CI 的长期分支或 PR。
- Agent 自报通过不能替代 GitHub 提交、祖先关系和 CI 证据。

## 4. P0 修复设计

### 4.1 AI 额度来源感知退款

当前问题：套餐月度额度消费失败后，原 `consume` 仍计入月度使用量，同时退款函数直接增加 Credit 余额，可能产生额外 Credit。

设计：

- 每次 AI 消费流水必须记录明确来源：`plan` 或 `credit`。
- 套餐额度消费失败：写入与原消费关联的抵消流水，月度净消耗恢复，不修改 Credit 余额。
- Credit 消费失败：只回补原先实际扣除的 Credit。
- 退款必须引用原消费流水或稳定操作键，禁止只按金额盲目加余额。
- 同一消费只能退款一次；重复退款返回已处理结果，不重复改变账务。
- 消费、退款和余额更新保持事务原子性。

验收用例：

1. 套餐额度调用成功：月度净消耗增加 1，Credit 不变。
2. 套餐额度调用失败：月度净消耗恢复，Credit 不变。
3. Credit 调用成功：Credit 减少 1。
4. Credit 调用失败：Credit 恢复到原值。
5. 同一请求重复提交：不重复扣减。
6. 同一消费重复退款：不重复回补。
7. 非法退款来源：拒绝处理并记录风险。

### 4.2 企业 Host 严格校验

当前问题：企业主页和员工企业名片只有在 Host 存在时才校验；Host 缺失时可能按 Workspace ID 继续渲染，Metadata 也可能绕过 Host 验证。

设计：

- 企业公开页面必须取得规范化 Host；Host 缺失直接 `404`。
- 未知域名、未验证域名、平台域名错误进入企业内部路由、跨 Workspace 域名全部 `404`。
- 页面正文与 `generateMetadata` 使用同一 Host 验证入口。
- 不允许 `NEXT_PUBLIC_APP_URL`、环境变量或内部路由参数跳过 Host 验证。
- 开发环境 localhost 例外必须显式、集中定义，不得分散在页面中。

验收用例：

1. 已验证企业域名访问正确 Workspace：成功。
2. 缺少 Host：404。
3. 未知 Host：404。
4. A 企业域名访问 B Workspace：404。
5. 未验证域名：404。
6. Metadata 请求同样执行上述验证。

### 4.3 脚本与 CI 清理

- 删除 `package.json` 中重复的 `test`、`test:d2`、`test:d4` 键。
- 保留单一命令定义。
- CI 使用与生产一致的 Node.js 22。
- CI 至少执行：
  - `npm ci`
  - `npx prisma validate`
  - `npx prisma generate`
  - `npm run typecheck`
  - `npm run lint`
  - `npm test -- --runInBand`
  - `npm run build`
  - `git diff --check`
- 最终提交必须出现真实 GitHub Actions 成功记录；本地退出码 0 不作为替代。

## 5. 集成复审范围

在 P0 修复后，只复审以下高风险交叉区域：

- 套餐正式代码：`free`、`plus`、`pro`、`enterprise`、`enterprise_pro`。
- 历史套餐别名只通过集中函数转换。
- Jeepwork 仅允许 `super_admin`。
- 敏感配置生产环境缺少加密密钥时 fail-closed。
- 普通用户一级导航只有：首页、名片、客户、AI、我的。
- 个人 AI 不得读取 Workspace 企业产品和知识库。
- 个人套餐额度统计不得混入 Workspace 企业资源。
- 企业公开页必须按真实 Host 隔离。

发现新的 P0 时在同一轮修复；P1/P2 记录到后续清单，不扩大本轮范围。

## 6. 文档处理

本阶段不全面重写宪法和 PRD。

只有在代码修复和 CI 通过后，才进行最小文档更新：

- 把唯一开发主线改为 `integration/mvp-closeout-r1` 或其最终正式命名。
- 标记 `codex/link168-v2-direction` 为历史参考。
- 记录正式套餐代码和临时分支生命周期规则。
- 不增加新功能承诺，不扩大 MVP 范围。

## 7. 分支清理

满足以下全部条件后删除五条临时分支：

- 五个提交均确认是唯一主线祖先。
- P0 修复完成。
- 完整 CI 成功。
- 最终集成 SHA 已记录。

待删除：

- `agent/closeout-r1-security`
- `agent/closeout-r1-billing`
- `agent/closeout-r1-ai`
- `agent/closeout-r1-public`
- `agent/closeout-r1-console`

不删除提交历史；提交仍保留在唯一主线中。

## 8. 完成标准

本次 GPT Work 收口只有同时满足以下条件才算完成：

1. AI 套餐额度退款不再增加额外 Credit。
2. Host 缺失和跨 Workspace 访问全部 fail-closed。
3. `package.json` 不存在重复键。
4. GitHub CI 全部成功。
5. 唯一主线最新 SHA 明确记录。
6. 五条临时 Agent 分支删除。
7. `master` 未被提前修改。
8. 未部署生产环境。
9. 输出遗留 P1/P2 清单和是否具备部署验收条件的结论。

## 9. 明确不做

- 不重新建立第三条主线。
- 不把两套无共同祖先的历史做整仓 merge。
- 不启动 10 个 Agent。
- 不新增企业功能、套餐、媒体类型或组件类型。
- 不调用真实支付宝、阿里百炼或生产数据库。
- 不因为测试难写而修改产品规则。
