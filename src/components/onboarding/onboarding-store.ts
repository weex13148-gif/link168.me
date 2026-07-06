export type OnboardingStep =
  | "welcome"
  | "username"
  | "avatar"
  | "profile"
  | "template"
  | "first-link"
  | "publish"
  | "checklist";

export const ONBOARDING_STEPS: OnboardingStep[] = [
  "welcome",
  "username",
  "avatar",
  "profile",
  "template",
  "first-link",
  "publish",
  "checklist",
];

export const STEP_LABELS: Record<OnboardingStep, string> = {
  welcome: "欢迎",
  username: "创建地址",
  avatar: "上传头像",
  profile: "完善资料",
  template: "选择模板",
  "first-link": "添加链接",
  publish: "发布名片",
  checklist: "任务清单",
};

export type OnboardingData = {
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  template: "business" | "creator" | "conversion";
  firstLinkTitle: string;
  firstLinkUrl: string;
  published: boolean;
};

export const initialOnboardingData: OnboardingData = {
  username: "",
  displayName: "",
  bio: "",
  avatarUrl: null,
  template: "business",
  firstLinkTitle: "",
  firstLinkUrl: "",
  published: false,
};

const STORAGE_KEY = "link168_onboarding_progress";

export function saveOnboardingProgress(step: OnboardingStep, data: Partial<OnboardingData>): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadOnboardingProgress();
    const saved = {
      step,
      data: { ...existing.data, ...data },
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // 静默失败
  }
}

export function loadOnboardingProgress(): { step: OnboardingStep | null; data: Partial<OnboardingData> } {
  if (typeof window === "undefined") return { step: null, data: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { step: null, data: {} };
    const parsed = JSON.parse(raw) as { step?: OnboardingStep; data?: Partial<OnboardingData> };
    return {
      step: parsed.step || null,
      data: parsed.data || {},
    };
  } catch {
    return { step: null, data: {} };
  }
}

export function clearOnboardingProgress(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 静默失败
  }
}

export function getNextStep(current: OnboardingStep): OnboardingStep | null {
  const index = ONBOARDING_STEPS.indexOf(current);
  if (index === -1 || index >= ONBOARDING_STEPS.length - 1) return null;
  return ONBOARDING_STEPS[index + 1];
}

export function getPrevStep(current: OnboardingStep): OnboardingStep | null {
  const index = ONBOARDING_STEPS.indexOf(current);
  if (index <= 0) return null;
  return ONBOARDING_STEPS[index - 1];
}

export function getStepIndex(step: OnboardingStep): number {
  return ONBOARDING_STEPS.indexOf(step);
}

export function isStepOptional(step: OnboardingStep): boolean {
  return ["avatar", "profile", "first-link"].includes(step);
}
