# 当前轮禁止修改清单

- `00_GOVERNANCE_LOCKED/**`
- 根目录 `PRODUCT_CONSTITUTION.md` 兼容入口
- 根目录正式 `PRD.md`
- 所有业务源代码
- `prisma/**`、数据库迁移和生产数据
- `package.json`、锁文件和依赖版本
- `.env*`、服务器配置、支付、邮件和 AI 密钥
- GitHub 默认分支、保护规则、生产部署和远程服务器

发现必须修改上述范围才能继续时，停止对应任务并向总控报告。
