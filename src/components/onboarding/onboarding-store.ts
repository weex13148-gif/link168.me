import {
  ONBOARDING_STEPS,
  type OnboardingStep,
} from "@/lib/onboarding/readiness";

export { ONBOARDING_STEPS };
export type { OnboardingStep };

export const STEP_LABELS: Record<OnboardingStep, string> = {
  "verify-email": "验证邮箱",
  username: "公开地址",
  business: "业务资料",
  template: "专业模板",
  contact: "联系方式",
  preview: "手机预览",
  publish: "发布名片",
  reception: "接待设置",
};

const STORAGE_KEY = "link168_onboarding_progress";

type OnboardingNavigation = {
  step: OnboardingStep | null;
  updatedAt: number | null;
};

export function saveOnboardingProgress(step: OnboardingStep): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ step, updatedAt: Date.now() }),
    );
  } catch {
    // 静默失败
  }
}

export function loadOnboardingProgress(): OnboardingNavigation {
  if (typeof window === "undefined") return { step: null, updatedAt: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { step: null, updatedAt: null };
    const parsed = JSON.parse(raw) as Partial<OnboardingNavigation>;
    return {
      step:
        parsed.step && ONBOARDING_STEPS.includes(parsed.step)
          ? parsed.step
          : null,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : null,
    };
  } catch {
    return { step: null, updatedAt: null };
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

export function isStepOptional(_step: OnboardingStep): boolean {
  return false;
}
