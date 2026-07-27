# Link168 风险登记

概率/影响均为基于当前代码结构的审计判断，不是生产统计。

| 风险 | 严重程度 | 发生概率 | 影响 | 证据 | 建议处理批次 |
|---|---|---|---|---|---|
| 个人模型与 Workspace 数据边界不一致 | P0 | 高 | 企业 A/B 数据混淆、权限失效 | `Profile.userId`、`Product.userId`、`KnowledgeDoc.userId`、`Lead.profileId`；Workspace 仅关联成员/域名/额度 | 第 1 批，先定归属和服务端授权 |
| 三套用户后台并存 | P1 | 高 | 重复逻辑、入口冲突、验收口径不一致 | `/console`、`/workbench`、`/dashboard` 均出现在 build 路由 | 第 1 批，统一主导航和兼容跳转 |
| D2 企业域名套餐判断漂移 | P0 | 中 | enterprise_pro 可能无法按合同使用域名，或旧别名越权 | `src/lib/domains.ts` 的 `PLAN_DOMAIN_LIMITS` 使用 `enterprise_pro_plus`；正式配置为 `enterprise_pro` | 第 1 批，修复并补攻击用例 |
| Host 与 Workspace 真实绑定未做公网验证 | P0 | 中 | A 企业 Host 访问 B 企业页面、canonical 错误 | D2 代码和测试存在，但无本轮服务器/DNS/HTTPS 证据 | 第 1 批后服务器验收 |
| 企业额度并发/退款未用真实隔离 PostgreSQL 验证 | P0 | 中 | 重复扣点、退款状态错误、额度不一致 | `enterprise-quota.ts` 有条件更新和状态机；PRD D4 明确要求真实并发 | 第 1 批，隔离库并发测试 |
| RAG 名义与实现不一致 | P1 | 高 | AI 读取范围、召回质量和引用不可控 | 仅 `KnowledgeDoc.content` 整体注入 prompt，未发现 chunk/embedding/vector | 第 2 批，先定义最小检索协议 |
| Lead 新旧状态并存 | P1 | 高 | 统计、筛选和转化口径分裂 | `Lead.status` 注释与 workbench route 同时支持历史状态 | 第 1 批，迁移/兼容读取后单一写入 |
| Service/Offer/Booking/Quote 只有组件语义 | P1 | 中 | 预约、报价和产品转化无法形成独立可追踪状态 | `/api/contact` 的 `sourceComponent`/消息拼接 | 第 2 批，按真实使用选择最小模型 |
| 旧 Showcase 数据与运行时边界混杂 | P2 | 中 | 误重新暴露退役功能或误删历史数据 | 无公开路由；Schema/审计动作仍在；`showcase-retirement.test.ts` | 后续清理，必须先备份/批准 |
| 外部服务未配置 | P0 | 未验证 | 不能证明真实 AI、邮件、支付、退款、上传 | `src/app/api/jeepwork/settings/api/route.ts` 明确要求真实测试；本轮未配置 | 服务器/配置验收批次 |
| CI 触发分支仍包含历史线 | P2 | 中 | 旧分支规则与唯一主线混淆 | `.github/workflows/mvp-closeout.yml`、`v1-check.yml` | 后续治理，不改历史 |
| 内存限流不适合多实例生产 | P1 | 中 | 跨实例绕过频率限制 | `/api/contact` 使用模块级 Map；注释明确生产应使用 Redis | 部署前，接入共享限流存储 |

## 当前风险判断

本地工程质量目前可接受：全部本地门禁通过。但“可 build”不能降低数据隔离、真实外部服务、浏览器和公网 Host 的风险等级；这些仍是发布前阻断项。
