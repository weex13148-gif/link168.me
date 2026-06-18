"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MutableRefObject, ReactNode } from "react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import {
  ArrowRight,
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
  Mail,
  MapPin,
  MessageCircle,
  Monitor,
  MoreHorizontal,
  Palette,
  Pencil,
  Plus,
  QrCode,
  Save,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Trash2,
  Type,
  User,
  Video,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { PhonePreview, type PhonePreviewAppearance, type PhonePreviewLink } from "@/components/PhonePreview";
import { isPlaceholderHandle, normalizeHandle } from "@/lib/handle";
import type { Profile, ProfileLink } from "@/lib/link168-types";

type DashboardTab = "制作" | "外观" | "数据" | "我的";
type AppearanceTab = "主题" | "自定义" | "系统配置";
type ModalState = "share" | "modules" | "vip" | null;
type ModuleType =
  | "link"
  | "text"
  | "group-title"
  | "qr"
  | "wechat"
  | "shop"
  | "booking"
  | "map"
  | "cover"
  | "popup"
  | "carousel"
  | "bilibili"
  | "douyin-video"
  | "channels-video"
  | "any-video"
  | "divider"
  | "copy-text";

type DashboardState = {
  loading: boolean;
  saving: boolean;
  error: string;
  userId: string | null;
  userEmail: string | null;
  emailVerified: boolean;
  profile: Profile | null;
  links: BuilderLink[];
};

type BuilderLink = ProfileLink & {
  isDraft?: boolean;
  flash?: boolean;
  saveError?: string;
};

type DashboardResponse = {
  success?: boolean;
  error?: string;
  user?: { id: string; email: string; emailVerified?: boolean };
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

const PUBLIC_ADDRESS_PLACEHOLDER = "link168.me/yourname";
const DRAFT_LINK_PREVIEW_HINT = "右侧预览当前只显示已保存并公开的链接，草稿链接保存后才会出现在真实公开主页。";

type CustomStyle = {
  backgroundMode: "solid" | "gradient1" | "gradient2" | "image";
  backgroundColor: string;
  buttonBg: string;
  buttonText: string;
  buttonBorder: string;
  nameColor: string;
  bioColor: string;
  buttonShape: "square" | "rounded";
  buttonAlign: "left" | "center" | "right";
};

type SystemConfig = {
  showPowered: boolean;
  showSearch: boolean;
  linkIcon: "share" | "arrow" | "hidden";
};

const initialState: DashboardState = {
  loading: true,
  saving: false,
  error: "",
  userId: null,
  userEmail: null,
  emailVerified: false,
  profile: null,
  links: [],
};

const navItems: DashboardTab[] = ["制作", "外观", "数据", "我的"];
const appearanceTabs: AppearanceTab[] = ["主题", "自定义", "系统配置"];

const freeThemes = [
  { name: "Link168 草木默认", surface: "bg-[#F7F1E7]", card: "bg-[#FFFDF8]", link: "bg-[#FFFDF8] text-[#2B241E] border-[#E8DCCB]" },
  { name: "简约白", surface: "bg-[#FFFDF8]", card: "bg-white", link: "bg-white text-[#2B241E] border-[#E8DCCB]" },
  { name: "商务黑", surface: "bg-[#111827]", card: "bg-[#1F2937] text-white", link: "bg-[#F9FAFB] text-[#111827]" },
  { name: "蓝色科技", surface: "bg-[#EAF3FF]", card: "bg-white", link: "bg-[#2563EB] text-white border-[#2563EB]" },
  { name: "橙色活力", surface: "bg-[#FFF3E6]", card: "bg-white", link: "bg-[#F97316] text-white border-[#F97316]" },
  { name: "浅绿清新", surface: "bg-[#DDE8CD]", card: "bg-[#FFFDF8]", link: "bg-[#F7F1E7] text-[#3F5F31] border-[#E8DCCB]" },
];

const vipThemes = ["黑金高级", "星空", "森林", "海边", "渐变艺术", "极简玻璃"];

const moduleGroups = [
  {
    title: "基础模块",
    modules: [
      { label: "链接", icon: Link2, type: "link", enabled: true },
      { label: "文本", icon: Type, type: "text", enabled: true },
      { label: "组标题", icon: Sparkles, type: "group-title", enabled: true },
      { label: "可复制文本", icon: Copy, type: "copy-text", vip: true },
    ],
  },
  {
    title: "展示模块",
    modules: [
      { label: "二维码", icon: QrCode, type: "qr", enabled: true },
      { label: "封面图", icon: ImageIcon, type: "cover", vip: true },
      { label: "弹出图", icon: ImageIcon, type: "popup", vip: true },
      { label: "轮播图", icon: ImageIcon, type: "carousel", vip: true },
    ],
  },
  {
    title: "视频模块",
    modules: [
      { label: "B站视频", icon: Video, type: "bilibili", vip: true },
      { label: "抖音视频", icon: Video, type: "douyin-video", vip: true },
      { label: "视频号", icon: Video, type: "channels-video", vip: true },
      { label: "任意视频", icon: Video, type: "any-video", vip: true },
    ],
  },
  {
    title: "增强模块",
    modules: [
      { label: "分割线", icon: MoreHorizontal, type: "divider", vip: true },
      { label: "微信客服", icon: MessageCircle, type: "wechat", enabled: true },
      { label: "商品链接", icon: ShoppingBag, type: "shop", enabled: true },
      { label: "预约咨询", icon: Sparkles, type: "booking", enabled: true },
      { label: "地图位置", icon: MapPin, type: "map", enabled: true },
    ],
  },
] satisfies Array<{
  title: string;
  modules: Array<{ label: string; icon: typeof Link2; type: ModuleType; enabled?: boolean; vip?: boolean }>;
}>;

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

function createDraftLink(position: number, profileId = "", preset: Partial<Pick<BuilderLink, "title" | "url" | "description">> = {}): BuilderLink {
  const now = new Date().toISOString();
  return {
    id: `draft-${Date.now()}`,
    profile_id: profileId,
    title: preset.title || "",
    url: preset.url || "",
    description: preset.description || "",
    icon_url: null,
    position,
    is_active: true,
    created_at: now,
    updated_at: now,
    isDraft: true,
    flash: true,
  };
}

function getModulePreset(type: ModuleType, shareUrl: string): Partial<Pick<BuilderLink, "title" | "url" | "description">> {
  const presets: Record<ModuleType, Partial<Pick<BuilderLink, "title" | "url" | "description">>> = {
    link: { title: "", url: "", description: "" },
    text: { title: "文本说明", url: "", description: "在这里补充一段主页说明" },
    "group-title": { title: "分组标题", url: "", description: "用于区分不同内容入口" },
    qr: { title: "我的二维码", url: shareUrl, description: "扫码访问我的 Link168 主页" },
    wechat: { title: "微信客服", url: "", description: "添加微信，随时咨询" },
    shop: { title: "商品链接", url: "", description: "查看精选商品或服务" },
    booking: { title: "预约咨询", url: "", description: "预约时间，快速沟通" },
    map: { title: "地图位置", url: "", description: "查看门店或服务位置" },
    cover: {},
    popup: {},
    carousel: {},
    bilibili: {},
    "douyin-video": {},
    "channels-video": {},
    "any-video": {},
    divider: {},
    "copy-text": {},
  };

  return presets[type];
}

function buildAppearance(themeName: string, custom: CustomStyle, system: SystemConfig): PhonePreviewAppearance {
  const theme = freeThemes.find((item) => item.name === themeName);
  if (theme) {
    return {
      surfaceClassName: theme.surface,
      cardClassName: theme.card,
      linkClassName: theme.link,
      linkIcon: system.linkIcon,
      showSearch: system.showSearch,
      showPowered: system.showPowered,
    };
  }

  return {
    surfaceClassName: "",
    cardClassName: "bg-white/90",
    linkClassName: custom.buttonShape === "square" ? "rounded-lg" : "rounded-2xl",
    nameStyle: { color: custom.nameColor },
    bioStyle: { color: custom.bioColor },
    linkStyle: {
      background: custom.buttonBg,
      color: custom.buttonText,
      borderColor: custom.buttonBorder,
      borderRadius: custom.buttonShape === "square" ? 8 : 18,
    },
    linkAlign: custom.buttonAlign,
    linkIcon: system.linkIcon,
    showSearch: system.showSearch,
    showPowered: system.showPowered,
  };
}

function customSurfaceStyle(custom: CustomStyle) {
  if (custom.backgroundMode === "solid") return { background: custom.backgroundColor };
  if (custom.backgroundMode === "gradient1") return { background: "linear-gradient(160deg,#F7F1E7 0%,#DDE8CD 100%)" };
  if (custom.backgroundMode === "gradient2") return { background: "linear-gradient(160deg,#FFFDF8 0%,#F2E7D8 100%)" };
  return { background: "linear-gradient(160deg,#F7F1E7 0%,#FFFDF8 50%,#DDE8CD 140%)" };
}

function copyTextFallback(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const titleInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<DashboardState>(initialState);
  const [activeTab, setActiveTab] = useState<DashboardTab>("制作");
  const [appearanceTab, setAppearanceTab] = useState<AppearanceTab>("主题");
  const [selectedTheme, setSelectedTheme] = useState("Link168 草木默认");
  const [customStyle, setCustomStyle] = useState<CustomStyle>({
    backgroundMode: "solid",
    backgroundColor: "#F7F1E7",
    buttonBg: "#FFFDF8",
    buttonText: "#2B241E",
    buttonBorder: "#E8DCCB",
    nameColor: "#2B241E",
    bioColor: "#7A6D5E",
    buttonShape: "rounded",
    buttonAlign: "left",
  });
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    showPowered: true,
    showSearch: false,
    linkIcon: "arrow",
  });
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [profileOpen, setProfileOpen] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState("");
  const [activeFlash, setActiveFlash] = useState("");
  const [addingFlash, setAddingFlash] = useState(false);
  const [currentOrigin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));
  const savedUsername = state.profile?.username || "";
  const hasPublicAddress = !isPlaceholderHandle(savedUsername);
  const canCompletePublicAddress = !state.profile || isPlaceholderHandle(state.profile.username);

  const publicUrl = hasPublicAddress ? `link168.me/${savedUsername}` : PUBLIC_ADDRESS_PLACEHOLDER;
  const previewUrl = hasPublicAddress ? `/${savedUsername}?preview=1` : "/dashboard";
  const shareUrl = hasPublicAddress ? `${currentOrigin || "https://link168.me"}/${savedUsername}` : currentOrigin || "https://link168.me";
  const savedLinks = useMemo(() => state.links.filter((link) => !link.isDraft), [state.links]);
  const draftLinks = useMemo(() => state.links.filter((link) => link.isDraft), [state.links]);

  const previewLinks: PhonePreviewLink[] = useMemo(
    () =>
      savedLinks
        .filter((link) => link.is_active)
        .sort((a, b) => a.position - b.position)
        .map((link) => ({
          id: link.id,
          label: link.title.trim() || "未命名链接",
          caption: link.description,
          href: link.url.trim() ? normalizeUrl(link.url) : undefined,
          isActive: link.is_active,
        })),
    [savedLinks],
  );

  const activeLinks = useMemo(() => savedLinks.filter((link) => link.is_active), [savedLinks]);
  const previewAppearance = useMemo(() => buildAppearance(selectedTheme, customStyle, systemConfig), [customStyle, selectedTheme, systemConfig]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
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
      if (profile?.theme) {
        setSelectedTheme(profile.theme);
      }
      setState({
        loading: false,
        saving: false,
        error: "",
        userId: result.user.id,
        userEmail: result.user.email,
        emailVerified: result.user.emailVerified ?? false,
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

  const themeSyncedRef = useRef(false);
  useEffect(() => {
    if (!state.userId) return;
    if (!themeSyncedRef.current) {
      themeSyncedRef.current = true;
      return;
    }

    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch("/api/dashboard", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: selectedTheme }),
          signal: controller.signal,
        });
        const result = (await response.json()) as { success?: boolean; error?: string };
        if (!response.ok || !result.success) {
          console.warn("主题保存失败：", result.error);
        }
      } catch {
        console.warn("主题保存请求被跳过或失败");
      }
    })();

    return () => controller.abort();
  }, [selectedTheme, state.userId]);

  async function copyText(value: string, message = "已复制链接") {
    const text = value.trim();
    if (!text) {
      showToast("没有可复制的链接");
      return;
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else if (!copyTextFallback(text)) {
        throw new Error("Clipboard fallback failed");
      }
      showToast(message);
    } catch {
      if (copyTextFallback(text)) {
        showToast(message);
        return;
      }

      showToast("复制失败，请长按或手动复制");
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasPublicAddress && !canCompletePublicAddress) {
      setState((current) => ({ ...current, error: "当前账号缺少可用公开地址，请联系管理员处理。" }));
      return;
    }

    if (canCompletePublicAddress && !normalizeHandle(username)) {
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
    setState((current) => ({ ...current, saving: false, profile: result.profile || null, error: "" }));
    showToast("保存成功");
  }

  async function uploadAvatar(file: File | null) {
    if (!file) return;
    if (!state.profile || !hasPublicAddress) {
      showToast("请先保存主页资料");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);
    setState((current) => ({ ...current, saving: true, error: "" }));

    try {
      const response = await fetch("/api/dashboard/avatar", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as ProfileResponse;

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success || !result.profile) {
        setState((current) => ({ ...current, saving: false, error: result.error || "头像上传失败。" }));
        return;
      }

      setState((current) => ({ ...current, saving: false, profile: result.profile || null, error: "" }));
      showToast("头像已上传");
    } catch {
      setState((current) => ({ ...current, saving: false, error: "头像上传失败，请稍后再试。" }));
    } finally {
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  function updateLocalLink(linkId: string, patch: Partial<BuilderLink>) {
    setState((current) => ({
      ...current,
      links: current.links.map((link) => (link.id === linkId ? { ...link, ...patch } : link)),
    }));
  }

  function addDraftLink(preset: Partial<Pick<BuilderLink, "title" | "url" | "description">> = {}) {
    setAddingFlash(true);
    window.setTimeout(() => setAddingFlash(false), 300);
    const draft = createDraftLink(state.links.length, state.profile?.id || "", preset);
    setState((current) => ({ ...current, links: [...current.links, draft] }));
    showToast("已添加未保存草稿");
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
    if (!state.profile || !hasPublicAddress) {
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
      setState((current) => ({
        ...current,
        saving: false,
        error: result.error || "链接保存失败。",
        links: current.links.map((item) => (item.id === link.id ? { ...item, saveError: result.error || "链接保存失败。" } : item)),
      }));
      return;
    }

    setState((current) => ({
      ...current,
      saving: false,
      links: current.links
        .map((item) => (item.id === link.id ? { ...toBuilderLink(result.link as ProfileLink), saveError: "" } : item))
        .sort((a, b) => a.position - b.position),
    }));
    showToast(link.isDraft ? "链接已保存并公开" : "保存成功");
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

    setState((current) => ({ ...current, saving: false, links: current.links.filter((item) => item.id !== link.id) }));
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
      <main className="grid min-h-dvh place-items-center bg-[#F7F1E7] px-4">
        <div className="flex items-center gap-3 rounded-[24px] border border-[#E8DCCB] bg-[#FFFDF8] px-5 py-4 text-sm font-black text-[#2B241E] shadow-[0_18px_45px_rgba(86,68,46,0.12)]">
          <Loader2 aria-hidden className="link168-feature-icon animate-spin text-[#6F8F4E]" />
          正在读取制作器...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[radial-gradient(circle_at_12%_10%,rgba(221,232,205,0.72),transparent_24%),radial-gradient(circle_at_88%_14%,rgba(200,164,93,0.12),transparent_20%),linear-gradient(135deg,#FFFDF8_0%,#F7F1E7_52%,#F2E7D8_100%)] text-[#2B241E]">
      <header className="sticky top-0 z-40 border-b border-[#E8DCCB]/90 bg-[#FFFDF8]/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard" className="inline-flex w-[108px] max-w-[32vw] items-center opacity-90 transition hover:opacity-100">
            <Image src="/brand/link168-logo.png" alt="Link168 链接一路发" width={1536} height={864} priority className="h-auto w-full object-contain" />
          </Link>

          <nav className="order-3 flex w-full justify-center gap-2 overflow-x-auto text-[16px] font-semibold text-[#7A6D5E] md:order-none md:w-auto">
            {navItems.map((item) => (
              <button
                key={item}
                onClick={() => setActiveTab(item)}
                className={`min-h-11 rounded-2xl px-4 transition ${activeTab === item ? "bg-[#6F8F4E] text-white shadow-sm shadow-[#6F8F4E]/20" : "hover:bg-[#F2E7D8] hover:text-[#3F5F31]"}`}
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              onClick={() => setModal("vip")}
              className="link168-button-press inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[#F6E7C8] px-4 text-[15px] font-semibold text-[#8C612E] shadow-sm hover:brightness-105"
            >
              <Crown aria-hidden className="link168-nav-icon" />
              升级VIP
            </button>
            <span className="hidden max-w-[260px] truncate rounded-2xl bg-[#DDE8CD] px-4 py-2 text-xs font-semibold text-[#3F5F31] lg:inline">永久专属链接：{publicUrl}</span>
            <button onClick={() => setModal("share")} className="link168-button-press inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[#6F8F4E] px-4 text-[15px] font-semibold text-white shadow-sm hover:bg-[#5E7F3F]">
              <Share2 aria-hidden className="link168-nav-icon" />
              分享
            </button>
            <button onClick={signOut} className="grid size-11 place-items-center rounded-2xl bg-[#F2E7D8] text-[#7A6D5E]">
              <LogOut aria-label="退出登录" className="link168-nav-icon" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_410px] lg:px-8">
        <section className="grid gap-5">
          {!state.loading && state.userEmail && !state.emailVerified ? (
            <div className="flex flex-col items-start gap-3 rounded-[28px] border border-[#FFB020/30 bg-[#FFF7E0] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#FFB020]/20 text-[#8C612E]">
              <Mail aria-hidden className="link168-nav-icon" />
            </div>
            <div>
              <p className="text-sm font-black text-[#8C612E]">请先验证你的邮箱</p>
              <p className="mt-1 text-sm leading-6 text-[#8C612E]/90">
                我们已向 <span className="font-bold">{state.userEmail}</span> 发送了验证链接。点击邮件中的链接即可完成验证。
              </p>
            </div>
          </div>
          </div>
          ) : null}

          {state.error ? <p className="rounded-2xl border border-[#FF4D4F]/20 bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">{state.error}</p> : null}

          {activeTab === "制作" ? (
            <BuilderPanel
              publicUrl={publicUrl}
              previewUrl={previewUrl}
              shareUrl={shareUrl}
              state={state}
              username={username}
              hasPublicAddress={hasPublicAddress}
              canCompletePublicAddress={canCompletePublicAddress}
              displayName={displayName}
              bio={bio}
              profileOpen={profileOpen}
              activeLinks={activeLinks}
              draftLinks={draftLinks}
              addingFlash={addingFlash}
              activeFlash={activeFlash}
              titleInputRefs={titleInputRefs}
              avatarInputRef={avatarInputRef}
              setUsername={setUsername}
              setDisplayName={setDisplayName}
              setBio={setBio}
              setProfileOpen={setProfileOpen}
              saveProfile={saveProfile}
              uploadAvatar={uploadAvatar}
              addDraftLink={addDraftLink}
              setModal={setModal}
              copyText={copyText}
              changeAddressNotice={changeAddressNotice}
              updateLocalLink={updateLocalLink}
              saveLink={saveLink}
              deleteLink={deleteLink}
              showToast={showToast}
              flash={flash}
            />
          ) : null}

          {activeTab === "外观" ? (
            <AppearancePanel
              activeTab={appearanceTab}
              selectedTheme={selectedTheme}
              customStyle={customStyle}
              systemConfig={systemConfig}
              setActiveTab={setAppearanceTab}
              setSelectedTheme={setSelectedTheme}
              setCustomStyle={setCustomStyle}
              setSystemConfig={setSystemConfig}
              showToast={showToast}
              openVip={() => setModal("vip")}
            />
          ) : null}

          {activeTab === "数据" ? <DataPanel links={state.links} openVip={() => setModal("vip")} /> : null}

          {activeTab === "我的" ? (
            <AccountPanel
              email={state.userEmail}
              displayName={displayName}
              bio={bio}
              publicUrl={publicUrl}
              previewUrl={previewUrl}
              shareUrl={shareUrl}
              copyText={copyText}
              openVip={() => setModal("vip")}
              onAddressNotice={changeAddressNotice}
              signOut={signOut}
              showToast={showToast}
            />
          ) : null}
        </section>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-[30px] border border-[#E8DCCB] bg-[#FFFDF8]/90 p-4 shadow-[0_22px_70px_rgba(86,68,46,0.12)] backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-[#3F5F31]">实时预览</p>
                <p className="text-xs text-[#7A6D5E]">左侧改动会同步到手机</p>
              </div>
              <Palette aria-hidden className="link168-feature-icon text-[#6F8F4E]" />
            </div>
            <div style={selectedTheme === "自定义" ? customSurfaceStyle(customStyle) : undefined} className={selectedTheme === "自定义" ? "rounded-[34px] p-2" : ""}>
              <PhonePreview
                variant="public"
                poweredLogoClickable
                username={username}
                displayName={displayName}
                bio={bio}
                avatarUrl={state.profile?.avatar_url}
                links={previewLinks}
                appearance={previewAppearance}
                className="max-w-[360px]"
              />
            </div>
            {draftLinks.length ? <p className="mt-3 text-center text-xs font-semibold text-[#7A6D5E]">{DRAFT_LINK_PREVIEW_HINT}</p> : null}
          </div>
        </aside>
      </div>

      {modal === "share" ? (
        <ShareModal
          url={shareUrl}
          previewUrl={previewUrl}
          username={username}
          onClose={() => setModal(null)}
          onCopy={() => void copyText(shareUrl)}
        />
      ) : null}
      {modal === "modules" ? (
        <ModulePickerModal
          onClose={() => setModal(null)}
          onAddModule={(type) => {
            addDraftLink(getModulePreset(type, shareUrl));
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

function BuilderPanel({
  publicUrl,
  previewUrl,
  shareUrl,
  state,
  username,
  hasPublicAddress,
  canCompletePublicAddress,
  displayName,
  bio,
  profileOpen,
  activeLinks,
  draftLinks,
  addingFlash,
  activeFlash,
  titleInputRefs,
  avatarInputRef,
  setUsername,
  setDisplayName,
  setBio,
  setProfileOpen,
  saveProfile,
  uploadAvatar,
  addDraftLink,
  setModal,
  copyText,
  changeAddressNotice,
  updateLocalLink,
  saveLink,
  deleteLink,
  showToast,
  flash,
}: {
  publicUrl: string;
  previewUrl: string;
  shareUrl: string;
  state: DashboardState;
  username: string;
  hasPublicAddress: boolean;
  canCompletePublicAddress: boolean;
  displayName: string;
  bio: string;
  profileOpen: boolean;
  activeLinks: BuilderLink[];
  draftLinks: BuilderLink[];
  addingFlash: boolean;
  activeFlash: string;
  titleInputRefs: MutableRefObject<Record<string, HTMLInputElement | null>>;
  avatarInputRef: MutableRefObject<HTMLInputElement | null>;
  setUsername: (value: string) => void;
  setDisplayName: (value: string) => void;
  setBio: (value: string) => void;
  setProfileOpen: (value: boolean | ((open: boolean) => boolean)) => void;
  saveProfile: (event: FormEvent<HTMLFormElement>) => void;
  uploadAvatar: (file: File | null) => Promise<void>;
  addDraftLink: (preset?: Partial<Pick<BuilderLink, "title" | "url" | "description">>) => void;
  setModal: (modal: ModalState) => void;
  copyText: (value: string, message?: string) => Promise<void>;
  changeAddressNotice: () => void;
  updateLocalLink: (linkId: string, patch: Partial<BuilderLink>) => void;
  saveLink: (link: BuilderLink) => Promise<void>;
  deleteLink: (link: BuilderLink) => Promise<void>;
  showToast: (message: string) => void;
  flash: (label: string) => void;
}) {
  return (
    <>
      <section className="rounded-[30px] border border-[#E8DCCB] bg-[#FFFDF8]/92 p-5 shadow-[0_18px_55px_rgba(86,68,46,0.10)]">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-black text-[#3F5F31]">公开主页地址</p>
            <h1 className="mt-2 text-3xl font-black text-[#2B241E]">{publicUrl}</h1>
            <p className="mt-2 text-sm text-[#7A6D5E]">
              {canCompletePublicAddress ? "当前账号还没有正式公开地址，首次补全并保存后将立即锁定。" : "当前版本暂不开放随意修改公开地址，避免旧链接和二维码失效。"}
            </p>
            {canCompletePublicAddress ? (
              <label className="mt-4 block max-w-md">
                <span className="text-sm font-black text-[#3F5F31]">首次补全公开地址</span>
                <div className="mt-2 flex h-12 items-center rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4">
                  <span className="shrink-0 text-sm font-black text-[#7A6D5E]">link168.me/</span>
                  <input
                    value={username}
                    onChange={(event) => setUsername(normalizeHandle(event.target.value))}
                    placeholder="yourname"
                    className="min-w-0 flex-1 bg-transparent pl-2 text-sm font-black text-[#2B241E] outline-none"
                  />
                </div>
              </label>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void copyText(shareUrl)} disabled={!hasPublicAddress} className="link168-button-press inline-flex min-h-10 items-center gap-2 rounded-full bg-[#DDE8CD] px-4 text-sm font-black text-[#3F5F31] disabled:opacity-50">
              <Copy aria-hidden className="link168-nav-icon" />
              复制链接
            </button>
            <Link href={previewUrl} aria-disabled={!hasPublicAddress} className={`link168-button-press inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-black ring-1 ring-[#E8DCCB] ${hasPublicAddress ? "bg-[#FFFDF8] text-[#3F5F31]" : "pointer-events-none bg-[#F7F1E7] text-[#A69A8A]"}`}>
              <Eye aria-hidden className="link168-nav-icon" />
              预览主页
            </Link>
            <button onClick={() => setModal("share")} disabled={!hasPublicAddress} className="link168-button-press inline-flex min-h-10 items-center gap-2 rounded-full bg-[#6F8F4E] px-4 text-sm font-black text-white hover:bg-[#5E7F3F] disabled:cursor-not-allowed disabled:bg-[#AFC19A]">
              <Share2 aria-hidden className="link168-nav-icon" />
              分享主页
            </button>
            <button onClick={changeAddressNotice} className="link168-button-press inline-flex min-h-10 items-center rounded-full bg-[#F6E7C8] px-4 text-sm font-black text-[#8C612E]">
              修改主页地址（后续开放）
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-[#E8DCCB] bg-[#FFFDF8]/92 p-5 shadow-[0_18px_55px_rgba(86,68,46,0.10)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black text-[#3F5F31]">主页资料卡片</p>
            <h2 className="mt-1 text-2xl font-black text-[#2B241E]">编辑主页展示内容</h2>
          </div>
          <button onClick={() => setProfileOpen((open) => !open)} className="grid size-11 place-items-center rounded-2xl bg-[#F2E7D8] text-[#7A6D5E]">
            {profileOpen ? <ChevronUp aria-label="收起资料区" className="link168-nav-icon" /> : <ChevronDown aria-label="展开资料区" className="link168-nav-icon" />}
          </button>
        </div>

        {profileOpen ? (
          <form onSubmit={saveProfile} className="mt-5 grid gap-5">
            <div className="grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start">
              <div className="flex flex-col items-start gap-3">
                <div className="grid size-20 place-items-center overflow-hidden rounded-full bg-[linear-gradient(135deg,#DDE8CD,#C8A45D)] text-2xl font-black text-[#3F5F31] shadow-lg shadow-[#6F8F4E]/12">
                  {state.profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={state.profile.avatar_url} alt="主页头像" className="size-full object-cover" />
                  ) : (
                    displayName ? displayName.slice(0, 1).toUpperCase() : "L"
                  )}
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(event) => void uploadAvatar(event.target.files?.[0] || null)}
                />
                <button type="button" onClick={() => avatarInputRef.current?.click()} className="link168-button-press inline-flex min-h-10 w-fit items-center gap-2 rounded-full bg-[#DDE8CD] px-4 text-sm font-black text-[#3F5F31]">
                  <ImageIcon aria-hidden className="link168-feature-icon" />
                  上传头像
                </button>
              </div>
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-black text-[#3F5F31]">昵称</span>
                    <input className="mt-2 h-12 w-full rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] px-4 outline-none focus:border-[#6F8F4E] focus:bg-[#FFFDF8]" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="例如：阿宝" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-black text-[#3F5F31]">公开地址</span>
                    {canCompletePublicAddress ? (
                      <div className="mt-2 flex h-12 items-center rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4">
                        <span className="shrink-0 text-sm font-black text-[#7A6D5E]">link168.me/</span>
                        <input
                          value={username}
                          onChange={(event) => setUsername(normalizeHandle(event.target.value))}
                          placeholder="yourname"
                          className="min-w-0 flex-1 bg-transparent pl-2 text-sm font-black text-[#2B241E] outline-none"
                        />
                      </div>
                    ) : (
                      <input className="mt-2 h-12 w-full rounded-2xl border border-[#E8DCCB] bg-[#F2E7D8] px-4 text-[#7A6D5E]" value={publicUrl} readOnly />
                    )}
                  </label>
                </div>
                <p className="rounded-2xl bg-[#F7F1E7] px-4 py-3 text-sm text-[#7A6D5E]">
                  {canCompletePublicAddress ? "首次补全成功后，公开地址将立即写入数据库并锁定。" : "公开地址已锁定，后续修改将等待单独开放。"}
                </p>
              </div>
            </div>
            <label className="block">
              <span className="text-sm font-black text-[#3F5F31]">简介</span>
              <textarea className="mt-2 min-h-24 w-full resize-none rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] px-4 py-3 outline-none focus:border-[#6F8F4E] focus:bg-[#FFFDF8]" value={bio} onChange={(event) => setBio(event.target.value)} placeholder="一句话介绍你自己" />
            </label>
            <button type="submit" disabled={state.saving} className="link168-button-press inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-[#6F8F4E] px-5 text-sm font-black text-white hover:bg-[#5E7F3F] disabled:opacity-60">
              {state.saving ? <Loader2 aria-hidden className="link168-nav-icon animate-spin" /> : <Save aria-hidden className="link168-nav-icon" />}
              保存资料
            </button>
          </form>
        ) : null}
      </section>

      <section className="rounded-[30px] border border-[#E8DCCB] bg-[#FFFDF8]/92 p-5 shadow-[0_18px_55px_rgba(86,68,46,0.10)]">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-black text-[#3F5F31]">搭建我的主页</p>
            <h2 className="mt-1 text-2xl font-black text-[#2B241E]">管理主页按钮</h2>
            <p className="mt-1 text-sm text-[#7A6D5E]">当前 {state.links.length} 个链接，其中已保存并公开 {activeLinks.length} 个。</p>
            {draftLinks.length ? <p className="mt-1 text-xs font-semibold text-[#8C612E]">另有 {draftLinks.length} 个未保存草稿，尚未写入数据库，也不会在公开主页显示。</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => addDraftLink()} className={`link168-button-press inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-black transition ${addingFlash ? "bg-[#F6E7C8] text-[#8C612E]" : "bg-[#6F8F4E] text-white hover:bg-[#5E7F3F]"}`}>
              <Plus aria-hidden className="link168-feature-icon" />
              添加新链接
            </button>
            <button onClick={() => setModal("modules")} className="link168-button-press inline-flex min-h-11 items-center gap-2 rounded-full bg-[#DDE8CD] px-5 text-sm font-black text-[#3F5F31]">
              <Wand2 aria-hidden className="link168-feature-icon" />
              添加更多模块
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          {state.links.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#E8DCCB] bg-[#F7F1E7] px-4 py-10 text-center">
              <p className="text-sm font-black text-[#2B241E]">还没有链接</p>
              <p className="mt-1 text-sm text-[#7A6D5E]">点击“添加新链接”创建第一个主页按钮。</p>
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
                onChange={(patch) => updateLocalLink(link.id, { ...patch, saveError: "" })}
                onToggle={() => {
                  updateLocalLink(link.id, { is_active: !link.is_active, saveError: "" });
                  showToast(link.is_active ? "已隐藏" : "已公开");
                }}
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
    </>
  );
}

function AppearancePanel({
  activeTab,
  selectedTheme,
  customStyle,
  systemConfig,
  setActiveTab,
  setSelectedTheme,
  setCustomStyle,
  setSystemConfig,
  showToast,
  openVip,
}: {
  activeTab: AppearanceTab;
  selectedTheme: string;
  customStyle: CustomStyle;
  systemConfig: SystemConfig;
  setActiveTab: (tab: AppearanceTab) => void;
  setSelectedTheme: (theme: string) => void;
  setCustomStyle: (style: CustomStyle | ((style: CustomStyle) => CustomStyle)) => void;
  setSystemConfig: (config: SystemConfig | ((config: SystemConfig) => SystemConfig)) => void;
  showToast: (message: string) => void;
  openVip: () => void;
}) {
  return (
    <section className="rounded-[30px] border border-[#E8DCCB] bg-[#FFFDF8]/92 p-5 shadow-[0_18px_55px_rgba(86,68,46,0.10)]">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-black text-[#3F5F31]">外观设置</p>
          <h1 className="mt-1 text-3xl font-black text-[#2B241E]">调整主页视觉风格</h1>
        </div>
        <div className="flex rounded-2xl bg-[#F2E7D8] p-1">
          {appearanceTabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`min-h-10 rounded-xl px-4 text-[15px] font-semibold transition ${activeTab === tab ? "bg-[#6F8F4E] text-white" : "text-[#7A6D5E] hover:text-[#3F5F31]"}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "主题" ? (
        <div className="mt-5 grid gap-5">
          <ThemeGrid title="免费主题" themes={freeThemes.map((theme) => theme.name)} selectedTheme={selectedTheme} onSelect={(name) => {
            setSelectedTheme(name);
            showToast("修改成功");
          }} />
          <ThemeGrid title="VIP 主题" themes={vipThemes} vip selectedTheme={selectedTheme} onSelect={openVip} />
        </div>
      ) : null}

      {activeTab === "自定义" ? (
        <div className="mt-5 grid gap-5">
          <div className="grid gap-3 rounded-3xl bg-[#F7F1E7] p-4">
            <h2 className="text-xl font-black text-[#2B241E]">背景</h2>
            <div className="grid gap-2 sm:grid-cols-4">
              {(["solid", "gradient1", "gradient2", "image"] as CustomStyle["backgroundMode"][]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setSelectedTheme("自定义");
                    setCustomStyle((style) => ({ ...style, backgroundMode: mode }));
                    showToast(mode === "image" ? "图片背景上传后续开放" : "修改成功");
                  }}
                  className={`rounded-2xl px-4 py-3 text-sm font-black ring-1 ring-[#E8DCCB] ${customStyle.backgroundMode === mode ? "bg-[#6F8F4E] text-white" : "bg-[#FFFDF8] text-[#3F5F31]"}`}
                >
                  {mode === "solid" ? "纯色" : mode === "gradient1" ? "渐变1" : mode === "gradient2" ? "渐变2" : "图片"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 rounded-3xl bg-[#F7F1E7] p-4 sm:grid-cols-2">
            {[
              ["背景色", "backgroundColor"],
              ["按钮背景色", "buttonBg"],
              ["按钮文字色", "buttonText"],
              ["按钮边框色", "buttonBorder"],
              ["昵称颜色", "nameColor"],
              ["简介颜色", "bioColor"],
            ].map(([label, key]) => (
              <button key={key} onClick={openVip} className="link168-button-press flex items-center justify-between gap-3 rounded-2xl bg-[#FFFDF8] px-4 py-3 text-left">
                <span className="text-sm font-black text-[#3F5F31]">{label}</span>
                <span className="inline-flex items-center gap-2">
                  <span className="block size-8 rounded-xl border border-[#E8DCCB]" style={{ background: customStyle[key as keyof CustomStyle] as string }} />
                  <span className="rounded-full bg-[#F6E7C8] px-2 py-1 text-[11px] font-black text-[#8C612E]">VIP</span>
                </span>
              </button>
            ))}
          </div>

          <div className="grid gap-4 rounded-3xl bg-[#F7F1E7] p-4 sm:grid-cols-2">
            <Segmented title="按钮形状" options={["直角", "圆角"]} value={customStyle.buttonShape === "square" ? "直角" : "圆角"} onChange={() => {
              openVip();
            }} />
            <Segmented title="按钮对齐" options={["左对齐", "居中", "右对齐"]} value={customStyle.buttonAlign === "left" ? "左对齐" : customStyle.buttonAlign === "center" ? "居中" : "右对齐"} onChange={() => {
              openVip();
            }} />
          </div>

          <div className="grid gap-3 rounded-3xl bg-[#F6E7C8] p-4 sm:grid-cols-2">
            {["自定义背景图片上传", "自定义封面图", "隐藏底部 Link168 Logo", "高级主题保存"].map((label) => (
              <button key={label} onClick={openVip} className="link168-button-press flex items-center justify-between rounded-2xl bg-[#FFFDF8] px-4 py-3 text-left text-sm font-black text-[#8C612E]">
                {label}
                <Lock aria-hidden className="link168-nav-icon" />
              </button>
            ))}
          </div>

          <button onClick={() => showToast("修改成功")} className="link168-button-press inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-[#6F8F4E] px-5 text-sm font-black text-white hover:bg-[#5E7F3F]">
            <Save aria-hidden className="link168-nav-icon" />
            保存外观
          </button>
        </div>
      ) : null}

      {activeTab === "系统配置" ? (
        <div className="mt-5 grid gap-3">
          <ConfigSwitch label="是否显示你的 Link168 链接" checked={systemConfig.showPowered} onClick={() => {
            setSystemConfig((config) => ({ ...config, showPowered: true }));
            showToast("免费版默认保留 Powered by Link168");
          }} />
          <ConfigSwitch label="是否显示搜索按钮" checked={systemConfig.showSearch} onClick={() => {
            setSystemConfig((config) => ({ ...config, showSearch: !config.showSearch }));
            showToast("修改成功");
          }} />
          <div className="rounded-3xl bg-[#F7F1E7] p-4">
            <p className="text-sm font-black text-[#3F5F31]">链接右侧图标风格</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                ["share", "分享"],
                ["arrow", "箭头"],
                ["hidden", "隐藏"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => {
                    setSystemConfig((config) => ({ ...config, linkIcon: value as SystemConfig["linkIcon"] }));
                    showToast("修改成功");
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-black ${systemConfig.linkIcon === value ? "bg-[#6F8F4E] text-white" : "bg-[#FFFDF8] text-[#3F5F31] ring-1 ring-[#E8DCCB]"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {["是否显示分享按钮", "隐藏 Link168 图标", "蓝V认证", "提示到浏览器打开", "随机链接 / 动态链接", "初始弹窗提示"].map((label) => (
            <button key={label} onClick={openVip} className="link168-button-press flex items-center justify-between rounded-3xl bg-[#F6E7C8] px-4 py-4 text-left text-sm font-black text-[#8C612E]">
              <span>{label}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FFFDF8] px-3 py-1 text-xs">
                升级会员 <Lock aria-hidden className="size-3" />
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function themeLook(theme: string, vip?: boolean) {
  if (vip) {
    if (theme === "黑金高级") return { surface: "bg-[#111827]", button: "bg-[#FACC15] text-[#111827]", avatar: "bg-[#FACC15]", text: "text-[#FDE68A]" };
    if (theme === "星空") return { surface: "bg-[radial-gradient(circle_at_30%_20%,#6366F1,#111827_55%)]", button: "bg-white/15 text-white border-white/20", avatar: "bg-[#A5B4FC]", text: "text-white" };
    if (theme === "森林") return { surface: "bg-[linear-gradient(160deg,#052E16,#166534)]", button: "bg-[#DCFCE7] text-[#14532D]", avatar: "bg-[#86EFAC]", text: "text-[#DCFCE7]" };
    if (theme === "海边") return { surface: "bg-[linear-gradient(160deg,#0EA5E9,#ECFEFF)]", button: "bg-white text-[#075985]", avatar: "bg-[#BAE6FD]", text: "text-white" };
    if (theme === "渐变艺术") return { surface: "bg-[linear-gradient(160deg,#A78BFA,#F9A8D4,#FDE68A)]", button: "bg-white/85 text-[#581C87]", avatar: "bg-white", text: "text-white" };
    return { surface: "bg-white/35 backdrop-blur", button: "bg-white/55 text-[#111827] border-white/60", avatar: "bg-white/70", text: "text-white" };
  }
  if (theme === "简约白") return { surface: "bg-white", button: "bg-[#F8FAFC] text-[#111827]", avatar: "bg-[#E5E7EB]", text: "text-[#111827]" };
  if (theme === "商务黑") return { surface: "bg-[#111827]", button: "bg-[#F9FAFB] text-[#111827]", avatar: "bg-[#374151]", text: "text-white" };
  if (theme === "蓝色科技") return { surface: "bg-[#DBEAFE]", button: "bg-[#2563EB] text-white", avatar: "bg-[#60A5FA]", text: "text-[#1E3A8A]" };
  if (theme === "橙色活力") return { surface: "bg-[#FFEDD5]", button: "bg-[#F97316] text-white", avatar: "bg-[#FDBA74]", text: "text-[#9A3412]" };
  if (theme === "浅绿清新") return { surface: "bg-[#DDE8CD]", button: "bg-[#FFFDF8] text-[#3F5F31]", avatar: "bg-[#6F8F4E]", text: "text-[#3F5F31]" };
  return { surface: "bg-[#F7F1E7]", button: "bg-[#FFFDF8] text-[#2B241E]", avatar: "bg-[linear-gradient(135deg,#DDE8CD,#C8A45D)]", text: "text-[#2B241E]" };
}

function ThemeGrid({ title, themes, selectedTheme, vip, onSelect }: { title: string; themes: string[]; selectedTheme: string; vip?: boolean; onSelect: (name: string) => void }) {
  return (
    <div>
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-3 grid gap-4 lg:grid-cols-3">
        {themes.map((theme) => {
          const look = themeLook(theme, vip);
          return (
            <button key={theme} onClick={() => onSelect(theme)} className={`link168-button-press group relative rounded-[28px] border p-4 text-left transition hover:-translate-y-1 hover:shadow-lg ${selectedTheme === theme ? "border-[#6F8F4E] bg-[#DDE8CD] shadow-[0_18px_45px_rgba(86,68,46,0.14)]" : "border-[#E8DCCB] bg-[#FFFDF8]"}`}>
              {vip ? <span className="absolute right-3 top-3 z-10 rounded-full bg-[#F6E7C8] px-2 py-1 text-[11px] font-black text-[#8C612E]">VIP</span> : null}
              {selectedTheme === theme ? (
                <span className="absolute left-3 top-3 z-10 grid size-7 place-items-center rounded-full bg-[#6F8F4E] text-white">
                  <Check aria-hidden className="link168-nav-icon" />
                </span>
              ) : null}
              <div className="link168-phone-shell mx-auto w-full max-w-[150px] p-1.5 shadow-xl shadow-[#2B241E]/12">
                <div className={`link168-phone-screen h-full overflow-hidden p-3 ${look.surface}`}>
                  <div className={`mx-auto size-11 rounded-full ${look.avatar}`} />
                  <div className={`mx-auto mt-2 h-3 w-20 rounded-full bg-current/70 ${look.text}`} />
                  <div className={`mx-auto mt-2 h-2 w-24 rounded-full bg-current/30 ${look.text}`} />
                  <div className="mt-4 grid gap-2">
                    {[0, 1, 2].map((index) => (
                      <div key={index} className={`min-h-8 rounded-xl border border-black/5 px-2 py-1.5 text-[10px] font-black ${look.button}`}>
                        {index === 0 ? "微信公众号" : index === 1 ? "小红书" : "预约咨询"}
                      </div>
                    ))}
                  </div>
                  <div className={`mx-auto mt-4 h-3 w-24 rounded-full bg-current/40 ${look.text}`} />
                </div>
              </div>
              <p className="mt-3 text-center text-sm font-black">{theme}</p>
              {vip ? <p className="mt-1 text-center text-xs font-bold text-[#8C612E]">会员主题，点击升级</p> : <p className="mt-1 text-center text-xs font-bold text-[#7A6D5E]">点击同步右侧预览</p>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Segmented({ title, options, value, onChange }: { title: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <p className="text-sm font-black text-[#3F5F31]">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <button key={option} onClick={() => onChange(option)} className={`rounded-full px-4 py-2 text-sm font-black ${value === option ? "bg-[#6F8F4E] text-white" : "bg-[#FFFDF8] text-[#3F5F31] ring-1 ring-[#E8DCCB]"}`}>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function ConfigSwitch({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center justify-between rounded-3xl bg-[#F7F1E7] px-4 py-4 text-left">
      <span className="text-sm font-black text-[#3F5F31]">{label}</span>
      <span className={`h-7 w-12 rounded-full p-1 transition ${checked ? "bg-[#6F8F4E]" : "bg-[#D8CDBE]"}`}>
        <span className={`block size-5 rounded-full bg-white transition ${checked ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}

function DataPanel({ links, openVip }: { links: BuilderLink[]; openVip: () => void }) {
  const metrics = [
    { label: "今日访问", value: "0", icon: Eye },
    { label: "昨日访问", value: "0", icon: BarChart3 },
    { label: "总访问", value: "0", icon: Monitor },
    { label: "总点击", value: "0", icon: Link2 },
    { label: "点击率", value: "0%", icon: Share2 },
  ];

  return (
    <section className="rounded-[30px] border border-[#E8DCCB] bg-[#FFFDF8]/92 p-5 shadow-[0_18px_55px_rgba(86,68,46,0.10)]">
      <div>
        <p className="text-sm font-black text-[#3F5F31]">数据中心</p>
        <h1 className="mt-1 text-3xl font-black text-[#2B241E]">查看主页访问与点击</h1>
      </div>
      <div className="mt-5 rounded-3xl bg-[#F6E7C8] p-4">
        <p className="text-sm font-black text-[#8C612E]">当前为展示预览</p>
        <p className="mt-2 text-sm leading-6 text-[#8C612E]">数据统计功能暂未开放，以上数据仅为占位展示。真实访问统计将在后续版本逐步开放。</p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-[24px] border border-[#E8DCCB] bg-[#F7F1E7] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-[#7A6D5E]">{label}</p>
              <Icon aria-hidden className="link168-data-icon text-[#6F8F4E]" />
            </div>
            <p className="mt-2 text-4xl font-black tracking-tight text-[#2B241E]">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <section className="rounded-[24px] border border-[#E8DCCB] bg-[#F7F1E7] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-[#2B241E]">最近 7 天访问趋势</h2>
            <BarChart3 aria-hidden className="link168-data-icon text-[#6F8F4E]" />
          </div>
          <div className="mt-6 flex h-40 items-end gap-3">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-t-2xl bg-[#DDE8CD]" style={{ height: `${18 + index * 3}px` }} />
                <span className="text-[11px] font-bold text-[#A69A8A]">D{index + 1}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-2xl bg-[#FFFDF8] px-4 py-3 text-sm font-bold text-[#7A6D5E]">数据统计功能暂未开放，当前仅为展示预览。</p>
        </section>
        <section className="rounded-[24px] border border-[#E8DCCB] bg-[#F7F1E7] p-5">
          <h2 className="text-xl font-black text-[#2B241E]">设备来源</h2>
          <div className="mt-4 grid gap-3">
            <div className="flex items-center justify-between rounded-2xl bg-[#FFFDF8] px-4 py-3 text-sm font-black">
              <span className="inline-flex items-center gap-2"><Smartphone aria-hidden className="link168-data-icon text-[#6F8F4E]" />手机</span>
              <span>0</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-[#FFFDF8] px-4 py-3 text-sm font-black">
              <span className="inline-flex items-center gap-2"><Monitor aria-hidden className="link168-data-icon text-[#6F8F4E]" />电脑</span>
              <span>0</span>
            </div>
          </div>
        </section>
      </div>
      <section className="mt-5 rounded-[24px] border border-[#E8DCCB] bg-[#F7F1E7] p-5">
        <h2 className="text-xl font-black text-[#2B241E]">链接点击排行 Top 5</h2>
        <div className="mt-4 grid gap-2">
          {links.length ? links.slice(0, 5).map((link, index) => (
            <div key={link.id} className="flex items-center justify-between rounded-2xl bg-[#FFFDF8] px-4 py-3 text-sm">
              <span className="font-black">{index + 1}. {link.title || "未命名链接"}</span>
              <span className="text-[#7A6D5E]">0 次</span>
            </div>
          )) : <p className="rounded-2xl bg-[#FFFDF8] px-4 py-4 text-sm font-bold text-[#7A6D5E]">暂无链接点击数据。</p>}
        </div>
      </section>
      <section className="mt-5 rounded-[24px] border border-[#E6CF9F] bg-[#F6E7C8] p-5">
        <h2 className="text-xl font-black text-[#8C612E]">高级数据（暂未开放）</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {["365 天数据", "自定义日期筛选", "来源分析", "地区分析", "设备 / 浏览器分析", "二维码扫码数据", "每条链接每日趋势", "导出数据", "高峰访问时间"].map((label) => (
            <button key={label} onClick={openVip} disabled className="flex items-center justify-between rounded-2xl bg-[#FFFDF8] px-4 py-3 text-left text-sm font-black text-[#A69A8A] cursor-not-allowed">
              {label}
              <Lock aria-hidden className="link168-nav-icon" />
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}

type SessionInfo = {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
};

function AccountPanel({
  email,
  displayName,
  bio,
  publicUrl,
  previewUrl,
  shareUrl,
  copyText,
  openVip,
  onAddressNotice,
  signOut,
  showToast,
}: {
  email: string | null;
  displayName: string;
  bio: string;
  publicUrl: string;
  previewUrl: string;
  shareUrl: string;
  copyText: (value: string, message?: string) => Promise<void>;
  openVip: () => void;
  onAddressNotice: () => void;
  signOut: () => Promise<void>;
  showToast: (message: string) => void;
}) {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [sessions, setSessions] = useState<SessionInfo[] | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!oldPassword || !newPassword || !confirmNewPassword) {
      showToast("请完整填写密码信息");
      return;
    }
    if (newPassword.length < 6) {
      showToast("新密码至少需要 6 位");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showToast("两次输入的新密码不一致");
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPassword,
          newPassword,
          confirmPassword: confirmNewPassword,
        }),
      });
      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
        message?: string;
      };
      setPasswordLoading(false);

      if (!response.ok || !result.success) {
        showToast(result.error || "修改失败，请稍后重试");
        return;
      }

      showToast(result.message || "密码已修改成功");
      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setShowChangePassword(false);
    } catch {
      setPasswordLoading(false);
      showToast("网络错误，请稍后重试");
    }
  }

  async function handleLoadSessions() {
    setShowSessions((previous) => {
      if (!previous) void loadSessions();
      return !previous;
    });
  }

  async function loadSessions() {
    setSessionsLoading(true);
    try {
      const response = await fetch("/api/auth/sessions");
      const result = (await response.json()) as {
        success?: boolean;
        sessions?: SessionInfo[];
        error?: string;
      };
      if (response.ok && result.success && result.sessions) {
        setSessions(result.sessions);
      } else {
        showToast(result.error || "加载会话失败");
      }
    } catch {
      showToast("网络错误，请稍后重试");
    } finally {
      setSessionsLoading(false);
    }
  }

  async function handleRevokeSession(sessionId: string) {
    setRevokingId(sessionId);
    try {
      const response = await fetch("/api/auth/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
        message?: string;
      };
      if (response.ok && result.success) {
        showToast(result.message || "已退出该设备");
        setSessions((previous) =>
          previous ? previous.filter((session) => session.id !== sessionId) : previous,
        );
      } else {
        showToast(result.error || "退出失败");
      }
    } catch {
      showToast("网络错误，请稍后重试");
    } finally {
      setRevokingId(null);
    }
  }

  async function handleRevokeAllOthers() {
    setRevokingId("all-others");
    try {
      const response = await fetch("/api/auth/sessions?action=all-others", {
        method: "DELETE",
      });
      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
        message?: string;
      };
      if (response.ok && result.success) {
        showToast(result.message || "已退出其他设备");
        setSessions((previous) =>
          previous ? previous.filter((session) => session.isCurrent) : previous,
        );
      } else {
        showToast(result.error || "退出失败");
      }
    } catch {
      showToast("网络错误，请稍后重试");
    } finally {
      setRevokingId(null);
    }
  }

  function formatDate(iso: string) {
    try {
      const date = new Date(iso);
      return date.toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  return (
    <section className="grid gap-5">
      <div className="rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8]/92 p-5 shadow-[0_18px_55px_rgba(86,68,46,0.10)]">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="grid size-16 place-items-center rounded-full bg-[linear-gradient(135deg,#DDE8CD,#C8A45D)] text-2xl font-black text-[#3F5F31]">{displayName ? displayName.slice(0, 1).toUpperCase() : "L"}</div>
            <div>
              <h1 className="text-2xl font-black text-[#2B241E]">{displayName || "Link168 用户"}</h1>
              <p className="mt-1 text-sm text-[#7A6D5E]">{email || "未读取到邮箱"}</p>
              <p className="mt-1 text-sm font-black text-[#3F5F31]">当前版本：免费版</p>
            </div>
          </div>
          <button onClick={openVip} className="link168-button-press inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-[#F6E7C8] px-5 text-sm font-black text-[#8C612E]">
            <Crown aria-hidden className="link168-nav-icon" />
            升级会员
          </button>
        </div>
        {bio ? <p className="mt-4 rounded-2xl bg-[#F7F1E7] px-4 py-3 text-sm text-[#7A6D5E]">{bio}</p> : null}
      </div>

      <AccountSection title="账号信息" icon={<User aria-hidden className="link168-feature-icon" />}>
        <InfoRow label="邮箱账号" value={email || "-"} />
        <InfoRow label="手机号绑定" value="未绑定" />
        <ActionRow label={showChangePassword ? "收起修改密码" : "修改密码"} onClick={() => setShowChangePassword((previous) => !previous)} />
        {showChangePassword ? (
          <form onSubmit={handleChangePassword} className="grid gap-3 rounded-2xl border border-dashed border-[#E8DCCB] bg-[#FFFDF8] p-4">
            <label className="block">
              <span className="text-sm font-black text-[#3F5F31]">当前密码</span>
              <input
                required
                type="password"
                value={oldPassword}
                onChange={(event) => setOldPassword(event.target.value)}
                placeholder="请输入当前密码"
                className="mt-2 h-11 w-full rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] px-4 text-[#2B241E] outline-none transition placeholder:text-[#A69A8A] focus:border-[#6F8F4E] focus:bg-[#FFFDF8] focus:ring-4 focus:ring-[#6F8F4E]/12"
              />
            </label>
            <label className="block">
              <span className="text-sm font-black text-[#3F5F31]">新密码（至少 6 位）</span>
              <input
                required
                minLength={6}
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="请输入新密码"
                className="mt-2 h-11 w-full rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] px-4 text-[#2B241E] outline-none transition placeholder:text-[#A69A8A] focus:border-[#6F8F4E] focus:bg-[#FFFDF8] focus:ring-4 focus:ring-[#6F8F4E]/12"
              />
            </label>
            <label className="block">
              <span className="text-sm font-black text-[#3F5F31]">再次输入新密码</span>
              <input
                required
                minLength={6}
                type="password"
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                placeholder="请再次输入"
                className="mt-2 h-11 w-full rounded-2xl border border-[#E8DCCB] bg-[#F7F1E7] px-4 text-[#2B241E] outline-none transition placeholder:text-[#A69A8A] focus:border-[#6F8F4E] focus:bg-[#FFFDF8] focus:ring-4 focus:ring-[#6F8F4E]/12"
              />
            </label>
            <button
              type="submit"
              disabled={passwordLoading}
              className="link168-button-press flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#6F8F4E] px-5 font-black text-white shadow-lg shadow-[#6F8F4E]/20 transition hover:-translate-y-0.5 hover:bg-[#5E7F3F] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {passwordLoading ? "提交中..." : "确认修改密码"}
            </button>
          </form>
        ) : null}
        <ActionRow label={showSessions ? "收起登录设备" : "登录设备管理"} onClick={handleLoadSessions} />
        {showSessions ? (
          <div className="grid gap-3 rounded-2xl border border-dashed border-[#E8DCCB] bg-[#FFFDF8] p-4">
            {sessionsLoading ? (
              <p className="text-center text-sm text-[#7A6D5E]">加载中...</p>
            ) : sessions && sessions.length ? (
              <>
                {sessions.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => void handleRevokeAllOthers()}
                    disabled={revokingId === "all-others"}
                    className="link168-button-press inline-flex min-h-10 w-fit items-center justify-center gap-2 rounded-full border border-[#B42318]/40 bg-[#FFF1F0] px-4 text-xs font-black text-[#B42318] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {revokingId === "all-others" ? "提交中..." : "退出所有其他设备"}
                  </button>
                ) : null}
                {sessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between gap-4 rounded-2xl bg-[#F7F1E7] px-4 py-3 text-sm">
                    <div className="grid gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-[#2B241E]">{session.device}</span>
                        <span className="text-[#7A6D5E]">· {session.browser}</span>
                        {session.isCurrent ? (
                          <span className="inline-flex items-center rounded-full bg-[#6F8F4E]/15 px-2 py-0.5 text-xs font-black text-[#3F5F31]">当前设备</span>
                        ) : null}
                      </div>
                      <p className="text-xs text-[#7A6D5E]">位置：{session.location}</p>
                      <p className="text-xs text-[#7A6D5E]">最后活跃：{formatDate(session.lastActive)}</p>
                    </div>
                    {session.isCurrent ? null : (
                      <button
                        type="button"
                        onClick={() => void handleRevokeSession(session.id)}
                        disabled={revokingId === session.id}
                        className="link168-button-press inline-flex min-h-9 items-center justify-center gap-1 rounded-full border border-[#B42318]/40 bg-[#FFF1F0] px-3 text-xs font-black text-[#B42318] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {revokingId === session.id ? "退出中..." : "退出"}
                      </button>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <p className="text-center text-sm text-[#7A6D5E]">暂无登录设备信息</p>
            )}
          </div>
        ) : null}
        <ActionRow label="账号安全" onClick={() => showToast("功能即将开放")} />
      </AccountSection>

      <AccountSection title="主页信息" icon={<ShieldCheck aria-hidden className="link168-feature-icon" />}>
        <InfoRow label="公开主页地址" value={publicUrl} />
        <ActionRow label="复制链接" onClick={() => void copyText(shareUrl)} />
        <LinkRow label="预览主页" href={previewUrl} />
        <ActionRow label="修改主页地址：后续开放" onClick={onAddressNotice} />
      </AccountSection>

      <AccountSection title="会员与服务" icon={<Crown aria-hidden className="link168-feature-icon" />}>
        <InfoRow label="当前套餐" value="免费版" />
        <ActionRow label="会员权益" onClick={openVip} />
        <ActionRow label="开通会员" onClick={openVip} />
        <InfoRow label="订单记录" value="后续开放" />
      </AccountSection>

      <AccountSection title="帮助与支持" icon={<MessageCircle aria-hidden className="link168-feature-icon" />}>
        <LinkRow label="使用指南" href="/help" />
        <LinkRow label="帮助中心" href="/help" />
        <ActionRow label="联系我们" onClick={() => showToast("功能即将开放")} />
        <ActionRow label="更新日志" onClick={() => showToast("功能即将开放")} />
        <LinkRow label="举报中心" href="/report" />
      </AccountSection>

      <AccountSection title="危险操作" icon={<LogOut aria-hidden className="link168-feature-icon" />}>
        <ActionRow label="退出登录" danger onClick={() => void signOut()} />
        <InfoRow label="注销账号" value="后续开放" />
      </AccountSection>
    </section>
  );
}

function AccountSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[28px] border border-[#E8DCCB] bg-[#FFFDF8]/92 p-5 shadow-[0_18px_55px_rgba(86,68,46,0.08)]">
      <h2 className="flex items-center gap-2 text-xl font-black text-[#2B241E]">{icon}{title}</h2>
      <div className="mt-4 grid gap-2">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#F7F1E7] px-4 py-3 text-sm">
      <span className="font-black text-[#3F5F31]">{label}</span>
      <span className="text-right text-[#7A6D5E]">{value}</span>
    </div>
  );
}

function ActionRow({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`link168-button-press flex items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-black ${danger ? "bg-[#FFF1F0] text-[#B42318]" : "bg-[#F7F1E7] text-[#3F5F31]"}`}>
      {label}
      <ArrowRight aria-hidden className="link168-nav-icon" />
    </button>
  );
}

function LinkRow({ label, href }: { label: string; href: string }) {
  return (
    <Link href={href} className="link168-button-press flex items-center justify-between rounded-2xl bg-[#F7F1E7] px-4 py-3 text-left text-sm font-black text-[#3F5F31]">
      {label}
      <ArrowRight aria-hidden className="link168-nav-icon" />
    </Link>
  );
}

function LinkCard({
  link,
  saving,
  flashActive,
  setTitleRef,
  onChange,
  onToggle,
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
  onToggle: () => void;
  onSave: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onVip: (label: string) => void;
  onFlash: (label: string) => void;
}) {
  const toolItems = [
    { label: "添加图标", icon: ImageIcon, action: () => onFlash("添加图标") },
    { label: "密码保护", icon: Lock, action: () => onVip("密码保护") },
    { label: "跳转动画", icon: Zap, action: () => onVip("跳转动画") },
    { label: "分享统计", icon: Share2, action: () => onVip("分享统计") },
    { label: "点击数据", icon: BarChart3, action: () => onVip("点击数据") },
  ];

  return (
    <article className={`rounded-[28px] border p-4 shadow-sm transition ${link.flash ? "border-[#C8A45D] bg-[#F6E7C8]" : "border-[#E8DCCB] bg-[#F7F1E7]"}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {link.isDraft ? (
          <>
            <span className="rounded-full bg-[#F6E7C8] px-3 py-1 text-xs font-black text-[#8C612E]">草稿</span>
            <span className="text-xs font-semibold text-[#8C612E]">尚未保存到数据库，仅在编辑器中可见</span>
          </>
        ) : (
          <span className="rounded-full bg-[#DDE8CD] px-3 py-1 text-xs font-black text-[#3F5F31]">已保存</span>
        )}
      </div>
      <div className="grid gap-3 lg:grid-cols-[24px_minmax(0,1fr)_auto] lg:items-start">
        <GripVertical aria-hidden className="mt-3 hidden link168-feature-icon cursor-grab text-[#A69A8A] lg:block" />
        <div className="grid gap-3">
          <input ref={setTitleRef} value={link.title} onChange={(event) => onChange({ title: event.target.value })} placeholder="链接标题" className="h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm font-black outline-none focus:border-[#6F8F4E]" />
          <input value={link.url} onChange={(event) => onChange({ url: event.target.value })} placeholder="链接地址" className="h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm outline-none focus:border-[#6F8F4E]" />
          <input value={link.description || ""} onChange={(event) => onChange({ description: event.target.value })} placeholder="链接描述" className="h-11 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 text-sm outline-none focus:border-[#6F8F4E]" />
          {link.saveError ? <p className="text-sm font-semibold text-[#B42318]">{link.saveError}</p> : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button onClick={onToggle} className={`link168-button-press rounded-full px-3 py-2 text-xs font-black ${link.is_active ? "bg-[#DDE8CD] text-[#3F5F31]" : "bg-[#EFE7DC] text-[#7A6D5E]"}`}>
            {link.is_active ? "公开" : "隐藏"}
          </button>
          <button onClick={onSave} disabled={saving} className="link168-button-press inline-flex min-h-10 items-center gap-2 rounded-full bg-[#6F8F4E] px-4 text-sm font-black text-white shadow-sm disabled:opacity-60">
            {link.isDraft ? <Save aria-label="保存链接" className="link168-nav-icon" /> : <Pencil aria-label="更新链接" className="link168-nav-icon" />}
            {link.isDraft ? "保存并公开" : "保存修改"}
          </button>
          <button onClick={onDelete} disabled={saving} className="grid size-10 place-items-center rounded-full bg-[#FFFDF8] text-[#B42318] shadow-sm disabled:opacity-60">
            <Trash2 aria-label="删除链接" className="link168-nav-icon" />
          </button>
          <button onClick={onCopy} className="grid size-10 place-items-center rounded-full bg-[#FFFDF8] text-[#7A6D5E] shadow-sm">
            <Copy aria-label="复制链接" className="link168-nav-icon" />
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-[#E8DCCB] pt-3">
        {toolItems.map(({ label, icon: Icon, action }) => (
          <button key={label} onClick={action} title={label} className={`link168-tooltip link168-button-press grid size-9 place-items-center rounded-full bg-[#FFFDF8] text-[#7A6D5E] shadow-sm transition hover:bg-[#2B241E] hover:text-white ${flashActive === label ? "bg-[#F6E7C8] text-[#8C612E]" : ""}`} data-tooltip={label}>
            <Icon aria-label={label} className="link168-nav-icon" />
          </button>
        ))}
      </div>
    </article>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#2B241E]/45 px-4 py-6 backdrop-blur-sm">
      <section className="max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-[30px] border border-[#E8DCCB] bg-[#FFFDF8] p-5 shadow-[0_30px_100px_rgba(43,36,30,0.25)]">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black text-[#2B241E]">{title}</h2>
          <button onClick={onClose} className="grid size-10 place-items-center rounded-full bg-[#F2E7D8] text-[#7A6D5E]">
            <X aria-label="关闭" className="link168-nav-icon" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function ShareModal({ url, previewUrl, username, onClose, onCopy }: { url: string; previewUrl: string; username: string; onClose: () => void; onCopy: () => void }) {
  const qrRef = useRef<HTMLDivElement | null>(null);

  function downloadQRCode() {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) {
      window.alert("二维码生成失败，请稍后再试。");
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svg);
    const image = new window.Image();
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    image.onload = () => {
      const padding = 32;
      const canvas = document.createElement("canvas");
      canvas.width = image.width + padding * 2;
      canvas.height = image.height + padding * 2;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(svgUrl);
        window.alert("二维码下载失败，请稍后再试。");
        return;
      }

      context.fillStyle = "#FFFDF8";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, padding, padding);
      URL.revokeObjectURL(svgUrl);

      canvas.toBlob((blob) => {
        if (!blob) {
          window.alert("二维码下载失败，请稍后再试。");
          return;
        }

        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const safeName = (username || "profile").replace(/[^a-z0-9_-]/gi, "");
        link.href = downloadUrl;
        link.download = `link168-${safeName || "profile"}-qrcode.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
      }, "image/png");
    };

    image.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      window.alert("二维码下载失败，请稍后再试。");
    };

    image.src = svgUrl;
  }

  return (
    <ModalShell title="分享你的 Link168 主页" onClose={onClose}>
      <div className="mt-5 grid gap-5 sm:grid-cols-[220px_minmax(0,1fr)]">
        <div className="grid aspect-square place-items-center rounded-[28px] border border-[#E8DCCB] bg-[radial-gradient(circle_at_30%_20%,rgba(221,232,205,0.88),transparent_36%),#F7F1E7] p-4">
          <div ref={qrRef} className="grid size-40 place-items-center rounded-3xl bg-[#FFFDF8] p-4 text-[#3F5F31] shadow-sm">
            <QRCode value={url} size={132} bgColor="#FFFDF8" fgColor="#2B241E" level="M" />
          </div>
          <p className="mt-3 text-xs font-black text-[#3F5F31]">Link168 主页二维码</p>
        </div>
        <div className="grid content-center gap-3">
          <p className="rounded-2xl bg-[#F7F1E7] px-4 py-3 text-sm font-black text-[#3F5F31]">{url}</p>
          <button onClick={onCopy} className="link168-button-press inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#6F8F4E] px-5 text-sm font-black text-white hover:bg-[#5E7F3F]">
            <Copy aria-hidden className="link168-nav-icon" />
            复制链接
          </button>
          <button onClick={downloadQRCode} className="link168-button-press inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#DDE8CD] px-5 text-sm font-black text-[#3F5F31]">
            <Download aria-hidden className="link168-nav-icon" />
            下载二维码
          </button>
          <Link href={previewUrl} className="link168-button-press inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#F6E7C8] px-5 text-sm font-black text-[#8C612E]">
            <Eye aria-hidden className="link168-nav-icon" />
            预览主页
          </Link>
        </div>
      </div>
    </ModalShell>
  );
}

function ModulePickerModal({ onClose, onAddModule, onSoon, onFlash, activeFlash }: { onClose: () => void; onAddModule: (type: ModuleType) => void; onSoon: (message: string) => void; onFlash: (label: string) => void; activeFlash: string }) {
  return (
    <ModalShell title="添加更多模块" onClose={onClose}>
      <div className="mt-5 grid gap-5">
        {moduleGroups.map((group) => (
          <section key={group.title}>
            <h3 className="text-sm font-black text-[#3F5F31]">{group.title}</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {group.modules.map((module) => {
                const { label, icon: Icon, type } = module;
                const enabled = "enabled" in module && module.enabled === true;
                const vip = "vip" in module && module.vip === true;

                return (
                  <button
                    key={label}
                    onClick={() => {
                      onFlash(label);
                      if (enabled) {
                        window.setTimeout(() => onAddModule(type), 120);
                        return;
                      }

                      onSoon(vip ? "该功能为会员功能" : "功能即将开放");
                    }}
                    className={`link168-button-press flex items-center justify-between rounded-2xl border border-[#E8DCCB] px-4 py-3 text-left text-sm font-black transition ${activeFlash === label ? "bg-[#F6E7C8] text-[#8C612E]" : "bg-[#F7F1E7] text-[#3F5F31]"}`}
                  >
                    <span className="inline-flex items-center gap-3">
                      <Icon aria-hidden className="link168-feature-icon text-[#6F8F4E]" />
                      {label}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs font-black ${enabled ? "text-[#3F5F31]" : "text-[#8C612E]"}`}>
                      {enabled ? "免费 · 已开放" : "会员 · 会员专属"}
                      {enabled ? <Check aria-hidden className="link168-nav-icon" /> : <Lock aria-hidden className="link168-nav-icon text-[#A69A8A]" />}
                    </span>
                  </button>
                );
              })}
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
        <div className="rounded-3xl bg-[#F6E7C8] p-4">
          <p className="text-sm font-black text-[#8C612E]">当前为展示预览</p>
          <p className="mt-2 text-sm leading-6 text-[#8C612E]">会员支付功能暂未开放，以上内容仅为产品展示预览。如需开通会员，请联系 Link168 官方客服。</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {vipPlans.map((plan) => (
            <div key={plan.name} className="rounded-3xl border border-[#E8DCCB] bg-[#F7F1E7] p-4 text-center">
              <p className="text-sm font-black text-[#3F5F31]">{plan.name}</p>
              <p className="mt-2 text-3xl font-black">¥{plan.price}</p>
            </div>
          ))}
        </div>
        <div className="rounded-3xl bg-[#F6E7C8] p-4">
          <p className="text-sm font-black text-[#8C612E]">会员权益</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {vipBenefits.map((item) => (
              <span key={item} className="inline-flex items-center gap-2 rounded-2xl bg-[#FFFDF8] px-3 py-2 text-sm font-bold">
                <Crown aria-hidden className="link168-nav-icon text-[#C8A45D]" />
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button onClick={onPay} disabled className="min-h-12 rounded-full bg-[#AFC19A] px-5 text-sm font-black text-white cursor-not-allowed">微信支付（暂未开放）</button>
          <button onClick={onPay} disabled className="min-h-12 rounded-full bg-[#D4A880] px-5 text-sm font-black text-white cursor-not-allowed">支付宝支付（暂未开放）</button>
        </div>
      </div>
    </ModalShell>
  );
}

function Toast({ message }: { message: string }) {
  return <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[#2B241E] px-5 py-3 text-sm font-black text-white shadow-xl">{message}</div>;
}
