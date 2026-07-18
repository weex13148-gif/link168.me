"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  Mail,
  Palette,
  Phone,
  Rocket,
  User,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { PhonePreview } from "@/components/PhonePreview";
import type { DashboardProfile } from "@/components/dashboard-v1/types";
import { publicProfileUrl } from "@/components/dashboard-v1/types";
import {
  clearOnboardingProgress,
  getNextStep,
  getPrevStep,
  getStepIndex,
  loadOnboardingProgress,
  ONBOARDING_STEPS,
  saveOnboardingProgress,
  STEP_LABELS,
} from "@/components/onboarding/onboarding-store";
import {
  getOnboardingReadiness,
  type OnboardingSnapshot,
  type OnboardingStep,
} from "@/lib/onboarding/readiness";

type OnboardingData = {
  username: string;
  displayName: string;
  jobTitle: string;
  bio: string;
  template: "business" | "creator" | "conversion";
  phone: string;
  email: string;
  wechat: string;
};

const initialOnboardingData: OnboardingData = {
  username: "",
  displayName: "",
  jobTitle: "",
  bio: "",
  template: "business",
  phone: "",
  email: "",
  wechat: "",
};

type DashboardResult = {
  success?: boolean;
  error?: string;
  user?: { emailVerified?: boolean };
  profile?: DashboardProfile | null;
};

type ProfileResult = {
  success?: boolean;
  error?: string;
  profile?: DashboardProfile | null;
};

function profileToData(profile: DashboardProfile | null | undefined): OnboardingData {
  return {
    username: profile?.username ?? "",
    displayName: profile?.display_name ?? "",
    jobTitle: profile?.job_title ?? "",
    bio: profile?.bio ?? "",
    template: (profile?.template === "creator" || profile?.template === "conversion"
      ? profile.template
      : "business") as OnboardingData["template"],
    phone: profile?.phone ?? "",
    email: profile?.email ?? "",
    wechat: profile?.wechat ?? "",
  };
}

function errorMessage(result: { error?: string }, fallback: string): string {
  return result.error || fallback;
}

export function OnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("verify-email");
  const [data, setData] = useState<OnboardingData>(initialOnboardingData);
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverTruthReady, setServerTruthReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (): Promise<boolean> => {
    setServerTruthReady(false);
    setError("");
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const result = (await response.json()) as DashboardResult;
      if (!response.ok || !result.success) {
        setError(errorMessage(result, "无法读取当前引导进度，请重试。"));
        return false;
      }

      const snapshot: OnboardingSnapshot = {
        emailVerified: Boolean(result.user?.emailVerified),
        username: result.profile?.username ?? null,
        displayName: result.profile?.display_name ?? null,
        jobTitle: result.profile?.job_title ?? null,
        bio: result.profile?.bio ?? null,
        template: result.profile?.template ?? null,
        phone: result.profile?.phone ?? null,
        email: result.profile?.email ?? null,
        wechat: result.profile?.wechat ?? null,
        isPublic: Boolean(result.profile?.is_public),
      };
      const readiness = getOnboardingReadiness(snapshot);
      const cached = loadOnboardingProgress();
      const cachedIndex = cached.step
        ? ONBOARDING_STEPS.indexOf(cached.step)
        : -1;
      const requiredIndex = ONBOARDING_STEPS.indexOf(
        readiness.nextStep,
      );
      const initialIndex =
        cachedIndex >= 0 && cachedIndex <= requiredIndex
          ? cachedIndex
          : requiredIndex;

      setProfile(result.profile ?? null);
      setData(profileToData(result.profile));
      setCurrentStep(
        ONBOARDING_STEPS[initialIndex] || readiness.nextStep,
      );
      setServerTruthReady(true);
      return true;
    } catch {
      setError("网络连接失败，无法读取当前引导进度。请检查网络后重试。");
      return false;
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await loadDashboard();
      setLoading(false);
    })();
  }, [loadDashboard]);

  useEffect(() => {
    if (serverTruthReady) saveOnboardingProgress(currentStep);
  }, [currentStep, serverTruthReady]);

  const moveTo = useCallback((step: OnboardingStep | null) => {
    if (!step) return;
    setError("");
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const goNext = useCallback(() => moveTo(getNextStep(currentStep)), [currentStep, moveTo]);
  const goPrev = useCallback(() => moveTo(getPrevStep(currentStep)), [currentStep, moveTo]);

  function updateProfile(result: ProfileResult): DashboardProfile | null {
    if (!result.profile) return null;
    setProfile(result.profile);
    setData(profileToData(result.profile));
    return result.profile;
  }

  async function requestVerification() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/auth/verify-email", { method: "POST" });
      const result = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || result.success !== true) {
        setError(errorMessage(result, "验证邮件发送失败，请稍后重试。"));
        return;
      }
      router.push("/verify-email");
    } catch {
      setError("网络连接失败，验证邮件未发送。请稍后重试。");
    } finally {
      setSaving(false);
    }
  }

  async function saveUsername(): Promise<boolean> {
    const username = data.username.trim();
    if (!username) {
      setError("请输入你想要的公开地址。");
      return false;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/username", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const result = (await response.json()) as { success?: boolean; error?: string; username?: string };
      if (!response.ok || result.success !== true || !result.username) {
        setError(errorMessage(result, "公开地址保存失败，请换一个后重试。"));
        return false;
      }
      setData((previous) => ({ ...previous, username: result.username ?? username }));
      setProfile((previous) => previous ? { ...previous, username: result.username ?? username } : previous);
      return true;
    } catch {
      setError("网络连接失败，公开地址未保存。请稍后重试。");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveBusiness(): Promise<boolean> {
    const displayName = data.displayName.trim();
    const jobTitle = data.jobTitle.trim();
    const bio = data.bio.trim();
    if (!displayName || !jobTitle || !bio) {
      setError("请填写姓名或品牌名、专业定位，以及服务对象与业务介绍。");
      return false;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, jobTitle, bio }),
      });
      const result = (await response.json()) as ProfileResult;
      const savedProfile = response.ok && result.success === true ? updateProfile(result) : null;
      if (!savedProfile || !savedProfile.display_name?.trim() || !savedProfile.job_title?.trim() || !savedProfile.bio?.trim()) {
        setError(errorMessage(result, "业务资料未完整保存，请稍后重试。"));
        return false;
      }
      return true;
    } catch {
      setError("网络连接失败，业务资料未保存。请稍后重试。");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveTemplate(): Promise<boolean> {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/appearance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: "Link168 草木默认", template: data.template }),
      });
      const result = (await response.json()) as ProfileResult;
      const savedProfile = response.ok && result.success === true ? updateProfile(result) : null;
      if (!savedProfile || savedProfile.template !== data.template) {
        setError(errorMessage(result, "模板未确认保存，请重新选择后重试。"));
        return false;
      }
      return true;
    } catch {
      setError("网络连接失败，模板未保存。请稍后重试。");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveContact(): Promise<boolean> {
    const phone = data.phone.trim();
    const email = data.email.trim();
    const wechat = data.wechat.trim();
    if (!phone && !email && !wechat) {
      setError("请至少填写一种联系方式。");
      return false;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, email, wechat, contactVisibility: "public" }),
      });
      const result = (await response.json()) as ProfileResult;
      const savedProfile = response.ok && result.success === true ? updateProfile(result) : null;
      if (!savedProfile || ![savedProfile.phone, savedProfile.email, savedProfile.wechat].some((channel) => channel?.trim())) {
        setError(errorMessage(result, "联系方式未确认保存，请稍后重试。"));
        return false;
      }
      return true;
    } catch {
      setError("网络连接失败，联系方式未保存。请稍后重试。");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function publish(): Promise<boolean> {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: true }),
      });
      const result = (await response.json()) as ProfileResult;
      const savedProfile = response.ok && result.success === true ? updateProfile(result) : null;
      if (!savedProfile || savedProfile.is_public !== true) {
        setError(errorMessage(result, "发布状态未确认，请稍后重试。"));
        return false;
      }
      return true;
    } catch {
      setError("网络连接失败，名片未发布。请稍后重试。");
      return false;
    } finally {
      setSaving(false);
    }
  }

  const completeOnboarding = useCallback(() => {
    clearOnboardingProgress();
    router.replace("/console");
    router.refresh();
  }, [router]);

  const stepIndex = getStepIndex(currentStep);
  const progress = useMemo(
    () => ((stepIndex + 1) / ONBOARDING_STEPS.length) * 100,
    [stepIndex],
  );
  const publicUrl = publicProfileUrl(profile?.username);

  async function retryDashboard() {
    setLoading(true);
    await loadDashboard();
    setLoading(false);
  }

  if (loading) {
    return (
      <main className="ui-page grid min-h-dvh place-items-center px-4">
        <div className="ui-surface flex items-center gap-3 px-5 py-4 text-sm font-black">
          <Loader2 className="size-5 animate-spin text-[var(--ui-brand)]" />
          正在读取你的引导进度…
        </div>
      </main>
    );
  }

  if (!serverTruthReady) {
    return (
      <main className="ui-page grid min-h-dvh place-items-center px-4">
        <section className="ui-surface w-full max-w-md p-6 text-center sm:p-8">
          <h1 className="text-xl font-black text-[var(--ui-ink)]">暂时无法读取引导进度</h1>
          <p role="alert" className="mt-3 text-sm leading-6 text-[var(--ui-muted)]">
            {error || "请检查网络后重试读取。"}
          </p>
          <button
            type="button"
            onClick={() => void retryDashboard()}
            className="ui-button-primary mt-6 min-h-12 w-full text-base"
          >
            重试读取
          </button>
        </section>
      </main>
    );
  }

  const errorBox = error ? (
    <p role="alert" className="mt-5 rounded-xl bg-[var(--ui-danger-soft)] px-4 py-3 text-sm font-bold text-[var(--ui-danger)]">
      {error}
    </p>
  ) : null;

  const backButton = stepIndex > 0 ? (
    <button type="button" onClick={goPrev} className="ui-button-secondary min-h-12 flex-1 text-base">
      <ArrowLeft className="size-4" />
      上一步
    </button>
  ) : null;

  return (
    <main className="ui-page min-h-dvh pb-16 safe-area-pb">
      <header className="sticky top-0 z-20 border-b border-[var(--ui-line)] bg-[var(--ui-surface)]/90 backdrop-blur safe-area-pt">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3 sm:px-6">
          <BrandLogo size="header" className="!w-[100px]" />
          <div className="flex-1">
            <div className="h-2 overflow-hidden rounded-full bg-[var(--ui-surface-muted)]">
              <div className="h-full rounded-full bg-[var(--ui-brand)] transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1.5 text-xs font-bold text-[var(--ui-muted)]">
              第 {stepIndex + 1} 步 / 共 {ONBOARDING_STEPS.length} 步 · {STEP_LABELS[currentStep]}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-4xl gap-8 px-4 py-6 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-10">
        <div className="min-w-0">
          {currentStep === "verify-email" ? (
            <section className="ui-surface p-6 sm:p-8">
              <Mail className="size-8 text-[var(--ui-brand)]" />
              <h1 className="mt-5 text-2xl font-black text-[var(--ui-ink)] sm:text-3xl">先验证邮箱</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--ui-muted)]">验证邮箱后，才能发布并管理你的公开名片。</p>
              {errorBox}
              <button type="button" onClick={() => void requestVerification()} disabled={saving} className="ui-button-primary mt-6 min-h-12 w-full text-base disabled:opacity-60">
                {saving ? <Loader2 className="size-5 animate-spin" /> : null}
                {saving ? "正在发送…" : "发送验证邮件"}
                <ArrowRight className="size-4" />
              </button>
            </section>
          ) : null}

          {currentStep === "username" ? (
            <section className="ui-surface p-6 sm:p-8">
              <User className="size-8 text-[var(--ui-brand)]" />
              <h1 className="mt-5 text-2xl font-black text-[var(--ui-ink)] sm:text-3xl">创建你的公开地址</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--ui-muted)]">别人通过 link168.me/你的地址 就能访问你的名片。</p>
              <label className="mt-6 grid gap-2">
                <span className="text-sm font-black text-[var(--ui-ink)]">公开地址</span>
                <input value={data.username} onChange={(event) => setData((previous) => ({ ...previous, username: event.target.value.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase() }))} maxLength={32} className="ui-input" placeholder="例如：abao" />
              </label>
              {errorBox}
              <div className="mt-6 flex gap-3">{backButton}<button type="button" disabled={saving} onClick={async () => { if (await saveUsername()) goNext(); }} className="ui-button-primary min-h-12 flex-[2] text-base disabled:opacity-60">{saving ? <Loader2 className="size-5 animate-spin" /> : null}{saving ? "保存中…" : "继续"}<ArrowRight className="size-4" /></button></div>
            </section>
          ) : null}

          {currentStep === "business" ? (
            <section className="ui-surface p-6 sm:p-8">
              <FileText className="size-8 text-[var(--ui-brand)]" />
              <h1 className="mt-5 text-2xl font-black text-[var(--ui-ink)] sm:text-3xl">填写业务资料</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--ui-muted)]">这些资料将直接展示在你的共享名片上。</p>
              <div className="mt-6 grid gap-4">
                <input name="displayName" aria-label="姓名或品牌名" value={data.displayName} onChange={(event) => setData((previous) => ({ ...previous, displayName: event.target.value }))} maxLength={40} className="ui-input" placeholder="姓名或品牌名" />
                <input name="jobTitle" aria-label="专业定位" value={data.jobTitle} onChange={(event) => setData((previous) => ({ ...previous, jobTitle: event.target.value }))} maxLength={200} className="ui-input" placeholder="专业定位" />
                <textarea name="bio" aria-label="服务对象与业务介绍" value={data.bio} onChange={(event) => setData((previous) => ({ ...previous, bio: event.target.value }))} maxLength={500} className="ui-input min-h-32 resize-y" placeholder="服务对象与业务介绍" />
              </div>
              {errorBox}
              <div className="mt-6 flex gap-3">{backButton}<button type="button" disabled={saving} onClick={async () => { if (await saveBusiness()) goNext(); }} className="ui-button-primary min-h-12 flex-[2] text-base disabled:opacity-60">{saving ? <Loader2 className="size-5 animate-spin" /> : null}{saving ? "保存中…" : "保存并继续"}<ArrowRight className="size-4" /></button></div>
            </section>
          ) : null}

          {currentStep === "template" ? (
            <section className="ui-surface p-6 sm:p-8">
              <Palette className="size-8 text-[var(--ui-brand)]" />
              <h1 className="mt-5 text-2xl font-black text-[var(--ui-ink)] sm:text-3xl">选择专业模板</h1>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[{ id: "business", name: "商务简约" }, { id: "creator", name: "创意展示" }, { id: "conversion", name: "转化导向" }].map((template) => <button key={template.id} type="button" onClick={() => setData((previous) => ({ ...previous, template: template.id as OnboardingData["template"] }))} className={`rounded-2xl border-2 p-4 text-left ${data.template === template.id ? "border-[var(--ui-brand)] bg-[var(--ui-brand-soft)]" : "border-[var(--ui-line)]"}`}><p className="font-black text-[var(--ui-ink)]">{template.name}</p><p className="mt-2 text-sm text-[var(--ui-muted)]">适配你的公开名片</p>{data.template === template.id ? <Check className="mt-3 size-5 text-[var(--ui-brand)]" /> : null}</button>)}
              </div>
              {errorBox}
              <div className="mt-6 flex gap-3">{backButton}<button type="button" disabled={saving} onClick={async () => { if (await saveTemplate()) goNext(); }} className="ui-button-primary min-h-12 flex-[2] text-base disabled:opacity-60">{saving ? <Loader2 className="size-5 animate-spin" /> : null}{saving ? "保存中…" : "使用此模板"}<ArrowRight className="size-4" /></button></div>
            </section>
          ) : null}

          {currentStep === "contact" ? (
            <section className="ui-surface p-6 sm:p-8">
              <Phone className="size-8 text-[var(--ui-brand)]" />
              <h1 className="mt-5 text-2xl font-black text-[var(--ui-ink)] sm:text-3xl">留下至少一种联系方式</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--ui-muted)]">保存后将公开展示你填写的联系方式。</p>
              <div className="mt-6 grid gap-4"><input value={data.phone} onChange={(event) => setData((previous) => ({ ...previous, phone: event.target.value }))} className="ui-input" placeholder="手机号码" /><input type="email" value={data.email} onChange={(event) => setData((previous) => ({ ...previous, email: event.target.value }))} className="ui-input" placeholder="邮箱" /><input value={data.wechat} onChange={(event) => setData((previous) => ({ ...previous, wechat: event.target.value }))} className="ui-input" placeholder="微信号" /></div>
              {errorBox}
              <div className="mt-6 flex gap-3">{backButton}<button type="button" disabled={saving} onClick={async () => { if (await saveContact()) goNext(); }} className="ui-button-primary min-h-12 flex-[2] text-base disabled:opacity-60">{saving ? <Loader2 className="size-5 animate-spin" /> : null}{saving ? "保存中…" : "保存并预览"}<ArrowRight className="size-4" /></button></div>
            </section>
          ) : null}

          {currentStep === "preview" ? (
            <section className="ui-surface p-6 sm:p-8">
              <Eye className="size-8 text-[var(--ui-brand)]" />
              <h1 className="mt-5 text-2xl font-black text-[var(--ui-ink)] sm:text-3xl">确认手机预览</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--ui-muted)]">以下内容来自刚刚保存到服务器的名片资料。</p>
              <PhonePreview variant="public" username={profile?.username || "你的地址"} displayName={profile?.display_name} bio={profile?.bio} avatarUrl={profile?.avatar_url} appearance={{ themeName: profile?.theme, template: (profile?.template || "business") as "business" | "creator" | "conversion", customTheme: profile?.custom_theme, contactVisibility: profile?.contact_visibility }} className="mx-auto mt-6 max-w-[315px]" />
              {errorBox}
              <div className="mt-6 flex gap-3">{backButton}<button type="button" onClick={goNext} className="ui-button-primary min-h-12 flex-[2] text-base">预览无误<ArrowRight className="size-4" /></button></div>
            </section>
          ) : null}

          {currentStep === "publish" ? (
            <section className="ui-surface p-6 sm:p-8">
              <Rocket className="size-8 text-[var(--ui-brand)]" />
              <h1 className="mt-5 text-2xl font-black text-[var(--ui-ink)] sm:text-3xl">发布你的名片</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--ui-muted)]">发布后，任何人都可以通过公开地址访问这张名片。</p>
              <p className="mt-6 break-all rounded-xl bg-[var(--ui-surface-muted)] px-4 py-3 text-sm font-bold text-[var(--ui-brand-hover)]">{publicUrl || "公开地址未确认"}</p>
              {errorBox}
              <div className="mt-6 flex gap-3">{backButton}<button type="button" disabled={saving} onClick={async () => { if (await publish()) goNext(); }} className="ui-button-primary min-h-12 flex-[2] text-base disabled:opacity-60">{saving ? <Loader2 className="size-5 animate-spin" /> : <Rocket className="size-4" />}{saving ? "发布中…" : "立即发布"}</button></div>
            </section>
          ) : null}

          {currentStep === "reception" ? (
            <section className="ui-surface p-6 sm:p-8">
              <CheckCircle2 className="size-8 text-[var(--ui-success)]" />
              <h1 className="mt-5 text-2xl font-black text-[var(--ui-ink)] sm:text-3xl">名片已发布</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--ui-muted)]">接下来可选择你的访客接待方式。</p>
              <div className="mt-6 grid gap-4">
                <div className="rounded-2xl border border-[var(--ui-line)] p-5"><h2 className="font-black text-[var(--ui-ink)]">免费预设接待</h2><p className="mt-2 text-sm leading-6 text-[var(--ui-muted)]">预设回复不调用模型，也不消耗 AI 额度。</p><Link href="/workbench/ai?mode=preset" onClick={clearOnboardingProgress} className="ui-button-secondary mt-4 min-h-11">配置免费预设接待</Link></div>
                <div className="rounded-2xl border border-[var(--ui-line)] p-5"><h2 className="font-black text-[var(--ui-ink)]">Plus / Pro 真实 AI 接待</h2><p className="mt-2 text-sm leading-6 text-[var(--ui-muted)]">使用真实 AI 为访客提供接待与回复。</p><Link href="/workbench/ai?mode=real" onClick={clearOnboardingProgress} className="ui-button-primary mt-4 min-h-11">了解 Plus / Pro 真实 AI 接待</Link></div>
              </div>
              <button type="button" onClick={completeOnboarding} className="mt-6 w-full text-sm font-black text-[var(--ui-muted)] underline underline-offset-4">稍后设置，进入首页</button>
            </section>
          ) : null}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24"><p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-[var(--ui-faint)]">名片预览</p><PhonePreview variant="public" username={profile?.username || data.username || "你的地址"} displayName={profile?.display_name || data.displayName || "姓名或品牌名"} bio={profile?.bio || data.bio || "服务对象与业务介绍"} avatarUrl={profile?.avatar_url} appearance={{ themeName: profile?.theme || "Link168 草木默认", template: (profile?.template || data.template) as "business" | "creator" | "conversion", customTheme: profile?.custom_theme, contactVisibility: profile?.contact_visibility }} className="mx-auto max-w-[280px]" /></div>
        </aside>
      </div>
    </main>
  );
}
