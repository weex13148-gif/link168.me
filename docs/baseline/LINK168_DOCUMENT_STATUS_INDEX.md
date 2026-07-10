# Link168 文档状态索引

索引日期：2026-07-06
索引范围：docs/ 目录下所有文档

状态定义：
- **当前有效**：内容与代码一致，可作为开发依据
- **历史参考**：曾经有效，现在仅作参考
- **已被后续文档替代**：有更新版本，此版本不再有效
- **内容存在冲突**：与其他文档或代码存在不一致
- **禁止直接作为当前开发依据**：内容过时或未经确认
- **状态无法确认**：无法判断文档与代码的关系

---

## 1. 审计报告（docs/audits/）

| 文件 | 状态 | 说明 |
|------|------|------|
| UI_PRODUCT_STRUCTURE_AUDIT_20260706.md | 当前有效 | UI 产品结构审计，核心审计报告 |
| CURRENT_CHANGES_REVIEW_20260706.md | 当前有效 | 当前工作区改动审查报告 |
| LINK168_LOCAL_CODE_AND_PRD_AUDIT_20260705.md | 已被后续文档替代 | 被 UI_PRODUCT_STRUCTURE_AUDIT_20260706.md 替代 |

---

## 2. 规划文档（docs/plans/）

| 文件 | 状态 | 说明 |
|------|------|------|
| UI_PRODUCT_REMEDIATION_PLAN_20260706.md | 当前有效 | UI 产品整改计划，基于最新审计 |

---

## 3. 归档文档（docs/archive/）

### 审计归档（docs/archive/audits/）

| 文件 | 状态 | 说明 |
|------|------|------|
| audit-remediation-20260703.md | 历史参考 | 早期审计报告，内容已过时 |
| product-audit-vlink-ai-backend-20260705.md | 历史参考 | 后端审计，部分内容仍有参考价值 |

### 规划归档（docs/archive/plans/）

| 文件 | 状态 | 说明 |
|------|------|------|
| LINK168_3_DAY_CONTINUOUS_DEVELOPMENT_PLAN.md | 已被后续文档替代 | 被 UI_PRODUCT_REMEDIATION_PLAN_20260706.md 替代 |
| WECHAT_MINIPROGRAM_FUTURE_DESIGN.md | 历史参考 | 微信小程序设计，尚未开发 |

---

## 4. 规范与说明文档（docs/）

| 文件 | 状态 | 说明 |
|------|------|------|
| DOCUMENT_INDEX.md | 状态无法确认 | 文档索引，可能过时 |
| FUNCTION_REPORT_20260705.md | 历史参考 | 功能报告，被当前真实状态报告替代 |
| JEEPWORK_ADMIN_SPEC.md | 当前有效 | Jeepwork 管理后台规范 |
| PRICING_AND_ENTITLEMENTS.md | 内容存在冲突 | 定价与权益定义，与代码中实际实现存在差异 |
| PRODUCTION_BASELINE.md | 当前有效 | 生产环境基线配置 |
| REPOSITORY_VERSION_POLICY.md | 当前有效 | 仓库版本策略 |
| SHOWCASE_AND_DEMO.md | 当前有效 | Showcase 展示系统说明 |
| TEST_REPORT_PUBLIC_CARD_MOBILE_MVP_20260705.md | 已被后续文档替代 | 被当前真实状态报告中的手机端分析替代 |
| UI_ARCHITECTURE.md | 内容存在冲突 | UI 架构文档，与实际代码结构存在差异 |
| USER_COMPONENT_CATALOG.md | 当前有效 | 用户组件目录 |

---

## 5. 项目根目录文档

| 文件 | 状态 | 说明 |
|------|------|------|
| PRD.md | 内容存在冲突 | 产品需求文档，与当前代码实现存在多处不一致 |
| PROJECT_RULES.md | 当前有效 | 项目开发规则，持续更新 |
| ROADMAP.md | 历史参考 | 路线图，可能过时 |
| SPRINT.md | 历史参考 | 迭代计划，可能过时 |
| README.md | 当前有效 | 项目说明文档 |

---

## 6. 基线报告（docs/baseline/）

| 文件 | 状态 | 说明 |
|------|------|------|
| LINK168_CURRENT_BASELINE.md | 当前有效（本轮权威） | 2026-07-06 五阶段开发流程 Phase 0 产物，当前基线 |
| LINK168_ISSUE_LEDGER.md | 当前有效（本轮权威） | 2026-07-06 问题台账 D1-D20，两轮开发唯一缺陷来源 |
| AGENT_FILE_OWNERSHIP.md | 当前有效（本轮权威） | 2026-07-06 Agent 文件所有权边界，所有 Agent 必须遵守 |
| LINK168_CURRENT_REALITY_REPORT.md | 历史参考 | 早期项目真实状态报告，被本轮 LINK168_CURRENT_BASELINE.md 替代 |
| LINK168_DOCUMENT_STATUS_INDEX.md | 当前有效（本文件） | 文档状态索引，本轮已更新 |

---

## 7. 文档依赖关系

```
PRD.md (存在冲突)
  └── LINK168_LOCAL_CODE_AND_PRD_AUDIT_20260705.md (已替代)
        └── UI_PRODUCT_STRUCTURE_AUDIT_20260706.md (当前有效)
              ├── CURRENT_CHANGES_REVIEW_20260706.md (当前有效)
              └── UI_PRODUCT_REMEDIATION_PLAN_20260706.md (当前有效)
                    └── LINK168_CURRENT_REALITY_REPORT.md (当前有效)

PRICING_AND_ENTITLEMENTS.md (存在冲突)
  └── 与代码中 plans.ts、appearance API 存在不一致

JEEPWORK_ADMIN_SPEC.md (当前有效)
  └── 与 /jeepwork 代码一致

UI_ARCHITECTURE.md (存在冲突)
  └── 与实际路由结构存在差异
```

---

## 8. 需要关注的冲突点

| 冲突项 | 文档 1 | 文档 2/代码 | 冲突内容 |
|--------|--------|------------|---------|
| 主题权限 | PRICING_AND_ENTITLEMENTS.md | presetThemes.ts + appearance API | 免费主题数量不一致 |
| 后台结构 | UI_ARCHITECTURE.md | /console + /workbench | 实际存在双后台，文档未说明 |
| 组件分类 | USER_COMPONENT_CATALOG.md | features/profile-modules | 分类数量不一致 |
| 定价数据源 | PRD.md | /page.tsx vs /pricing/page.tsx | 首页硬编码，文档未说明 |
| 产品定位 | README.md | 首页实际内容 | 文档说"智能名片"，首页未突出 |

---

*索引结束*