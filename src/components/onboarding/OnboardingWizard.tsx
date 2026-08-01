"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  Loader2,
  MessageSquareText,
  Phone,
  Rocket,
  Store,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { PhonePreview, type PhonePreviewLink } from "@/components/PhonePreview";
import type {
  DashboardLink,
  DashboardProfile,
  DashboardResponse,
} from "@/components/dashboard-v1/types";
import { isTemporaryUsername } from "@/components/dashboard-v1/types";

type OnboardingStep = "identity" | "action" | "publish";
type ActionType = "consult" | "service" | "contact";
type ContactType = "wechat" | "phone" | "link";

type ActionResponse = {
  success?: boolean;
  error?: string;
  link?: DashboardLink;
};

const STEPS: Array<{ id: OnboardingStep; label: string }> = [
  { id: "identity", label: "介绍自己" },
  { id: "action", label: "客户动作" },
  { id: "publish", label: "预览发布" },
];

function stepFromData(profile: DashboardProfile | null, links: DashboardLink[]) {
  const identityReady = Boolean(
    profile &&
      !isTemporaryUsername(profile.username) &&
      profile.display_name?.trim() &&
      profile.bio?.trim(),
  );
  if (!identityReady) return "identity" as const;
  return links.length > 0 ? ("publish" as const) : ("action" as const);
}

async function readJson<T>(response: Response) {
  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>("identity");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(true);
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [links, setLinks] = useState<DashboardLink[]>([]);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [actionType, setActionType] = useState<ActionType>("consult");
  const [contactType, setContactType] = useState<ContactType>("wechat");
  const [actionTitle, setActionTitle] = useState("");
  const [actionValue, setActionValue] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/dashboard", { cache: "no-store" });
        const data = await readJson<DashboardResponse>(response);
        if (!response.ok || !data.user) {
          router.replace("/login?next=/onboarding");
          return;
        }
        if (cancelled) return;
        const nextProfile = data.profile ?? null;
        const nextLinks = data.links ?? [];
        setUserEmail(data.user.email);
        setEmailVerified(data.user.emailVerified);
        setProfile(nextProfile);
        setLinks(nextLinks);
        setUsername(
          nextProfile && !isTemporaryUsername(nextProfile.username)
            ? nextProfile.username
            : "",
        );
        setDisplayName(nextProfile?.display_name ?? "");
        setBio(nextProfile?.bio ?? "");
        if (nextProfile?.is_public) {
          router.replace("/console");
          return;
        }
        setStep(stepFromData(nextProfile, nextLinks));
      } catch {
        if (!cancelled) setError("暂时无法加载资料，请检查网络后重试。");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const previewLinks: PhonePreviewLink[] = useMemo(
    () =>
      links
        .filter((link) => link.is_active)
        .map((link) => ({
          id: link.id,
          label: link.title,
          caption: link.description,
          url: link.url,
          icon: link.icon_url || link.icon_value,
          iconType: link.icon_type,
          type: link.type,
          componentType: link.type,
          payload: link.payload_json,
          isActive: true,
        })),
    [links],
  );

  const stepIndex = STEPS.findIndex((item) => item.id === step);
  const publicPath = username ? `link168.me/${username}` : "link168.me/你的地址";

  async function saveIdentity() {
    const cleanUsername = username.trim().toLowerCase();
    const cleanName = displayName.trim();
    const cleanBio = bio.trim();
    if (!/^[a-z][a-z0-9_-]{2,23}$/.test(cleanUsername)) {
      setError("公开地址需以英文字母开头，使用 3–24 位字母、数字、短横线或下划线。");
      return;
    }
    if (!cleanName) {
      setError("请填写客户能认出的经营名称。");
      return;
    }
    if (!cleanBio) {
      setError("请用一句话说明你能为客户解决什么问题。");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanUsername,
          displayName: cleanName,
          bio: cleanBio,
        }),
      });
      const data = await readJson<{
        success?: boolean;
        error?: string;
        profile?: DashboardProfile;
      }>(response);
      if (!response.ok || !data.success || !data.profile) {
        setError(data.error || "资料没有保存，请稍后重试。");
        return;
      }
      setProfile(data.profile);
      setUsername(data.profile.username);
      setStep(links.length > 0 ? "publish" : "action");
    } catch {
      setError("网络连接失败，刚才的内容仍保留在页面中。");
    } finally {
      setSaving(false);
    }
  }

  function buildActionRequest() {
    if (actionType === "consult") {
      return {
        title: "联系我",
        url: "",
        description: "留下联系方式和需求，我会尽快回复。",
        componentType: "contact-form",
        payload: JSON.stringify({
          title: "告诉我你的需求",
          description: "留下联系方式和需求，我会尽快回复。",
          buttonText: "提交需求",
          messagePlaceholder: "请简单描述你想解决的问题",
        }),
      };
    }
    if (actionType === "service") {
      const name = actionTitle.trim();
      if (!name) return null;
      return {
        title: name,
        url: "",
        description: "欢迎咨询这项服务的方案和报价。",
        componentType: "service-card",
        payload: JSON.stringify({
          name,
          description: "欢迎咨询这项服务的方案和报价。",
          ctaLabel: "咨询服务",
          allowBooking: true,
        }),
      };
    }

    const value = actionValue.trim();
    if (!value) return null;
    if (contactType === "phone") {
      return {
        title: actionTitle.trim() || "电话联系",
        url: value,
        description: "",
        componentType: "phone",
      };
    }
    if (contactType === "wechat") {
      return {
        title: actionTitle.trim() || "添加微信",
        url: value,
        description: "",
        componentType: "wechat",
      };
    }
    return {
      title: actionTitle.trim() || "了解更多",
      url: value,
      description: "",
      componentType: "link",
    };
  }

  async function saveAction() {
    const requestBody = buildActionRequest();
    if (!requestBody) {
      setError(
        actionType === "service"
          ? "请填写你希望客户了解的服务名称。"
          : "请填写对应的微信号、电话号码或完整链接。",
      );
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const data = await readJson<ActionResponse>(response);
      if (!response.ok || !data.success || !data.link) {
        setError(data.error || "客户入口没有保存，请稍后重试。");
        return;
      }
      setLinks((current) => [...current, data.link!]);
      setStep("publish");
    } catch {
      setError("网络连接失败，刚才的内容仍保留在页面中。");
    } finally {
      setSaving(false);
    }
  }

  async function publishProfile() {
    if (!profile || !username || links.length === 0) {
      setError("请先完成经营信息和一个客户动作，再发布名片。");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: true }),
      });
      const data = await readJson<{
        success?: boolean;
        error?: string;
        profile?: DashboardProfile;
      }>(response);
      if (!response.ok || !data.success || !data.profile?.is_public) {
        setError(data.error || "名片尚未发布，请稍后重试。");
        return;
      }
      router.replace("/console?welcome=published");
      router.refresh();
    } catch {
      setError("网络连接失败，名片没有发布，请重试。");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="ui-page grid min-h-dvh place-items-center px-4">
        <div className="ui-surface flex items-center gap-3 px-5 py-4 text-sm font-black">
          <Loader2 className="size-5 animate-spin text-[var(--ui-brand)]" />
          正在准备你的第一张名片…
        </div>
      </main>
    );
  }

  return (
    <main className="ui-page min-h-dvh py-4 sm:py-8">
      <div className="ui-container max-w-6xl">
        <header className="flex items-center justify-between gap-4">
          <BrandLogo size="header" />
          <span className="rounded-full border border-[var(--ui-line)] bg-white px-3 py-1.5 text-xs font-black text-[var(--ui-muted)]">
            约 3 分钟完成
          </span>
        </header>

        {!emailVerified ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--ui-accent)]/25 bg-[var(--ui-accent-soft)] px-4 py-3 text-xs text-[#8C612E]">
            <span>
              {userEmail} 尚未验证，但不影响先创建名片；请在 30 天内完成验证。
            </span>
            <a href={`/verify-email?email=${encodeURIComponent(userEmail)}`} className="font-black underline">
              去验证
            </a>
          </div>
        ) : null}

        <nav aria-label="创建名片进度" className="mt-5 grid grid-cols-3 overflow-hidden rounded-2xl border border-[var(--ui-line)] bg-white">
          {STEPS.map((item, index) => {
            const current = item.id === step;
            const complete = index < stepIndex;
            return (
              <div
                key={item.id}
                className={`flex min-h-14 items-center justify-center gap-2 border-r border-[var(--ui-line)] px-2 text-xs font-black last:border-r-0 sm:text-sm ${
                  current
                    ? "bg-[var(--ui-brand)] text-white"
                    : complete
                      ? "bg-[var(--ui-brand-soft)] text-[var(--ui-brand)]"
                      : "text-[var(--ui-faint)]"
                }`}
              >
                <span className="grid size-5 place-items-center rounded-full border border-current text-[10px]">
                  {complete ? <Check className="size-3" /> : index + 1}
                </span>
                {item.label}
              </div>
            );
          })}
        </nav>

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="ui-surface p-5 sm:p-7">
            {step === "identity" ? (
              <>
                <p className="text-xs font-black text-[var(--ui-brand)]">第一步 · 介绍自己</p>
                <h1 className="mt-2 text-2xl font-black text-[var(--ui-ink)] sm:text-3xl">
                  先让客户一眼看懂你是谁
                </h1>
                <p className="mt-2 text-sm leading-6 text-[var(--ui-muted)]">
                  只填三项就够了，头像、主题和更多内容发布后再完善。
                </p>
                <div className="mt-6 grid gap-4">
                  <label className="grid gap-2">
                    <span className="text-sm font-black text-[var(--ui-ink)]">经营名称</span>
                    <input
                      className="ui-input"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="例如：林溪品牌设计"
                      maxLength={40}
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-black text-[var(--ui-ink)]">公开地址</span>
                    <div className="flex min-w-0 items-center rounded-xl border border-[var(--ui-line)] bg-white focus-within:ring-2 focus-within:ring-[var(--ui-brand)]/25">
                      <span className="shrink-0 pl-3 text-sm text-[var(--ui-faint)]">link168.me/</span>
                      <input
                        className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm font-bold outline-none"
                        value={username}
                        onChange={(event) => setUsername(event.target.value.toLowerCase())}
                        placeholder="linxi"
                        maxLength={24}
                        autoCapitalize="none"
                      />
                    </div>
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-black text-[var(--ui-ink)]">一句话业务价值</span>
                    <textarea
                      className="ui-input min-h-24 resize-y"
                      value={bio}
                      onChange={(event) => setBio(event.target.value)}
                      placeholder="例如：帮助本地商家把品牌和服务讲清楚，获得更多有效咨询。"
                      maxLength={160}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => void saveIdentity()}
                  disabled={saving}
                  className="ui-button-primary mt-6 min-h-12 w-full text-base disabled:opacity-60"
                >
                  {saving ? <Loader2 className="size-5 animate-spin" /> : null}
                  {saving ? "正在保存…" : "保存并选择客户动作"}
                  {!saving ? <ArrowRight className="size-4" /> : null}
                </button>
              </>
            ) : null}

            {step === "action" ? (
              <>
                <p className="text-xs font-black text-[var(--ui-brand)]">第二步 · 客户动作</p>
                <h1 className="mt-2 text-2xl font-black text-[var(--ui-ink)] sm:text-3xl">
                  客户看完后，你希望他做什么？
                </h1>
                <p className="mt-2 text-sm leading-6 text-[var(--ui-muted)]">
                  先放一个最重要的动作，发布后随时可以增加更多内容。
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      id: "consult" as const,
                      title: "咨询我",
                      desc: "收集需求和联系方式",
                      icon: MessageSquareText,
                    },
                    {
                      id: "service" as const,
                      title: "查看服务",
                      desc: "介绍你的一项核心服务",
                      icon: Store,
                    },
                    {
                      id: "contact" as const,
                      title: "直接联系",
                      desc: "微信、电话或外部链接",
                      icon: Phone,
                    },
                  ].map(({ id, title, desc, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setActionType(id);
                        setError("");
                      }}
                      className={`rounded-2xl border p-4 text-left transition ${
                        actionType === id
                          ? "border-[var(--ui-brand)] bg-[var(--ui-brand-soft)]"
                          : "border-[var(--ui-line)] bg-white hover:border-[var(--ui-brand)]/40"
                      }`}
                    >
                      <Icon className="size-5 text-[var(--ui-brand)]" />
                      <p className="mt-3 text-sm font-black text-[var(--ui-ink)]">{title}</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--ui-muted)]">{desc}</p>
                    </button>
                  ))}
                </div>

                {actionType === "consult" ? (
                  <div className="mt-5 rounded-2xl bg-[var(--ui-surface-muted)] p-4">
                    <p className="text-sm font-black text-[var(--ui-ink)]">推荐给第一次使用</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--ui-muted)]">
                      系统会添加一个真实留资表单，访客提交后会进入你的客户线索。
                    </p>
                  </div>
                ) : null}

                {actionType === "service" ? (
                  <label className="mt-5 grid gap-2">
                    <span className="text-sm font-black text-[var(--ui-ink)]">核心服务名称</span>
                    <input
                      className="ui-input"
                      value={actionTitle}
                      onChange={(event) => setActionTitle(event.target.value)}
                      placeholder="例如：品牌定位咨询"
                      maxLength={60}
                    />
                  </label>
                ) : null}

                {actionType === "contact" ? (
                  <div className="mt-5 grid gap-4">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "wechat" as const, label: "微信" },
                        { id: "phone" as const, label: "电话" },
                        { id: "link" as const, label: "外部链接" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setContactType(item.id)}
                          className={`min-h-11 rounded-xl text-sm font-black ${
                            contactType === item.id
                              ? "bg-[var(--ui-ink)] text-white"
                              : "bg-[var(--ui-surface-muted)] text-[var(--ui-muted)]"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <label className="grid gap-2">
                      <span className="text-sm font-black text-[var(--ui-ink)]">
                        {contactType === "wechat"
                          ? "微信号"
                          : contactType === "phone"
                            ? "电话号码"
                            : "完整链接"}
                      </span>
                      <input
                        className="ui-input"
                        value={actionValue}
                        onChange={(event) => setActionValue(event.target.value)}
                        placeholder={
                          contactType === "wechat"
                            ? "your-wechat"
                            : contactType === "phone"
                              ? "13800138000"
                              : "https://example.com"
                        }
                      />
                    </label>
                  </div>
                ) : null}

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setStep("identity");
                    }}
                    className="ui-button-secondary min-h-12"
                  >
                    <ArrowLeft className="size-4" />
                    上一步
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveAction()}
                    disabled={saving}
                    className="ui-button-primary min-h-12 flex-1 text-base disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="size-5 animate-spin" /> : null}
                    {saving ? "正在保存…" : "保存并预览"}
                    {!saving ? <ArrowRight className="size-4" /> : null}
                  </button>
                </div>
              </>
            ) : null}

            {step === "publish" ? (
              <>
                <p className="text-xs font-black text-[var(--ui-brand)]">第三步 · 预览发布</p>
                <h1 className="mt-2 text-2xl font-black text-[var(--ui-ink)] sm:text-3xl">
                  确认后公开你的经营名片
                </h1>
                <p className="mt-2 text-sm leading-6 text-[var(--ui-muted)]">
                  发布前只有你能看到；发布后保存的修改会同步到公开页。
                </p>
                <div className="mt-6 rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface-muted)] p-4">
                  <p className="text-xs font-bold text-[var(--ui-faint)]">公开地址</p>
                  <p className="mt-1 break-all text-base font-black text-[var(--ui-brand)]">
                    {publicPath}
                  </p>
                  <div className="mt-4 grid gap-2 text-sm">
                    {[
                      `经营名称：${displayName || "待填写"}`,
                      `业务价值：${bio || "待填写"}`,
                      `客户动作：${links[0]?.title || "待添加"}`,
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2">
                        <span className="grid size-5 place-items-center rounded-full bg-[var(--ui-success)] text-white">
                          <Check className="size-3" />
                        </span>
                        <span className="font-bold text-[var(--ui-ink)]">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void publishProfile()}
                  disabled={saving || links.length === 0}
                  className="ui-button-primary mt-6 min-h-12 w-full text-base disabled:opacity-60"
                >
                  {saving ? <Loader2 className="size-5 animate-spin" /> : <Rocket className="size-5" />}
                  {saving ? "正在发布…" : "确认并发布名片"}
                </button>
                {links.length === 0 ? (
                  <p className="mt-2 text-center text-xs font-bold text-[var(--ui-danger)]">
                    发布前需要至少一个客户动作。
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setStep("action");
                  }}
                  className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-black text-[var(--ui-muted)]"
                >
                  <ArrowLeft className="size-4" />
                  返回修改客户动作
                </button>
              </>
            ) : null}

            {error ? (
              <p role="alert" className="mt-4 rounded-xl bg-[var(--ui-danger-soft)] px-4 py-3 text-sm font-bold text-[var(--ui-danger)]">
                {error}
              </p>
            ) : null}
          </section>

          <aside className="hidden lg:block">
            <div className="sticky top-6 rounded-2xl border border-[var(--ui-line)] bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[var(--ui-ink)]">访客看到的样子</p>
                  <p className="text-xs text-[var(--ui-muted)]">使用正式公开页渲染</p>
                </div>
                <ExternalLink className="size-4 text-[var(--ui-faint)]" />
              </div>
              <PhonePreview
                variant="public"
                renderMode="preview"
                poweredLogoClickable={false}
                profileId={profile?.id}
                username={username || "yourname"}
                displayName={displayName || "你的经营名称"}
                bio={bio || "用一句话告诉客户你能解决什么问题"}
                avatarUrl={profile?.avatar_url}
                links={previewLinks}
                appearance={{
                  themeName: profile?.theme || "Link168 草木默认",
                  template: (profile?.template || "business") as
                    | "business"
                    | "creator"
                    | "conversion",
                  customTheme: profile?.custom_theme,
                  contactVisibility: profile?.contact_visibility || "public",
                }}
                className="mx-auto max-w-[280px]"
              />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
