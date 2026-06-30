// Part 3: 系统逻辑层 + 数据库 + 迁移 + 安全 + 部署
const { p, heading, buildTable, imageParagraph } = require("./gen-doc-part1");
const { PageBreak } = require("docx");

function section7() {
  return [
    heading("7. 系统逻辑层说明", 1),
    p("系统按五层划分：身份层、主页内容层、短链接层、AI 能力层、管理控制层，外加跨层的安全防护层。每层职责独立，但通过数据库（Prisma Schema）与统一的 auth/rate-limit/content-safety 模块协同。", true),
    heading("7.1 用户身份层", 2),
    p("职责：登录、注册、Session、角色与权限。核心数据：users（bcrypt password_hash）、sessions（token_hash）、password_reset_tokens、email_verification_tokens、login_attempts。角色使用 User.role（USER/ADMIN/SUPER_ADMIN）。权限入口统一使用 src/lib/auth.ts 的 requireLogin/requireAdmin/requireSuperAdmin，避免业务路由散落权限判断。", true),
    heading("7.2 主页内容层", 2),
    p("职责：Profile、Links、Avatar、Theme、Public Page。每一个用户有且仅有一个 Profile，一对多关联 links；公开主页 /[username] 渲染时使用 isPublic/isActive 过滤。头像与主题字段在 profiles 中用 URL/JSON 表达，避免把图片或样式直接入数据库。", true),
    heading("7.3 短链接层", 2),
    p("职责：ShortLink（自定义 slug、目标 URL）、Link（主页下挂的链接点击总计数）、link_clicks 日志表。点击统计分为两个维度：links.totalClicks（聚合）与 link_clicks（细粒度日志）。跳转前对目标 URL 做协议限制，禁止 javascript: 与 data:。", true),
    heading("7.4 AI 能力层", 2),
    p("职责：Assistant Config、Provider、Chat API、Usage Logs、Rate Limit。Assistant Config 位于 src/lib/ai/assistants.ts，定义五大 Agent 的系统提示与角色信息；Provider 封装为统一对话接口；Chat API 为 /api/enterprise-ai/chat；Usage 通过 ai_usage_logs 汇总；Rate Limit 复用 src/lib/rate-limit.ts，独立设置 AI 专用阈值。", true),
    heading("7.5 管理控制层", 2),
    p("职责：Admin APIs、Super Admin APIs、Config Center、审计日志（待补）。Super Admin 能力集中在 /admin/settings/api、/admin/users、/admin/ai-usage 等路由；普通 Admin 只能查看与处理举报。所有写操作都应经过 requireSuperAdmin。审计日志表后续可扩展，记录管理员操作、目标资源、时间戳。", true),
    heading("7.6 安全防护层", 2),
    p("职责：Rate Limit（全链路限流）、Content Safety（文本内容基础过滤）、Password Hash（bcrypt）、Token Hash（SHA256）、File Upload Safety（MIME+magic bytes+禁止 SVG）、Sensitive Config Encryption（AES-GCM/同类加密后写 app_configs）。安全逻辑集中在 src/lib/rate-limit.ts、content-safety.ts、app-config.ts、admin-auth.ts。", true),
    new PageBreak(),
  ];
}

function section8() {
  const tables = [
    {
      name: "users",
      desc: "账号信息与身份角色",
      fields: "id、email、emailVerified、password_hash、role（USER/ADMIN/SUPER_ADMIN）、isSystem、lastLoginAt、createdAt、updatedAt",
      rel: "1:1 profiles（profile.userId UNIQUE）；1:N sessions、short_links、ai_usage_logs、reports",
      keep: "永远只存 password_hash；不要在 users 表存放明文密码/Token；系统账号标记 isSystem=true 避免误删。",
    },
    {
      name: "profiles",
      desc: "用户公开主页",
      fields: "id、username UNIQUE、displayName、bio、avatarUrl、isPublic、themeConfig、createdAt、updatedAt、userId UNIQUE",
      rel: "1:1 users；1:N links",
      keep: "username 保留字与路由保留字必须一致；isPublic 切换需要同步展示与搜索。",
    },
    {
      name: "links",
      desc: "主页展示链接",
      fields: "id、profileId、title、url、description、isActive、order、totalClicks、createdAt、updatedAt",
      rel: "N:1 profiles；1:N link_clicks",
      keep: "order 用于前端排序；新增字段（图标、分组）通过 Prisma Migrate 增量上线。",
    },
    {
      name: "sessions",
      desc: "用户登录态",
      fields: "id、userId、token_hash、expiresAt、createdAt",
      rel: "N:1 users",
      keep: "token_hash 与 cookie 中随机 Token 一一对应；过期时批量清理；HTTPS 下 Cookie Secure=true。",
    },
    {
      name: "reports",
      desc: "用户举报",
      fields: "id、reporterId、profileId、linkId、reason、detail、status（NEW/PROCESSED）、handlerNote、processedAt、createdAt",
      rel: "N:1 users、profiles、links",
      keep: "handlerNote 与 processedAt 为管理员处理痕迹；禁止对同一举报重复计数。",
    },
    {
      name: "password_reset_tokens",
      desc: "找回密码 Token",
      fields: "id、userId、token_hash、expiresAt、used、createdAt",
      rel: "N:1 users",
      keep: "Token 仅能使用一次；短期有效（建议 30 分钟内）；接口加 IP 限流。",
    },
    {
      name: "email_verification_tokens",
      desc: "邮箱验证 Token",
      fields: "id、userId、token_hash、expiresAt、used、createdAt",
      rel: "N:1 users",
      keep: "SMTP 未启用时表单可跳过真实发送；真实用户后必须启用。",
    },
    {
      name: "login_attempts",
      desc: "防撞库日志",
      fields: "id、ip、email、success、createdAt",
      rel: "松散表",
      keep: "滑动窗口内失败次数超限时拒绝；定期归档避免表膨胀。",
    },
    {
      name: "app_configs",
      desc: "系统配置中心",
      fields: "id、configKey UNIQUE、config_value（加密后字符串）、isSecret、description、createdAt、updatedAt",
      rel: "KV 表",
      keep: "敏感配置永远加密存储；KEY 命名按 service.sub-key 规范（例如 ai.primary.key、smtp.password）。",
    },
    {
      name: "ai_usage_logs",
      desc: "AI 用量日志",
      fields: "id、userId、assistantType、promptTokens、completionTokens、cost、createdAt",
      rel: "N:1 users",
      keep: "assistantType 枚举化；按日期分组合计；成本字段随模型调价可能需重算。",
    },
    {
      name: "short_links",
      desc: "短链接",
      fields: "id、userId、slug UNIQUE、targetUrl、totalClicks、createdAt、updatedAt",
      rel: "N:1 users；1:N link_clicks",
      keep: "targetUrl 协议限制 http/https；slug 保留字与 username 保留字类似处理。",
    },
    {
      name: "link_clicks",
      desc: "点击日志",
      fields: "id、linkId、shortLinkId、ip、userAgent、referer、createdAt",
      rel: "N:1 links / short_links",
      keep: "不要写入可识别身份信息；定期按月份归档或截断。",
    },
  ];

  const r = [
    heading("8. 数据库设计说明", 1),
    p("数据库使用 PostgreSQL 14+，通过 Prisma Client 统一访问。Schema 定义在 prisma/schema.prisma；迁移脚本位于 prisma/migrations/。所有数据库变更必须通过 migration 发布，禁止在生产数据库手改 DDL。", true),
    heading("8.1 核心数据表", 2),
  ];
  for (const t of tables) {
    r.push(heading(t.name + "：" + t.desc, 3));
    r.push(p("关键字段：" + t.fields, true));
    r.push(p("关联关系：" + t.rel, true));
    r.push(p("维护注意事项：" + t.keep, true));
  }
  r.push(heading("8.2 为什么只存哈希与加密", 2));
  r.push(p("为什么密码只存 password_hash：bcrypt 加盐哈希能抵抗离线彩虹表；即使数据库泄露也无法还原明文密码。升级成本轮数通过 env 可调。", true));
  r.push(p("为什么 Token 只存 token_hash：Session/重置/验证 Token 都以 SHA256 等哈希入库，Cookie 或邮件中存放原文；对比时再算一次哈希，避免数据库泄露直接劫持会话。", true));
  r.push(p("为什么敏感配置要加密：app_configs.config_value 对 AI Key、SMTP 密码等字段加密存储，数据库备份不会把密钥泄露到第三方。", true));
  r.push(heading("8.3 为什么数据库必须可迁移", 2));
  r.push(p("真实用户出现后，数据库可能需要迁移服务器、跨环境、备份恢复。通过 Prisma Migrate + pg_dump 的组合，保证每次发布都可在 staging 先行验证、在生产可回滚。", true));
  new PageBreak();
  return r;
}

function section9() {
  return [
    heading("9. 数据库迁移与封装建议", 1),
    p("数据库迁移流程标准化是本项目后续维护的重中之重。当前方案：PostgreSQL + Prisma Schema + prisma/migrations；所有业务访问统一走 Prisma Client，不在路由或组件里写原生 SQL。", true),
    heading("9.1 推荐封装策略", 2),
    buildTable(
      ["策略", "说明", "实现位置"],
      [
        ["统一走 Prisma", "业务代码只使用 @prisma/client；禁止手写原生 SQL", "src/lib/db.ts"],
        ["不散落原生 SQL", "如需复杂查询在 lib 层封装函数，不写在路由内", "src/lib/*.ts"],
        ["迁移通过 migration", "每次 Schema 变更使用 prisma migrate dev，生成可回放脚本", "prisma/migrations/*"],
        ["生产前 pg_dump", "生产迁移前执行 pg_dump 加密备份，失败时可回滚", "服务器运维脚本"],
        ["staging 先行", "先在 staging 环境跑迁移并验证，再走生产", "CI/CD 流程"],
        ["账号创建走脚本", "管理员/super_admin 通过 seed/脚本创建，不手写明文密码", "prisma/seed.ts"],
        ["导出排除密钥", "备份时避免把 API Key/Token 明文带入日志/脚本", "app-config.ts 加密存储"],
        ["备份加密保存", "pg_dump 输出加密压缩后保存；解密口令与服务器分离", "运维文档"],
      ],
      [1800, 4200, 3000],
    ),
    heading("9.2 维护流程：备份、迁移、回滚、恢复、数据脱敏", 2),
    p("备份：每周 pg_dump 一次，增量 WAL 持续；每次迁移前再额外备份。备份使用 AES/压缩后写入独立存储。", true),
    p("迁移：staging 跑 prisma migrate deploy 并通过冒烟测试；生产在低峰执行，迁移完成后观察 30 分钟；保留失败时的 dump 快照。", true),
    p("回滚：Prisma migrate 本身不可逆；发生失败时使用迁移前的 dump 恢复；重大变更前建议先做 read-only 副本演练。", true),
    p("恢复：恢复流程文档化，包含 pg_restore、环境变量、超级管理员账号重建步骤；恢复完成后运行自检脚本。", true),
    p("创建账号：通过 seed 脚本或 prisma studio（仅内网）生成 bcrypt 哈希后入库；不在代码或日志输出明文密码。", true),
    p("数据脱敏：导出供测试/开发使用时，把邮箱替换为 example.com、password_hash 替换为固定测试值、avatarUrl 替换为占位图、api key 替换为 sk-**** 模拟值。", true),
    p("迁移到新服务器：新环境先初始化数据库 + 跑 migrate deploy → 从备份恢复数据 → 调整 .env.production → Nginx/PM2 重启；先使用临时域名验证，再切 DNS。", true),
    new PageBreak(),
  ];
}

function section10() {
  const done = [
    ["bcrypt 12 轮密码哈希", "users.password_hash，登录时 bcrypt.compare"],
    ["Session Cookie", "HttpOnly+SameSite；生产环境 COOKIE_SECURE=true"],
    ["注册限流", "rate-limit.ts，按 IP+邮箱滑动窗口"],
    ["找回密码限流", "rate-limit.ts，按邮箱短期限制"],
    ["登录防爆破", "login_attempts 记录；同邮箱/IP 超限时拒绝"],
    ["AI 调用限流", "rate-limit.ts 对 AI 接口独立阈值，加用户额度+全局额度"],
    ["短链接创建限流", "按 userId 限制频率；限制 targetUrl 协议"],
    ["上传 MIME 校验", "服务器读取 content-type 并拒绝非图片 MIME"],
    ["文件头 magic bytes 校验", "读取文件前几个字节判定真实类型"],
    ["禁止 SVG", "SVG 容易被注入脚本；统一转为 PNG/JPG/WEBP"],
    ["随机文件名", "上传后使用 crypto.randomUUID + 扩展名，避免路径穿越"],
    ["API Key 加密存储", "app_configs.config_value 加密后写入；前端仅显示脱敏值"],
    ["管理员 API 鉴权", "requireSuperAdmin/requireAdmin 统一入口"],
    ["内容安全基础过滤", "content-safety.ts，对明显违规词拒写"],
    ["Prompt Injection 基础检测", "输入侧过滤典型越狱短语；系统指令独立于用户输入"],
  ];
  const todo = [
    ["AI 输出审核", "对 Agent 输出做内容安全二次审查"],
    ["图片 NSFW 审核", "上传图片前调用图像内容审核 API"],
    ["管理员审计日志", "记录管理员/超级管理员每次写操作"],
    ["分布式限流", "使用 Redis/Upstash 替换当前内存 Map"],
    ["手机端真实设备测试", "在 iOS/Android 主流机型验证 UI 与交互"],
    ["短链恶意域名库", "对目标 URL 做域名黑名单检查"],
    ["后台隐藏路径 /jeepwork", "Nginx 层仅允许指定 IP"],
    ["HTTPS 与 Cookie Secure", "生产强制 HTTPS，HSTS、CSRF 基础防护"],
  ];
  return [
    heading("10. 安全设计说明", 1),
    heading("10.1 已完成安全点", 2),
    buildTable(["安全项", "说明"], done.map(d => [d[0], d[1]]), [2500, 6500]),
    heading("10.2 待补安全点", 2),
    buildTable(["待补项", "说明"], todo.map(d => [d[0], d[1]]), [2500, 6500]),
    new PageBreak(),
  ];
}

function section11() {
  return [
    heading("11. 部署与服务器状态", 1),
    p("代码仓库：项目代码使用 GitHub master 同步。线上部署路径：/www/link168。运行方式：Next.js 使用 PM2 守护进程；Nginx 做反向代理与静态资源缓存。数据库：PostgreSQL 独立实例，通过 Prisma Migrate 管理结构迁移。", true),
    buildTable(
      ["部署项", "说明"],
      [
        ["代码仓库", "GitHub master 同步（开发/生产分支策略可后续完善）"],
        ["服务器路径", "/www/link168，node_modules 与构建产物不入库"],
        ["PM2 配置", "pm2 start ecosystem.config.js 或等价配置；设置 restart on crash"],
        ["Nginx 反向代理", "绑定域名，代理到 Next.js 端口；HTTPS 需要证书（建议使用 ACME 自动化）"],
        ["PostgreSQL", "独立实例，连接字符串仅由环境变量 DATABASE_URL 管理"],
        [".env.production", "文件权限 600（仅文件主可读），不提交到 Git"],
        ["生产数据库迁移", "prisma migrate deploy；每次发布前在 staging 先行验证"],
        ["测试账号/管理员账号", "账号已创建，密码由服务器 root 权限文件保存，不在文档中明文"],
        ["敏感信息", "服务器地址、API Key、数据库密码均由环境变量管理"],
      ],
      [2500, 6500],
    ),
    p("注意：本文件不写任何真实密钥、真实数据库密码、真实账号密码、Token。如需要调整，请参考服务器上 .env.production 与超级管理员配置中心 /admin/settings/api。", true),
    new PageBreak(),
  ];
}

module.exports = { section7, section8, section9, section10, section11 };
