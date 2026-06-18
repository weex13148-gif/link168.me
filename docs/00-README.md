# docs 目录导航

本目录存放 link168.me 产品开发、技术架构、比赛规划、运维安全等全部文档。

## 目录结构

```
docs/
├── 00-README.md                         ← 本文件：目录导航
│
├── product/                             ← 产品相关
│   ├── 01-PRD.md                        ← 产品需求文档（核心）
│   ├── 02-PROJECT_STATUS.md             ← 项目现状说明
│   ├── 03-FEATURE_COMPLETION.md         ← 功能完成度报告
│   └── 04-UNFINISHED_FEATURES.md        ← 未完成功能清单
│
├── tech/                                ← 技术相关
│   ├── 05-ARCHITECTURE.md               ← 技术架构说明
│   ├── 06-DEPLOYMENT.md                 ← 服务器部署说明
│   └── 07-SECURITY_AND_KEYS.md          ← 安全与密钥管理说明
│
├── plan/                                ← 规划与路线
│   ├── 08-ROADMAP.md                    ← 开发任务路线图
│   └── 09-COMPETITION_PLAN.md           ← TRAE 创业比赛参赛规划
│
└── archive/                             ← 过程记录
    └── 10-TRAE_DEV_LOG_TEMPLATE.md      ← Trae 开发日志模板
```

## 与根目录文件的关系

根目录已存在以下项目级文件，保留不动：

- [README.md](../README.md) — 项目入口说明
- [PROJECT_RULES.md](../PROJECT_RULES.md) — 品牌与产品规则
- [ROADMAP.md](../ROADMAP.md) — 早期路线图
- [SPRINT.md](../SPRINT.md) — Sprint 1 验收标准

本 `docs/` 目录是对上述文件的 **结构化、比赛友好、可交接** 的扩展版本。

## docs 中已有但本规划未覆盖的文件

- [SUPER_ADMIN_PRD.md](./SUPER_ADMIN_PRD.md) — 超级管理员后台 PRD
- [AUDIT_LOG_SCHEMA_PLAN.md](./AUDIT_LOG_SCHEMA_PLAN.md) — 审计日志 schema 规划
- [SYSTEM_ACCOUNT_RULES.md](./SYSTEM_ACCOUNT_RULES.md) — 系统账号与权限规则
- [UI_REFERENCE_PROMPTS.md](./UI_REFERENCE_PROMPTS.md) — UI 参考提示词
- [UI_STYLE_GUIDE.md](./UI_STYLE_GUIDE.md) — UI 风格指南

以上文件继续保留，与新文件并存。

## 推荐阅读顺序

### 新手/新成员路径
1. `product/01-PRD.md` — 产品是什么、做什么
2. `product/02-PROJECT_STATUS.md` — 现在做到哪一步
3. `tech/05-ARCHITECTURE.md` — 技术怎么搭的
4. `product/03-FEATURE_COMPLETION.md` — 每个功能做到什么程度

### 评委/比赛路径
1. `plan/09-COMPETITION_PLAN.md` — 怎么讲故事
2. `product/01-PRD.md` — 产品内容
3. `tech/05-ARCHITECTURE.md` — 技术深度
4. `product/03-FEATURE_COMPLETION.md` — 实物证据

### 开发/交接路径
1. `tech/05-ARCHITECTURE.md`
2. `tech/06-DEPLOYMENT.md`
3. `tech/07-SECURITY_AND_KEYS.md`
4. `product/04-UNFINISHED_FEATURES.md`
5. `plan/08-ROADMAP.md`

## 维护约定

- 所有文档均为 Markdown，不嵌入真实密钥/密码
- 功能状态分 5 档：`已完成 / 半完成 / 展示预览 / 规划功能 / 未完成`
- 每次大迭代后，先更新 `product/02-PROJECT_STATUS.md`，再同步其他文档
- 截图建议放在 `docs/screenshots/` 目录，用相对路径引用
