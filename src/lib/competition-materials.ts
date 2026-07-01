export type CompetitionMaterialItem = {
  id: string;
  name: string;
  purpose: "competition_ppt" | "project_pdf" | "demo_video" | "product_screenshot" | "judge_doc" | "backup";
  required: boolean;
  format: string;
  owner: string;
  description: string;
};

export const COMPETITION_MATERIALS: CompetitionMaterialItem[] = [
  { id: "roadshow-ppt", name: "决赛路演 PPT", purpose: "competition_ppt", required: true, format: "PPTX + PDF", owner: "项目负责人", description: "8–12 分钟版本，包含定位、痛点、方案、产品演示、商业模式、竞争优势、进展和下一步。" },
  { id: "project-brief", name: "项目说明书", purpose: "project_pdf", required: true, format: "PDF", owner: "项目负责人", description: "2–6 页，说明项目背景、目标用户、核心闭环、技术架构、商业模式和当前边界。" },
  { id: "demo-video", name: "产品演示视频", purpose: "demo_video", required: true, format: "MP4，建议 3–5 分钟", owner: "项目负责人", description: "录制注册、邮箱验证、主页编辑、公开主页、链接跳转、二维码和管理后台。" },
  { id: "screenshots", name: "产品关键截图", purpose: "product_screenshot", required: true, format: "PNG / JPG / WEBP", owner: "项目负责人", description: "首页、Dashboard、公开主页、邮箱验证、比赛中心和超级管理员后台。" },
  { id: "judge-guide", name: "评委体验说明", purpose: "judge_doc", required: true, format: "PDF / DOCX", owner: "项目负责人", description: "提供展示地址、访问密码、演示账号、推荐体验顺序、已完成/内测/规划边界。" },
  { id: "qa", name: "评委问答清单", purpose: "judge_doc", required: true, format: "PDF / DOCX", owner: "项目负责人", description: "覆盖用户价值、竞品差异、技术实现、商业化、合规、安全、AI 成本和未来计划。" },
  { id: "company-proof", name: "主体与合规资料", purpose: "judge_doc", required: false, format: "PDF / 图片", owner: "公司负责人", description: "营业执照、ICP备案、用户协议、隐私政策、举报入口和公司主体说明。" },
  { id: "source-proof", name: "开发与代码证明", purpose: "judge_doc", required: false, format: "PDF / 图片", owner: "项目负责人", description: "GitHub 提交记录、TRAE 使用记录、构建通过记录和关键功能验收截图。" },
  { id: "backup", name: "离线备份包", purpose: "backup", required: true, format: "ZIP", owner: "项目负责人", description: "PPT、PDF、视频、截图、说明书、评委指南和应急演示素材的离线备份。" },
];

export const COMPETITION_PAGE_CONTENT = [
  "一句话定位与目标用户",
  "真实用户痛点与使用场景",
  "产品解决方案和核心闭环",
  "真实产品页面与演示顺序",
  "AI 助理当前状态与安全边界",
  "免费版、会员版、企业版商业模式",
  "与 Linktree、二维码工具和普通电子名片的差异",
  "已完成、内测中、下一阶段的真实进展",
  "团队、公司主体、联系方式和展示地址",
  "评委资料下载、体验说明和问答准备",
] as const;

export const COMPETITION_DEMO_FLOW = [
  "打开比赛展示中心并说明页面受密码保护",
  "用 30 秒讲清定位、目标用户和核心价值",
  "进入真实首页并完成注册或使用固定演示账号",
  "展示邮箱验证、头像、资料和真实用户名",
  "添加两个真实链接并保存公开主页",
  "打开公开主页，确认按钮直接跳转原始网址",
  "展示二维码、主题、会员边界和企业 AI 入口",
  "进入超级管理员后台查看邮箱、用户、日志和比赛中心",
  "回到比赛页面说明商业模式、竞争优势和真实进展",
  "结束前给出下一阶段目标和联系方式",
] as const;

export const COMPETITION_FINAL_CHECKS = [
  "展示地址、共享密码和演示账号已单独记录",
  "PPT、PDF、视频、截图和评委指南均有最新版本",
  "所有页面不出现测试账号、yourname、假备案和内部占位词",
  "已完成、内测中和规划中能力没有混淆",
  "手机、电脑和弱网情况下都有备用演示方案",
  "GitHub 最新 master 已通过 Prisma、Lint、TypeScript 和生产构建",
  "所有材料已同时保存在电脑、云盘和离线备份包",
  "正式提交前再次核对比赛官方文件命名、大小和截止时间",
] as const;
