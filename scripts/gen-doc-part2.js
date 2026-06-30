// Part 2: 用户功能 + AI Agent + 管理后台
const { p, heading, buildTable, imageParagraph } = require("./gen-doc-part1");
const { PageBreak } = require("docx");

function section4() {
  const features = [
    {
      title: "4.1 注册流程",
      body: [
        "用户入口：首页右上角「注册」按钮，或直接访问 /register。",
        "操作步骤：填写邮箱 + 密码 → 提交 → 返回登录成功并跳转到 /dashboard。",
        "后端接口：POST /api/auth/register，校验邮箱格式、密码强度，bcrypt 哈希后写入 users 表。",
        "数据库涉及表：users、email_verification_tokens（如启用验证）。",
        "关键校验：邮箱唯一性、密码长度、注册限流（IP + 邮箱）。",
        "后续维护注意点：如需扩展第三方登录（微信/手机号），建议在 auth 模块新增 provider 子路由，保持 bcrypt + Session 逻辑。",
      ],
      shot: "screenshot-register.png", caption: "图 4：用户注册页面",
    },
    {
      title: "4.2 登录流程",
      body: [
        "用户入口：/login 或首页右上角「登录」。",
        "操作步骤：填写邮箱 + 密码 → 提交 → 获得 HttpOnly Cookie → 重定向 /dashboard。",
        "后端接口：POST /api/auth/login，查询 users，bcrypt 比对；成功后生成随机 Session Token，以 SHA256 哈希写入 sessions 表。",
        "数据库涉及表：users、sessions、login_attempts（用于反撞库）。",
        "关键校验：bcrypt 比对、登录失败限流（同邮箱/同 IP 短时间超限拒绝）。",
        "后续维护注意点：HTTPS 环境开启 COOKIE_SECURE=true；定期清理过期 Session。",
      ],
      shot: "screenshot-login.png", caption: "图 5：统一登录入口",
    },
    {
      title: "4.3 找回密码流程",
      body: [
        "用户入口：/forgot-password。",
        "操作步骤：填写注册邮箱 → 发送重置 Token → 点击邮件链接 → /reset-password 设置新密码。",
        "后端接口：POST /api/auth/forgot-password 写入 password_reset_tokens；POST /api/auth/reset-password 验证后更新 bcrypt 哈希。",
        "数据库涉及表：users、password_reset_tokens。",
        "关键校验：Token 唯一性、有效期、一次性消耗（used=true）、新密码强度、接口限流。",
        "后续维护注意点：SMTP 邮件发送走超级管理员配置，不在源码中写密码。",
      ],
      shot: "screenshot-forgot-password.png", caption: "图 6：找回密码入口",
    },
    {
      title: "4.4 创建主页流程",
      body: [
        "用户入口：首次登录 /dashboard 引导设置 username。",
        "操作步骤：输入 username → 校验唯一/格式/保留字 → 写入 Profile。",
        "后端接口：PUT /api/dashboard（首次创建） + GET /api/dashboard。",
        "数据库涉及表：profiles（users 一对一，userId 唯一）。",
        "关键校验：username 唯一、保留字过滤（admin、api、dashboard、enterprise-ai 等）、长度限制。",
        "后续维护注意点：保留字清单随新增顶级路由同步更新，避免与用户主页冲突。",
      ],
    },
    {
      title: "4.5 编辑主页资料",
      body: [
        "用户入口：/dashboard 个人资料区。",
        "操作步骤：编辑显示名、简介、主题 → 保存。",
        "后端接口：PUT /api/dashboard，upsert 写入 Profile。",
        "数据库涉及表：profiles。",
        "关键校验：Session 鉴权、XSS 基础过滤（入库前清理）。",
        "后续维护注意点：主题字段 Schema 已预留，后续开放多主题切换。",
      ],
    },
    {
      title: "4.6 添加链接",
      body: [
        "用户入口：/dashboard 链接管理区。",
        "操作步骤：新建链接 → 填写标题、URL、描述 → 保存；支持激活/停用、排序。",
        "后端接口：POST/PATCH/DELETE /api/dashboard/links。",
        "数据库涉及表：links（profileId 外键）。",
        "关键校验：URL 格式、标题长度、按用户归属校验（防止越权）。",
        "后续维护注意点：可扩展链接图标、分组、点击热力分析，新增字段通过 Prisma Migrate 上线。",
      ],
    },
    {
      title: "4.7 头像上传",
      body: [
        "用户入口：/dashboard 头像上传按钮。",
        "操作步骤：选择本地图片 → 服务端校验并存储 → 返回访问 URL。",
        "后端接口：/api/dashboard/avatar（或 dashboard 统一入口）。",
        "数据库涉及表：profiles.avatarUrl。",
        "关键校验：文件后缀、MIME 类型、真实文件头 magic bytes（PNG/JPG/WEBP）、禁止 SVG/可执行扩展、文件大小限制、随机重命名。",
        "后续维护注意点：生产环境对接对象存储（S3 兼容），不要直接存本地磁盘；新增 NSFW 图片审核。",
      ],
    },
    {
      title: "4.8 公开主页访问",
      body: [
        "用户入口：/[username] 直接访问。",
        "操作步骤：首页输入用户名或扫描二维码跳转。",
        "后端接口：Next.js Server Component 读取 profile + links。",
        "数据库涉及表：profiles、links。",
        "关键校验：用户名存在、isPublic=true、关联链接 isActive=true。",
        "后续维护注意点：品牌 Footer 文案与回首页链接统一维护；后续 Pro 版可隐藏 Footer。",
      ],
      shot: "screenshot-demo-profile.png", caption: "图 7：用户公开主页",
    },
    {
      title: "4.9 二维码与分享",
      body: [
        "用户入口：/dashboard 分享区。",
        "操作步骤：生成公开主页 URL 的二维码，下载或截屏用于线下传播。",
        "后端接口：前端使用 react-qr-code 本地生成，不依赖服务端画图。",
        "数据库涉及表：无。",
        "关键校验：URL 是合法的公开主页地址。",
        "后续维护注意点：后续可扩展自定义二维码样式、海报生成（需要服务端画图）。",
      ],
    },
    {
      title: "4.10 短链接创建与访问",
      body: [
        "用户入口：/dashboard 短链接区（如启用）。",
        "操作步骤：输入目标 URL + 自定义 slug → 保存 → /s/[slug] 或 /go/[linkId] 跳转。",
        "后端接口：CRUD /api/dashboard/short-links；跳转路由 app/s/[slug]、app/go/[linkId]。",
        "数据库涉及表：short_links、link_clicks。",
        "关键校验：slug 唯一、目标 URL 仅允许 http/https、点击计数原子更新。",
        "后续维护注意点：恶意域名检测（钓鱼/垃圾站）列为后续 P1；点击日志合规处理，避免写入 PII。",
      ],
    },
  ];

  const r = [heading("4. 用户端功能说明", 1)];
  for (const f of features) {
    r.push(heading(f.title, 2));
    for (const line of f.body) r.push(p(line, true));
    if (f.shot) r.push(...imageParagraph(f.shot, f.caption));
  }
  r.push(new PageBreak());
  return r;
}

function section5() {
  const agents = [
    { name: "5.1 财税 Agent", ins: "收入、成本、开票记录、经营场景描述", outs: "经营情况摘要、税费初步估算、提醒清单", lim: "仅供参考，不替代税务师；不处理发票认证、真实申报", risk: "用户可能把草稿当真实申报；输出不出现确定性「应缴 X 元」", keep: "持续补充行业语料与费用归类规则；输出二次人工审核" },
    { name: "5.2 法务 Agent", ins: "协议片段、场景描述、条款要点", outs: "风险初筛、条款解释、审阅清单", lim: "不提供法律意见书，不替代律师；不对真实纠纷给结论", risk: "用户可能把提示当作法律意见；需在界面显著标注「仅供参考」", keep: "建立常见风险短语库，对涉及人身/财产条款提示保守" },
    { name: "5.3 市场调研 Agent", ins: "城市、品类、客群、竞品信息", outs: "人群画像摘要、竞品要点、推广建议与渠道列表", lim: "不代表真实市场调研结论；数据需用户线下核实", risk: "大模型可能虚构竞品，输出模板中强制声明数据来源", keep: "维护行业关键词词典，避免输出虚构竞品名称" },
    { name: "5.4 设计 Agent", ins: "主页风格偏好、目标受众、色系关键词", outs: "视觉建议、海报文字创意、配色提示、主题建议", lim: "当前不直接生成图片，仅输出文字描述与可执行建议", risk: "品牌名称被误写；与用户已有视觉系统不一致", keep: "与主题系统联动；接入生成式图片需做 NSFW 审核" },
    { name: "5.5 社媒运营 Agent", ins: "内容方向、平台（小红书/抖音/公众号）、目标受众", outs: "选题清单、标题草案、脚本段落、发布计划建议", lim: "不替代真实运营，不保证点赞/转化数据", risk: "标题党、触碰平台规则；需人工修改后发布", keep: "持续更新平台规则提示；敏感话题词表独立维护" },
  ];

  const r = [heading("5. AI Agent 功能说明", 1)];
  r.push(p("五大 AI Agent 定位为「经营辅助」而非专业替代：帮助用户整理问题、梳理资料、生成草稿，结果需用户自行判断与修改。在 v0.1 内测版中，AI Agent 对白名单账号开放，普通用户默认不开放完整 AI 能力，以控制成本与风险。", true));
  for (const a of agents) {
    r.push(heading(a.name, 2));
    r.push(p("输入内容：" + a.ins, true));
    r.push(p("输出内容：" + a.outs, true));
    r.push(p("使用限制：" + a.lim, true));
    r.push(p("风险提示：" + a.risk, true));
    r.push(p("维护建议：" + a.keep, true));
  }
  r.push(heading("5.6 AI Provider 统一封装与密钥管理", 2));
  r.push(p("Provider 封装位于 src/lib/ai/provider.ts，对不同模型提供统一对话接口。AI Key 不硬编码在源码，也不传到前端。超级管理员通过 /admin/settings/api 配置并加密入库（app_configs.config_value 加密存储），前端仅能看到脱敏值（形如 sk-****abcd）。", true));
  r.push(heading("5.7 白名单、额度与限流", 2));
  r.push(p("白名单机制：由超级管理员在配置中心开启 AI 能力并维护白名单用户列表。用户级额度（每日/每用户）与全局额度（每日所有用户合计）独立配置，超出额度后接口返回友好错误并记录 ai_usage_logs。IP 级限流复用 src/lib/rate-limit.ts，对 AI 接口独立设置更严格阈值。", true));
  r.push(heading("5.8 Prompt Injection 防护与输出审核", 2));
  r.push(p("输入侧：对系统指令分隔符、典型越狱短语做基础过滤，优先使用结构化配置（JSON）而非自由拼接字符串。输出侧：当前为基础过滤；完整 AI 输出审核与图片 NSFW 审核列为后续 P0。", true));
  r.push(...imageParagraph("screenshot-enterprise-ai.png", "图 8：AI Agent 功能介绍页"));
  r.push(...imageParagraph("screenshot-enterprise-ai-dashboard.png", "图 9：五大 AI Agent 工作台"));
  r.push(new PageBreak());
  return r;
}

function section6() {
  return [
    heading("6. 管理后台说明", 1),
    p("管理后台面向两类角色：普通管理员（admin，可处理举报与查看用户）与超级管理员（super_admin，可访问系统配置中心、用户管理、主页管理、AI 用量统计等全部功能）。普通管理员不具备修改密钥与修改角色的能力。", true),
    heading("6.1 后台入口与隐藏路径", 2),
    p("当前后台入口为 /admin 系列路由。后续建议新增 /jeepwork 作为后台路径别名，并在部署时把真实后台只对特定 IP 或经过反向代理开放。为什么不能暴露 /admin？因为它集中了系统配置、密钥、用户数据与治理能力。建议做法：Nginx 层仅允许指定 IP 访问后台路径；应用层 requireSuperAdmin 二次校验（role === super_admin）。", true),
    ...imageParagraph("screenshot-admin.png", "图 10：管理后台入口与功能概览"),
    heading("6.2 用户管理 /admin/users", 2),
    p("页面用途：查询用户列表、查看基础信息（邮箱、注册时间、角色、是否系统账号）、修改角色、重置密码。", true),
    p("可操作内容：按邮箱搜索、按角色筛选、查看用户关联主页、关联点击数与链接数统计、重置密码、更新角色。", true),
    p("权限要求：超级管理员；系统账号不允许被普通管理员重置或删除。", true),
    p("对应 API：GET/PATCH /api/admin/users、POST /api/admin/users/reset-password。", true),
    p("风险点：管理员可能不小心把普通用户升级为 super_admin；对「升级为 super_admin」操作做二次确认并记录审计日志。", true),
    ...imageParagraph("screenshot-admin-users.png", "图 11：用户管理页，支持查看用户和角色状态"),
    heading("6.3 主页管理 /admin/profiles", 2),
    p("页面用途：查看公开主页列表、隐藏/恢复主页（isPublic 切换）、按 username/显示名搜索。", true),
    p("可操作内容：搜索、排序、批量隐藏/恢复、查看链接详情。", true),
    p("权限要求：超级管理员。", true),
    p("对应 API：GET /api/admin/profiles、PATCH /api/admin/profiles/[username]。", true),
    p("风险点：误隐藏影响业务；「操作确认」弹窗 + 后台 handlerNote 记录。", true),
    ...imageParagraph("screenshot-admin-profiles.png", "图 12：主页管理页"),
    heading("6.4 举报管理 /admin/reports", 2),
    p("页面用途：查看用户举报、标记处理状态、填写处理备注、一键隐藏违规主页。", true),
    p("可操作内容：搜索举报、查看详情、填写处理备注、标记已处理/恢复待处理、隐藏/恢复对应主页。", true),
    p("权限要求：管理员或超级管理员。", true),
    p("对应 API：GET /api/admin/reports、PATCH /api/admin/reports/[id]。", true),
    p("风险点：举报可能被滥用、管理员可能误判；处理备注需可追溯并接入审计日志。", true),
    ...imageParagraph("screenshot-admin-reports.png", "图 13：举报管理页"),
    heading("6.5 AI 用量统计 /admin/ai-usage", 2),
    p("页面用途：汇总 AI 调用（按用户、按 Agent、按日期），监控成本与异常。", true),
    p("可操作内容：查看总调用次数、活跃用户、Top N 用户、指定日期范围过滤。", true),
    p("权限要求：超级管理员。", true),
    p("对应 API：GET /api/admin/ai-usage，聚合 ai_usage_logs 表。", true),
    p("风险点：异常用户或恶意脚本刷量可能产生高昂成本；需监控与额度熔断。", true),
    heading("6.6 系统配置中心 /admin/settings/api", 2),
    p("页面用途：集中维护第三方服务配置（AI API Key、SMTP、对象存储、短信等）。", true),
    p("可操作内容：新增/更新/删除配置项、开关启用、查看脱敏值（形如 sk-****abcd）。", true),
    p("权限要求：超级管理员；敏感字段仅后端解密使用，前端不得返回明文。", true),
    p("对应 API：GET/PATCH/POST /api/admin/settings/api。", true),
    p("风险点：Key 泄露、权限错配、配置值污染。建议：敏感字段加密存储；更新操作二次确认；后续接入审计日志。", true),
    ...imageParagraph("screenshot-admin-settings.png", "图 14：系统配置中心"),
    new PageBreak(),
  ];
}

module.exports = { section4, section5, section6 };
