export type OnboardingStep =
  | "verify-email"
  | "username"
  | "business"
  | "template"
  | "contact"
  | "preview"
  | "publish"
  | "reception";

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  "verify-email",
  "username",
  "business",
  "template",
  "contact",
  "preview",
  "publish",
  "reception",
] as const;

export type OnboardingSnapshot = {
  emailVerified: boolean;
  username: string | null;
  displayName: string | null;
  jobTitle: string | null;
  bio: string | null;
  template: string | null;
  phone: string | null;
  email: string | null;
  wechat: string | null;
  isPublic: boolean;
};

export type OnboardingReadiness = {
  nextStep: OnboardingStep;
  completedSteps: readonly OnboardingStep[];
};

const hasText = (value: string | null) => Boolean(value?.trim());

const hasPermanentUsername = (value: string | null) => {
  const username = value?.trim().toLowerCase() || "";
  return (
    Boolean(username) &&
    username !== "yourname" &&
    !/^u_[a-z0-9]{12}$/.test(username) &&
    !/^user-[a-z0-9]{6,}$/.test(username)
  );
};

export function getOnboardingReadiness(
  snapshot: OnboardingSnapshot,
): OnboardingReadiness {
  const checks: Record<OnboardingStep, boolean> = {
    "verify-email": snapshot.emailVerified,
    username: hasPermanentUsername(snapshot.username),
    business:
      hasText(snapshot.displayName) &&
      hasText(snapshot.jobTitle) &&
      hasText(snapshot.bio),
    template: ["business", "creator", "conversion"].includes(
      snapshot.template || "",
    ),
    contact:
      hasText(snapshot.phone) ||
      hasText(snapshot.email) ||
      hasText(snapshot.wechat),
    preview: snapshot.isPublic,
    publish: snapshot.isPublic,
    reception: false,
  };

  const completedSteps = ONBOARDING_STEPS.filter((step) => checks[step]);
  const nextStep =
    ONBOARDING_STEPS.find((step) => !checks[step]) || "reception";
  return { nextStep, completedSteps };
}
