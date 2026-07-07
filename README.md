# Link168 V2 Direction Branch

这是 `D:\77.me\branches\link168-v2-direction` 的分支说明。

## 分支目标

本分支只服务 Link168 V2 主产品线：经营名片、公开访问、客户线索、数据分析、会员付费和 Jeepwork 平台治理。

## 必读文档

- `docs/DEVELOPMENT_DIRECTION_20260707.md`
- `docs/PRD_Link168_V2_DIRECTION_20260707.md`
- `docs/CURATED_CODE_MANIFEST.md`
- `docs/reference-images`

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
