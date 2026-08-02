"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  Globe,
  Mail,
  MapPin,
  Phone,
  ShoppingBag,
} from "lucide-react";
import { getThemeClasses, type ShareThemeClassSet } from "@/components/theme/presetThemes";
import type { CustomTheme } from "@/components/theme/types";
import { normalizeCustomTheme } from "@/components/theme/normalize";
import { sanitizeMapUrl, sanitizePhoneNumber, sanitizePublicUrl } from "@/lib/public-url-security";
import { PublicContactActions } from "@/components/share/PublicContactActions";
import { PublicModuleList, PUBLIC_MODULE_SURFACE_STYLE, PUBLIC_PROFILE_BUTTON_STYLE } from "@/components/share/PublicModuleList";
import { PublicProfileHero } from "@/components/share/PublicProfileHero";
import type { PublicProfileIdentity, PublicProfileRenderMode } from "@/components/share/public-profile-types";
import { resolvePlatformIcon } from "@/lib/link-icons";
import { CoverImageModule } from "@/components/share/modules/CoverImageModule";
import { PopupImageModule } from "@/components/share/modules/PopupImageModule";
import { CarouselModule } from "@/components/share/modules/CarouselModule";
import { BilibiliVideoModule } from "@/components/share/modules/BilibiliVideoModule";
import { YoutubeVideoModule } from "@/components/share/modules/YoutubeVideoModule";
import { VideoLinkModule } from "@/components/share/modules/VideoLinkModule";
import { NeteaseMusicModule } from "@/components/share/modules/NeteaseMusicModule";
import { MusicLinkModule } from "@/components/share/modules/MusicLinkModule";
import { DividerModule } from "@/components/share/modules/DividerModule";
import { CopyTextModule } from "@/components/share/modules/CopyTextModule";
import { AiChatModule } from "@/components/share/modules/AiChatModule";
import { ModuleFallback } from "@/components/share/modules/ModuleFallback";
import BookingModule from "@/components/share/modules/BookingModule";
import ProductCardModule from "@/components/share/modules/ProductCardModule";
import ServiceCardModule from "@/components/share/modules/ServiceCardModule";
import OfferModule from "@/components/share/modules/OfferModule";
import { QuoteModule } from "@/components/share/modules/QuoteModule";
import { ContactFormModule } from "@/components/share/modules/ContactFormModule";
import { ContactEntryCard } from "@/components/share/ContactEntryCard";
import { CONTACT_ENTRY_TYPE } from "@/lib/contact-entries";
import {
  isModuleType,
  validateModulePayload,
  type BilibiliVideoPayload,
  type BookingPayload,
  type CarouselPayload,
  type CopyTextPayload,
  type CoverImagePayload,
  type DividerPayload,
  type MusicLinkPayload,
  type NeteaseMusicPayload,
  type OfferPayload,
  type QuotePayload,
  type ContactFormPayload,
  type PopupImagePayload,
  type ProductCardPayload,
  type ServiceCardPayload,
  type VideoLinkPayload,
  type YoutubeVideoPayload,
} from "@/features/profile-modules";

export type SharePageTemplate = "business" | "creator" | "conversion";
export type ShareLinkStyle = "solid" | "outline" | "soft";

export type SharePageLink = {
  id: string;
  title: string;
  description?: string | null;
  url?: string | null;
  icon?: string | null;
  iconType?: string | null;
  type?: string | null;
  componentType?: string | null;
  payload?: string | null;
  workspaceId?: string | null;
};

export interface SharePageRendererProps extends PublicProfileIdentity {
  template?: SharePageTemplate;
  links: SharePageLink[];
  renderMode?: PublicProfileRenderMode;
  themeName?: string | null;
  customTheme?: string | null;
  surfaceClassName?: string;
  cardClassName?: string;
  linkClassName?: string;
  linkStyle?: ShareLinkStyle;
  showBrandFoot?: boolean;
  reportUrl?: string | null;
  emptyText?: string;
  bioFallback?: string;
  onQrCodeClick?: () => void;
  onShareClick?: () => void;
  onContactInteraction?: (linkId: string) => void;
  onAiAvailabilityChange?: (available: boolean) => void;
  onOpenContact?: () => void;
  onOpenContactEntry?: (contactEntryId?: string) => void;
  stickyAction?: ReactNode;
}

function safeParseJson<T = unknown>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeComponentType(link: SharePageLink): string {
  if (link.componentType) return link.componentType;
  const rawType = (link.type || "").toLowerCase();
  if (rawType) return rawType;
  return "link";
}

function parseCustomTheme(themeName: string | null | undefined, customThemeJson: string | null | undefined): CustomTheme | null {
  if (!customThemeJson && !themeName) return null;
  try {
    return normalizeCustomTheme(themeName || null, customThemeJson || null);
  } catch {
    return null;
  }
}

function buildLinkClassSet(base: ShareThemeClassSet, linkStyle: ShareLinkStyle, override?: string): string {
  if (override) return override;
  if (linkStyle === "outline") return "bg-transparent border border-current/30 text-current hover:bg-current/5";
  if (linkStyle === "soft") return "bg-white/70 border border-white/40 text-current shadow-sm hover:bg-white";
  return base.linkClassName;
}

function sanitizeHref(componentType: string, itemUrl: string | null | undefined, payload: Record<string, unknown> | null) {
  if (componentType === "phone") {
    const raw = typeof payload?.phone === "string" ? payload.phone : itemUrl || "";
    const cleaned = sanitizePhoneNumber(raw.replace(/^tel:/i, ""));
    return cleaned.safe && cleaned.phone
      ? { href: `tel:${cleaned.phone}`, displayFallback: null as string | null }
      : { href: null, displayFallback: "电话号码格式不正确" };
  }
  if (componentType === "map") {
    const raw = typeof payload?.map === "string" ? payload.map : itemUrl || "";
    const cleaned = sanitizeMapUrl(raw);
    return cleaned.safe && cleaned.url
      ? { href: cleaned.url, displayFallback: null as string | null }
      : { href: null, displayFallback: "地图链接被系统判定为不安全" };
  }
  if (componentType === "email") {
    const raw = typeof payload?.email === "string" ? payload.email : itemUrl || "";
    const email = raw.trim().slice(0, 254);
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    return valid
      ? { href: `mailto:${email}`, displayFallback: null as string | null }
      : { href: null, displayFallback: "邮箱格式不正确" };
  }
  if (componentType === "address") {
    const raw = typeof payload?.address === "string" ? payload.address : itemUrl || "";
    const address = raw.trim();
    return address.length >= 2 && address.length <= 300
      ? { href: `https://maps.google.com/maps?q=${encodeURIComponent(address)}`, displayFallback: null as string | null }
      : { href: null, displayFallback: "地址格式不正确" };
  }
  if (["wechat", "text", "group-title"].includes(componentType)) {
    return { href: null, displayFallback: null as string | null };
  }
  const cleaned = sanitizePublicUrl(itemUrl || "");
  return cleaned.safe && cleaned.url
    ? { href: cleaned.url, displayFallback: null as string | null }
    : { href: null, displayFallback: "链接被系统判定为不安全" };
}

function renderLinkIcon(iconValue: string | null | undefined, iconType: string | null | undefined, defaultClass: string): ReactNode {
  const value = (iconValue || "").trim();
  if (iconType === "platform") {
    const iconPath = resolvePlatformIcon(value);
    if (iconPath) {
      return (
        <span className={`grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-black/5 ${defaultClass}`}>
          <img src={iconPath} alt="" className="size-full object-cover" />
        </span>
      );
    }
    return <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${defaultClass}`}><Globe aria-hidden className="size-5" /></span>;
  }
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return (
      <span className={`grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-black/5 ${defaultClass}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="" className="size-full object-cover" />
      </span>
    );
  }
  if (value) {
    return <span className={`grid size-9 shrink-0 place-items-center rounded-xl text-xl ${defaultClass}`}>{value}</span>;
  }
  return <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${defaultClass}`}><Globe aria-hidden className="size-5" /></span>;
}

function BrandFoot({ classes }: { classes: ShareThemeClassSet }) {
  return (
    <a
      href={process.env.NEXT_PUBLIC_APP_URL || "https://link168.me"}
      aria-label="由 Link168 提供"
      className={`mt-5 inline-flex min-h-10 items-center gap-2 self-center rounded-full border border-black/10 bg-white/70 px-4 py-1.5 text-sm font-bold shadow-sm transition hover:opacity-80 ${classes.footerClassName}`}
    >
      由 Link168 提供
    </a>
  );
}

function renderNewModule(
  item: SharePageLink,
  componentType: string,
  payload: Record<string, unknown> | null,
  username: string,
  profileId?: string,
  onAvailabilityChange?: (available: boolean) => void,
  onOpenContact?: () => void,
  onOpenContactEntry?: (contactEntryId?: string) => void,
): ReactNode {
  if (!payload) return <div key={item.id}><ModuleFallback message="模块数据为空" /></div>;
  if (!isModuleType(componentType)) return <div key={item.id}><ModuleFallback message="未知模块类型" /></div>;
  const validation = validateModulePayload(componentType, payload);
  if (!validation.valid) return <div key={item.id}><ModuleFallback message={validation.errors?.[0] || "模块数据格式不正确"} /></div>;

  switch (componentType) {
    case "cover-image": return <div key={item.id}><CoverImageModule payload={payload as CoverImagePayload} /></div>;
    case "popup-image": return <div key={item.id}><PopupImageModule payload={payload as PopupImagePayload} /></div>;
    case "carousel": return <div key={item.id}><CarouselModule payload={payload as CarouselPayload} /></div>;
    case "bilibili-video": return <div key={item.id}><BilibiliVideoModule payload={payload as BilibiliVideoPayload} /></div>;
    case "youtube-video": return <div key={item.id}><YoutubeVideoModule payload={payload as YoutubeVideoPayload} /></div>;
    case "video-link": return <div key={item.id}><VideoLinkModule payload={payload as VideoLinkPayload} /></div>;
    case "netease-music": return <div key={item.id}><NeteaseMusicModule payload={payload as NeteaseMusicPayload} /></div>;
    case "music-link": return <div key={item.id}><MusicLinkModule payload={payload as MusicLinkPayload} /></div>;
    case "divider": return <div key={item.id}><DividerModule payload={payload as DividerPayload} /></div>;
    case "copy-text": return <div key={item.id}><CopyTextModule payload={payload as CopyTextPayload} /></div>;
    case "ai-chat": return <div key={item.id}><AiChatModule username={username} mode="customer-service" onAvailabilityChange={onAvailabilityChange} onOpenContact={onOpenContact} onOpenContactEntry={onOpenContactEntry} /></div>;
    case "product-card": return <div key={item.id}><ProductCardModule payload={payload as ProductCardPayload} username={username} /></div>;
    case "service-card": return <div key={item.id}><ServiceCardModule payload={payload as ServiceCardPayload} username={username} /></div>;
    case "offer": return <div key={item.id}><OfferModule payload={payload as OfferPayload} username={username} /></div>;
    case "booking": return <div key={item.id}><BookingModule payload={payload as BookingPayload} username={username} /></div>;
    case "quote": return <div key={item.id}><QuoteModule payload={payload as QuotePayload} profileId={profileId} username={username} /></div>;
    case "contact-form": return <div key={item.id}><ContactFormModule payload={payload as ContactFormPayload} profileId={profileId} username={username} /></div>;
    default: return <div key={item.id}><ModuleFallback message="未知模块类型" /></div>;
  }
}

function renderLegacyItem(
  item: SharePageLink,
  componentType: string,
  payload: Record<string, unknown> | null,
  classes: ShareThemeClassSet,
  variant: SharePageTemplate,
  linkClassName: string,
  onContactInteraction?: (linkId: string) => void,
) {
  if (componentType === CONTACT_ENTRY_TYPE) {
    return <div key={item.id}><ContactEntryCard entry={{ id: item.id, title: item.title, description: item.description, payload: item.payload, workspaceId: item.workspaceId }} /></div>;
  }
  const safe = sanitizeHref(componentType, item.url, payload);
  const title = item.title || "链接";
  const description = item.description;
  const common = `flex min-h-[56px] items-center justify-between gap-3 rounded-2xl px-3 py-3 shadow-sm ${linkClassName}`;
  const body = (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      {componentType === "phone" ? <span className="grid size-9 place-items-center rounded-xl bg-[#F3E7D1]"><Phone className="size-4 text-[#8A6A2E]" /></span> : null}
      {componentType === "email" ? <span className="grid size-9 place-items-center rounded-xl bg-[#F3E7D1]"><Mail className="size-4 text-[#8A6A2E]" /></span> : null}
      {componentType === "map" || componentType === "address" ? <span className="grid size-9 place-items-center rounded-xl bg-[#F3E7D1]"><MapPin className="size-4 text-[#8A6A2E]" /></span> : null}
      {componentType === "shop" || componentType === "booking" ? <span className="grid size-9 place-items-center rounded-xl bg-[#DDE8CD]">{componentType === "booking" ? <CalendarClock className="size-4 text-[#3F5F31]" /> : <ShoppingBag className="size-4 text-[#8A6A2E]" />}</span> : null}
      {!["phone", "email", "map", "address", "shop", "booking"].includes(componentType) ? renderLinkIcon(item.icon, item.iconType, classes.avatarClassName) : null}
      <span className="min-w-0 text-left">
        <span className="block truncate font-black">{title}</span>
        {description || !safe.href ? <span className={`mt-0.5 block line-clamp-2 text-xs leading-5 ${safe.href ? classes.subClassName : "text-red-600"}`}>{safe.href ? description : safe.displayFallback}</span> : null}
      </span>
    </span>
  );

  if (!safe.href || componentType === "text" || componentType === "group-title" || componentType === "wechat") {
    if (componentType === "group-title") {
      return <div key={item.id} className="flex items-center gap-3 px-1 py-2"><span className="h-px flex-1 bg-[#E8DCCB]" /><span className={`text-xs font-black uppercase ${classes.subClassName}`}>{title}</span><span className="h-px flex-1 bg-[#E8DCCB]" /></div>;
    }
    if (componentType === "text") {
      return <div key={item.id} data-public-module-surface style={PUBLIC_MODULE_SURFACE_STYLE} className={`rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 py-3 ${classes.subClassName}`}><div className="font-black text-[#2B241E]">{title}</div>{description ? <div className="mt-1 text-sm leading-6">{description}</div> : null}</div>;
    }
    if (componentType === "wechat") {
      const wechatId = typeof payload?.wechat === "string" ? payload.wechat : item.url || description || "";
      return <button key={item.id} type="button" data-public-button style={PUBLIC_PROFILE_BUTTON_STYLE} onClick={() => { onContactInteraction?.(item.id); if (wechatId) void navigator.clipboard?.writeText(wechatId).catch(() => undefined); }} className={`${common} w-full text-left`}>{body}<span className="rounded-full bg-[#3F5F31]/10 px-2 py-1 text-xs font-black text-[#3F5F31]">{wechatId || "微信"}</span></button>;
    }
    return <div key={item.id} data-public-module-surface style={PUBLIC_MODULE_SURFACE_STYLE} className={common}>{body}</div>;
  }

  return (
    <a key={item.id} href={safe.href} data-public-button style={PUBLIC_PROFILE_BUTTON_STYLE} onClick={() => { if (["phone", "email"].includes(componentType)) onContactInteraction?.(item.id); }} target={safe.href.startsWith("tel:") || safe.href.startsWith("mailto:") ? undefined : "_blank"} rel={safe.href.startsWith("tel:") || safe.href.startsWith("mailto:") ? undefined : "noopener noreferrer"} className={common}>
      {body}
      {variant === "conversion" ? <ArrowRight className="size-4 shrink-0 opacity-80" /> : <ArrowUpRight className="size-4 shrink-0 opacity-70" />}
    </a>
  );
}

function buildComponentItems(props: SharePageRendererProps, classes: ShareThemeClassSet) {
  const linkClassName = buildLinkClassSet(classes, props.linkStyle || "solid", props.linkClassName);
  const moduleTypes = new Set(["cover-image", "popup-image", "carousel", "bilibili-video", "youtube-video", "video-link", "netease-music", "music-link", "divider", "copy-text", "ai-chat", "product-card", "service-card", "offer", "booking", "quote", "contact-form"]);
  return props.links.map((item) => {
    const componentType = normalizeComponentType(item);
    const payload = safeParseJson<Record<string, unknown>>(item.payload);
    const node = moduleTypes.has(componentType)
      ? renderNewModule(item, componentType, payload, props.username, props.profileId, props.onAiAvailabilityChange, props.onOpenContact, props.onOpenContactEntry)
      : renderLegacyItem(item, componentType, payload, classes, props.template || "business", linkClassName, props.onContactInteraction);
    return { id: item.id, node };
  });
}

export function SharePageRenderer(props: SharePageRendererProps) {
  const baseClasses = getThemeClasses(props.themeName);
  const custom = parseCustomTheme(props.themeName, props.customTheme);
  const classes: ShareThemeClassSet = {
    ...baseClasses,
    surfaceClassName: props.surfaceClassName || baseClasses.surfaceClassName,
    cardClassName: props.cardClassName || baseClasses.cardClassName,
  };
  const renderMode = props.renderMode || "public";
  const identity: PublicProfileIdentity = {
    profileId: props.profileId,
    username: props.username,
    displayName: props.displayName,
    bio: props.bio,
    avatarUrl: props.avatarUrl,
    company: props.company,
    jobTitle: props.jobTitle,
    phone: props.phone,
    email: props.email,
    wechat: props.wechat,
    city: props.city,
    address: props.address,
    website: props.website,
    contactVisibility: props.contactVisibility,
  };
  const cardOpacity = Math.max(0, Math.min(100, custom?.cardOpacity ?? 100)) / 100;
  const textColor = custom?.textColor || "#2B241E";
  const cardStyle = custom?.cardStyle || "solid";
  const buttonStyle = custom?.buttonStyle || "solid";
  const cardBackground = cardStyle === "outline"
    ? "transparent"
    : "rgb(255 253 248 / var(--profile-card-opacity, 1))";
  const buttonTokens = buttonStyle === "outline"
    ? { background: "transparent", border: textColor, color: textColor }
    : buttonStyle === "soft"
      ? { background: "rgb(49 84 61 / 0.12)", border: "transparent", color: textColor }
      : { background: "#31543D", border: "#31543D", color: "#FFFFFF" };
  const sharedStyle = {
    "--profile-card-opacity": String(cardOpacity),
    "--profile-card-background": cardBackground,
    "--profile-card-border-color": cardStyle === "outline" ? textColor : "#E8DCCB",
    "--profile-card-shadow": cardStyle === "solid" ? "0 1px 2px rgb(86 68 46 / 0.08)" : cardStyle === "glass" ? "0 8px 24px rgb(86 68 46 / 0.10)" : "none",
    "--profile-card-backdrop": cardStyle === "glass" ? "blur(14px)" : "none",
    "--profile-button-radius": `${custom?.buttonRadius ?? 16}px`,
    "--profile-button-background": buttonTokens.background,
    "--profile-button-border-color": buttonTokens.border,
    "--profile-button-color": buttonTokens.color,
    "--profile-text-color": textColor,
    color: "var(--profile-text-color)",
  } as CSSProperties;
  const items = buildComponentItems(props, classes);

  return (
    <div className="min-h-full w-full bg-[#F4EEE5]" style={sharedStyle} data-profile-template={props.template || "business"} data-profile-card-style={cardStyle} data-profile-button-style={buttonStyle}>
      <div className="mx-auto w-full max-w-xl overflow-hidden bg-[#FFFDF8]">
        <PublicProfileHero identity={identity} customTheme={custom} renderMode={renderMode} onQrCodeClick={props.onQrCodeClick} onShareClick={props.onShareClick} />
        <div className="px-5 pb-6 text-sm">
          <PublicModuleList renderMode={renderMode} gap={custom?.moduleGap ?? 8} items={items} />
        </div>
        <PublicContactActions identity={identity} />
        {props.showBrandFoot ? <div className="flex justify-center px-5 pb-4"><BrandFoot classes={classes} /></div> : null}
        {props.reportUrl ? <Link href={props.reportUrl} className="block pb-5 text-center text-xs font-bold text-[#7A6D5E] opacity-70 hover:opacity-100">举报此主页</Link> : null}
      </div>
      {props.stickyAction}
    </div>
  );
}

export function getSurfaceClassForTheme(themeName: string | null | undefined, override?: string): string {
  return override || getThemeClasses(themeName).surfaceClassName;
}
