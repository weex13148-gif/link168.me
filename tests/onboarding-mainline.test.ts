import fs from "node:fs";
import path from "node:path";
import {
  ONBOARDING_STEPS,
  getOnboardingReadiness,
} from "@/lib/onboarding/readiness";

const ready = {
  emailVerified: true,
  username: "consultant-li",
  displayName: "李顾问",
  jobTitle: "品牌咨询顾问",
  bio: "帮助小企业建立清晰品牌定位，主要服务初创团队。",
  template: "business",
  phone: null,
  email: "hello@example.com",
  wechat: null,
  isPublic: true,
};

describe("approved onboarding mainline", () => {
  test("step order matches the specification", () => {
    expect(ONBOARDING_STEPS).toEqual([
      "verify-email",
      "username",
      "business",
      "template",
      "contact",
      "preview",
      "publish",
      "reception",
    ]);
  });

  test("email verification blocks first", () => {
    expect(
      getOnboardingReadiness({
        ...ready,
        emailVerified: false,
      }).nextStep,
    ).toBe("verify-email");
  });

  test("temporary username remains incomplete", () => {
    expect(
      getOnboardingReadiness({
        ...ready,
        username: "u_123456789abc",
      }).nextStep,
    ).toBe("username");
  });

  test("business requires identity, positioning and audience copy", () => {
    expect(
      getOnboardingReadiness({
        ...ready,
        bio: null,
      }).nextStep,
    ).toBe("business");
  });

  test("one contact channel is required", () => {
    expect(
      getOnboardingReadiness({
        ...ready,
        phone: null,
        email: null,
        wechat: null,
      }).nextStep,
    ).toBe("contact");
  });

  test("a published profile reaches the reception choice", () => {
    expect(getOnboardingReadiness(ready).nextStep).toBe("reception");
  });

  test("a private completed profile reaches preview before publish", () => {
    expect(
      getOnboardingReadiness({ ...ready, isPublic: false }).nextStep,
    ).toBe("preview");
  });

  test("wizard persists through approved existing APIs", () => {
    const wizard = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/onboarding/OnboardingWizard.tsx",
      ),
      "utf8",
    );
    for (const endpoint of [
      "/api/dashboard",
      "/api/dashboard/username",
      "/api/dashboard/profile",
      "/api/dashboard/appearance",
    ]) {
      expect(wizard).toContain(endpoint);
    }
  });

  test("reception distinguishes preset replies from real AI", () => {
    const wizard = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/onboarding/OnboardingWizard.tsx",
      ),
      "utf8",
    );
    expect(wizard).toContain("免费预设接待");
    expect(wizard).toContain(
      "预设回复不调用模型，也不消耗 AI 额度",
    );
    expect(wizard).toContain("Plus / Pro 真实 AI 接待");
    expect(wizard).not.toContain("免费 AI 客服");
  });

  test("obsolete avatar and first-link steps are gone", () => {
    const store = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/onboarding/onboarding-store.ts",
      ),
      "utf8",
    );
    expect(store).not.toContain('"avatar"');
    expect(store).not.toContain('"first-link"');
    expect(store).not.toContain('"checklist"');
  });

  test("a newly created profile starts private until explicit publish", () => {
    const route = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/app/api/dashboard/profile/route.ts",
      ),
      "utf8",
    );
    expect(route).toContain("isPublic: isPublicValue ?? false");
  });

  test("wizard does not expose or cache progress before server truth is ready", () => {
    const wizard = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/onboarding/OnboardingWizard.tsx",
      ),
      "utf8",
    );
    expect(wizard).toContain("serverTruthReady");
    expect(wizard).toContain("if (!serverTruthReady)");
    expect(wizard).toContain("if (serverTruthReady) saveOnboardingProgress(currentStep)");
    expect(wizard).toContain("重试读取");
  });

  test("AI reception links clear progress without invoking the console completion redirect", () => {
    const wizard = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/onboarding/OnboardingWizard.tsx",
      ),
      "utf8",
    );
    expect(wizard).toContain('href="/workbench/ai?mode=preset" onClick={clearOnboardingProgress}');
    expect(wizard).toContain('href="/workbench/ai?mode=real" onClick={clearOnboardingProgress}');
    expect(wizard).not.toContain('href="/workbench/ai?mode=preset" onClick={completeOnboarding}');
    expect(wizard).not.toContain('href="/workbench/ai?mode=real" onClick={completeOnboarding}');
  });
});
