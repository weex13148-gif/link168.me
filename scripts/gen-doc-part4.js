// Part 4: 维护指南 + 比赛展示建议 + 风险 + 附录 + 讲解稿
const { p, heading, buildTable, imageParagraph } = require("./gen-doc-part1");
const { PageBreak } = require("docx");

function section12() {
  const mods = [
    { name: "修改注册/登录", files: "src/lib/auth.ts、src/app/api/auth/register/route.ts、src/app/api/auth/login/route.ts、src/app/api/auth/forgot-password/route.ts", notes: "改动后需重跑 npx tsc --noEmit 与 npm run build；在 staging 先验证 Session Cookie 路径" },
    { name: "修改主页", files: "src/app/[username]/page.tsx、src/app/api/dashboard/route.ts、prisma/schema.prisma 的 Profile 模型", notes: "新增字段必须通过 Prisma Migrate；保留字与路由同步" },
    { name: "修改短链接", files: "src/app/api/dashboard/short-links/route.ts、src/app/s/[slug]/route.ts、src/app/go/[linkId]/route.ts", notes: "targetUrl 协议限制不要放宽；点击计数避免并发更新丢失" },
    { name: "修改 AI Agent", files: "src/lib/ai/assistants.ts、src/lib/ai/provider.ts、src/app/api/enterprise-ai/chat/route.ts、src/app/enterprise-ai/dashboard/page.tsx", notes: "系统提示使用模板字符串 + JSON 拼接；避免把用户输入拼到系统提示前" },
    { name: "新增后台页面", files: "src/app/admin/*、src/app/api/admin/*、src/lib/admin-auth.ts", notes: "所有写操作必须 requireSuperAdmin；对敏感字段做脱敏；对新增配置写入 app_configs 加密" },
    { name: "修改数据库", files: "prisma/schema.prisma、prisma/migrations/*", notes: "prisma migrate dev 创建迁移脚本；生产使用 prisma migrate deploy；迁移前备份" },
    { name: "新增环境变量", files: ".env.example、src/lib/app-config.ts", notes: "敏感变量走 app_configs 而不是 .env；.env 用于数据库与运行参数" },
    { name: "上线步骤", files: "部署脚本", notes: "1) git pull 2) npm ci 3) prisma generate 4) prisma migrate deploy 5) npm run build 6) pm2 reload 7) 冒烟测试" },
    { name: "回滚步骤", files: "运维脚本", notes: "1) 使用迁移前 pg_dump 恢复 2) 回滚代码到上一版本 3) pm2 restart 4) 冒烟验证；不可反向执行 migrate" },
  ];
  const r = [heading("12. 维护与修改指南", 1)];
  for (const m of mods) {
    r.push(heading(m.name, 2));
    r.push(p("参考文件：" + m.files, true));
    r.push(p("修改注意点：" + m.notes, true));
  }
  r.push(new PageBreak());
  return r;
}

function section13() {
  return [
    heading("13. 比赛展示建议", 1),
    heading("13.1 可展示页面", 2),
    p("建议顺序：首页 → 登录页 → Dashboard（编辑主页 / 添加链接 / 上传头像 / 二维码分享）→ /demo 公开主页 → /enterprise-ai 介绍 → /enterprise-ai/dashboard 对话 → /admin 后台（用户管理/主页管理/举报管理/AI 用量/系统配置）。", true),
    heading("13.2 可讲技术点", 2),
    p("Next.js App Router + Server Components；Prisma + PostgreSQL 的分层；自建 Session + HttpOnly Cookie；bcrypt 密码哈希；MIME + magic bytes 双重上传校验；API Key 加密存储与前端脱敏；AI Provider 统一封装 + 白名单 + 额度；分布式限流（待补）；Nginx/PM2/PostgreSQL 部署闭环。", true),
    heading("13.3 可强调的安全设计", 2),
    p("密码只存 bcrypt 12 轮哈希；Token 只存 token_hash；API Key 加密写入 app_configs；上传禁止 SVG；Session Cookie 生产强制 Secure；关键接口加限流；管理员 API requireSuperAdmin 双重校验。", true),
    heading("13.4 可强调的 AI Agent 与经营名片结合", 2),
    p("主页展示链接名片，二维码把线下流量带到线上；AI Agent 帮用户生成内容、梳理问题、给出建议；从「展示名片」到「经营辅助」的连续体验，让小商家低成本做完整经营。", true),
    heading("13.5 可强调的完整上线闭环", 2),
    p("本地 npm run dev → npx tsc --noEmit → npm run build → 服务器 git pull → npm ci → prisma generate → prisma migrate deploy → pm2 reload → 线上冒烟测试。", true),
    heading("13.6 可强调的非程序员友好", 2),
    p("非程序员借助 AI Agent 完成内容草稿、海报文案、市场调研与法务提醒，降低经营门槛；产品本身也借助 AI 在小团队资源下完成 MVP。", true),
    new PageBreak(),
  ];
}

function section14() {
  const risks = [
    ["高", "AI 输出审核", "仅基础过滤", "接内容安全 API；敏感话题词表维护；输出显著提示「仅供参考」"],
    ["高", "图片内容审核", "未上线", "对接图像内容审核 API；对上传头像/外链图片做二次检查"],
    ["高", "管理员审计日志", "未实现", "新增 admin_audit_logs 表，记录写操作与关键读操作"],
    ["高", "后台隐藏路径 /jeepwork", "未实施", "Nginx 限定允许 IP；应用层 requireSuperAdmin 兜底"],
    ["高", "数据库备份与迁移脚本", "手工执行", "把 pg_dump + 加密保存写成定时脚本；上线前自动备份"],
    ["中", "分布式限流", "当前内存 Map", "切换为 Redis/Upstash；保留内存实现作为降级"],
    ["中", "手机端兼容测试", "未系统性测试", "在主流机型和浏览器做 UI/表单/跳转/上传测试"],
    ["中", "HTTPS 完整配置", "未完成 HSTS/CSRF", "配置 HSTS；为关键表单启用 CSRF token"],
    ["中", "域名证书", "按现状评估", "设置 ACME 自动续期；证书到期前告警"],
    ["中", "真实用户数据迁移方案", "未编写", "按字段分级脱敏；迁移脚本 + 验收 checklist"],
  ];
  return [
    heading("14. 当前风险与下一步计划", 1),
    buildTable(
      ["优先级", "风险 / 任务", "当前状态", "建议处理"],
      risks,
      [1200, 2600, 2400, 2800],
    ),
    new PageBreak(),
  ];
}

function section15() {
  const idx = [
    ["src/lib/auth.ts", "登录 Session、bcrypt、requireLogin/requireAdmin/requireSuperAdmin", "不要改动 cookie 名称与路径后忘记登出逻辑"],
    ["src/lib/rate-limit.ts", "IP+用户滑动窗口限流", "生产切换为分布式 Redis/Upstash"],
    ["src/lib/content-safety.ts", "文本内容基础过滤", "对接真实内容安全 API"],
    ["src/lib/app-config.ts", "app_configs 读写与敏感字段加密/解密", "密钥走环境变量；不在 Git 提交"],
    ["src/lib/admin-auth.ts", "管理员权限校验", "所有 /admin/* 路由统一入口"],
    ["src/lib/db.ts", "Prisma Client 单例", "业务代码只从这里引 db"],
    ["src/lib/ai/provider.ts", "统一对话接口", "模型切换只改这里"],
    ["src/lib/ai/assistants.ts", "五大 Agent 系统提示与角色信息", "修改系统提示要验证注入风险"],
    ["src/app/api/auth/*", "注册/登录/找回密码/登出 API", "修改后完整回归登录流程"],
    ["src/app/api/dashboard/*", "Dashboard CRUD：profile/links/avatar/short-links/stats", "权限与归属校验勿漏"],
    ["src/app/api/enterprise-ai/*", "AI 对话与访问状态 API", "额度/白名单/限流"],
    ["src/app/api/admin/*", "管理员/超级管理员后台 API", "统一 requireSuperAdmin"],
    ["src/app/[username]/page.tsx", "用户公开主页", "公开页面不要暴露敏感字段"],
    ["src/app/dashboard/page.tsx", "用户工作台", "与 /api/dashboard/* 联动"],
    ["src/app/enterprise-ai/dashboard/page.tsx", "AI Agent 工作台", "白名单未命中时显示申请入口"],
    ["src/app/admin/*", "管理后台页面", "管理员/超级管理员权限分级"],
    ["prisma/schema.prisma", "数据库模型", "改动后走 Prisma Migrate"],
    [".env.example", "环境变量模板", "敏感变量不在此写真实值"],
    ["package.json", "脚本与依赖", "npm run build / dev / start"],
  ];
  return [
    heading("15. 附录：核心文件索引", 1),
    buildTable(
      ["文件路径", "用途", "修改注意事项"],
      idx,
      [2600, 3400, 3000],
    ),
    new PageBreak(),
  ];
}

function section16() {
  return [
    heading("16. 评审一分钟讲解稿", 1),
    p("大家好，我们是哈勃造梦，产品是 link168.me，一张二维码数字名片 + 五大 AI Agent，面向自媒体、小商家和一人公司。小商家现在最大的问题不是缺想法，而是缺人：缺人做文案、缺人做设计、缺人做市场、缺人做财税和法务。link168.me 解决的就是：让一张名片把微信客服、商品橱窗、课程目录、社群入口、公众号、小红书、抖音集中展示，并通过二维码线下传播。再通过五大 AI Agent——财税、法务、市场调研、设计、社媒运营——把经营决策和内容生产的门槛降下来。", true),
    p("我们从技术上也做了完整闭环：Next.js + PostgreSQL + Prisma Migrate；自建 Session + HttpOnly Cookie；bcrypt 12 轮密码哈希；API Key 加密存储与前端脱敏；MIME+magic bytes 双重上传校验；管理员后台与举报治理；白名单 + 额度控制的五大 AI Agent。我们已经在服务器上跑通，支持本地演示与线上公开页面。我们不替代真实的税务、律师和设计外包，而是帮助小商家低成本把生意跑起来。谢谢大家。", true),
    new PageBreak(),
  ];
}

function section17() {
  return [
    heading("17. 项目三分钟答辩提纲", 1),
    heading("17.1 项目背景", 2),
    p("自媒体、小商家、一人公司普遍面临流量承接难、经营缺工具、数据散落在多平台的问题。link168.me 把「聚合入口」与「经营辅助」融合在一个产品里。", true),
    heading("17.2 用户痛点", 2),
    p("一张海报放不下所有链接；多账号登录和维护成本高；缺专业财税、法务、市场、设计、社媒运营能力；内容生产需要大量时间与经验。", true),
    heading("17.3 核心功能", 2),
    p("注册登录、公开主页、链接管理、头像上传、二维码分享、短链接与跳转、点击统计、举报治理、超级管理员后台。", true),
    heading("17.4 AI Agent 亮点", 2),
    p("五大 Agent 覆盖财税/法务/市场调研/设计/社媒运营；白名单制内测；用户级与全局额度控制；基础 Prompt Injection 防护。", true),
    heading("17.5 安全与上线能力", 2),
    p("密码只存 bcrypt 哈希；Token 只存 hash；API Key 加密存储；MIME+magic bytes 校验；禁止 SVG；统一限流；Nginx+PM2+PostgreSQL 线上部署闭环；N/A SSL/HSTS 后续补齐。", true),
    heading("17.6 下一步计划", 2),
    p("补齐 AI 输出审核与图片内容审核、管理员审计日志、后台隐藏路径与 IP 限制、数据库自动化备份与迁移脚本、Redis/Upstash 分布式限流、手机端兼容测试、完整 HTTPS 与域名证书自动化、真实用户数据迁移方案。", true),
    new PageBreak(),
  ];
}

module.exports = { section12, section13, section14, section15, section16, section17 };
