# link168.me 安全与密钥管理说明

版本：V0.1 MVP Draft  
更新日期：2026-06-18

> 严禁在仓库、文档、日志、截图中写入任何真实密钥、真实数据库连接串、真实 SMTP 密码、真实支付密钥、真实云厂商主账号 AccessKey。

## 1. 服务器环境变量专属项

以下配置必须只存在服务器环境变量中，不能放进网页后台，也不能保存在数据库中：

- `DATABASE_URL`
- `SESSION_SECRET`
- `ADMIN_SECRET`
- `CONFIG_ENCRYPTION_KEY`
- 服务器 root 密码
- GitHub Token
- 阿里云主账号 AccessKey

其中：

- `CONFIG_ENCRYPTION_KEY` 是 AppConfig 敏感字段的根密钥
- 该密钥只用于服务器端加解密
- 不允许通过网页后台读取、展示、保存或修改

## 2. 超级管理员配置中心规则

Link168 的第三方服务配置统一由 `/admin/settings/api` 超级管理员配置中心管理，适用范围包括：

- AI 服务
- 邮件 SMTP
- 支付配置
- 对象存储
- 短信服务
- 地图 / 统计 / Webhook / 其他第三方配置

规则如下：

1. 只有 `role=super_admin` 可访问
2. 敏感字段必须后端加密存储
3. 前端只返回脱敏值，例如 `sk-****abcd`
4. 普通用户、普通管理员不得查看完整密钥
5. 所有第三方 API 必须经过后端代理调用
6. 所有会产生成本的功能默认关闭
7. AI / 支付 / 短信 / 云存储等能力必须由老板手动启用

## 3. 系统保留账号规则

- `test@link168.me`：普通测试账号，`role=user`，`is_system=true`
- `admin@link168.me`：管理员账号，`role=admin`，`is_system=true`
- `superadmin@link168.me`：超级管理员账号，`role=super_admin`，`is_system=true`

系统账号规则：

1. 禁止通过后台、API、清理脚本删除
2. 数据库层通过 trigger 防止误删
3. 管理员不得随意重置或替换系统保留账号

## 4. 第三方密钥使用原则

- AI Key、SMTP 密码、支付 API Key、对象存储 AccessKey、短信密钥、统计 Key 等都属于敏感字段
- 这些字段写入数据库前必须加密
- 如果前端提交的值包含 `****`，后端必须拒绝保存
- 日志中不得打印完整密钥
- 任何测试失败信息只允许返回安全摘要

## 5. 云厂商密钥最小权限要求

如果使用阿里云 OSS、腾讯云 COS、短信、地图等云厂商服务：

1. 必须优先使用最小权限子账号
2. 禁止在产品配置中心使用主账号 AccessKey
3. 上传、短信、统计等服务要按最小可用权限拆分

## 6. 部署前检查

- `.env.local`、`.env.production` 未提交到 Git
- 仓库中不存在真实 `DATABASE_URL`
- 仓库中不存在真实 `ADMIN_SECRET`
- 仓库中不存在真实 `CONFIG_ENCRYPTION_KEY`
- 超级管理员配置中心敏感字段均为脱敏展示
- 所有付费 API 默认关闭
- 生产环境使用 `npx prisma migrate deploy`

## 7. 说明

本文件只记录安全原则与边界，不记录任何真实值。  
真实配置仅由老板或运维在服务器环境中维护。
