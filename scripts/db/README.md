# Link168 数据库工具 (`scripts/db/`)

本目录封装一套 PostgreSQL 备份 / 恢复 / 迁移 / 初始化 / 校验脚本，用于：

- 把当前数据库迁移到新服务器
- 恢复到某次备份快照
- 部署 Prisma migrations 到生产环境
- 创建 demo / admin / super-admin 系统账号
- 验证数据库结构是否完整

所有脚本均通过 `npm run` 调用，见 [package.json](../../package.json)。

---

## 1. 如何备份数据库

```bash
npm run db:backup
```

行为：

- 读取 `DATABASE_URL`（来自环境变量或 `.env`）。
- 自动创建备份目录（默认 `./backups/db`，可通过 `BACKUP_DIR` 覆盖）。
- 调用 `pg_dump` 导出 `.sql`，并用 `gzip` 压缩为 `link168-db-YYYYMMDD-HHmmss.sql.gz`。
- 输出文件路径和大小。
- 在支持的系统上把文件权限改为 `chmod 600`（仅所有者可读）。

要求：

- 系统已安装 PostgreSQL 客户端工具（`pg_dump` / `psql`）。
  - macOS：`brew install postgresql`
  - Debian / Ubuntu：`apt install postgresql-client`
  - Fedora / RHEL：`dnf install postgresql`
  - Windows：<https://www.postgresql.org/download/windows/>

注意：

- 备份文件 **不要提交到 Git**（.gitignore 已保护 `*.sql` / `*.sql.gz` / `backups/`）。
- 输出中 **不会** 打印 `DATABASE_URL`。

---

## 2. 如何恢复数据库

```bash
CONFIRM_RESTORE=yes npm run db:restore -- ./backups/db/link168-db-20260618-081500.sql.gz
```

行为：

- 读取 `DATABASE_URL` 和命令行传入的备份文件路径。
- 支持 `.sql` 和 `.sql.gz` 两种格式。
- 恢复前提醒先备份当前库；`CONFIRM_RESTORE=yes` 未设置则 **拒绝执行**。
- 调用 `psql` 恢复。失败则直接退出，**不会** 自动删除备份文件。

恢复后建议：

```bash
npm run db:migrate
npm run db:verify
```

---

## 3. 如何迁移数据库（Prisma deploy）

```bash
npm run db:migrate
```

行为：

- 执行 `prisma migrate status`，然后 `prisma migrate deploy`。
- 最后自动执行 `npm run db:verify`。

**生产环境保护：**

- 当 `NODE_ENV=production` 时，必须同时设置
  `CONFIRM_PRODUCTION_MIGRATE=yes`，否则直接退出。
- 迁移前会提示先执行 `npm run db:backup`。

---

## 4. 如何验证数据库结构

```bash
npm run db:verify
```

行为：

- 用 Prisma Client 检查 12 个必备表：
  `users, profiles, links, sessions, reports, short_links, link_clicks,
  password_reset_tokens, email_verification_tokens, login_attempts,
  app_configs, ai_usage_logs`。
- 检查关键字段（`users.email`, `users.password_hash`, `users.role`,
  `users.email_verified`, `profiles.username`, `links.total_clicks`）。
- 统计 `users / profiles / links / short_links / reports / ai_usage_logs` 的行数。
- **不会** 输出 `password_hash`、`DATABASE_URL` 或其他密钥。
- 最终输出 `数据库结构验证通过` 或失败，并以非零退出码返回。

---

## 5. 如何创建系统账号

```bash
npm run db:create-users
```

行为：

- 创建 3 个账号 + 3 个 profile：
  - `demo@link168.me` / 角色 `user` / profile 用户名 `demo`
  - `admin@link168.me` / 角色 `admin` / profile 用户名 `admin`
  - `superadmin@link168.me` / 角色 `super_admin` / profile 用户名 `superadmin`
- 使用 `bcrypt` 12 轮做密码 hash，**只写入 `password_hash`**，
  **不写明文密码**。
- 若用户已存在，则更新其 `password_hash / role / email_verified`。
- 密码来源：
  - 若设置了环境变量 `DEMO_PASSWORD / ADMIN_PASSWORD / SUPER_ADMIN_PASSWORD`
    则使用提供的值；否则生成 20 位随机强密码。
- 密码 **只在控制台显示一次**，请即时保存到服务器安全位置。
- 邮箱可通过 `DEMO_EMAIL / ADMIN_EMAIL / SUPER_ADMIN_EMAIL` 覆盖。

安全注意：

- 不要把密码写入仓库 / .env.example / 文档。
- `create-system-users` 输出的密码只在终端显示一次，不会落盘。

---

## 6. 如何把数据库迁移到新服务器

**目标：** 新服务器一套全新环境，并把用户数据完整迁移过去。

**前提条件：**

- 旧 / 新服务器均已安装 PostgreSQL 客户端。
- 两端 `node_modules` 已安装（`npm ci`）。
- 两端 `DATABASE_URL` 已配置，且指向各自的数据库。

**操作步骤：**

```bash
# 1) 旧服务器：备份数据库
ssh old-server
cd /www/link168
npm run db:backup
# 记录输出的 .sql.gz 绝对路径

# 2) 把备份文件安全传输到新服务器
#   推荐通过 scp / rsync over SSH，走内网或 VPN 通道
scp old-server:/www/link168/backups/db/link168-db-<TIMESTAMP>.sql.gz \
    new-server:/tmp/

# 3) 新服务器：安装 PostgreSQL（如果尚未安装）
ssh new-server
# Debian/Ubuntu 示例：
sudo apt update && sudo apt install -y postgresql postgresql-client

# 4) 新服务器：创建数据库和数据库用户（示例）
sudo -u postgres psql -c "CREATE USER link168_app WITH PASSWORD '...';"
sudo -u postgres psql -c "CREATE DATABASE link168 OWNER link168_app;"
sudo -u postgres psql -d link168 -c "GRANT ALL PRIVILEGES ON DATABASE link168 TO link168_app;"

# 5) 新服务器：配置 DATABASE_URL
#    编辑 /www/link168/.env.production（或通过 systemd / PM2 注入）
#    DATABASE_URL=postgresql://link168_app:<PASSWORD>@localhost:5432/link168

# 6) 新服务器：恢复备份
cd /www/link168
CONFIRM_RESTORE=yes npm run db:restore -- /tmp/link168-db-<TIMESTAMP>.sql.gz

# 7) 新服务器：部署 Prisma migrations
npm run db:migrate

# 8) 新服务器：结构校验
npm run db:verify

# 9) 启动应用
pm2 start npm --name link168 -- start
pm2 save

# 10) 人工检查
#    - 登录页 / 登录（demo / admin / super-admin）
#    - 主页正常渲染
#    - 短链接功能可用
#    - AI 功能（如启用）可用
#    - 后台（dashboard）正常
```

**注意：**

- 迁移过程中建议暂停旧服务器写操作（例如把 `nginx` 切到 maintenance
  page，或停掉 `pm2 stop link168` 再备份），避免在备份窗口内写入新
  数据导致恢复后数据不一致。
- 恢复到新库后，**一定** 运行 `npm run db:verify` 验证完整性。

---

## 7. 生产环境操作顺序

生产环境任何写操作之前都必须：

1. 通知团队并获得确认。
2. 执行 `npm run db:backup` 产生一份最新备份。
3. 在 staging 环境把该备份还原并跑一次 `db:migrate` + `db:verify` 做演练。
4. staging 演练成功后，再对生产库执行相同步骤。
5. 操作后立刻跑 `db:verify`，并在关键路径做人工登录验证。
6. 保留本次备份文件及操作日志。

生产环境运行迁移命令形式：

```bash
NODE_ENV=production CONFIRM_PRODUCTION_MIGRATE=yes npm run db:migrate
```

---

## 8. 回滚方案

Prisma Migrate 是 *forward-only* 的，它本身不提供自动回滚。
如果新 migration 引入错误，建议使用 **备份回退** 流程：

```bash
# 1) 停止应用
pm2 stop link168

# 2) 还原数据库到迁移前的备份
CONFIRM_RESTORE=yes npm run db:restore -- ./backups/db/link168-db-<PREV>.sql.gz

# 3) 从代码层面 revert 相关 migration（如果是代码问题，
#    git revert 引入该 migration 的 commit）
git revert <commit-sha>

# 4) 重新部署应用，然后启动
pm2 restart link168
npm run db:verify
```

> 关键：**任何导致 schema 变化的 deploy 前，必须先有可还原的备份**。

---

## 9. 不要保存明文密码

- `create-system-users.js` 只写入 `password_hash`（bcrypt 12 轮）。
- 所有脚本 **不会** 把明文密码写到磁盘 / 日志 / Git。
- 数据库中唯一与密码相关的字段是 `users.password_hash`。
- 不要把 `DEMO_PASSWORD / ADMIN_PASSWORD / SUPER_ADMIN_PASSWORD` 的真实
  值放入 `.env.example`。

---

## 10. 不要提交备份文件和 .env

- `.gitignore` 已保护：
  - `backups/`
  - `*.sql`
  - `*.sql.gz`
  - `.env`
  - `.env.*` （但保留 `!.env.example`）
- 不要把生产 `DATABASE_URL`、`SESSION_SECRET`、`ADMIN_SECRET`、
  `CONFIG_ENCRYPTION_KEY` 等写回代码库或提交到 Git。
- 服务器上的 `.env.production` 建议权限 `chmod 600`，并由部署流程
  注入（例如通过 Ansible / 云 Secret Manager / systemd EnvironmentFile）。

---

## 脚本文件索引

| 文件 | 用途 | 敏感操作 | 确认 env |
| --- | --- | --- | --- |
| `backup-db.js` | 备份 PostgreSQL | 否 | `DATABASE_URL` |
| `restore-db.js` | 从备份恢复 | **覆盖现有数据库** | `DATABASE_URL`, `CONFIRM_RESTORE=yes` |
| `migrate-db.js` | Prisma migrate deploy | 是（schema 写操作） | `DATABASE_URL`；若 `NODE_ENV=production` 需 `CONFIRM_PRODUCTION_MIGRATE=yes` |
| `verify-db.js` | 结构 / 行数校验 | 否（只读） | `DATABASE_URL` |
| `create-system-users.js` | 初始化 demo/admin/super-admin | 是（会 upsert 用户记录） | `DATABASE_URL`，可选 `DEMO_EMAIL` 等 |
