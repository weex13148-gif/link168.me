"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Loader2, Mail, RefreshCcw, X } from "lucide-react";
import { PhonePreview, type PhonePreviewLink } from "@/components/PhonePreview";
import { QrCodeModal } from "@/components/share/QrCodeModal";
import { ShareModal } from "@/components/share/ShareModal";
import { AppearancePanel } from "@/components/dashboard-v1/AppearancePanel";
import { DashboardFrame } from "@/components/dashboard-v1/DashboardFrame";
import { HomePanel } from "@/components/dashboard-v1/HomePanel";
import { LinksPanel } from "@/components/dashboard-v1/LinksPanel";
import { ProfilePanel } from "@/components/dashboard-v1/ProfilePanel";
import { SharePanel } from "@/components/dashboard-v1/SharePanel";
import { UpgradeDialog } from "@/components/dashboard-v1/UpgradeDialog";
import { useDashboardCore } from "@/components/dashboard-v1/core-store";
import { useDashboardLinks } from "@/components/dashboard-v1/link-state";
import { logoutRequest } from "@/components/dashboard-v1/dashboard-api";
import type { DashboardLink, DashboardTab } from "@/components/dashboard-v1/types";
import { publicProfileUrl } from "@/components/dashboard-v1/types";

type ToastState = { message: string; tone: "success" | "error" } | null;

const editorTabs: DashboardTab[] = ["home", "profile", "links", "appearance", "share"];

function isEditorTab(tab: string | null): tab is DashboardTab {
  return editorTabs.includes(tab as DashboardTab);
}

export default function DashboardV1Client() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<DashboardTab>("home");
  const [loadedLinks, setLoadedLinks] = useState<DashboardLink[]>([]);
  const [toast, setToast] = useState<ToastState>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [emailBannerOpen, setEmailBannerOpen] = useState(true);

  const showToast = useCallback((message: string, tone: "success" | "error" = "success") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 2800);
  }, []);
  const onUnauthorized = useCallback(() => router.replace("/login"), [router]);
  const onUpgrade = useCallback(() => setUpgradeOpen(true), []);
  const onNeedProfile = useCallback(() => setActiveTab("profile"), []);
  const navigateToAccount = useCallback(() => router.push("/workbench/account"), [router]);

  const core = useDashboardCore({ onUnauthorized, onLinksLoaded: setLoadedLinks, onUpgrade, showToast });
  const publicUrl = publicProfileUrl(core.profile?.username);
  const linkState = useDashboardLinks({
    initialLinks: loadedLinks,
    profileReady: Boolean(publicUrl),
    setGlobalSaveState: core.setSaveState,
    showToast,
    onNeedProfile,
    onUpgrade,
  });
  useEffect(() => { void core.load(); }, [core.load]);
  useEffect(() => { linkState.replaceLinks(loadedLinks); }, [loadedLinks, linkState.replaceLinks]);
  useEffect(() => {
    if (requestedTab === "stats") {
      router.replace("/workbench/analytics");
      return;
    }
    if (requestedTab === "account") {
      router.replace("/workbench/account");
      return;
    }
    setActiveTab(isEditorTab(requestedTab) ? requestedTab : "home");
  }, [requestedTab, router]);

  const previewLinks: PhonePreviewLink[] = useMemo(() => linkState.sortedLinks
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
    })), [linkState.sortedLinks]);

  async function logout() {
    await logoutRequest();
    router.replace("/login");
    router.refresh();
  }

  function copyText(value: string) {
    if (!value) {
      showToast("请先设置公开主页地址。", "error");
      setActiveTab("profile");
      return;
    }
    void navigator.clipboard.writeText(value).then(() => showToast("已复制"), () => showToast("复制失败，请手动复制。", "error"));
  }

  function openShare() {
    if (!publicUrl) {
      showToast("请先设置公开主页地址。", "error");
      setActiveTab("profile");
      return;
    }
    setShareOpen(true);
  }

  function openQr() {
    if (!publicUrl) {
      showToast("请先设置公开主页地址。", "error");
      setActiveTab("profile");
      return;
    }
    setQrOpen(true);
  }

  if (core.loading) return <section className="ui-page grid min-h-dvh place-items-center px-4"><div className="ui-surface flex items-center gap-3 px-5 py-4 text-sm font-black"><Loader2 className="size-5 animate-spin text-[var(--ui-brand)]" />正在加载用户后台…</div></section>;
  if (core.loadError) return <section className="ui-page grid min-h-dvh place-items-center px-4"><section className="ui-surface w-full max-w-md p-6 text-center"><AlertTriangle className="mx-auto size-10 text-[var(--ui-danger)]" /><h1 className="mt-4 text-xl ui-title">后台暂时无法加载</h1><p className="mt-2 text-sm leading-6 ui-muted">{core.loadError}</p><button type="button" onClick={() => void core.load()} className="ui-button-primary mt-5"><RefreshCcw className="size-4" />重新加载</button></section></section>;

  const preview = <PhonePreview variant="public" profileId={core.profile?.id} poweredLogoClickable username={core.profile?.username || "abao"} displayName={core.profile?.display_name || "我的名片"} bio={core.profile?.bio || "填写一句简介，让访客快速了解你"} avatarUrl={core.profile?.avatar_url} links={previewLinks} appearance={{ themeName: core.profile?.theme || "Link168 草木默认", template: (core.profile?.template || "business") as "business" | "creator" | "conversion", customTheme: core.profile?.custom_theme || null, contactVisibility: core.profile?.contact_visibility || "public" }} className="mx-auto max-w-[315px]" />;

  let panel: ReactNode;
  if (activeTab === "profile") panel = <ProfilePanel profile={core.profile} username={core.username} displayName={core.displayName} bio={core.bio} saveState={core.saveState} uploadingAvatar={core.uploadingAvatar} onUsernameChange={(value) => { core.setUsername(value); core.markDirty(); }} onDisplayNameChange={(value) => { core.setDisplayName(value); core.markDirty(); }} onBioChange={(value) => { core.setBio(value); core.markDirty(); }} onSave={core.saveProfile} onUploadAvatar={(file) => void core.uploadAvatar(file)} onDeleteAvatar={() => void core.deleteAvatar()} />;
  else if (activeTab === "links") panel = <LinksPanel links={linkState.sortedLinks} isPaid={core.planEntitlements.isPaid} planLabel={core.planEntitlements.planLabel} creating={linkState.creating} busyLinkId={linkState.busyLinkId} onCreate={linkState.createLink} onUpdate={linkState.updateLink} onToggle={linkState.toggleLink} onDelete={linkState.deleteLink} onMove={linkState.moveLink} onCopy={copyText} onUpgrade={onUpgrade} />;
  else if (activeTab === "appearance") panel = <AppearancePanel theme={core.profile?.theme || "草木原色"} template={core.profile?.template || "business"} customThemes={core.planEntitlements.customThemes} customTheme={core.profile?.custom_theme || null} isPublic={core.profile?.is_public ?? true} language={core.profile?.language || "zh"} contactVisibility={core.profile?.contact_visibility || "public"} saving={core.appearanceSaving} onSave={core.saveAppearance} onSaveCustom={core.saveCustomTheme} onSaveSystem={core.saveProfileSettings} onUpgrade={onUpgrade} />;
  else if (activeTab === "share") panel = <SharePanel publicUrl={publicUrl} username={core.profile?.username || ""} displayName={core.profile?.display_name || "我的名片"} onCopy={() => copyText(publicUrl)} onShare={openShare} onQr={openQr} />;
  else panel = <HomePanel user={core.user} profile={core.profile} links={linkState.sortedLinks} publicUrl={publicUrl} onNavigate={setActiveTab} onAccount={navigateToAccount} onCopy={() => copyText(publicUrl)} onShare={openShare} onQr={openQr} />;

  return (
    <>
      <DashboardFrame activeTab={activeTab} setActiveTab={setActiveTab} userEmail={core.user.email} planLabel={core.planEntitlements.planLabel} saveState={core.saveState} onShare={openShare} onLogout={() => void logout()} preview={preview}>
        {!core.user.emailVerified && emailBannerOpen ? <div className="mb-5 flex flex-col gap-3 rounded-[18px] border border-[var(--ui-accent)]/25 bg-[var(--ui-accent-soft)] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-[#8C612E]"><Mail className="size-4" /></span><div><p className="text-sm font-black text-[#8C612E]">邮箱尚未验证</p><p className="mt-1 text-xs leading-5 text-[#8C612E]/80">您的邮箱尚未验证，请在 30 天内完成验证，否则主页将暂停公开展示。</p></div></div><div className="flex items-center gap-2"><button type="button" onClick={navigateToAccount} className="ui-button-secondary min-h-10">立即验证</button><button type="button" onClick={() => setEmailBannerOpen(false)} className="grid size-10 place-items-center rounded-xl bg-white/70 text-[#8C612E]" aria-label="关闭提醒"><X className="size-4" /></button></div></div> : null}
        {panel}
      </DashboardFrame>
      <ShareModal isOpen={shareOpen} onClose={() => setShareOpen(false)} pageUrl={publicUrl} displayName={core.profile?.display_name || "我的名片"} username={core.profile?.username || ""} onOpenQrCode={() => setQrOpen(true)} />
      <QrCodeModal isOpen={qrOpen} onClose={() => setQrOpen(false)} pageUrl={publicUrl} displayName={core.profile?.display_name || "我的名片"} username={core.profile?.username || "link168"} />
      <UpgradeDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
      {toast ? <div className={`fixed bottom-24 left-1/2 z-[80] -translate-x-1/2 rounded-xl px-4 py-3 text-sm font-black text-white shadow-[var(--ui-shadow-md)] lg:bottom-6 ${toast.tone === "error" ? "bg-[var(--ui-danger)]" : "bg-[var(--ui-ink)]"}`}>{toast.message}</div> : null}
    </>
  );
}
