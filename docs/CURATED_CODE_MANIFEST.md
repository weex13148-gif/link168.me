# V2 分支代码取舍清单

目标路径：`D:\77.me\branches\link168-v2-direction`

分支名：`codex/link168-v2-direction`

## 1. 保留代码

### 根配置

- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `next.config.ts`
- `eslint.config.mjs`
- `postcss.config.mjs`
- `prisma.config.ts`
- `.env.example`
- `.gitignore`
- `PROJECT_RULES.md`

保留原因：这些文件是 Next.js、TypeScript、Prisma、ESLint 和工程约束的最低运行基础。

### 应用代码

- `src/app`
- `src/components`
- `src/features`
- `src/lib`
- `src/types`
- `src/proxy.ts`

保留原因：认证、公开名片、工作台、产品、线索、分析、会员、AI、通知、工作区和 Jeepwork 都在这些目录内。

### 数据库和脚本

- `prisma`
- `scripts/db`
- `scripts/smoke-test.*`
- `scripts/avatar-cleanup.test.mjs`
- `scripts/ai-test`

保留原因：数据库模型、迁移、备份、恢复、校验和基础烟测仍然有用。

### 静态资源

- `public/brand`

保留原因：品牌 Logo 是产品页面和公开名片的可复用资产。

### 参考资料

- `docs/reference-images`
- `docs/DEVELOPMENT_DIRECTION_20260707.md`
- `docs/PRD_Link168_V2_DIRECTION_20260707.md`
- `docs/CURATED_CODE_MANIFEST.md`

保留原因：分支必须知道产品方向来自哪里，以及代码为什么这样取舍。

## 2. 从活动分支剔除

- `.git`：源仓库历史不复制，新分支重新初始化。
- `.agents`：代理过程文件不属于产品代码。
- `node_modules`：依赖应通过 `npm install` 生成。
- `.next`：构建缓存不入分支。
- `storage`：运行期上传数据不入分支。
- `.env`、`.env.local`：本地密钥不入分支。
- `00_AGENT_CONTROL`：过程控制文件不属于产品代码。
- `77me-output`、`77me-output-v2`：交付过程文件不进入新分支根。
- `docs/archive`、`docs/future`、`docs/superpowers`：历史/未来/过程文档不作为 V2 主分支依据。
- `build.log`、`tsconfig.tsbuildinfo`：构建产物不入分支。
- `src/generated`：生成代码后续通过工具生成，不直接复制。

## 3. 主动剔除的产品线

- `src/app/admin`：旧后台路线，V2 统一使用 Jeepwork。
- `src/app/showcase`：展示中心不是 V2 MVP 主产品。
- `src/components/showcase`：同上。
- `src/app/enterprise-ai`：企业 AI 独立产品线暂缓。
- `src/app/api/admin`：旧后台 API 暂不进入主线。
- `src/app/api/enterprise-ai`：企业 AI API 暂缓。
- `src/lib/showcase*.ts`：展示中心配置暂缓。

## 4. 后续需要重构的保留项

这些代码会被复制，但不是代表结构已经合理：

- `/dashboard` 与 `/workbench`：当前可复用能力多，但必须合并到 `/console`。
- `/api/dashboard` 与 `/api/workbench`：后续要按控制台域重新整理。
- `src/components/dashboard*` 与 `src/components/workbench`：后续要沉淀为统一控制台组件。
- `src/lib/ai`：要继续统一 AI 命名、额度、成本和风控。
- `prisma/migrations`：包含历史迁移，短期保留以避免破坏数据库连续性，长期可在新基线稳定后整理。

## 5. 新分支验收

- 能看到新版 PRD 和方向文档。
- 源仓库密钥、依赖、构建缓存和运行期文件没有被复制。
- 分支路径是独立 Git 仓库。
- 当前分支名为 `codex/link168-v2-direction`。
- 首次提交只包含 V2 方向代码和文档。
