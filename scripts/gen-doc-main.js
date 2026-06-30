// Content generator: returns array of children for docx Document
const { p, heading, buildTable, imageParagraph } = require("./gen-doc-part1");
const { PageBreak } = require("docx");

function sectionCover() {
  return [
    new PageBreak(), // start after cover - actually this is the first section, use cover first
    heading("哈勃造梦项目", 1),
    p("项目功能说明 · 技术逻辑说明 · 后续维护手册"),
    p("link168.me — 一张二维码数字名片 + 五大 AI Agent"),
    p("面向自媒体、小商家和一人公司的 AI 经营名片平台"),
    p(`版本：v0.1 Internal Beta    日期：${new Date().toISOString().slice(0, 10)}`),
    p("出品方：合肥造梦哈勃文化传媒有限公司"),
    new PageBreak(),
  ];
}

function section1() {
  const r = [
    heading("1. 项目概览", 1),
    p("项目名称：哈勃造梦（link168.me）。本项目定位为面向自媒体、小商家和一人公司的 AI 经营名片平台。用户创建 link168.me/用户名 的公开主页，把微信客服、商品橱窗、课程目录、社群入口、公众号、小红书、抖音等平台链接集中展示，并通过二维码线下传播。在此基础上提供五大 AI Agent（财税、法务、市场调研、设计、社媒运营），帮助用户完成从展示、获客到经营的闭环。", true),
    p("项目主 Slogan：一张二维码数字名片 + 五大 AI Agent，小商家低成本获客与经营。视觉风格：暖白、简洁、高级、可信、中文用户友好的艺术商务风格。", true),
    heading("1.1 目标用户与核心价值", 2),
    buildTable(
      ["用户类型", "典型画像", "核心诉求"],
      [
        ["课程咨询者 / 知识付费博主", "独立讲师、线下课老师", "课程目录、咨询入口、往期学员案例，社媒内容助手"],
        ["小商家 / 个体户", "本地服务、手作品牌、淘宝店主", "商品橱窗、微信客服、经营数据提醒、设计与推广建议"],
        ["内容创作者", "公众号作者、小红书博主、短视频创作者", "各平台账号集中展示、粉丝聚合、选题与标题建议"],
        ["社群运营者 / 一人公司", "群主、活动组织者、自由职业者", "活动列表、入群入口、联系方式、合规与法务风险提醒"],
      ],
      [2200, 3400, 3400],
    ),
    heading("1.2 比赛展示亮点", 2),
    p("1) 完整闭环：注册 → 登录 → 创建主页 → 添加链接 → 公开主页访问 → 二维码分享 → 举报治理 → 超级管理员后台；", true),
    p("2) 安全可信：自建 Session + HttpOnly Cookie、bcrypt 12 轮密码哈希、登录防爆破限流、第三方密钥加密存储；", true),
    p("3) AI Agent 展示：财税、法务、市场调研、设计、社媒运营五大 Agent 工作台；白名单制内测、用户级额度与全局额度控制；", true),
    p("4) 管理后台：用户管理、主页管理、举报处理、系统配置中心、AI 用量统计；", true),
    p("5) 部署可验证：服务器已跑通 Next.js + PostgreSQL + Prisma Migrate，可演示本地 MVP 与线上公开页面。", true),
    heading("1.3 当前完成状态", 2),
    buildTable(
      ["模块", "状态", "说明"],
      [
        ["用户注册 / 登录 / 登出", "已完成", "bcrypt 哈希 + HttpOnly Cookie + Session Token"],
        ["找回密码 / 邮箱验证", "表单与 API 已完成", "依赖 SMTP，由超级管理员统一维护"],
        ["公开主页", "已完成", "/[username] 公开路由，品牌 Footer"],
        ["链接管理", "已完成", "标题 / URL / 描述 / 激活状态 / 排序"],
        ["头像上传", "已完成", "MIME + magic bytes 双重校验，禁止 SVG，随机文件名"],
        ["二维码 / 分享", "已完成", "基础二维码生成，后续可自定义样式"],
        ["短链接与跳转", "已完成", "/s/[slug]、/go/[linkId]，目标 URL 协议限制"],
        ["点击统计", "已完成", "Link.totalClicks 字段 + link_clicks 日志表"],
        ["举报中心", "已完成", "用户提交 + 管理员列表与处理备注"],
        ["五大 AI Agent", "内测白名单", "五大 Agent 对话 + 白名单 + 额度 + 基础注入过滤"],
        ["超级管理员后台", "已完成", "/admin/users、/admin/profiles、/admin/reports、/admin/ai-usage、/admin/settings/api"],
        ["PostgreSQL + Prisma", "已完成", "迁移脚本化（prisma/migrations/*）"],
      ],
      [2200, 2200, 4600],
    ),
    ...imageParagraph("screenshot-home.png", "图 1：首页 — 产品定位与核心入口展示"),
    new PageBreak(),
  ];
  return r;
}

function section2() {
  return [
    heading("2. 产品定位", 1),
    p("为什么是 AI 经营名片平台？因为小商家、个体户、自媒体普遍同时面临三个问题：流量承接难（无法在一张名片、一张海报里留下所有入口）、经营缺工具（没有财税、法务、市场、设计、社媒的专业人力或预算）、经营数据散落在多个平台。", true),
    p("link168.me 通过一张二维码数字名片把这些入口集中到一个 URL，再通过五大 AI Agent 把经营决策和内容生产的门槛降下来。我们不替代真实的税务、律师与设计外包，而是把「信息收集 → 思路梳理 → 内容产出」的一部分自动化，让用户能够低成本把生意跑起来。", true),
    heading("2.1 和普通个人主页 / 短链工具 / 普通 AI 工具的区别", 2),
    buildTable(
      ["对比维度", "普通个人主页", "普通短链工具", "普通 AI 工具", "link168.me"],
      [
        ["链接聚合", "有限", "强", "无", "强（带标题/描述/排序）"],
        ["品牌识别", "依赖平台", "无品牌", "无品牌", "品牌 Footer / 自定义主题"],
        ["二维码传播", "一般无", "部分支持", "无", "默认支持，后续可自定义"],
        ["经营闭环", "无", "无", "仅内容生成", "展示 + 获客 + 经营辅助"],
        ["行业 Agent", "无", "无", "通用对话", "财税 / 法务 / 市场调研 / 设计 / 社媒运营"],
        ["治理与合规", "弱", "弱", "弱", "举报中心 + 管理员后台 + 内容安全基础过滤"],
        ["成本", "免费 / 平台抽成", "免费 / 会员", "按量付费", "内测免费，后续会员制"],
      ],
      [1300, 1400, 1400, 1400, 3500],
    ),
    ...imageParagraph("screenshot-demo-profile.png", "图 2：用户公开主页示例 /demo"),
    ...imageParagraph("screenshot-demo-profile-mobile.png", "图 3：移动端公开主页效果"),
    new PageBreak(),
  ];
}

function section3() {
  return [
    heading("3. 功能总览", 1),
    buildTable(
      ["模块", "功能", "用户角色", "当前状态", "说明"],
      [
        ["用户注册与登录", "邮箱密码注册、登录登出、bcrypt 哈希", "访客/用户", "已完成", "src/app/api/auth/*"],
        ["邮箱验证", "邮件发送 + Token 校验", "用户", "表单/API 已完成", "依赖 SMTP，超级管理员维护"],
        ["找回密码", "忘记密码 + 重置密码流程", "用户", "表单/API 已完成", "Token 一次性消耗，短期有效"],
        ["公开主页", "/[username] 公开路由", "访客/用户", "已完成", "暖白简洁视觉 + 品牌 Footer"],
        ["链接管理", "新增/编辑/删除/排序/激活", "登录用户", "已完成", "/api/dashboard/links"],
        ["头像上传", "文件上传 + MIME/magic bytes 校验", "登录用户", "已完成", "禁止 SVG；随机文件名"],
        ["主题风格", "默认主题 + Schema 预留字段", "登录用户", "半完成", "后续开放多主题切换"],
        ["二维码 / 分享", "主页二维码生成", "登录用户", "已完成", "react-qr-code 本地生成"],
        ["短链接", "自定义 slug + 目标 URL + 计数", "登录用户", "已完成", "/s/[slug]、/go/[linkId]"],
        ["点击统计", "Link 点击数 + link_clicks 日志", "登录用户", "已完成", "总点击与点击日志分表"],
        ["AI Agent 工作台", "五大 Agent 对话界面", "白名单用户", "内测版", "/enterprise-ai/dashboard"],
        ["五大 AI Agent", "财税/法务/市场调研/设计/社媒运营", "白名单用户", "内测版", "白名单 + 额度控制"],
        ["AI 白名单", "管理员配置 AI 可访问用户", "超级管理员", "已完成", "/admin/settings/api"],
        ["AI 额度控制", "用户级 + 全局额度", "超级管理员", "已完成", "ai_usage_logs + 配置中心"],
        ["管理后台", "/admin 路由矩阵", "管理员/超级管理员", "已完成", "用户/主页/举报/配置/用量"],
        ["用户管理", "用户列表搜索/角色状态", "超级管理员", "已完成", "/admin/users"],
        ["主页管理", "主页列表/隐藏/恢复", "超级管理员", "已完成", "/admin/profiles"],
        ["举报管理", "举报列表/处理备注/隐藏主页", "管理员/超级管理员", "已完成", "/admin/reports"],
        ["AI 用量统计", "按用户/Agent/日期汇总", "超级管理员", "已完成", "/admin/ai-usage"],
        ["系统配置中心", "第三方 API/邮件/存储/短信", "超级管理员", "已完成", "/admin/settings/api"],
        ["安全加固", "限流/密码哈希/Token 哈希/上传校验", "系统层", "已完成", "src/lib/rate-limit.ts、content-safety.ts"],
      ],
      [1200, 2200, 1200, 1400, 3000],
    ),
    new PageBreak(),
  ];
}

module.exports = { sectionCover, section1, section2, section3 };
