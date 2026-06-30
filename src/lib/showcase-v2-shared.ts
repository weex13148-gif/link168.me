// 比赛展示页面 V2 - 客户端安全共享类型与常量。
// 该文件不依赖任何服务端模块（无 Prisma / Node API / server-only 副作用），
// 可被 React 客户端组件安全 import。

export const SHOWCASE_V2_SECTIONS = [
  "opening",
  "painPoints",
  "solution",
  "productDemo",
  "aiAssistants",
  "businessModel",
  "competition",
  "progress",
  "ending",
] as const;

export type ShowcaseV2SectionKey = (typeof SHOWCASE_V2_SECTIONS)[number];

export const SHOWCASE_V2_SECTION_LABELS: Record<ShowcaseV2SectionKey, string> = {
  opening: "开场封面",
  painPoints: "用户痛点",
  solution: "产品解决方案",
  productDemo: "真实产品演示",
  aiAssistants: "五大 AI 助理",
  businessModel: "商业模式",
  competition: "竞争优势",
  progress: "项目进展与未来规划",
  ending: "结束页",
};

export type ShowcaseV2Bullet = { title: string; description?: string; icon?: string; value?: string };
export type ShowcaseV2Stat = { label: string; value: string; hint?: string };
export type ShowcaseV2SectionMeta = Record<string, unknown>;

export type ShowcaseV2Content = {
  id: string;
  sectionKey: ShowcaseV2SectionKey;
  eyebrow: string;
  title: string;
  body: string;
  bullets: ShowcaseV2Bullet[];
  stats: ShowcaseV2Stat[];
  ctaText: string | null;
  ctaUrl: string | null;
  metadata: ShowcaseV2SectionMeta;
  updatedBy: string | null;
  updatedAt: string;
};

export type ShowcaseV2Sequence = {
  id: string;
  sectionKey: ShowcaseV2SectionKey;
  orderIndex: number;
  visible: boolean;
  animation: boolean;
  theme: string;
  dwellSec: number;
  allowSwipe: boolean;
};

export type ShowcaseV2PublicPayload = {
  meta: {
    version: string;
    brand: string;
    tagline: string;
    enableAI: boolean;
    allowFreeInput: boolean;
    suggestedQuestionsByAssistant: Record<string, string[]>;
    welcomeByAssistant: Record<string, string>;
  };
  sections: Array<{
    key: ShowcaseV2SectionKey;
    label: string;
    eyebrow: string;
    title: string;
    body: string;
    bullets: ShowcaseV2Bullet[];
    stats: ShowcaseV2Stat[];
    ctaText: string | null;
    ctaUrl: string | null;
    theme: string;
    animation: boolean;
    allowSwipe: boolean;
    dwellSec: number;
  }>;
};
