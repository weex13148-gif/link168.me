"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Crown,
  Download,
  Eye,
  GripVertical,
  ImageIcon,
  Link2,
  Loader2,
  Lock,
  LogOut,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Palette,
  Pencil,
  Plus,
  QrCode,
  Save,
  Share2,
  ShoppingBag,
  Sparkles,
  Trash2,
  Type,
  Video,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { PhonePreview, type PhonePreviewLink } from "@/components/PhonePreview";
import type { Profile, ProfileLink } from "@/lib/link168-types";

type DashboardState = {
  loading: boolean;
  saving: boolean;
  error: string;
  userId: string | null;
  profile: Profile | null;
  links: BuilderLink[];
};

type BuilderLink = ProfileLink & {
  isDraft?: boolean;
  flash?: boolean;
};

type DashboardResponse = {
  success?: boolean;
  error?: string;
  user?: { id: string; email: string };
  profile?: Profile | null;
  links?: ProfileLink[];
};

type ProfileResponse = {
  success?: boolean;
  error?: string;
  profile?: Profile;
};

type LinkResponse = {
  success?: boolean;
  error?: string;
  link?: ProfileLink;
};

type ModalState = "share" | "modules" | "vip" | null;

const initialState: DashboardState = {
  loading: true,
  saving: false,
  error: "",
  userId: null,
  profile: null,
  links: [],
};

const navItems = ["制作", "外观", "数据", "我的"];

const moduleGroups = [
  {
    title: "基础模块",
    modules: [
      { label: "链接", icon: Link2, type: "link", enabled: true },
      { label: "文本", icon: Type },
      { label: "组标题", icon: Sparkles },
      { label: "可复制文本", icon: Copy },
    ],
  },
  {
    title: "图片模块",
    modules: [
      { label: "二维码", icon: QrCode },
      { label: "封面图", icon: ImageIcon },
      { label: "弹出图", icon: ImageIcon },
      { label: "轮播图", icon: ImageIcon },
    ],
  },
  {
    title: "视频模块",
    modules: [
      { label: "B站视频", icon: Video },
      { label: "抖音视频链接", icon: Video },
      { label: "视频号链接", icon: Video },
      { label: "任意视频链接", icon: Video },
    ],
  },
  {
    title: "其他模块",
    modules: [
      { label: "分割线", icon: MoreHorizontal },
      { label: "微信客服", icon: MessageCircle },
      { label: "商品链接", icon: ShoppingBag },
      { label: "预约咨询", icon: Sparkles },
      { label: "地图位置", icon: MapPin },
    ],
  },
];

const vipPlans = [
  { name: "年费", price: "188" },
  { name: "半年", price: "108" },
  { name: "月费", price: "25.8" },
];

const vipBenefits = ["隐藏底部 Logo", "更多模块", "访问数据", "自定义主题", "高级二维码", "专属客服"];

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function toBuilderLink(link: ProfileLink): BuilderLink {
  return { ...link, isDraft: false, flash: false };
}

function createDraftLink(position: number, profileId = ""): BuilderLink {
  const now = new Date().toISOString();
  return {
    id: `draft-${Date.now()}`,
    profile_id: profileId,
    title: "",
    url: "",
    description: "",
    icon_url: null,
    position,
    is_active: true,
    created_at: now,
    updated_at: now,
    isDraft: true,
    flash: true,
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const titleInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [state, setState] = useState<DashboardState>(initialState);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [profileOpen, setProfileOpen] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState("");
  const [activeFlash, setActiveFlash] = useState("");
  const [addingFlash, setAddingFlash] = useState(false);

  const publicUrl = username ? `link168.me/${username}` : "保存资料后生成公开地址";
  const previewUrl = username ? `/${username}` : "/dashboard";

  const previewLinks: PhonePreviewLink[] = useMemo(
    () =>
      state.links
        .filter((link) => link.is_active)
        .sort((a, b) => a.position - b.position)
        .map((link) => ({
          id: link.id,
          label: link.title.trim() || "未命名链接",
          caption: link.description,
          href: link.url.trim() ? normalizeUrl(link.url) : undefined,
          isActive: link.is_active,
        })),
    [state.links],
  );

  const activeLinks = useMemo(() => state.links.filter((link) => link.is_active), [state.links]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }, []);

  const flash = useCallback((key: string) => {
    setActiveFlash(key);
    window.setTimeout(() => setActiveFlash(""), 300);
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const result = (await response.json()) as DashboardResponse;
      if (!response.ok || !result.success || !result.user) {
        setState({ ...initialState, loading: false, error: result.error || "读取后台数据失败。" });
        return;
      }

      const profile = result.profile || null;
      const links = (result.links || []).map(toBuilderLink);
      setUsername(profile?.username || "");
      setDisplayName(profile?.display_name || "");
      setBio(profile?.bio || "");
      setState({
        loading: false,
        saving: false,
        error: "",
        userId: result.user.id,
        profile,
        links,
      });
    } catch {
      setState({ ...initialState, loading: false, error: "读取后台数据失败。" });
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  async function copyText(value: string, message = "复制成功") {
    try {
      await navigator.clipboard.writeText(value);
      showToast(message);
    } catch {
      showToast("复制失败，请手动复制");
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!username) {
      setState((current) => ({ ...current, error: "请先完成注册生成公开地址。" }));
      return;
    }

    setState((current) => ({ ...current, saving: true, error: "" }));

    const response = await fetch("/api/dashboard", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, displayName, bio }),
    });
    const result = (await response.json()) as ProfileResponse;

    if (response.status === 401) {
      router.replace("/login");
      return;
    }

    if (!response.ok || !result.success || !result.profile) {
      setState((current) => ({ ...current, saving: false, error: result.error || "资料保存失败。" }));
      return;
    }

    setUsername(result.profile.username);
    setDisplayName(result.profile.display_name || "");
    setBio(result.profile.bio || "");
    setState((current) => ({
      ...current,
      saving: false,
      profile: result.profile || null,
      error: "",
    }));
    showToast("保存成功");
  }

  function updateLocalLink(linkId: string, patch: Partial<BuilderLink>) {
    setState((current) => ({
      ...current,
      links: current.links.map((link) => (link.id === linkId ? { ...link, ...patch } : link)),
    }));
  }

  function addDraftLink() {
    setAddingFlash(true);
    window.setTimeout(() => setAddingFlash(false), 300);
    const draft = createDraftLink(state.links.length, state.profile?.id || "");
    setState((current) => ({
      ...current,
      links: [...current.links, draft],
    }));
    showToast("添加成功");
    window.setTimeout(() => {
      titleInputRefs.current[draft.id]?.focus();
      updateLocalLink(draft.id, { flash: false });
    }, 60);
  }

  async function saveLink(link: BuilderLink) {
    const title = link.title.trim();
    const url = normalizeUrl(link.url);
    if (!title || !url) {
      showToast("请先填写标题和链接");
      return;
    }

    if (!state.profile) {
      showToast("请先保存主页资料");
      return;
    }

    setState((current) => ({ ...current, saving: true, error: "" }));

    const response = await fetch(link.isDraft ? "/api/dashboard/links" : `/api/dashboard/links/${link.id}`, {
      method: link.isDraft ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, url, description: link.description, isActive: link.is_active }),
    });
    const result = (await response.json()) as LinkResponse;

    if (response.status === 401) {
      router.replace("/login");
      return;
    }

    if (!response.ok || !result.success || !result.link) {
      setState((current) => ({ ...current, saving: false, error: result.error || "链接保存失败。" }));
      return;
    }

    setState((current) => ({
      ...current,
      saving: false,
      links: current.links
        .map((item) => (item.id === link.id ? toBuilderLink(result.link as ProfileLink) : item))
        .sort((a, b) => a.position - b.position),
    }));
    showToast("保存成功");
  }

  async function deleteLink(link: BuilderLink) {
    if (!window.confirm("确定删除这个链接吗？")) return;

    if (link.isDraft) {
      setState((current) => ({ ...current, links: current.links.filter((item) => item.id !== link.id) }));
      showToast("已删除");
      return;
    }

    setState((current) => ({ ...current, saving: true, error: "" }));
    const response = await fetch(`/api/dashboard/links/${link.id}`, { method: "DELETE" });
    const result = (await response.json()) as { success?: boolean; error?: string };

    if (response.status === 401) {
      router.replace("/login");
      return;
    }

    if (!response.ok || !result.success) {
      setState((current) => ({ ...current, saving: false, error: result.error || "链接删除失败。" }));
      return;
    }

    setState((current) => ({
      ...current,
      saving: false,
      links: current.links.filter((item) => item.id !== link.id),
    }));
    showToast("已删除");
  }

  function changeAddressNotice() {
    showToast("修改公开地址后，旧链接和二维码可能失效，该功能后续开放。");
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  if (state.loading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#F7F6EA] px-4">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-black text-[#113A1D] shadow-sm">
          <Loader2 aria-hidden className="size-5 animate-spin text-[#16A34A]" />
          正在读取制作器...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#F7F6EA] text-[#113A1D]">
      <header className="sticky top-0 z-40 border-b border-[#DDE8CF] bg-white/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard" className="inline-flex w-[132px] max-w-[38vw] items-center">
            <Image src="/brand/link168-logo.png" alt="Link168 链接一路发" width={1536} height={864} priority className="h-auto w-full object-contain" />
          </Link>

          <nav className="order-3 flex w-full justify-center gap-2 text-sm font-black text-[#52624A] md:order-none md:w-auto">
            {navItems.map((item) => (
              <button
                key={item}
                onClick={() => (item === "制作" ? undefined : showToast(`${item}功能即将开放`))}
                className={`rounded-full px-4 py-2 transition ${item === "制作" ? "bg-[#0B6B2B] text-white shadow-sm" : "hover:bg-[#ECFDF3] hover:text-[#0B6B2B]"}`}
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              onClick={() => setModal("vip")}
              className="link168-button-press inline-flex min-h-10 items-center gap-2 rounded-full bg-[#FACC15] px-4 text-sm font-black text-[#113A1D] shadow-sm hover:brightness-105"
            >
              <Crown aria-hidden className="size-4" />
              升级VIP
            </button>
            <span className="hidden max-w-[260px] truncate rounded-full bg-[#ECFDF3] px-4 py-2 text-xs font-black text-[#0B6B2B] lg:inline">
              永久专属链接：{publicUrl}
            </span>
            <button
              onClick={() => setModal("share")}
              className="link168-button-press inline-flex min-h-10 items-center gap-2 rounded-full bg-[#113A1D] px-4 text-sm font-black text-white shadow-sm"
            >
              <Share2 aria-hidden className="size-4" />
              分享
            </button>
            <button onClick={signOut} className="grid size-10 place-items-center rounded-full bg-[#F7F6EA] text-[#52624A]">
              <LogOut aria-label="退出登录" className="size-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_410px] lg:px-8">
        <section className="grid gap-5">
          {state.error ? <p className="rounded-2xl border border-[#FF4D4F]/20 bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">{state.error}</p> : null}

          <section className="rounded-[26px] border border-[#DDE8CF] bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-black text-[#0B6B2B]">公开主页地址</p>
                <h1 className="mt-2 text-3xl font-black">{publicUrl}</h1>
                <p className="mt-2 text-sm text-[#52624A]">当前版本暂不开放随意修改公开地址，避免旧链接和二维码失效。</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => void copyText(`https://${publicUrl}`)} className="link168-button-press inline-flex min-h-10 items-center gap-2 rounded-full bg-[#ECFDF3] px-4 text-sm font-black text-[#0B6B2B]">
                  <Copy aria-hidden className="size-4" />
                  复制链接
                </button>
                <Link href={previewUrl} className="link168-button-press inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-black text-[#14532D] ring-1 ring-[#DDE8CF]">
                  <Eye aria-hidden className="size-4" />
                  预览主页
                </Link>
                <button onClick={() => setModal("share")} className="link168-button-press inline-flex min-h-10 items-center gap-2 rounded-full bg-[#113A1D] px-4 text-sm font-black text-white">
                  <Share2 aria-hidden className="size-4" />
                  分享主页
                </button>
                <button onClick={changeAddressNotice} className="link168-button-press inline-flex min-h-10 items-center rounded-full bg-[#FFF7D6] px-4 text-sm font-black text-[#AD6800]">
                  修改主页地址（后续开放）
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-[26px] border border-[#DDE8CF] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black text-[#0B6B2B]">主页资料卡片</p>
                <h2 className="mt-1 text-2xl font-black">编辑主页展示内容</h2>
              </div>
              <button onClick={() => setProfileOpen((open) => !open)} className="grid size-10 place-items-center rounded-full bg-[#F7F6EA] text-[#52624A]">
                {profileOpen ? <ChevronUp aria-label="收起资料区" className="size-5" /> : <ChevronDown aria-label="展开资料区" className="size-5" />}
              </button>
            </div>

            {profileOpen ? (
              <form onSubmit={saveProfile} className="mt-5 grid gap-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="grid size-20 place-items-center overflow-hidden rounded-full bg-[linear-gradient(135deg,#16A34A,#FACC15)] text-2xl font-black text-white">
                    {displayName ? displayName.slice(0, 1).toUpperCase() : "L"}
                  </div>
                  <button type="button" onClick={() => showToast("头像上传功能即将开放")} className="link168-button-press inline-flex min-h-10 w-fit items-center gap-2 rounded-full bg-[#ECFDF3] px-4 text-sm font-black text-[#0B6B2B]">
                    <ImageIcon aria-hidden className="size-4" />
                    上传头像
                  </button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-black text-[#14532D]">昵称</span>
                    <input
                      className="mt-2 h-12 w-full rounded-2xl border border-[#DDE8CF] bg-[#FCFFF7] px-4 outline-none focus:border-[#16A34A]"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="例如：阿宝"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-black text-[#14532D]">公开地址</span>
                    <input className="mt-2 h-12 w-full rounded-2xl border border-[#DDE8CF] bg-[#F7F6EA] px-4 text-[#8FA083]" value={publicUrl} readOnly />
                  </label>
                </div>
                <label className="block">
                  <span className="text-sm font-black text-[#14532D]">简介</span>
                  <textarea
                    className="mt-2 min-h-24 w-full resize-none rounded-2xl border border-[#DDE8CF] bg-[#FCFFF7] px-4 py-3 outline-none focus:border-[#16A34A]"
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    placeholder="一句话介绍你自己"
                  />
                </label>
                <button type="submit" disabled={state.saving} className="link168-button-press inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-[#0B6B2B] px-5 text-sm font-black text-white disabled:opacity-60">
                  {state.saving ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Save aria-hidden className="size-4" />}
                  保存资料
                </button>
              </form>
            ) : null}
          </section>

          <section className="rounded-[26px] border border-[#DDE8CF] bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-black text-[#0B6B2B]">链接卡片</p>
                <h2 className="mt-1 text-2xl font-black">管理主页按钮</h2>
                <p className="mt-1 text-sm text-[#52624A]">当前 {state.links.length} 个链接，公开显示 {activeLinks.length} 个。</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={addDraftLink}
                  className={`link168-button-press inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-black transition ${addingFlash ? "bg-[#FACC15] text-[#113A1D]" : "bg-[#0B6B2B] text-white"}`}
                >
                  <Plus aria-hidden className="size-4" />
                  添加新链接
                </button>
                <button onClick={() => setModal("modules")} className="link168-button-press inline-flex min-h-11 items-center gap-2 rounded-full bg-[#ECFDF3] px-5 text-sm font-black text-[#0B6B2B]">
                  <Wand2 aria-hidden className="size-4" />
                  添加更多模块
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              {state.links.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[#DDE8CF] bg-[#FCFFF7] px-4 py-10 text-center">
                  <p className="text-sm font-black">还没有链接</p>
                  <p className="mt-1 text-sm text-[#52624A]">点击“添加新链接”创建第一个主页按钮。</p>
                </div>
              ) : null}
              {state.links
                .slice()
                .sort((a, b) => a.position - b.position)
                .map((link) => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    saving={state.saving}
                    flashActive={activeFlash}
                    setTitleRef={(node) => {
                      titleInputRefs.current[link.id] = node;
                    }}
                    onChange={(patch) => updateLocalLink(link.id, patch)}
                    onSave={() => void saveLink(link)}
                    onDelete={() => void deleteLink(link)}
                    onCopy={() => void copyText(link.url || `https://${publicUrl}`, "复制成功")}
                    onVip={(label) => {
                      flash(label);
                      setModal("vip");
                    }}
                    onFlash={flash}
                  />
                ))}
            </div>
          </section>
        </section>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-[30px] border border-[#DDE8CF] bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-[#0B6B2B]">实时预览</p>
                <p className="text-xs text-[#52624A]">左侧改动会同步到手机</p>
              </div>
              <Palette aria-hidden className="size-5 text-[#16A34A]" />
            </div>
            <PhonePreview
              variant="public"
              poweredLogoClickable
              username={username}
              displayName={displayName}
              bio={bio}
              avatarUrl={state.profile?.avatar_url}
              links={previewLinks}
              className="max-w-[360px]"
            />
          </div>
        </aside>
      </div>

      {modal === "share" ? (
        <ShareModal
          url={`https://${publicUrl}`}
          previewUrl={previewUrl}
          onClose={() => setModal(null)}
          onCopy={() => void copyText(`https://${publicUrl}`)}
          onSoon={() => showToast("二维码保存功能即将开放")}
        />
      ) : null}
      {modal === "modules" ? (
        <ModulePickerModal
          onClose={() => setModal(null)}
          onAddLink={() => {
            addDraftLink();
            setModal(null);
          }}
          onSoon={(message) => showToast(message)}
          onFlash={flash}
          activeFlash={activeFlash}
        />
      ) : null}
      {modal === "vip" ? <VipModal onClose={() => setModal(null)} onPay={() => showToast("在线支付接口配置中，暂未开放自动支付。如需提前开通会员，请联系 Link168 官方客服。")} /> : null}
      {toast ? <Toast message={toast} /> : null}
    </main>
  );
}

function LinkCard({
  link,
  saving,
  flashActive,
  setTitleRef,
  onChange,
  onSave,
  onDelete,
  onCopy,
  onVip,
  onFlash,
}: {
  link: BuilderLink;
  saving: boolean;
  flashActive: string;
  setTitleRef: (node: HTMLInputElement | null) => void;
  onChange: (patch: Partial<BuilderLink>) => void;
  onSave: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onVip: (label: string) => void;
  onFlash: (label: string) => void;
}) {
  const toolItems = [
    { label: "图标", icon: ImageIcon, action: () => onFlash("图标") },
    { label: "锁定", icon: Lock, action: () => onVip("锁定") },
    { label: "抖动", icon: Zap, action: () => onVip("抖动") },
    { label: "重定向", icon: Share2, action: () => onVip("重定向") },
    { label: "数据分析", icon: BarChart3, action: () => onVip("数据分析") },
  ];

  return (
    <article className={`rounded-[26px] border p-4 shadow-sm transition ${link.flash ? "border-[#FACC15] bg-[#FFFBE6]" : "border-[#DDE8CF] bg-[#FCFFF7]"}`}>
      <div className="grid gap-3 lg:grid-cols-[24px_minmax(0,1fr)_auto] lg:items-start">
        <GripVertical aria-hidden className="mt-3 hidden size-5 cursor-grab text-[#8FA083] lg:block" />
        <div className="grid gap-3">
          <input
            ref={setTitleRef}
            value={link.title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder="点此输入标题"
            className="h-11 rounded-2xl border border-[#DDE8CF] bg-white px-4 text-sm font-black outline-none focus:border-[#16A34A]"
          />
          <input
            value={link.url}
            onChange={(event) => onChange({ url: event.target.value })}
            placeholder="点此输入链接"
            className="h-11 rounded-2xl border border-[#DDE8CF] bg-white px-4 text-sm outline-none focus:border-[#16A34A]"
          />
          <input
            value={link.description || ""}
            onChange={(event) => onChange({ description: event.target.value })}
            placeholder="描述，可选"
            className="h-11 rounded-2xl border border-[#DDE8CF] bg-white px-4 text-sm outline-none focus:border-[#16A34A]"
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={() => onChange({ is_active: !link.is_active })}
            className={`link168-button-press rounded-full px-3 py-2 text-xs font-black ${link.is_active ? "bg-[#ECFDF3] text-[#0B6B2B]" : "bg-[#F1F5F9] text-[#64748B]"}`}
          >
            {link.is_active ? "公开" : "隐藏"}
          </button>
          <button onClick={onSave} disabled={saving} className="grid size-10 place-items-center rounded-full bg-white text-[#0B6B2B] shadow-sm disabled:opacity-60">
            <Pencil aria-label="编辑/保存链接" className="size-4" />
          </button>
          <button onClick={onDelete} disabled={saving} className="grid size-10 place-items-center rounded-full bg-white text-[#B42318] shadow-sm disabled:opacity-60">
            <Trash2 aria-label="删除链接" className="size-4" />
          </button>
          <button onClick={onCopy} className="grid size-10 place-items-center rounded-full bg-white text-[#52624A] shadow-sm">
            <Copy aria-label="复制/分享链接" className="size-4" />
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-[#DDE8CF] pt-3">
        {toolItems.map(({ label, icon: Icon, action }) => (
          <button
            key={label}
            onClick={action}
            title={label}
            className={`link168-tooltip link168-button-press grid size-9 place-items-center rounded-full bg-white text-[#52624A] shadow-sm transition hover:bg-[#111827] hover:text-white ${flashActive === label ? "bg-[#FACC15] text-[#113A1D]" : ""}`}
            data-tooltip={label}
          >
            <Icon aria-label={label} className="size-4" />
          </button>
        ))}
      </div>
    </article>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4 py-6">
      <section className="max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-[30px] bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black">{title}</h2>
          <button onClick={onClose} className="grid size-10 place-items-center rounded-full bg-[#F7F6EA]">
            <X aria-label="关闭" className="size-5" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function ShareModal({ url, previewUrl, onClose, onCopy, onSoon }: { url: string; previewUrl: string; onClose: () => void; onCopy: () => void; onSoon: () => void }) {
  return (
    <ModalShell title="分享你的 Link168 主页" onClose={onClose}>
      <div className="mt-5 grid gap-5 sm:grid-cols-[220px_minmax(0,1fr)]">
        <div className="grid aspect-square place-items-center rounded-[26px] border border-dashed border-[#0B6B2B]/30 bg-[#ECFDF3]">
          <div className="grid size-32 place-items-center rounded-3xl bg-white text-[#0B6B2B] shadow-sm">
            <QrCode aria-hidden className="size-16" />
          </div>
        </div>
        <div className="grid content-center gap-3">
          <p className="rounded-2xl bg-[#F7F6EA] px-4 py-3 text-sm font-black text-[#0B6B2B]">{url}</p>
          <button onClick={onCopy} className="link168-button-press inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#0B6B2B] px-5 text-sm font-black text-white">
            <Copy aria-hidden className="size-4" />
            复制链接
          </button>
          <button onClick={onSoon} className="link168-button-press inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#ECFDF3] px-5 text-sm font-black text-[#0B6B2B]">
            <Download aria-hidden className="size-4" />
            保存二维码
          </button>
          <Link href={previewUrl} className="link168-button-press inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#FACC15] px-5 text-sm font-black text-[#113A1D]">
            <Eye aria-hidden className="size-4" />
            预览主页
          </Link>
        </div>
      </div>
    </ModalShell>
  );
}

function ModulePickerModal({
  onClose,
  onAddLink,
  onSoon,
  onFlash,
  activeFlash,
}: {
  onClose: () => void;
  onAddLink: () => void;
  onSoon: (message: string) => void;
  onFlash: (label: string) => void;
  activeFlash: string;
}) {
  return (
    <ModalShell title="添加更多模块" onClose={onClose}>
      <div className="mt-5 grid gap-5">
        {moduleGroups.map((group) => (
          <section key={group.title}>
            <p className="mb-3 text-sm font-black text-[#0B6B2B]">{group.title}</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {group.modules.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    onFlash(item.label);
                    if (item.type === "link") onAddLink();
                    else onSoon(item.label.includes("链接") || item.label.includes("客服") || item.label.includes("咨询") ? "会员功能" : "即将开放");
                  }}
                  className={`link168-button-press grid min-h-24 place-items-center rounded-3xl border border-[#DDE8CF] bg-[#FCFFF7] px-3 text-center text-sm font-black text-[#14532D] transition hover:-translate-y-1 hover:shadow-lg ${activeFlash === item.label ? "bg-[#FACC15]" : ""}`}
                >
                  <item.icon aria-hidden className="mb-2 size-7 text-[#16A34A]" />
                  {item.label}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </ModalShell>
  );
}

function VipModal({ onClose, onPay }: { onClose: () => void; onPay: () => void }) {
  return (
    <ModalShell title="升级 Link168 会员" onClose={onClose}>
      <div className="mt-5 grid gap-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {vipPlans.map((plan) => (
            <div key={plan.name} className="rounded-3xl border border-[#DDE8CF] bg-[#FCFFF7] p-4 text-center">
              <p className="text-sm font-black text-[#0B6B2B]">{plan.name}</p>
              <p className="mt-2 text-3xl font-black text-[#113A1D]">{plan.price}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {vipBenefits.map((benefit) => (
            <span key={benefit} className="inline-flex items-center gap-2 rounded-2xl bg-[#ECFDF3] px-3 py-2 text-sm font-black text-[#0B6B2B]">
              <Check aria-hidden className="size-4" />
              {benefit}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={onPay} className="link168-button-press inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-[#16A34A] px-5 text-sm font-black text-white">
            微信支付
          </button>
          <button onClick={onPay} className="link168-button-press inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-[#FACC15] px-5 text-sm font-black text-[#113A1D]">
            支付宝支付
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function Toast({ message }: { message: string }) {
  return <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[#113A1D] px-5 py-3 text-sm font-black text-white shadow-2xl">{message}</div>;
}
