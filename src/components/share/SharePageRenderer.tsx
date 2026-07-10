"use client";

import type { CSSProperties, ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  Copy,
  Download,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  QrCode,
  Share2,
  ShoppingBag,
  UserCircle,
} from "lucide-react";
import { getThemeClasses, type ShareThemeClassSet } from "@/components/theme/presetThemes";
import type { CustomTheme } from "@/components/theme/types";
import { normalizeCustomTheme } from "@/components/theme/normalize";
import { sanitizeMapUrl, sanitizePhoneNumber, sanitizePublicUrl } from "@/lib/public-url-security";
import dynamic from "next/dynamic";
import { ModuleFallback } from "@/components/share/modules/ModuleFallback";

const CoverImageModule = dynamic(() => import("@/components/share/modules/CoverImageModule").then((m) => ({ default: m.CoverImageModule })));
const PopupImageModule = dynamic(() => import("@/components/share/modules/PopupImageModule").then((m) => ({ default: m.PopupImageModule })));
const CarouselModule = dynamic(() => import("@/components/share/modules/CarouselModule").then((m) => ({ default: m.CarouselModule })));
const BilibiliVideoModule = dynamic(() => import("@/components/share/modules/BilibiliVideoModule").then((m) => ({ default: m.BilibiliVideoModule })));
const YoutubeVideoModule = dynamic(() => import("@/components/share/modules/YoutubeVideoModule").then((m) => ({ default: m.YoutubeVideoModule })));
const VideoLinkModule = dynamic(() => import("@/components/share/modules/VideoLinkModule").then((m) => ({ default: m.VideoLinkModule })));
const NeteaseMusicModule = dynamic(() => import("@/components/share/modules/NeteaseMusicModule").then((m) => ({ default: m.NeteaseMusicModule })));
const MusicLinkModule = dynamic(() => import("@/components/share/modules/MusicLinkModule").then((m) => ({ default: m.MusicLinkModule })));
const DividerModule = dynamic(() => import("@/components/share/modules/DividerModule").then((m) => ({ default: m.DividerModule })));
const CopyTextModule = dynamic(() => import("@/components/share/modules/CopyTextModule").then((m) => ({ default: m.CopyTextModule })));
const AiChatModule = dynamic(() => import("@/components/share/modules/AiChatModule").then((m) => ({ default: m.AiChatModule })));
const BookingModule = dynamic(() => import("@/components/share/modules/BookingModule").then((m) => ({ default: m.default })));
const ProductCardModule = dynamic(() => import("@/components/share/modules/ProductCardModule").then((m) => ({ default: m.default })));
const ServiceCardModule = dynamic(() => import("@/components/share/modules/ServiceCardModule").then((m) => ({ default: m.default })));
const OfferModule = dynamic(() => import("@/components/share/modules/OfferModule").then((m) => ({ default: m.default })));
import {
  isModuleType,
  validateModulePayload,
  type AiChatPayload,
  type BilibiliVideoPayload,
  type BookingPayload,
  type CarouselPayload,
  type CopyTextPayload,
  type CoverImagePayload,
  type DividerPayload,
  type MusicLinkPayload,
  type NeteaseMusicPayload,
  type OfferPayload,
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
  type?: string | null;
  componentType?: string | null;
  payload?: string | null;
};

export interface SharePageRendererProps {
  template?: SharePageTemplate;
  username: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  links: SharePageLink[];
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
  company?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
  city?: string | null;
  address?: string | null;
  website?: string | null;
  contactVisibility?: string;
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

function buildSurfaceStyle(custom: CustomTheme | null): CSSProperties {
  if (!custom) return {};
  if (custom.backgroundType === "solid") return { backgroundColor: custom.backgroundValue, color: custom.textColor };
  if (custom.backgroundType === "gradient") return { background: custom.backgroundValue, color: custom.textColor };
  if (custom.backgroundType === "image") {
    return {
      backgroundImage: `url(${custom.backgroundValue})`,
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundSize: "cover",
      color: custom.textColor,
    };
  }
  return { color: custom.textColor };
}

function buildLinkClassSet(base: ShareThemeClassSet, linkStyle: ShareLinkStyle, override?: string): string {
  if (override) return override;
  if (linkStyle === "outline") return "bg-transparent border border-current/30 text-current hover:bg-current/5";
  if (linkStyle === "soft") return "bg-[var(--ui-surface)]/70 border border-white/40 text-current shadow-sm hover:bg-[var(--ui-surface)]";
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
  if (["wechat", "text", "group-title"].includes(componentType)) {
    return { href: null, displayFallback: null as string | null };
  }
  const cleaned = sanitizePublicUrl(itemUrl || "");
  return cleaned.safe && cleaned.url
    ? { href: cleaned.url, displayFallback: null as string | null }
    : { href: null, displayFallback: "链接被系统判定为不安全" };
}

function SafeAvatar({ src, alt, fallbackInitial, className, avatarClassName }: {
  src?: string | null;
  alt: string;
  fallbackInitial: string;
  className: string;
  avatarClassName: string;
}) {
  const [imgError, setImgError] = useState(false);
  if (!src || imgError) {
    return <div className={`grid shrink-0 place-items-center ${className} ${avatarClassName}`}>{fallbackInitial.slice(0, 1).toUpperCase()}</div>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} onError={() => setImgError(true)} loading="lazy" decoding="async" />
  );
}

function renderLinkIcon(iconValue: string | null | undefined, defaultClass: string): ReactNode {
  const value = (iconValue || "").trim();
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
      className={`mt-5 inline-flex min-h-10 items-center gap-2 self-center rounded-full border border-black/10 bg-[var(--ui-surface)]/70 px-4 py-1.5 text-sm font-bold shadow-sm transition hover:opacity-80 ${classes.footerClassName}`}
    >
      由 Link168 提供
    </a>
  );
}

function HeaderActions({ onQrCodeClick, onShareClick }: { onQrCodeClick?: () => void; onShareClick?: () => void }) {
  if (!onQrCodeClick && !onShareClick) return null;
  return (
    <div className="flex items-center gap-2">
      {onQrCodeClick ? (
        <button type="button" onClick={onQrCodeClick} className="grid size-10 place-items-center rounded-xl border border-black/10 bg-[var(--ui-surface)]/70 shadow-sm transition hover:bg-[var(--ui-surface)]" aria-label="二维码">
          <QrCode aria-hidden className="size-5 text-[var(--ui-ink)]" />
        </button>
      ) : null}
      {onShareClick ? (
        <button type="button" onClick={onShareClick} className="grid size-10 place-items-center rounded-xl border border-black/10 bg-[var(--ui-surface)]/70 shadow-sm transition hover:bg-[var(--ui-surface)]" aria-label="分享">
          <Share2 aria-hidden className="size-5 text-[var(--ui-ink)]" />
        </button>
      ) : null}
    </div>
  );
}

function ContactInfoSection({ phone, email, wechat, address, website, username, classes }: {
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
  address?: string | null;
  website?: string | null;
  username: string;
  classes: ShareThemeClassSet;
}) {
  if (!phone && !email && !wechat && !address && !website) return null;
  const itemClass = "flex min-h-[44px] items-center gap-3 rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface)] px-3 py-2.5 shadow-sm";
  const iconClass = "grid size-9 shrink-0 place-items-center rounded-xl";
  return (
    <div className="w-full space-y-2">
      {phone ? <a href={`tel:${phone}`} className={itemClass}><span className={`${iconClass} bg-[var(--ui-warning-soft)]`}><Phone className="size-4 text-[var(--ui-warning)]" /></span><span className={`truncate text-sm font-black ${classes.nameClassName}`}>{phone}</span></a> : null}
      {email ? <a href={`mailto:${email}`} className={itemClass}><span className={`${iconClass} bg-[var(--ui-success-soft)]`}><Mail className="size-4 text-[var(--ui-brand)]" /></span><span className={`truncate text-sm font-black ${classes.nameClassName}`}>{email}</span></a> : null}
      {wechat ? (
        <button type="button" onClick={() => navigator.clipboard?.writeText(wechat).catch(() => undefined)} className={`${itemClass} w-full text-left`}>
          <span className={`${iconClass} bg-[var(--ui-success-soft)]`}><MessageCircle className="size-4 text-[var(--ui-brand)]" /></span>
          <span className="min-w-0 flex-1"><span className={`block truncate text-sm font-black ${classes.nameClassName}`}>微信：{wechat}</span><span className={`block text-xs ${classes.subClassName}`}>点击复制微信号</span></span>
          <Copy className="size-4 shrink-0 opacity-40" />
        </button>
      ) : null}
      {address ? <div className={itemClass}><span className={`${iconClass} bg-[var(--ui-warning-soft)]`}><MapPin className="size-4 text-[var(--ui-warning)]" /></span><span className={`truncate text-sm font-black ${classes.nameClassName}`}>{address}</span></div> : null}
      {website ? <a href={website.startsWith("http") ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" className={itemClass}><span className={`${iconClass} bg-[var(--ui-warning-soft)]`}><Globe className="size-4 text-[var(--ui-warning)]" /></span><span className={`truncate text-sm font-black ${classes.nameClassName}`}>官网</span><ArrowUpRight className="ml-auto size-4 shrink-0 opacity-70" /></a> : null}
      <a href={`/api/public/${username}/vcard`} download className="flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-[var(--ui-success)] bg-[var(--ui-success-soft)] px-3 py-2.5 text-sm font-black text-[var(--ui-brand)] shadow-sm transition hover:bg-[var(--ui-success-soft)]">
        <Download className="size-4" />
        保存到通讯录
      </a>
    </div>
  );
}

function renderHeader(props: SharePageRendererProps, classes: ShareThemeClassSet, compact = false) {
  const name = props.displayName || "Link168 名片";
  const initial = name.slice(0, 1).toUpperCase();
  const companyLine = props.company || props.jobTitle ? [props.jobTitle, props.company].filter(Boolean).join(" · ") : null;
  const bioText = props.bio || props.bioFallback || "这个主页还没有简介。";
  const avatarSize = compact ? "size-14 rounded-2xl" : "size-16 rounded-full sm:size-20";
  return (
    <section className={`relative w-full overflow-hidden rounded-2xl p-4 shadow-sm ${classes.cardClassName}`}>
      <div className="absolute right-3 top-3 z-10"><HeaderActions onQrCodeClick={props.onQrCodeClick} onShareClick={props.onShareClick} /></div>
      <div className={compact ? "flex items-start gap-3 pr-20" : "flex flex-col items-center text-center"}>
        <SafeAvatar src={props.avatarUrl} alt={`${name} 的头像`} fallbackInitial={initial} className={`${avatarSize} shrink-0 ring-2 ring-white/60`} avatarClassName={`text-xl font-black ${classes.avatarClassName}`} />
        <div className="min-w-0">
          <h2 className={`mt-3 truncate text-lg font-black ${classes.nameClassName}`}>{name}</h2>
          {companyLine ? <p className={`mt-0.5 flex items-center justify-center gap-1 text-xs font-bold ${classes.subClassName}`}><UserCircle className="size-3.5" />{companyLine}</p> : null}
          <p className={`mt-0.5 text-xs font-bold ${classes.subClassName}`}>@{props.username || "yourname"}</p>
          <p className={`mt-2 line-clamp-3 text-xs leading-5 ${classes.subClassName} sm:text-sm sm:leading-6`}>{bioText}</p>
        </div>
      </div>
    </section>
  );
}

function renderNewModule(item: SharePageLink, componentType: string, payload: Record<string, unknown> | null, username: string): ReactNode {
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
    case "ai-chat": {
      const aiPayload = payload as AiChatPayload;
      return <div key={item.id}><AiChatModule assistantName={aiPayload.assistantName || "AI 接待"} welcomeText={aiPayload.greeting || "你好，有什么可以帮你？"} username={username} mode="customer-service" /></div>;
    }
    case "product-card": return <div key={item.id}><ProductCardModule payload={payload as ProductCardPayload} username={username} /></div>;
    case "service-card": return <div key={item.id}><ServiceCardModule payload={payload as ServiceCardPayload} username={username} /></div>;
    case "offer": return <div key={item.id}><OfferModule payload={payload as OfferPayload} username={username} /></div>;
    case "booking": return <div key={item.id}><BookingModule payload={payload as BookingPayload} username={username} /></div>;
    default: return <div key={item.id}><ModuleFallback message="未知模块类型" /></div>;
  }
}

function renderLegacyItem(item: SharePageLink, componentType: string, payload: Record<string, unknown> | null, classes: ShareThemeClassSet, variant: SharePageTemplate, linkClassName: string) {
  const safe = sanitizeHref(componentType, item.url, payload);
  const title = item.title || "链接";
  const description = item.description;
  const common = `flex min-h-[56px] items-center justify-between gap-3 rounded-2xl px-3 py-3 shadow-sm ${linkClassName}`;
  const body = (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      {componentType === "phone" ? <span className="grid size-9 place-items-center rounded-xl bg-[var(--ui-warning-soft)]"><Phone className="size-4 text-[var(--ui-warning)]" /></span> : null}
      {componentType === "map" ? <span className="grid size-9 place-items-center rounded-xl bg-[var(--ui-warning-soft)]"><MapPin className="size-4 text-[var(--ui-warning)]" /></span> : null}
      {componentType === "shop" || componentType === "booking" ? <span className="grid size-9 place-items-center rounded-xl bg-[var(--ui-success-soft)]">{componentType === "booking" ? <CalendarClock className="size-4 text-[var(--ui-brand)]" /> : <ShoppingBag className="size-4 text-[var(--ui-warning)]" />}</span> : null}
      {!["phone", "map", "shop", "booking"].includes(componentType) ? renderLinkIcon(item.icon, classes.avatarClassName) : null}
      <span className="min-w-0 text-left">
        <span className="block truncate font-black">{title}</span>
        {description || !safe.href ? <span className={`mt-0.5 block line-clamp-2 text-xs leading-5 ${safe.href ? classes.subClassName : "text-red-600"}`}>{safe.href ? description : safe.displayFallback}</span> : null}
      </span>
    </span>
  );

  if (!safe.href || componentType === "text" || componentType === "group-title" || componentType === "wechat") {
    if (componentType === "group-title") {
      return <div key={item.id} className="flex items-center gap-3 px-1 py-2"><span className="h-px flex-1 bg-[var(--ui-line)]" /><span className={`text-xs font-black uppercase ${classes.subClassName}`}>{title}</span><span className="h-px flex-1 bg-[var(--ui-line)]" /></div>;
    }
    if (componentType === "text") {
      return <div key={item.id} className={`rounded-2xl border border-[var(--ui-line)] bg-[var(--ui-surface)] px-4 py-3 ${classes.subClassName}`}><div className="font-black text-[var(--ui-ink)]">{title}</div>{description ? <div className="mt-1 text-sm leading-6">{description}</div> : null}</div>;
    }
    if (componentType === "wechat") {
      const wechatId = typeof payload?.wechat === "string" ? payload.wechat : item.url || description || "";
      return <div key={item.id} className={common}>{body}<span className="rounded-full bg-[var(--ui-brand)]/10 px-2 py-1 text-xs font-black text-[var(--ui-brand)]">{wechatId || "微信"}</span></div>;
    }
    return <div key={item.id} className={common}>{body}</div>;
  }

  return (
    <a key={item.id} href={safe.href} target={safe.href.startsWith("tel:") ? undefined : "_blank"} rel={safe.href.startsWith("tel:") ? undefined : "noopener noreferrer"} className={common}>
      {body}
      {variant === "conversion" ? <ArrowRight className="size-4 shrink-0 opacity-80" /> : <ArrowUpRight className="size-4 shrink-0 opacity-70" />}
    </a>
  );
}

type ParsedLink = {
  item: SharePageLink;
  componentType: string;
  payload: Record<string, unknown> | null;
  isModule: boolean;
};

function parseLinks(links: SharePageLink[]): ParsedLink[] {
  const moduleTypes = new Set(["cover-image", "popup-image", "carousel", "bilibili-video", "youtube-video", "video-link", "netease-music", "music-link", "divider", "copy-text", "ai-chat", "product-card", "service-card", "offer", "booking"]);
  return links.map((item) => {
    const componentType = normalizeComponentType(item);
    const payload = safeParseJson<Record<string, unknown>>(item.payload);
    return { item, componentType, payload, isModule: moduleTypes.has(componentType) };
  });
}

function renderComponentList(
  props: SharePageRendererProps,
  classes: ShareThemeClassSet,
  custom: CustomTheme | null,
  parsedLinks: ParsedLink[],
) {
  if (parsedLinks.length === 0) {
    return (
      <div className={`rounded-2xl border border-dashed border-[var(--ui-line)] bg-[var(--ui-surface)]/70 px-5 py-10 text-center ${classes.subClassName}`}>
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--ui-success-soft)]"><Globe className="size-7 text-[var(--ui-success)]" /></div>
        <p className="mt-4 text-base font-black text-[var(--ui-ink)]">{props.emptyText || "暂无公开内容"}</p>
        <p className="mt-2 text-sm leading-6 text-[var(--ui-muted)]">你仍然可以通过页面上的联系方式与主页所有者沟通。</p>
      </div>
    );
  }

  const linkClassName = buildLinkClassSet(classes, props.linkStyle || "solid", props.linkClassName);
  return (
    <div className="space-y-2" style={custom?.moduleGap ? { gap: `${custom.moduleGap}px` } : undefined}>
      {parsedLinks.map(({ item, componentType, payload, isModule }) => {
        if (isModule) return renderNewModule(item, componentType, payload, props.username);
        return renderLegacyItem(item, componentType, payload, classes, props.template || "business", linkClassName);
      })}
    </div>
  );
}

export function SharePageRenderer(props: SharePageRendererProps) {
  const baseClasses = getThemeClasses(props.themeName);
  const custom = parseCustomTheme(props.themeName, props.customTheme);
  const classes: ShareThemeClassSet = {
    ...baseClasses,
    surfaceClassName: props.surfaceClassName || baseClasses.surfaceClassName,
    cardClassName: props.cardClassName || baseClasses.cardClassName,
  };
  const showContact = props.contactVisibility !== "private" && props.contactVisibility !== "contacts_only";
  const compact = props.template === "conversion";
  const parsedLinks = useMemo(() => parseLinks(props.links), [props.links]);

  return (
    <div className={`min-h-full w-full ${classes.surfaceClassName}`} style={buildSurfaceStyle(custom)}>
      <div className="mx-auto flex w-full max-w-xl flex-col items-center px-3 py-4 sm:px-4">
        {renderHeader(props, classes, compact)}
        {showContact ? (
          <div className="mt-4 w-full">
            <ContactInfoSection phone={props.phone} email={props.email} wechat={props.wechat} address={props.address} website={props.website} username={props.username} classes={classes} />
          </div>
        ) : null}
        <div className="mt-4 w-full text-sm">{renderComponentList(props, classes, custom, parsedLinks)}</div>
        {!showContact ? (
          <a href={`/api/public/${props.username}/vcard`} download className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-[var(--ui-success)] bg-[var(--ui-success-soft)] px-3 py-2.5 text-sm font-black text-[var(--ui-brand)] shadow-sm transition hover:bg-[var(--ui-success-soft)]">
            <Download className="size-4" />
            保存到通讯录
          </a>
        ) : null}
        {props.showBrandFoot ? <BrandFoot classes={classes} /> : null}
        {props.reportUrl ? <Link href={props.reportUrl} className={`mt-2 block text-center text-xs font-bold opacity-60 hover:opacity-90 ${classes.footerClassName}`}>举报此主页</Link> : null}
      </div>
    </div>
  );
}

export function getSurfaceClassForTheme(themeName: string | null | undefined, override?: string): string {
  return override || getThemeClasses(themeName).surfaceClassName;
}
