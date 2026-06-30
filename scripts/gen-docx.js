// Word 文档生成器（docx）
const fs = require("fs");
const path = require("path");
const {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  Table,
  TableCell,
  TableRow,
  BorderStyle,
  WidthType,
  AlignmentType,
  TextRun,
  ImageRun,
  PageBreak,
} = require("docx");

const SCREENSHOT_DIR = "c:\\Users\\bifuc\\AppData\\Local\\Temp\\trae\\screenshots";
const OUTPUT_PATH = "C:\\Users\\bifuc\\Desktop\\哈勃造梦项目.docx";

const FONT = "Microsoft YaHei";
const FS_BODY = 21;
const FS_SMALL = 18;
const FS_H2 = 32;
const FS_H3 = 28;
const FS_H1 = 48;
const C_BLACK = "1A1A1A";
const C_MUTED = "666666";
const C_PRIMARY = "B45309";
const C_HEADER_BG = "FEF3C7";
const C_BORDER = "F59E0B";

const screenshots = (() => {
  try {
    const files = fs
      .readdirSync(SCREENSHOT_DIR)
      .filter((f) => f.endsWith(".png"))
      .sort((a, b) => a.localeCompare(b));
    const abs = files.map((f) => path.join(SCREENSHOT_DIR, f));
    return { home: abs[0], login: abs[1], aiIntro: abs[2], register: abs[3], aiDashboard: abs[4], homeMobile: abs[5] };
  } catch (e) {
    console.warn("截图读取失败", e.message);
    return {};
  }
})();
console.log("截图路径：", screenshots);

function p(text, opts = {}) {
  return new Paragraph({
    alignment: opts.alignment || AlignmentType.LEFT,
    spacing: { before: opts.before || 80, after: opts.after || 80, line: 360 },
    indent: { firstLine: opts.noIndent ? 0 : 480 },
    children: [new TextRun({ text: String(text || ""), font: FONT, size: opts.size || FS_BODY, color: opts.color || C_BLACK, bold: !!opts.bold })],
  });
}

function pCenter(text, size) { return p(text, { alignment: AlignmentType.CENTER, noIndent: true, size: size || FS_BODY }); }
function h1(text) { return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200, line: 360 }, children: [new TextRun({ text, font: FONT, size: FS_H1, color: C_PRIMARY, bold: true })] }); }
function h2(text) { return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 260, after: 140, line: 360 }, children: [new TextRun({ text, font: FONT, size: FS_H2, color: C_BLACK, bold: true })] }); }
function h3(text) { return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 180, after: 100, line: 360 }, children: [new TextRun({ text, font: FONT, size: FS_H3, color: C_BLACK, bold: true })] }); }

function cell(text, opts = {}) {
  return new TableCell({
    width: { size: opts.width || 1500, type: WidthType.DXA },
    children: [new Paragraph({ spacing: { before: 40, after: 40, line: 320 }, children: [new TextRun({ text: String(text || ""), font: FONT, size: FS_SMALL, color: C_BLACK, bold: !!opts.bold })] })],
    verticalAlign: "center",
    backgroundColor: opts.bgColor,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: C_BORDER },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: C_BORDER },
      left: { style: BorderStyle.SINGLE, size: 6, color: C_BORDER },
      right: { style: BorderStyle.SINGLE, size: 6, color: C_BORDER },
    },
  });
}

function table(headers, rows, widths) {
  const W = widths || headers.map(() => Math.floor(8000 / headers.length));
  return new Table({
    width: { size: W.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, { bold: true, bgColor: C_HEADER_BG, width: W[i] })) }),
      ...rows.map((row) => new TableRow({ children: row.map((c, i) => cell(String(c ?? ""), { width: W[i] })) })),
    ],
  });
}

function imageBlock(filePath, caption, widthCm) {
  const items = [];
  if (filePath && fs.existsSync(filePath)) {
    const widthIn = (widthCm || 15) / 2.54;
    const heightIn = widthIn * 0.62;
    items.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 180, after: 60 }, children: [new ImageRun({ data: fs.readFileSync(filePath), transformation: { width: widthIn, height: heightIn } })] }));
  } else {
    items.push(p("（该页面截图因权限或页面不可访问而跳过）", { color: C_MUTED, alignment: AlignmentType.CENTER, noIndent: true }));
  }
  items.push(pCenter(caption, FS_SMALL));
  return items;
}

// ============ 构建内容 ============
const content = [];

content.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 3600 }, children: [] }));
content.push(pCenter("哈勃造梦项目", 72));
content.push(pCenter("link168.me \u2014 一张二维码数字名片 + 五大 AI Agent", 36));
content.push(pCenter("AI 经营名片平台（内测版 v0.1）", 26));
content.push(pCenter("项目功能说明 / 技术逻辑说明 / 后续维护手册", 22));
content.push(pCenter("文档版本：v0.1", 22));
content.push(pCenter("编制日期：2026 年 6 月 19 日", 22));
content.push(pCenter("编制单位：合肥造梦哈勃文化传媒有限公司", 22));
content.push(new PageBreak());

content.push(h1("一、项目概览"));
content.push(p("项目名称：哈勃造梦项目（对外品牌：link168.me）。"));
content.push(p("项目定位：面向自媒体、小商家和一人公司的 AI 经营名片平台。用户可通过一张数字名片，整合链接、商品橱窗、客服、课程目录和社群入口，并借助五大 AI Agent（财税、法务、市场调研、设计、社媒运营）辅助经营决策与内容生成。"));
content.push(p("目标用户：课程咨询者、知识付费博主、本地商家、个体户、内容创作者、私域运营者、自由职业者与门店服务者。"));
content.push(p("核心价值：用免费的二维码数字名片帮助用户承接全网流量，让访客从看到你到联系你更顺手；AI Agent 辅助经营决策，降低小商家数字化门槛。"));
content.push(p("比赛展示亮点：产品定位清晰、面向真实商业需求；完整实现从注册登录、主页创建、链接管理、二维码分享到举报治理的闭环；五大 AI Agent 展示位已接入 OpenAI-compatible provider，并通过白名单与额度控制保障成本；管理员后台可维护用户、主页、举报、AI 使用统计；所有第三方密钥均加密存储并脱敏展示。"));
content.push(p("当前完成状态：内测版 v0.1，本地可稳定运行；线上服务器已配置部署环境，迁移流程与备份策略已文档化；第三方邮件、短信、支付、对象存储预留配置位，管理员可通过超级管理员后台统一开启或关闭。"));

content.push(new PageBreak());
content.push(h1("二、产品定位"));
content.push(p("为什么是 AI 经营名片平台：小商家和自媒体面临三重困境——流量分散到不同平台、经营缺工具、数据散落各处难以沉淀。Link168 用一张数字名片集中展示链接、商品、客服、社群入口，并通过二维码线下传播；再把 AI Agent 装进这张名片，帮助经营者完成基础的财税整理、合同风险初筛、市场调研、视觉建议和社媒选题。"));
content.push(p("面向的用户：课程咨询者、本地商家、内容创作者、私域运营者、自由职业者、门店服务者、独立设计师。"));
content.push(p("解决的问题：多平台入口分散导致流量流失；缺乏统一的客服用联系点；缺乏合适的经营辅助工具；经营数据难以沉淀。"));
content.push(p("与普通个人主页的区别：普通个人主页只是链接聚合；Link168 在此基础上提供二维码传播、链接排序、视觉主题优化、举报治理与 AI 经营辅助。"));
content.push(p("与短链工具的区别：普通短链工具只解决跳转；Link168 同时解决品牌展示、链接集合、二维码分享与经营辅助。"));
content.push(p("与通用 AI 工具的区别：通用 AI 工具对小商家不友好，输入门槛高；Link168 的五大 Agent 针对中文小商家场景定制 prompt，提供结构化输出（摘要+建议+内容），降低使用门槛。"));

content.push(new PageBreak());
content.push(h1("三、功能总览"));
content.push(table(
  ["模块", "主要功能", "用户角色", "状态"],
  [
    ["用户注册与登录", "邮箱密码注册、bcrypt 哈希密码、会话 Cookie、登录失败限流", "全部用户", "已完成"],
    ["邮箱验证", "邮件发送链路，发送验证链接", "普通用户", "已完成（SMTP 可配置）"],
    ["找回密码", "重置链接发送、token 哈希校验、密码重置", "普通用户", "已完成"],
    ["用户主页", "头像、昵称、简介、主题切换、链接列表、公开可访问", "普通用户", "已完成"],
    ["链接管理", "新增、编辑、删除、激活、排序、emoji/图标/自定义图片", "普通用户", "已完成"],
    ["头像上传", "本地上传、magic bytes 校验、禁止 SVG、随机文件名", "普通用户", "已完成"],
    ["主题风格", "默认主题 + 多种主题切换", "普通用户", "已完成"],
    ["二维码与分享", "link168.me/username 公开地址，二维码生成与分享", "普通用户", "已完成"],
    ["短链接", "自定义短码生成、自动 slug、内网地址阻断", "普通用户", "已完成"],
    ["点击统计", "链接点击记录、设备、Referer、IP 哈希", "普通用户", "已完成"],
    ["AI Agent 工作台", "对话入口、五大 Agent 展示位", "白名单用户", "已完成（白名单制）"],
    ["五大 AI Agent", "财税、法务、市场调研、设计、社媒运营", "白名单用户", "已完成"],
    ["AI 白名单", "邮箱白名单维护", "超级管理员", "已完成"],
    ["AI 额度控制", "用户级每日上限、全局每日上限", "超级管理员", "已完成"],
    ["管理后台", "超级管理员角色守卫", "超级管理员", "已完成"],
    ["用户管理", "用户列表、搜索、角色变更、系统账号保护", "超级管理员", "已完成"],
    ["主页管理", "主页列表、隐藏/恢复、下架链接", "超级管理员", "已完成"],
    ["举报管理", "举报列表、处理备注、状态流转、联动主页", "超级管理员", "已完成"],
    ["AI 使用统计", "按用户/Agent/日期聚合", "超级管理员", "已完成"],
    ["系统配置中心", "第三方 API、邮件、支付、存储、短信、地图、统计、Webhook 统一管理", "超级管理员", "已完成"],
    ["安全加固", "注册限流、登录限流、AI 限流、密码哈希、token 哈希、文件上传校验、敏感配置加密、Prompt Injection 检测", "平台", "已完成"],
  ],
  [1400, 3400, 1400, 1800]
));

content.push(new PageBreak());
content.push(h1("四、用户端功能说明"));
content.push(h2("4.1 注册流程"));
content.push(p("用户入口：首页点击"免费注册"进入 /register 页面。"));
content.push(p("操作步骤：填写链接后缀 username、输入邮箱、设置密码、再次输入密码确认、勾选《用户协议》与《隐私政策》、点击"立即创建你的 Link168"。"));
content.push(p("后端接口：POST /api/auth/register。"));
content.push(p("数据库涉及：users、profiles、sessions（登录态）、email_verification_tokens（邮箱验证）。"));
content.push(p("关键校验：用户名唯一性冲突（返回 409）、邮箱唯一性冲突（返回 409）、用户名保留字与格式校验、密码长度与重复、注册 IP 限流（10 分钟 5 次）。"));

content.push(h2("4.2 登录流程"));
content.push(p("用户入口：/login 页面。操作步骤：输入邮箱、输入密码、点击"登录"。后端接口：POST /api/auth/login。"));
content.push(p("数据库涉及：users（email、password_hash、role）、login_attempts（失败次数/锁定时间）、sessions（生成会话 token）。"));
content.push(p("关键校验：邮箱格式、密码 bcrypt 比对、登录失败 IP + 邮箱频率限制、超过阈值后临时锁定。"));

content.push(h2("4.3 找回密码流程"));
content.push(p("用户入口：登录页点击"忘记密码？"。后端接口：POST /api/auth/forgot-password、POST /api/auth/reset-password。"));
content.push(p("关键校验：IP 限流（60 秒 2 次）；邮箱不存在时仍返回成功以避免枚举；token 存在过期时间与一次性使用标志。"));

content.push(h2("4.4 创建主页流程"));
content.push(p("用户入口：注册时已设置链接后缀（username），进入 /dashboard 即可创建主页。操作步骤：填写昵称/简介、上传头像、选择主题、添加链接、保存。"));
content.push(p("后端接口：PUT /api/dashboard、POST /api/dashboard/avatar、POST /api/dashboard/links。"));

content.push(h2("4.5 编辑主页资料"));
content.push(p("用户入口：/dashboard 页"外观" / "制作" Tab。后端接口：PUT /api/dashboard/profile。"));
content.push(p("关键校验：display_name ≤ 40 字、bio ≤ 500 字、UGC 内容敏感词过滤、theme / 语言白名单。"));

content.push(h2("4.6 添加链接"));
content.push(p("后端接口：POST /api/dashboard/links、PATCH /api/dashboard/links/:id、DELETE /api/dashboard/links/:id。"));

content.push(h2("4.7 头像上传"));
content.push(p("后端接口：POST /api/dashboard/avatar（multipart/form-data）。"));
content.push(p("关键校验：禁止 SVG、仅接受 jpeg/png/webp/gif、大小 ≤ 2MB、magic bytes 真实文件校验、随机文件名避免路径遍历。"));

content.push(h2("4.8 公开主页访问"));
content.push(p("用户入口：通过 link168.me/{username} 访问，或二维码扫码。"));

content.push(h2("4.9 二维码和分享"));
content.push(p("技术实现：前端使用 react-qr-code 组件生成二维码，内容为公开主页 URL。"));

content.push(h2("4.10 短链接创建和访问"));
content.push(p("后端接口：GET / POST /api/dashboard/short-links。关键校验：自定义 slug 需正则 `^[a-z0-9-_]{3,32}$`，唯一；禁止内网/localhost 目标 URL。"));

content.push(h2("附图"));
content.push(h3("图 1：产品首页"));
content.push(...imageBlock(screenshots.home, "（图 1：产品首页，展示品牌定位与"免费创建主页"入口）", 15));
content.push(h3("图 2：统一登录入口"));
content.push(...imageBlock(screenshots.login, "（图 2：统一登录入口，普通用户、管理员与超级管理员共用）", 15));
content.push(h3("图 3：注册页"));
content.push(...imageBlock(screenshots.register, "（图 3：注册页，用户在此抢占链接后缀与完成账号注册）", 15));
content.push(h3("图 4：移动端公开主页效果"));
content.push(...imageBlock(screenshots.homeMobile, "（图 4：移动端公开主页效果，适合微信和手机浏览器访问）", 10));

content.push(new PageBreak());
content.push(h1("五、AI Agent 功能说明"));
content.push(h2("5.1 五大 AI Agent 概述"));
content.push(table(
  ["Agent", "角色定位", "输入内容", "输出内容", "使用限制", "风险提示"],
  [
    ["财税 AI Agent", "收入/成本/税费/经营资料辅助整理", "经营流水、票据摘要、收支明细", "结构化摘要、合规建议清单", "白名单制，不替代持证税务师", "AI 结果仅供参考"],
    ["法务 AI Agent", "合同风险初筛与条款解释", "合同文本、协议片段、条款", "风险点清单、合规建议、阅读清单", "白名单制，不替代律师意见", "AI 结果仅供参考"],
    ["市场调研 AI Agent", "行业分析、竞品分析、用户画像", "行业/地区/目标用户描述", "竞品对照、用户画像、推广建议", "白名单制，不保证商业结果", "AI 结果仅供参考"],
    ["设计 AI Agent", "主页视觉建议、海报与物料建议", "品牌色、行业、目标受众", "视觉方向、布局建议、色彩搭配", "白名单制，不生成实图", "AI 结果仅供参考"],
    ["社媒运营 AI Agent", "小红书/抖音/公众号选题与脚本", "行业、产品描述、发布计划", "选题、标题、脚本、发布计划", "白名单制，AI 输出需用户自行判断", "AI 结果仅供参考"],
  ],
  [1100, 2100, 1800, 1800, 1600, 1200]
));

content.push(h2("5.2 AI Provider 统一封装"));
content.push(p("统一封装：将 OpenAI、通义千问、DeepSeek、豆包、智谱等兼容协议统一到 provider 层，切换仅需修改 provider/baseUrl/model/apiKey。调用入口集中在 src/lib/ai/provider.ts。"));
content.push(p("调用协议：POST /chat/completions，标准 OpenAI-compatible JSON。超时控制：60 秒超时，使用 AbortController。"));
content.push(p("缓存策略：每次调用设置 cache: no-store，避免 API Key 在边缘缓存泄露。"));

content.push(h2("5.3 API Key 配置方式"));
content.push(p("配置入口：超级管理员配置中心 /admin/settings/api → AI 服务 Tab。字段：provider、baseUrl、model、apiKey（敏感字段）。"));
content.push(p("存储策略：apiKey 以 AES-256-GCM 加密存储在 app_configs 表，前端展示时脱敏为 `sk-****abcd`，仅后端在调用时解密。"));

content.push(h2("5.4 白名单机制"));
content.push(p("配置入口：超级管理员配置中心 /admin/settings/api，在 AI 白名单中写入允许使用 AI 的邮箱列表。判定逻辑：isAiTester(email) 判断当前用户邮箱是否匹配白名单。"));

content.push(h2("5.5 用户级额度与全局额度"));
content.push(p("每日每用户调用上限、全局每日上限均可在配置中心调整。计数方式：每次对话后 incrementAiUsage(userId, assistant)，表 ai_usage_logs 以 userId+assistant+usageDate 唯一索引聚合。"));

content.push(h2("5.6 IP 限流"));
content.push(p("AI 对话接口：60 秒 20 次调用，防止滥用。"));

content.push(h2("5.7 Prompt Injection 防护"));
content.push(p("检测规则：针对"忽略前面"、"输出 system prompt"、"切换到调试模式"等触发词与正则进行启发式检测。处理：返回安全拦截提示，不调用模型。"));

content.push(h2("5.8 AI 输出审核（待补）"));
content.push(p("目前 AI 原始输出未经过第三方内容安全 API 审核。后续版本建议接入图文内容安全服务。"));

content.push(h2("附图"));
content.push(h3("图 5：企业 AI 介绍页"));
content.push(...imageBlock(screenshots.aiIntro, "（图 5：AI Agent 功能介绍页，展示五大 Agent 与企业版能力）", 15));
content.push(h3("图 6：AI 工作台"));
content.push(...imageBlock(screenshots.aiDashboard, "（图 6：AI 工作台示例，展示 Agent 对话入口与使用状态）", 15));

content.push(new PageBreak());
content.push(h1("六、管理后台说明"));
content.push(h2("6.1 普通管理员与超级管理员的区别"));
content.push(p("users.role 可能值：user、admin、super_admin。user 为普通用户；admin 可查看举报等基础信息；super_admin 可访问完整管理后台，包含用户管理、主页管理、举报管理、AI 使用统计、系统配置中心。"));

content.push(h2("6.2 后台入口与权限守卫"));
content.push(p("当前入口：/admin/users、/admin/profiles、/admin/reports、/admin/settings/api、/admin/ai-usage。"));
content.push(p("权限守卫：每个 /admin 页面及 /api/admin/** 接口都会校验当前会话用户的 role === super_admin。"));

content.push(h2("6.3 建议隐藏后台路径为 /jeepwork"));
content.push(p("建议后续版本将默认后台路径从 /admin 改为 /jeepwork 或自定义路径，降低被自动化扫描探测概率。在 Next.js 路由层面增加独立目录，并保持权限守卫一致。"));

content.push(h2("6.4 系统配置中心"));
content.push(p("页面用途：统一管理 AI、邮件、支付、对象存储、短信、地图、统计、Webhook 等第三方服务配置。可操作内容：模块启用/禁用、API Key 等配置项、测试连通性、保存。权限：仅 super_admin。"));
content.push(p("对应 API：GET / PUT / POST /api/admin/settings/api。风险点：敏感字段加密存储，前端仅返回脱敏值；后端必须拒绝保存值中带 `****` 的字符串。"));

content.push(h2("6.5 用户管理"));
content.push(p("页面用途：浏览所有用户、搜索邮箱/用户名/显示名、更改角色。对应 API：GET / PATCH /api/admin/users。风险点：系统账号（isSystem=true）不可被普通管理员或脚本删除，数据库层需加保护。"));

content.push(h2("6.6 主页管理"));
content.push(p("页面用途：浏览所有公开主页、搜索、隐藏/恢复、批量下架链接。对应 API：GET /api/admin/profiles、PATCH /api/admin/profiles/:username。"));

content.push(h2("6.7 举报管理"));
content.push(p("页面用途：查看用户提交的举报（URL、原因、联系方式、截图）并处理。可操作内容：标记已处理、恢复待处理、填写处理备注、隐藏被举报主页。对应 API：GET /api/admin/reports、PATCH /api/admin/reports/:id、DELETE /api/admin/reports/:id。"));

content.push(h2("6.8 AI 使用统计"));
content.push(p("页面用途：按用户、按 Agent、按日期聚合统计调用量。对应 API：GET /api/admin/ai-usage?days=30。"));

content.push(new PageBreak());
content.push(h1("七、系统逻辑层说明"));
content.push(h2("7.1 用户身份层"));
content.push(p("注册：/api/auth/register 创建 user 与 profile，并生成 session。登录：/api/auth/login 校验 email/password_hash（bcrypt），生成 session token（32 字节随机值 → SHA-256 哈希存储）。"));
content.push(p("Session：session 表存储 token_hash、user_id、expires_at、user_agent、ip_address、last_active。登录态通过 HttpOnly Cookie 访问，避免 JS 可读取以减少 XSS 风险。"));
content.push(p("角色：users.role（user / admin / super_admin），基于角色守卫访问管理后台。"));
content.push(p("权限：普通接口使用 requireUser 守卫；管理员接口使用 requireSuperAdmin 守卫。"));

content.push(h2("7.2 主页内容层"));
content.push(p("Profile：profiles 表维护 username、display_name、bio、avatar_url、theme、custom_theme、language、is_public。"));
content.push(p("Links：links 表按 profile_id 关联，支持 title、url、description、icon_type、icon_value、icon_url、position、is_active。"));
content.push(p("公开主页：/{username} 公开可访问，不登录；is_public=false 时展示占位页面。"));

content.push(h2("7.3 短链接层"));
content.push(p("ShortLink：short_links 表（id、slug、target_url、total_clicks、user_id）。Slug 全局唯一。Redirect：/s/{slug} → 302 跳转目标。"));
content.push(p("Link Clicks：link_clicks 表记录 link_id、profile_id、country、city、device、os、browser、referer、ip_hash、created_at。IP 以哈希形式存储，符合最小化隐私原则。"));

content.push(h2("7.4 AI 能力层"));
content.push(p("Assistant Config：五大 Agent 在 src/lib/ai/assistants.ts 中定义，包含 system prompt、输出格式、参数（temperature、maxTokens）。"));
content.push(p("Provider：统一封装到 src/lib/ai/provider.ts，按配置选择 provider、baseUrl、model、apiKey。"));
content.push(p("Chat API：/api/enterprise-ai/chat，受白名单与额度控制。Usage Logs：ai_usage_logs 表按用户+Agent+日期聚合。"));

content.push(h2("7.5 管理控制层"));
content.push(p("Admin APIs：/api/admin/users、/api/admin/profiles、/api/admin/reports、/api/admin/ai-usage、/api/admin/settings/api。"));
content.push(p("Super Admin APIs：所有管理 API 统一使用 requireSuperAdmin 守卫。Config Center：app_configs 表存储第三方服务配置，敏感字段以加密方式存储。审计待补：当前未实现审计日志持久化表，建议后续实现。"));

content.push(h2("7.6 安全防护层"));
content.push(p("Rate Limit：注册、登录、找回密码、AI 对话、短链接创建均有 IP 维度限流。Content Safety：UGC 内容敏感词过滤；AI 输入 Prompt Injection 检测。"));
content.push(p("Password Hash：bcrypt 12 轮。Token Hash：session token、重置 token、验证 token 均以哈希存储。File Upload Safety：mime 校验 + magic bytes 校验 + 大小限制 + 随机文件名 + 禁止 SVG。"));
content.push(p("Sensitive Config Encryption：AES-256-GCM 加密敏感配置，使用环境变量 CONFIG_ENCRYPTION_KEY 作为加密根密钥。"));

content.push(new PageBreak());
content.push(h1("八、数据库设计说明"));
content.push(p("数据库：PostgreSQL。ORM：Prisma（@prisma/client + @prisma/adapter-pg）。迁移：prisma/migrations 管理 DDL 版本。"));

content.push(h2("8.1 核心表一览"));
function st(rows) { return table(["字段", "类型", "约束/说明"], rows, [2200, 2200, 3600]); }

content.push(h3("users（用户表）"));
content.push(st([["id", "UUID", "主键"], ["email", "String", "唯一索引"], ["password_hash", "String", "bcrypt 哈希"], ["email_verified", "Boolean", "默认 false"], ["role", "String", "user/admin/super_admin"], ["is_system", "Boolean", "系统账号保护"], ["created_at/updated_at", "Timestamptz", "时间戳"]]));

content.push(h3("profiles（公开主页）"));
content.push(st([["id", "UUID", "主键"], ["user_id", "UUID", "一对一 users.id"], ["username", "String", "唯一索引，公开路径"], ["display_name", "String", "可空，昵称"], ["bio", "String", "可空，简介"], ["avatar_url", "String", "可空，头像路径"], ["theme", "String", "主题标识，默认 default"], ["custom_theme", "String", "可空，自定义主题 JSON"], ["language", "String", "语言偏好"], ["is_public", "Boolean", "默认 true"], ["created_at/updated_at", "Timestamptz", "时间戳"]]));

content.push(h3("links（主页链接）"));
content.push(st([["id", "UUID", "主键"], ["profile_id", "UUID", "关联 profile"], ["title", "String", "链接标题"], ["url", "String", "目标地址"], ["description", "String", "可空，副文案"], ["icon_type/icon_value/icon_url", "String", "图标类型/取值"], ["position", "Int", "展示顺序"], ["is_active", "Boolean", "是否启用"], ["total_clicks", "Int", "总点击数"], ["created_at/updated_at", "Timestamptz", "时间戳"]]));

content.push(h3("link_clicks（点击日志）"));
content.push(st([["id", "UUID", "主键"], ["link_id", "UUID", "关联 link"], ["profile_id", "UUID", "关联 profile（便于聚合）"], ["country/city/device/os/browser", "String", "可空，设备与来源"], ["referer", "String", "可空，引用页"], ["ip_hash", "String", "可空，IP 哈希"], ["created_at", "Timestamptz", "点击时间"]]));

content.push(h3("short_links（短链接）"));
content.push(st([["id", "UUID", "主键"], ["slug", "String", "唯一索引"], ["target_url", "String", "目标"], ["user_id", "UUID", "创建用户"], ["total_clicks", "Int", "点击数"], ["created_at/updated_at", "Timestamptz", "时间戳"]]));

content.push(h3("sessions（登录态）"));
content.push(st([["id", "UUID", "主键"], ["user_id", "UUID", "关联 user"], ["token_hash", "String", "Session Token 哈希"], ["expires_at", "Timestamptz", "过期"], ["user_agent/ip_address", "String", "设备/IP"], ["last_active", "Timestamptz", "最后活跃"], ["created_at", "Timestamptz", "创建时间"]]));

content.push(h3("password_reset_tokens 与 email_verification_tokens"));
content.push(st([["id", "UUID", "主键"], ["user_id", "UUID", "关联 user"], ["token_hash", "String", "唯一，哈希存储"], ["expires_at", "Timestamptz", "过期"], ["used", "Boolean", "是否已使用"], ["created_at", "Timestamptz", "创建时间"]]));

content.push(h3("login_attempts（登录尝试）"));
content.push(st([["id", "UUID", "主键"], ["email", "String", "尝试邮箱"], ["ip_address", "String", "来源 IP"], ["success", "Boolean", "是否成功"], ["locked", "Boolean", "是否已锁定"], ["lock_until", "Timestamptz", "解除时间"], ["created_at", "Timestamptz", "尝试时间"]]));

content.push(h3("reports（举报）"));
content.push(st([["id", "UUID", "主键"], ["report_url", "String", "被举报 URL"], ["report_type", "String", "举报类型"], ["report_reason", "String", "举报原因"], ["contact", "String", "可空，举报人联系方式"], ["image_url", "String", "可空，证据截图路径"], ["status", "String", "待处理/已处理/已驳回"], ["handler_note", "String", "处理备注"], ["processed_at", "Timestamptz", "处理时间"], ["created_at", "Timestamptz", "举报时间"]]));

content.push(h3("app_configs（配置中心）"));
content.push(st([["id", "UUID", "主键"], ["config_key", "String", "唯一，配置项 Key"], ["config_value", "String", "敏感字段加密后存储"], ["is_sensitive", "Boolean", "是否敏感"], ["created_at/updated_at", "Timestamptz", "时间戳"]]));

content.push(h3("ai_usage_logs（AI 使用日志）"));
content.push(st([["id", "UUID", "主键"], ["user_id", "UUID", "关联 user"], ["assistant", "String", "Agent 标识"], ["usage_date", "Date", "使用日期"], ["call_count", "Int", "当日调用数"], ["唯一约束", "(user_id, assistant, usage_date)", ""], ["created_at/updated_at", "Timestamptz", "时间戳"]]));

content.push(h2("8.2 设计考量"));
content.push(p("密码只存 password_hash：永远不保存明文密码，以 bcrypt 12 轮哈希存储。"));
content.push(p("token 只存 token_hash：session / password reset / email verification token 均以哈希存储。"));
content.push(p("敏感配置加密：apiKey、SMTP 密码等由 CONFIG_ENCRYPTION_KEY 加密存储，前端永远拿不到明文。"));
content.push(p("数据库迁移必须先备份：每次执行 prisma migrate deploy 前先 pg_dump 备份。"));
content.push(p("真实用户后数据库必须可迁移：系统应具备迁移脚本、数据脱敏脚本、回滚脚本与恢复脚本。"));

content.push(new PageBreak());
content.push(h1("九、数据库迁移与封装建议"));
content.push(h2("9.1 推荐策略"));
content.push(p("统一走 Prisma：所有数据库访问统一走 Prisma Client，禁止在业务代码中散落原始 SQL。"));
content.push(p("通过 migration 管理：所有 DDL 变更通过 prisma/migrations 生成版本化迁移脚本。"));
content.push(p("生产迁移前必须 pg_dump：线上迁移前必须备份全库。"));
content.push(p("迁移先在 staging 验证：任何新的迁移应先在测试/staging 环境验证后再部署到生产。"));
content.push(p("账号创建走脚本：创建系统账号走 npm run db:create-users 等脚本，禁止手写明文密码写入迁移脚本。"));
content.push(p("数据库导出排除密钥文件：备份文件不应包含.env、密钥说明文档。"));
content.push(p("导出备份必须加密保存：备份文件在存储介质上需加密。"));

content.push(h2("9.2 维护流程建议"));
content.push(table(
  ["操作", "触发条件", "命令/流程", "校验点"],
  [
    ["备份", "每次部署前 / 定时", "pg_dump → 加密压缩 → 异地存储", "备份可恢复、校验通过"],
    ["迁移", "新增/修改 schema 后", "npm run db:migrate", "staging 先行、回滚脚本同步准备"],
    ["回滚", "迁移失败时", "恢复最近备份 + 必要的手动修正", "业务侧降级方案"],
    ["恢复", "需要恢复旧版本时", "pg_restore 备份 + 应用代码回滚", "数据一致性检查"],
    ["创建账号", "初次部署 / 运维需要", "npm run db:create-users", "随机生成强密码，不在日志中输出"],
    ["数据脱敏", "非生产环境需要拷贝数据时", "字段级脱敏，邮箱/密码/密钥替换为占位值", "不将真实数据带入开发环境"],
    ["迁移到新服务器", "服务器迁移时", "pg_dump → 新服务器恢复 → npm run db:migrate", "连接串由新服务器环境变量提供"],
  ],
  [1000, 1600, 2800, 2600]
));

content.push(new PageBreak());
content.push(h1("十、安全设计说明"));
content.push(h2("10.1 已完成安全点"));
content.push(table(
  ["项", "实现方式"],
  [
    ["密码哈希", "bcrypt 12 轮"],
    ["Session Cookie", "HttpOnly，SameSite Lax，30 天过期"],
    ["注册限流", "IP+邮箱双维度，10 分钟 5 次"],
    ["找回密码限流", "IP 60 秒 2 次"],
    ["登录防爆破", "login_attempts 表 + 频率限制 + 锁定时间"],
    ["AI 调用限流", "IP 60 秒 20 次，用户级每日上限，全局每日上限"],
    ["短链接创建限流", "IP 60 秒 30 次"],
    ["文件上传 MIME 校验", "jpeg/png/webp/gif"],
    ["magic bytes 校验", "真实文件头字节校验"],
    ["禁止 SVG", "防止脚本注入"],
    ["随机文件名", "username + UUID 防止路径遍历"],
    ["API Key 加密存储", "AES-256-GCM + CONFIG_ENCRYPTION_KEY"],
    ["管理员 API 鉴权", "requireSuperAdmin 基于会话 role 校验"],
    ["UGC 内容敏感词过滤", "过滤 display_name、bio、链接标题/描述"],
    ["Prompt Injection 检测", "detectPromptInjection 覆盖常见指令注入模式"],
  ],
  [3000, 5000]
));

content.push(h2("10.2 待补安全点"));
content.push(table(
  ["项", "建议"],
  [
    ["AI 输出审核", "接入第三方内容安全 API 审核 AI 输出文本"],
    ["图片 NSFW 审核", "图片内容安全审核（NSFW/违规图像）"],
    ["管理员审计日志", "记录管理员操作（谁、何时、做了什么）"],
    ["Redis / Upstash 分布式限流", "当前限流为内存进程内；多实例部署时建议替换"],
    ["手机端真实设备测试", "后续补充真机设备测试"],
    ["短链恶意域名库", "禁止跳转到钓鱼/恶意域名"],
    ["后台隐藏路径", "/admin \u2192 /jeepwork，降低扫描暴露"],
    ["HTTPS + Cookie Secure 配置", "生产强制 HTTPS + Cookie Secure"],
  ],
  [3000, 5000]
));

content.push(new PageBreak());
content.push(h1("十一、部署与服务器状态"));
content.push(p("服务器路径：/www/link168。"));
content.push(p("运行时：Node.js + Next.js（next build && next start 生产模式），由 PM2 守护进程。"));
content.push(p("反向代理：Nginx（处理 HTTPS、域名证书、静态资源与反向代理到应用端口）。"));
content.push(p("数据库：PostgreSQL。连接串由服务器环境变量 DATABASE_URL 提供。"));
content.push(p(".env.production：生产环境配置文件权限建议 600。包含 DATABASE_URL、SESSION_SECRET、ADMIN_SECRET、CONFIG_ENCRYPTION_KEY 等，不提交到 Git。"));
content.push(p("生产数据库迁移：执行 npx prisma migrate deploy（由运维脚本执行）。迁移前必须备份。"));
content.push(p("测试账号、管理员账号、超级管理员账号：已通过 npm run db:create-users 脚本创建，密码不在文档中记录。"));
content.push(p("自动部署：禁止自动部署，任何线上改动需人工确认。"));

content.push(new PageBreak());
content.push(h1("十二、维护与修改指南"));
content.push(h2("12.1 修改注册 / 登录流程"));
content.push(p("相关文件：src/app/auth/register/page.tsx、src/app/auth/login/page.tsx、src/app/api/auth/register/route.ts、src/app/api/auth/login/route.ts、src/lib/auth.ts。"));
content.push(p("维护要点：保持密码 bcrypt 哈希；保持 token 以哈希存储；保持注册/登录限流。"));

content.push(h2("12.2 修改主页（UI 与字段）"));
content.push(p("相关文件：src/app/[username]/page.tsx、src/app/dashboard/page.tsx、src/app/api/dashboard/route.ts、src/app/api/dashboard/profile/route.ts。"));
content.push(p("维护要点：新增字段需同步修改 prisma/schema.prisma 并生成迁移；UGC 字段需保持敏感词过滤。"));

content.push(h2("12.3 修改短链接"));
content.push(p("相关文件：src/app/s/[slug]/route.ts、src/app/api/dashboard/short-links/route.ts。"));
content.push(p("维护要点：禁止内网跳转；确保 slug 唯一与格式合规。"));

content.push(h2("12.4 修改 AI Agent"));
content.push(p("相关文件：src/lib/ai/assistants.ts、src/lib/ai/provider.ts、src/app/api/enterprise-ai/chat/route.ts、src/app/enterprise-ai/dashboard/page.tsx。"));
content.push(p("维护要点：新增 Agent 需同步增加配置项与额度控制；API Key 必须由 app_configs 管理，前端不可接触。"));

content.push(h2("12.5 新增后台页面"));
content.push(p("相关文件：src/app/admin/** 目录下新增页面文件、src/app/api/admin/** 新增 API route。维护要点：所有管理后台 API 必须在首行 requireSuperAdmin 校验。"));

content.push(h2("12.6 修改数据库"));
content.push(p("相关文件：prisma/schema.prisma。步骤：编辑 schema → npx prisma migrate dev（本地） → 验证后在生产执行 npx prisma migrate deploy。"));

content.push(h2("12.7 新增环境变量"));
content.push(p("相关文件：.env.example（必须同步更新模板）、src/lib/app-config.ts（若涉及敏感字段需进入 app_configs 表）。"));

content.push(h2("12.8 上线命令建议"));
content.push(p("npm install → npm run build → npx prisma migrate deploy → pm2 start/reload。"));

content.push(h2("12.9 回滚"));
content.push(p("代码回滚：Git 回退到上一个版本后重新构建。数据回滚：从最近一次 pg_dump 恢复。"));

content.push(new PageBreak());
content.push(h1("十三、比赛展示建议"));
content.push(p("可以展示哪些页面：首页（品牌价值）、注册/登录（身份层）、Dashboard（制作与外观）、公开主页（访问体验）、AI 工作台（五大 Agent）、管理后台（超级管理员功能——但必须隐藏真实密钥显示）。"));
content.push(p("可讲的技术点：Next.js App Router；Prisma + PostgreSQL；自建 Session 与 HttpOnly Cookie；bcrypt 12 轮密码哈希；AES-256-GCM 敏感配置加密；限流/内容安全/Prompt Injection 防护；完整闭环（注册→主页→链接→分享→举报→管理→AI）。"));
content.push(p("可强调的安全设计：密钥管理原则（不在代码、不在文档、不在 Git）；API Key 加密存储与脱敏展示；系统账号保护机制；IP 哈希隐私最小化。"));
content.push(p("可强调 AI Agent 与经营名片结合：将名片作为业务入口，把 AI 工具作为经营辅助；白名单与额度控制作为可控能力。"));
content.push(p("可强调从功能到上线的完整闭环：功能、安全、运维、备份/恢复、部署文档齐全。"));

content.push(new PageBreak());
content.push(h1("十四、当前风险与下一步计划"));
content.push(table(
  ["优先级", "风险 / 任务", "当前状态", "建议处理"],
  [
    ["高", "AI 输出审核", "待补", "接入第三方内容安全 API 审核文本输出"],
    ["高", "图片内容审核（NSFW）", "待补", "接入图像安全审核 API"],
    ["高", "管理员审计日志", "待补", "新增 admin_audit_logs 表，记录敏感操作"],
    ["高", "后台隐藏路径 /jeepwork", "待补", "路由层面迁移至自定义路径"],
    ["中", "数据库备份与迁移脚本自动化", "半完成", "在服务器侧添加定时备份与加密存储"],
    ["中", "分布式限流 Redis/Upstash", "待补", "替换进程内存限流为共享存储限流"],
    ["中", "手机端兼容测试", "待补", "真机测试 iOS / Android 主流机型"],
    ["中", "HTTPS 完整配置 + Cookie Secure", "待补", "生产强制 HTTPS，Cookie 生产开启 Secure 标志"],
    ["中", "域名证书自动续期", "待补", "通过 Certbot/云厂商证书管理"],
    ["中", "真实用户数据迁移方案", "待补", "准备数据迁移/脱敏脚本，配合真实内测用户邀请上线"],
  ],
  [800, 2800, 1800, 4600]
));

content.push(new PageBreak());
content.push(h1("十五、附录：核心文件索引"));
content.push(table(
  ["文件路径", "用途", "修改注意事项"],
  [
    ["prisma/schema.prisma", "数据库表定义", "任何字段变更必须同步迁移脚本"],
    ["prisma/migrations/**", "数据库 DDL 版本", "生产迁移必须先备份"],
    ["src/lib/auth.ts", "用户身份与会话", "修改密码/会话逻辑需谨慎校验"],
    ["src/lib/admin-auth.ts", "管理员权限守卫", "所有后台 API 必须调用 requireSuperAdmin"],
    ["src/lib/app-config.ts", "敏感配置管理", "新增敏感字段需实现加密存储与脱敏展示"],
    ["src/lib/ai/provider.ts", "AI Provider 封装", "禁止将 API Key 暴露到前端"],
    ["src/lib/ai/assistants.ts", "五大 Agent 定义", "修改 system prompt 需同步更新中文提示"],
    ["src/lib/rate-limit.ts", "统一限流", "仅进程内有效，多实例需替换 Redis"],
    ["src/lib/content-safety.ts", "内容安全", "需定期更新敏感词和注入规则"],
    ["src/lib/db.ts", "Prisma Client 单例", "不暴露敏感连接串"],
    ["src/app/api/auth/register/route.ts", "注册 API", "需保持限流与唯一性校验"],
    ["src/app/api/auth/login/route.ts", "登录 API", "需保持失败限流与 bcrypt 校验"],
    ["src/app/api/auth/forgot-password/route.ts", "找回密码 API", "需避免邮箱枚举"],
    ["src/app/api/dashboard/**", "用户侧 API", "所有写操作需校验登录态"],
    ["src/app/api/dashboard/avatar/route.ts", "头像上传", "严格保持 magic bytes + 类型白名单"],
    ["src/app/api/dashboard/short-links/route.ts", "短链生成", "保持内网地址阻断"],
    ["src/app/api/admin/**", "管理员 API", "所有 API 首行必须 super_admin 校验"],
    ["src/app/api/enterprise-ai/chat/route.ts", "AI 对话", "需白名单 + 额度 + Prompt Injection 校验"],
    ["src/app/[username]/page.tsx", "公开主页", "不要暴露用户敏感信息"],
    ["src/app/dashboard/page.tsx", "用户工作台", "与 dashboard API 保持字段一致"],
    ["src/app/enterprise-ai/dashboard/page.tsx", "AI 工作台", "白名单状态由后端提供"],
    ["src/app/admin/**/page.tsx", "管理后台页面", "所有页面需服务端验证 role"],
    [".env.example", "环境变量模板", "新增环境变量必须同步更新"],
    ["package.json", "依赖与脚本", "新增脚本需同步维护文档"],
  ],
  [4000, 4500, 3500]
));

content.push(new PageBreak());
content.push(h1("十六、评审一分钟讲解稿"));
content.push(p("大家好，我们是哈勃造梦团队，今天带来的是 link168.me——一张二维码数字名片 + 五大 AI Agent，面向自媒体、小商家和一人公司的 AI 经营名片平台。用户注册后，只需几分钟，就可以把微信客服、商品橱窗、课程目录、社群入口、公众号、小红书、抖音集中放进一张数字名片，并通过二维码线下传播。后台提供完善的主页管理、链接管理、举报治理，而五大 AI Agent（财税、法务、市场调研、设计、社媒运营）则帮助经营者完成从展示到经营的闭环。我们使用 Next.js + PostgreSQL + Prisma，所有密码与 token 全部哈希存储，第三方密钥加密保存并在前端脱敏展示，支持白名单与额度控制的 AI 调用，以及完整的超级管理员后台。我们相信，一张二维码，一个经营助手，就能让中文小商家低成本完成数字化。感谢评审！"));

content.push(new PageBreak());
content.push(h1("十七、项目三分钟答辩提纲"));
content.push(h2("17.1 项目背景"));
content.push(p("小商家与自媒体面临"流量承接难、经营缺工具、数据难沉淀"三大问题；海外工具在中文体验、合规能力上并不贴合；中文环境需要一个更友好、更安全的名片级入口。"));

content.push(h2("17.2 用户痛点"));
content.push(p("多平台入口散落在微信群、小红书、抖音、店铺；缺乏统一的客服用联系点；经营辅助工具门槛高、成本高；经营数据与用户反馈难以沉淀。"));

content.push(h2("17.3 核心功能"));
content.push(p("注册 / 登录 / 主页创建 / 链接管理 / 头像上传 / 主题切换 / 二维码分享 / 短链接 / 点击统计 / 举报治理 / 管理后台。一句话：一张名片把全网入口集中展示，并可以扫码传播。"));

content.push(h2("17.4 AI Agent 亮点"));
content.push(p("五大 Agent（财税、法务、市场调研、设计、社媒运营）针对中文小商家定制；统一 OpenAI-compatible provider 封装；白名单与双维额度控制；Prompt Injection 启发式检测；结构化输出方便用户直接使用。"));

content.push(h2("17.5 安全与上线能力"));
content.push(p("密码与 token 哈希存储；HttpOnly Cookie 登录态；注册/登录/找回/AI 多级限流；文件上传 magic bytes 校验；敏感配置加密与脱敏；完整可迁移的数据库与部署文档。"));

content.push(h2("17.6 下一步计划"));
content.push(p("上线内测版 v0.1 邀请制试用；补齐 AI 输出审核、NSFW 图片审核、管理员审计日志、后台隐藏路径、分布式限流、HTTPS 完整配置；根据真实用户反馈迭代产品形态与内容。"));

console.log("开始构建 docx...");
const doc = new Document({
  styles: { default: { document: { run: { font: FONT, size: FS_BODY, color: C_BLACK } } } },
  sections: [{ properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } }, children: content }],
});

Packer.toBuffer(doc)
  .then((buffer) => {
    try {
      fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
      fs.writeFileSync(OUTPUT_PATH, buffer);
      console.log("OK", OUTPUT_PATH, (buffer.length / 1024).toFixed(1), "KB");
    } catch (e) { console.error("FAIL", e); process.exit(1); }
  })
  .catch((e) => { console.error("BUILD FAIL", e); process.exit(1); });
