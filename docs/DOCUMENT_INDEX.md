# Link168 文档索引

> 最后更新：2026-07-05
> 维护人：文档总控 Agent

Agent 开始任务前必须先读 `PROJECT_RULES.md` 和本文件，确认文档优先级和状态。

---

## 一、当前权威文档

| 文件路径 | 文档用途 | 状态 | 是否当前有效 | 是否可作为开发依据 | 事实或目标 |
|---------|---------|------|------------|----------------|-----------|
| `PROJECT_RULES.md` | 工程与安全红线，最高优先级 | 当前有效 | 是 | 是 | 事实+规则 |
| `PRD.md` | V2 生产级一体化产品需求文档 | 当前有效 | 是 | 是 | 事实+目标 |
| `ROADMAP.md` | W1-W11 版本路线图 | 当前有效 | 是 | 是 | 目标 |
| `SPRINT.md` | 当前 Sprint 与代码任务拆分 | 当前有效 | 是 | 是 | 目标 |
| `README.md` | 产品介绍与权威文档入口 | 当前有效 | 是 | 是 | 事实 |
| `docs/UI_ARCHITECTURE.md` | UI 与信息架构、移动端规范 | 当前有效 | 是 | 是 | 事实+目标 |
| `docs/USER_COMPONENT_CATALOG.md` | 20 种模块组件目录 | 当前有效 | 是 | 是 | 事实+目标 |
| `docs/SHOWCASE_AND_DEMO.md` | /showcase 可信演示闭环规范 | 当前有效 | 是 | 是 | 事实+目标 |
| `docs/JEEPWORK_ADMIN_SPEC.md` | /jeepwork 平台控制平面规范 | 当前有效 | 是 | 是 | 事实+目标 |
| `docs/PRICING_AND_ENTITLEMENTS.md` | 套餐、价格、权益与 AI 额度 | 当前有效 | 是 | 是 | 事实+目标 |
| `docs/REPOSITORY_VERSION_POLICY.md` | Git 分支与版本管理策略 | 当前有效 | 是 | 是 | 规则 |
| `docs/DOCUMENT_INDEX.md` | 本文件，全部文档清单 | 当前有效 | 是 | 是 | 索引 |

## 二、审计证据

| 文件路径 | 文档用途 | 状态 | 是否当前有效 | 是否可作为开发依据 |
|---------|---------|------|------------|----------------|
| `docs/audits/LINK168_LOCAL_CODE_AND_PRD_AUDIT_20260705.md` | 最新代码与功能审计报告（18 章节） | 审计证据 | 是（截至 2026-07-05） | 仅作为事实参考，不作为需求依据 |

## 三、历史归档

| 文件路径 | 原路径 | 文档用途 | 归档原因 | 是否可作为开发依据 |
|---------|--------|---------|---------|----------------|
| `docs/archive/plans/LINK168_3_DAY_CONTINUOUS_DEVELOPMENT_PLAN.md` | `LINK168_3_DAY_CONTINUOUS_DEVELOPMENT_PLAN.md` | 3 天持续开发计划 | 部分已执行，已被 ROADMAP/SPRINT 替代 | 否 |
| `docs/archive/plans/WECHAT_MINIPROGRAM_FUTURE_DESIGN.md` | `docs/WECHAT_MINIPROGRAM_FUTURE_DESIGN.md` | 微信小程序未来设计 | 纯未来规划，已标注【未来预留】 | 否 |
| `docs/archive/audits/audit-remediation-20260703.md` | `docs/audit-remediation-20260703.md` | 第一轮 Agent 整改台账 | 已被最新审计替代 | 否 |
| `docs/archive/audits/product-audit-vlink-ai-backend-20260705.md` | `docs/product-audit-vlink-ai-backend-20260705.md` | AI 后台产品审计 | 部分问题已修复，保留历史审计价值 | 否 |

## 四、未来预留

| 文件路径 | 文档用途 | 状态 | 是否进入当前验收 |
|---------|---------|------|----------------|
| `docs/future/README.md` | 未来预留功能清单 | 未来预留 | 否 |

## 五、技术与运维文档

| 文件路径 | 文档用途 | 状态 |
|---------|---------|------|
| `scripts/db/README.md` | 数据库运维脚本说明 | 当前有效 |

## 六、禁止作为当前指导的文件

以下文件不得作为新开发需求依据：

- `docs/archive/**`（全部历史归档）
- `docs/future/**`（全部未来预留）
- 任何标注为"历史归档"的文档
- 临时粘贴文件、过程文件、聊天记录

## 七、文档读取顺序

Agent 开始任务前应按以下顺序读取：

1. `PROJECT_RULES.md`（工程红线）
2. `docs/DOCUMENT_INDEX.md`（本文件，确认文档状态）
3. `PRD.md`（产品需求）
4. `SPRINT.md`（当前迭代任务）
5. `ROADMAP.md`（阶段规划）
6. `docs/UI_ARCHITECTURE.md`、`docs/USER_COMPONENT_CATALOG.md`、`docs/SHOWCASE_AND_DEMO.md`、`docs/JEEPWORK_ADMIN_SPEC.md`、`docs/PRICING_AND_ENTITLEMENTS.md`（专项规范）
7. `docs/audits/LINK168_LOCAL_CODE_AND_PRD_AUDIT_20260705.md`（最新审计）
8. `README.md`（产品概览）

## 八、文档变更记录

| 日期 | 变更内容 |
|------|---------|
| 2026-07-05 | V2 文档体系重建：创建 PRD、ROADMAP、SPRINT、UI_ARCHITECTURE、USER_COMPONENT_CATALOG、SHOWCASE_AND_DEMO、JEEPWORK_ADMIN_SPEC、PRICING_AND_ENTITLEMENTS、DOCUMENT_INDEX；更新 PROJECT_RULES（v0.3）、README；归档 4 份旧文档 |
| 2026-07-06 | 文档收口与一致性审计：PRD 补充行业方案档位；PRICING 补充行业方案定价与命名映射；UI_ARCHITECTURE 对齐 /console 路由命名、调整企业工作空间为【本次改版】；SPRINT 更新任务状态并补充 T-16；运行 3 Agent 并行代码事实核验、冲突矩阵、PRD 评估；未修改业务代码、Schema 或配置 |
