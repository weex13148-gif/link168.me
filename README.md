# Link168 V2 受治理工作区

本工作区以产品宪法、PRD和根级Agent规则约束开发，避免多Agent自由扩散。

## 分支目标

本分支只服务 Link168 V2 主产品线：经营名片、公开访问、客户线索、数据分析、会员付费和 Jeepwork 平台治理。

## 唯一必读文档

- `AGENTS.md`
- `00_GOVERNANCE_LOCKED/PRODUCT_CONSTITUTION.md`
- `PRD.md`
- `PROJECT_RULES.md`
- `DOCUMENT_INDEX.md`

`docs/audits/`与`07_ARCHIVE/HISTORICAL_DIRECTION/`只作历史证据，不作为当前开发规则。

## 开发命令

```bash
npm install
npm run dev
npm run lint
npm run typecheck
```

## 当前工程原则

- 用户侧后续统一到 `/console`。
- 平台侧统一到 `/jeepwork`。
- 旧 `/admin`、`/showcase`、`/enterprise-ai` 不作为 V2 主分支方向。
- 不提交 `.env`、`.env.local`、`node_modules`、`.next`、上传文件和构建缓存。
