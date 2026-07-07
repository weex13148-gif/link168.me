"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  User,
  Image as ImageIcon,
  FileText,
  Palette,
  Link as LinkIcon,
  QrCode,
  Rocket,
  CheckCircle2,
  SkipForward,
  Upload,
  Loader2,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { PhonePreview } from "@/components/PhonePreview";
import type { PhonePreviewLink } from "@/components/PhonePreview";
import {
  ONBOARDING_STEPS,
  STEP_LABELS,
  initialOnboardingData,
  saveOnboardingProgress,
  loadOnboardingProgress,
  clearOnboardingProgress,
  getNextStep,
  getPrevStep,
  getStepIndex,
  isStepOptional,
  type OnboardingStep,
  type OnboardingData,
} from "@/components/onboarding/onboarding-store";
import type { DashboardProfile } from "@/components/dashboard-v1/types";
import { publicProfileUrl } from "@/components/dashboard-v1/types";

type OnboardingWizardProps = {
  initialStep?: OnboardingStep;
};

export function OnboardingWizard({ initialStep = "welcome" }: OnboardingWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(initialStep);
  const [data, setData] = useState<OnboardingData>(initialOnboardingData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = loadOnboardingProgress();
    if (saved.step && ONBOARDING_STEPS.includes(saved.step)) {
      setCurrentStep(saved.step);
    }
    if (saved.data) {
      setData((prev) => ({ ...prev, ...saved.data }));
    }
    setLoading(false);
    void loadProfile();
  }, []);

  useEffect(() => {
    if (loading) return;
    saveOnboardingProgress(currentStep, data);
  }, [currentStep, data, loading]);

  async function loadProfile() {
    try {
      const res = await fetch("/api/dashboard");
      const result = await res.json();
      if (result?.success && result.profile) {
        setProfile(result.profile);
        setData((prev) => ({
          ...prev,
          username: result.profile.username || "",
          displayName: result.profile.display_name || "",
          bio: result.profile.bio || "",
          avatarUrl: result.profile.avatar_url || null,
          template: (result.profile.template || "business") as OnboardingData["template"],
        }));
      }
    } catch {
      // 静默失败
    }
  }

  const stepIndex = getStepIndex(currentStep);
  const progress = useMemo(() => ((stepIndex + 1) / ONBOARDING_STEPS.length) * 100, [stepIndex]);
  const prevStep = getPrevStep(currentStep);
  const nextStep = getNextStep(currentStep);
  const optional = isStepOptional(currentStep);

  const goNext = useCallback(() => {
    if (nextStep) {
      setCurrentStep(nextStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [nextStep]);

  const goPrev = useCallback(() => {
    if (prevStep) {
      setCurrentStep(prevStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [prevStep]);

  const skipStep = useCallback(() => {
    if (nextStep) {
      setCurrentStep(nextStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [nextStep]);

  const finishOnboarding = useCallback(() => {
    clearOnboardingProgress();
    router.push("/dashboard");
    router.refresh();
  }, [router]);

  async function handleAvatarUpload(file: File) {
    setSaving(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch("/api/dashboard/avatar", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      const avatarUrl = result?.avatarUrl || result?.profile?.avatar_url;
      if (result?.success && avatarUrl) {
        setData((prev) => ({ ...prev, avatarUrl }));
        setProfile((prev) => prev ? { ...prev, avatar_url: avatarUrl } : null);
      } else {
        setError(result.error || "头像上传失败，请重试。");
      }
    } catch {
      setError("网络连接失败，请稍后重试。");
    } finally {
      setSaving(false);
    }
  }

  async function saveUsername() {
    if (!data.username.trim()) {
      setError("请输入你想要的公开地址。");
      return false;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/username", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: data.username.trim() }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setError(result.error || "设置失败，请换一个试试。");
        return false;
      }
      setProfile((prev) => prev ? { ...prev, username: data.username.trim() } : null);
      return true;
    } catch {
      setError("网络连接失败，请稍后重试。");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: data.displayName.trim(),
          bio: data.bio.trim(),
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setError(result.error || "保存失败，请稍后重试。");
        return false;
      }
      setProfile((prev) => prev ? { ...prev, display_name: data.displayName.trim(), bio: data.bio.trim() } : null);
      return true;
    } catch {
      setError("网络连接失败，请稍后重试。");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveTemplate() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/appearance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: "草木原色", template: data.template }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setError(result.error || "保存失败，请稍后重试。");
        return false;
      }
      setProfile((prev) => prev ? { ...prev, template: data.template } : null);
      return true;
    } catch {
      setError("网络连接失败，请稍后重试。");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function addFirstLink() {
    if (!data.firstLinkTitle.trim()) {
      setError("请填写链接标题。");
      return false;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.firstLinkTitle.trim(),
          url: data.firstLinkUrl.trim() || "https://",
          type: "link",
          icon_type: "default",
          icon_value: "link",
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setError(result.error || "添加失败，请稍后重试。");
        return false;
      }
      return true;
    } catch {
      setError("网络连接失败，请稍后重试。");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function publishCard() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: true }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setError(result.error || "发布失败，请稍后重试。");
        return false;
      }
      setData((prev) => ({ ...prev, published: true }));
      setProfile((prev) => prev ? { ...prev, is_public: true } : null);
      return true;
    } catch {
      setError("网络连接失败，请稍后重试。");
      return false;
    } finally {
      setSaving(false);
    }
  }

  const previewLinks: PhonePreviewLink[] = useMemo(() => {
    if (data.firstLinkTitle.trim()) {
      return [{
        id: "preview-1",
        label: data.firstLinkTitle,
        caption: data.firstLinkUrl || "点击访问",
        url: data.firstLinkUrl || "#",
        icon: "link",
        type: "default",
        isActive: true,
      }];
    }
    return [];
  }, [data.firstLinkTitle, data.firstLinkUrl]);

  if (loading) {
    return (
      <main className="ui-page grid min-h-dvh place-items-center px-4">
        <div className="ui-surface flex items-center gap-3 px-5 py-4 text-sm font-black">
          <Loader2 className="size-5 animate-spin text-[var(--ui-brand)]" />
          正在加载引导…
        </div>
      </main>
    );
  }

  const publicUrl = publicProfileUrl(profile?.username);

  return (
    <main className="ui-page min-h-dvh pb-28 safe-area-pb">
      {/* 顶部进度条 */}
      <header className="sticky top-0 z-20 border-b border-[var(--ui-line)] bg-[var(--ui-surface)]/90 backdrop-blur safe-area-pt">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3 sm:px-6">
          <BrandLogo size="header" className="!w-[100px]" />
          <div className="flex-1">
            <div className="h-2 overflow-hidden rounded-full bg-[var(--ui-surface-muted)]">
              <div
                className="h-full rounded-full bg-[var(--ui-brand)] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs font-bold text-[var(--ui-muted)]">
              第 {stepIndex + 1} 步 / 共 {ONBOARDING_STEPS.length} 步 · {STEP_LABELS[currentStep]}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-4xl gap-8 px-4 py-6 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-10">
        {/* 左侧主内容 */}
        <div className="min-w-0">
          {/* 欢迎页 */}
          {currentStep === "welcome" ? (
            <section className="ui-surface p-6 sm:p-8">
              <div className="grid size-16 place-items-center rounded-2xl bg-[var(--ui-brand-soft)] text-[var(--ui-brand)]">
                <Sparkles className="size-8" />
              </div>
              <h1 className="mt-6 text-3xl font-black text-[var(--ui-ink)] sm:text-4xl">
                欢迎来到 Link168
              </h1>
              <p className="mt-3 text-base leading-7 text-[var(--ui-muted)]">
                只需几分钟，创建你的第一张公开名片。我们会引导你完成基础设置，让你的名片看起来专业又有个性。
              </p>

              <div className="mt-8 grid gap-3">
                {[
                  { icon: User, title: "创建专属地址", desc: "设置一个好记的公开链接" },
                  { icon: ImageIcon, title: "上传头像", desc: "让访客一眼认出你" },
                  { icon: FileText, title: "完善资料", desc: "填写昵称和个人简介" },
                  { icon: Palette, title: "选择模板", desc: "挑选最适合你的风格" },
                  { icon: Rocket, title: "发布上线", desc: "一键分享你的名片" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex items-center gap-3 rounded-xl bg-[var(--ui-surface-muted)] p-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[var(--ui-brand)]">
                        <Icon className="size-5" />
                      </span>
                      <div>
                        <p className="text-sm font-black text-[var(--ui-ink)]">{item.title}</p>
                        <p className="text-xs text-[var(--ui-muted)]">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={goNext}
                className="ui-button-primary mt-8 min-h-12 w-full text-base"
              >
                开始创建
                <ArrowRight className="size-4" />
              </button>
              <p className="mt-4 text-center text-xs text-[var(--ui-faint)]">
                可以随时跳过或返回，进度自动保存
              </p>
            </section>
          ) : null}

          {/* 设置 username */}
          {currentStep === "username" ? (
            <section className="ui-surface p-6 sm:p-8">
              <div className="grid size-14 place-items-center rounded-2xl bg-[var(--ui-brand-soft)] text-[var(--ui-brand)]">
                <User className="size-7" />
              </div>
              <h1 className="mt-5 text-2xl font-black text-[var(--ui-ink)] sm:text-3xl">
                创建你的公开地址
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--ui-muted)]">
                设置一个好记的地址，别人通过 link168.me/你的地址 就能访问你的名片。
              </p>

              <div className="mt-6 grid gap-2">
                <label className="text-sm font-black text-[var(--ui-ink)]">公开地址</label>
                <div className="flex overflow-hidden rounded-xl border border-[var(--ui-line)] bg-[var(--ui-surface)] focus-within:border-[var(--ui-brand)] focus-within:ring-4 focus-within:ring-[var(--ui-brand)]/15">
                  <span className="flex items-center border-r border-[var(--ui-line)] bg-[var(--ui-surface-muted)] px-4 text-sm font-bold text-[var(--ui-muted)]">
                    link168.me/
                  </span>
                  <input
                    type="text"
                    value={data.username}
                    onChange={(e) => setData((prev) => ({ ...prev, username: e.target.value.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase() }))}
                    placeholder="例如：abao"
                    className="min-h-12 flex-1 border-0 bg-transparent px-4 text-base font-bold text-[var(--ui-ink)] outline-none placeholder:text-[var(--ui-faint)]"
                    maxLength={32}
                  />
                </div>
                <p className="text-xs text-[var(--ui-faint)]">
                  支持字母、数字、下划线和短横线，3-32 个字符
                </p>
              </div>

              {error ? (
                <p className="mt-4 rounded-xl bg-[var(--ui-danger-soft)] px-4 py-3 text-sm font-bold text-[var(--ui-danger)]">
                  {error}
                </p>
              ) : null}

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={goPrev}
                  className="ui-button-secondary min-h-12 flex-1 text-base"
                >
                  <ArrowLeft className="size-4" />
                  上一步
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await saveUsername();
                    if (ok) goNext();
                  }}
                  disabled={saving || !data.username.trim()}
                  className="ui-button-primary min-h-12 flex-[2] text-base disabled:opacity-60"
                >
                  {saving ? <Loader2 className="size-5 animate-spin" /> : null}
                  {saving ? "保存中…" : "继续"}
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </section>
          ) : null}

          {/* 上传头像 */}
          {currentStep === "avatar" ? (
            <section className="ui-surface p-6 sm:p-8">
              <div className="grid size-14 place-items-center rounded-2xl bg-[var(--ui-brand-soft)] text-[var(--ui-brand)]">
                <ImageIcon className="size-7" />
              </div>
              <h1 className="mt-5 text-2xl font-black text-[var(--ui-ink)] sm:text-3xl">
                上传你的头像
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--ui-muted)]">
                一张清晰的头像能让访客更快记住你。建议使用正方形照片，大小不超过 5MB。
              </p>

              <div className="mt-6 flex flex-col items-center">
                <div className="relative">
                  <div className="grid size-36 place-items-center overflow-hidden rounded-full border-4 border-[var(--ui-surface-muted)] bg-[var(--ui-surface-muted)] sm:size-44">
                    {data.avatarUrl ? (
                      <img
                        src={data.avatarUrl}
                        alt="头像预览"
                        className="size-full object-cover"
                      />
                    ) : (
                      <User className="size-16 text-[var(--ui-faint)]" />
                    )}
                  </div>
                  {saving ? (
                    <div className="absolute inset-0 grid place-items-center rounded-full bg-black/30">
                      <Loader2 className="size-8 animate-spin text-white" />
                    </div>
                  ) : null}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleAvatarUpload(file);
                  }}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="ui-button-secondary mt-6 min-h-11 gap-2 text-sm"
                >
                  <Upload className="size-4" />
                  {data.avatarUrl ? "更换头像" : "选择照片"}
                </button>
              </div>

              {error ? (
                <p className="mt-6 rounded-xl bg-[var(--ui-danger-soft)] px-4 py-3 text-sm font-bold text-[var(--ui-danger)]">
                  {error}
                </p>
              ) : null}

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={goPrev}
                  className="ui-button-secondary min-h-12 flex-1 text-base"
                >
                  <ArrowLeft className="size-4" />
                  上一步
                </button>
                <button
                  type="button"
                  onClick={skipStep}
                  className="ui-button-secondary min-h-12 flex-1 text-base"
                >
                  <SkipForward className="size-4" />
                  跳过
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="ui-button-primary min-h-12 flex-1 text-base"
                >
                  继续
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </section>
          ) : null}

          {/* 填写昵称和简介 */}
          {currentStep === "profile" ? (
            <section className="ui-surface p-6 sm:p-8">
              <div className="grid size-14 place-items-center rounded-2xl bg-[var(--ui-brand-soft)] text-[var(--ui-brand)]">
                <FileText className="size-7" />
              </div>
              <h1 className="mt-5 text-2xl font-black text-[var(--ui-ink)] sm:text-3xl">
                介绍一下你自己
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--ui-muted)]">
                填写昵称和一句简介，让访客快速了解你。
              </p>

              <div className="mt-6 grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-black text-[var(--ui-ink)]">昵称</span>
                  <input
                    type="text"
                    value={data.displayName}
                    onChange={(e) => setData((prev) => ({ ...prev, displayName: e.target.value }))}
                    placeholder="你的名字或昵称"
                    className="ui-input"
                    maxLength={50}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-black text-[var(--ui-ink)]">个人简介</span>
                  <textarea
                    value={data.bio}
                    onChange={(e) => setData((prev) => ({ ...prev, bio: e.target.value }))}
                    placeholder="一句话介绍你自己，比如：产品经理 / 设计爱好者 / 咖啡重度用户"
                    className="ui-input min-h-[100px] resize-y"
                    maxLength={160}
                  />
                  <p className="text-xs text-[var(--ui-faint)] text-right">
                    {data.bio.length}/160
                  </p>
                </label>
              </div>

              {error ? (
                <p className="mt-4 rounded-xl bg-[var(--ui-danger-soft)] px-4 py-3 text-sm font-bold text-[var(--ui-danger)]">
                  {error}
                </p>
              ) : null}

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={goPrev}
                  className="ui-button-secondary min-h-12 flex-1 text-base"
                >
                  <ArrowLeft className="size-4" />
                  上一步
                </button>
                <button
                  type="button"
                  onClick={skipStep}
                  className="ui-button-secondary min-h-12 flex-1 text-base"
                >
                  <SkipForward className="size-4" />
                  跳过
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await saveProfile();
                    if (ok) goNext();
                  }}
                  disabled={saving}
                  className="ui-button-primary min-h-12 flex-1 text-base disabled:opacity-60"
                >
                  {saving ? <Loader2 className="size-5 animate-spin" /> : null}
                  {saving ? "保存中…" : "继续"}
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </section>
          ) : null}

          {/* 选择模板 */}
          {currentStep === "template" ? (
            <section className="ui-surface p-6 sm:p-8">
              <div className="grid size-14 place-items-center rounded-2xl bg-[var(--ui-brand-soft)] text-[var(--ui-brand)]">
                <Palette className="size-7" />
              </div>
              <h1 className="mt-5 text-2xl font-black text-[var(--ui-ink)] sm:text-3xl">
                选择名片模板
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--ui-muted)]">
                选择一个最适合你的风格，之后可以随时更换。
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  { id: "business", name: "商务简约", desc: "适合职场人士", color: "#5f7f45" },
                  { id: "creator", name: "创意展示", desc: "适合创作者", color: "#8C612E" },
                  { id: "conversion", name: "转化导向", desc: "适合销售推广", color: "#B42318" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setData((prev) => ({ ...prev, template: t.id as OnboardingData["template"] }))}
                    className={`relative rounded-2xl border-2 p-4 text-left transition ${
                      data.template === t.id
                        ? "border-[var(--ui-brand)] bg-[var(--ui-brand-soft)]"
                        : "border-[var(--ui-line)] bg-[var(--ui-surface)] hover:border-[var(--ui-faint)]"
                    }`}
                  >
                    {data.template === t.id ? (
                      <span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-[var(--ui-brand)] text-white">
                        <Check className="size-4" />
                      </span>
                    ) : null}
                    <div className="aspect-[9/16] w-full rounded-xl" style={{ backgroundColor: t.color + "20" }}>
                      <div className="flex h-full flex-col items-center justify-center gap-2 p-4">
                        <div className="size-12 rounded-full" style={{ backgroundColor: t.color + "40" }} />
                        <div className="h-3 w-16 rounded-full" style={{ backgroundColor: t.color + "60" }} />
                        <div className="h-2 w-20 rounded-full" style={{ backgroundColor: t.color + "30" }} />
                        <div className="mt-2 space-y-1.5 w-full">
                          <div className="h-2 w-full rounded-full" style={{ backgroundColor: t.color + "30" }} />
                          <div className="h-2 w-full rounded-full" style={{ backgroundColor: t.color + "30" }} />
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-sm font-black text-[var(--ui-ink)]">{t.name}</p>
                    <p className="mt-0.5 text-xs text-[var(--ui-muted)]">{t.desc}</p>
                  </button>
                ))}
              </div>

              {error ? (
                <p className="mt-4 rounded-xl bg-[var(--ui-danger-soft)] px-4 py-3 text-sm font-bold text-[var(--ui-danger)]">
                  {error}
                </p>
              ) : null}

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={goPrev}
                  className="ui-button-secondary min-h-12 flex-1 text-base"
                >
                  <ArrowLeft className="size-4" />
                  上一步
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await saveTemplate();
                    if (ok) goNext();
                  }}
                  disabled={saving}
                  className="ui-button-primary min-h-12 flex-1 text-base disabled:opacity-60"
                >
                  {saving ? <Loader2 className="size-5 animate-spin" /> : null}
                  {saving ? "保存中…" : "使用此模板"}
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </section>
          ) : null}

          {/* 添加第一个链接 */}
          {currentStep === "first-link" ? (
            <section className="ui-surface p-6 sm:p-8">
              <div className="grid size-14 place-items-center rounded-2xl bg-[var(--ui-brand-soft)] text-[var(--ui-brand)]">
                <LinkIcon className="size-7" />
              </div>
              <h1 className="mt-5 text-2xl font-black text-[var(--ui-ink)] sm:text-3xl">
                添加第一个链接
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--ui-muted)]">
                添加你最重要的一个链接，比如个人网站、作品集或社交媒体。
              </p>

              <div className="mt-6 grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-black text-[var(--ui-ink)]">链接标题</span>
                  <input
                    type="text"
                    value={data.firstLinkTitle}
                    onChange={(e) => setData((prev) => ({ ...prev, firstLinkTitle: e.target.value }))}
                    placeholder="例如：我的博客"
                    className="ui-input"
                    maxLength={50}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-black text-[var(--ui-ink)]">链接地址</span>
                  <input
                    type="url"
                    value={data.firstLinkUrl}
                    onChange={(e) => setData((prev) => ({ ...prev, firstLinkUrl: e.target.value }))}
                    placeholder="https://"
                    className="ui-input"
                  />
                </label>
              </div>

              {error ? (
                <p className="mt-4 rounded-xl bg-[var(--ui-danger-soft)] px-4 py-3 text-sm font-bold text-[var(--ui-danger)]">
                  {error}
                </p>
              ) : null}

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={goPrev}
                  className="ui-button-secondary min-h-12 flex-1 text-base"
                >
                  <ArrowLeft className="size-4" />
                  上一步
                </button>
                <button
                  type="button"
                  onClick={skipStep}
                  className="ui-button-secondary min-h-12 flex-1 text-base"
                >
                  <SkipForward className="size-4" />
                  跳过
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await addFirstLink();
                    if (ok) goNext();
                  }}
                  disabled={saving}
                  className="ui-button-primary min-h-12 flex-1 text-base disabled:opacity-60"
                >
                  {saving ? <Loader2 className="size-5 animate-spin" /> : null}
                  {saving ? "添加中…" : "添加并继续"}
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </section>
          ) : null}

          {/* 发布名片 */}
          {currentStep === "publish" ? (
            <section className="ui-surface p-6 sm:p-8">
              <div className="grid size-14 place-items-center rounded-2xl bg-[var(--ui-brand-soft)] text-[var(--ui-brand)]">
                <Rocket className="size-7" />
              </div>
              <h1 className="mt-5 text-2xl font-black text-[var(--ui-ink)] sm:text-3xl">
                发布你的名片
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--ui-muted)]">
                准备好让世界看到你的名片了吗？发布后，任何人都可以通过你的公开地址访问。
              </p>

              <div className="mt-6 rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface-muted)] p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-[var(--ui-ink)]">你的公开地址</span>
                  <span className="text-xs font-bold text-[var(--ui-brand)]">可访问</span>
                </div>
                <p className="mt-2 break-all rounded-xl bg-white px-4 py-3 text-sm font-bold text-[var(--ui-brand-hover)]">
                  {publicUrl || "尚未设置公开地址"}
                </p>
              </div>

              <div className="mt-4 grid gap-2">
                {[
                  { label: "专属公开地址", done: !!data.username },
                  { label: "头像", done: !!data.avatarUrl },
                  { label: "昵称和简介", done: !!data.displayName },
                  { label: "名片模板", done: !!data.template },
                  { label: "首个链接", done: !!data.firstLinkTitle },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className={`grid size-5 shrink-0 place-items-center rounded-full ${item.done ? "bg-[var(--ui-success)] text-white" : "bg-[var(--ui-line)]"}`}>
                      {item.done ? <Check className="size-3" /> : null}
                    </span>
                    <span className={`text-sm ${item.done ? "font-bold text-[var(--ui-ink)]" : "text-[var(--ui-faint)]"}`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              {error ? (
                <p className="mt-4 rounded-xl bg-[var(--ui-danger-soft)] px-4 py-3 text-sm font-bold text-[var(--ui-danger)]">
                  {error}
                </p>
              ) : null}

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={goPrev}
                  className="ui-button-secondary min-h-12 flex-1 text-base"
                >
                  <ArrowLeft className="size-4" />
                  上一步
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await publishCard();
                    if (ok) goNext();
                  }}
                  disabled={saving}
                  className="ui-button-primary min-h-12 flex-1 text-base disabled:opacity-60"
                >
                  {saving ? <Loader2 className="size-5 animate-spin" /> : <Rocket className="size-4" />}
                  {saving ? "发布中…" : "立即发布"}
                </button>
              </div>
            </section>
          ) : null}

          {/* 发布成功 + 任务清单 */}
          {currentStep === "checklist" ? (
            <section className="ui-surface p-6 sm:p-8">
              <div className="grid size-16 place-items-center rounded-2xl bg-[var(--ui-success-soft)] text-[var(--ui-success)]">
                <CheckCircle2 className="size-8" />
              </div>
              <h1 className="mt-5 text-2xl font-black text-[var(--ui-ink)] sm:text-3xl">
                你的名片已发布！
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--ui-muted)]">
                可以复制链接或保存二维码分享。
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface-muted)] p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[var(--ui-faint)]">公开地址</p>
                  <p className="mt-1 truncate text-sm font-black text-[var(--ui-brand-hover)]">
                    {publicUrl || "尚未设置公开地址"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (publicUrl) {
                        void navigator.clipboard.writeText(publicUrl);
                      }
                    }}
                    className="ui-button-secondary min-h-10 flex-1 text-sm sm:flex-none"
                  >
                    复制链接
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard?tab=share")}
                    className="ui-button-primary min-h-10 flex-1 text-sm sm:flex-none"
                  >
                    <QrCode className="size-4" />
                    二维码
                  </button>
                </div>
              </div>

              <div className="mt-8">
                <h2 className="text-lg font-black text-[var(--ui-ink)]">首次使用任务清单</h2>
                <p className="mt-1 text-sm text-[var(--ui-muted)]">完成以下任务，充分发挥你的名片价值</p>

                <div className="mt-4 grid gap-2">
                  {[
                    { title: "上传头像", desc: "让访客一眼认出你", done: !!data.avatarUrl, action: () => setCurrentStep("avatar") },
                    { title: "完善个人简介", desc: "一句话介绍自己", done: !!data.displayName && !!data.bio, action: () => setCurrentStep("profile") },
                    { title: "添加 3 个以上链接", desc: "展示更多内容", done: false, action: () => router.push("/dashboard?tab=links") },
                    { title: "设置自定义主题", desc: "打造专属风格", done: false, action: () => router.push("/dashboard?tab=appearance") },
                    { title: "开启 AI 客服", desc: "24 小时自动接待", done: false, action: () => router.push("/workbench/ai") },
                    { title: "查看数据分析", desc: "了解访客情况", done: false, action: () => router.push("/workbench/analytics") },
                  ].map((task, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={task.action}
                      className="flex w-full items-center gap-4 rounded-xl bg-[var(--ui-surface-muted)] p-4 text-left transition hover:bg-[var(--ui-line)]"
                    >
                      <span className={`grid size-6 shrink-0 place-items-center rounded-full ${task.done ? "bg-[var(--ui-success)] text-white" : "border-2 border-[var(--ui-faint)] bg-transparent"}`}>
                        {task.done ? <Check className="size-4" /> : null}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${task.done ? "font-bold text-[var(--ui-faint)] line-through" : "font-black text-[var(--ui-ink)]"}`}>
                          {task.title}
                        </p>
                        <p className="text-xs text-[var(--ui-muted)]">{task.desc}</p>
                      </div>
                      <ArrowRight className="size-4 shrink-0 text-[var(--ui-faint)]" />
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={finishOnboarding}
                className="ui-button-primary mt-8 min-h-12 w-full text-base"
              >
                进入名片后台
                <ArrowRight className="size-4" />
              </button>
            </section>
          ) : null}
        </div>

        {/* 右侧预览（桌面端） */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-[var(--ui-faint)]">
              实时预览
            </p>
            <PhonePreview
              variant="public"
              poweredLogoClickable={false}
              username={data.username || "abao"}
              displayName={data.displayName || "你的昵称"}
              bio={data.bio || "填写一句简介，让访客快速了解你"}
              avatarUrl={data.avatarUrl}
              links={previewLinks}
              appearance={{
                themeName: "Link168 草木默认",
                template: data.template,
              }}
              className="mx-auto max-w-[280px]"
            />
            {optional ? (
              <p className="mt-4 text-center text-xs text-[var(--ui-faint)]">
                此步骤可跳过，之后随时可以设置
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </main>
  );
}
