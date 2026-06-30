"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Globe, ArrowRight, QrCode, MessageCircle, Phone, MapPin, ShoppingBag, CalendarClock, Share2 } from "lucide-react";
import {
  getThemeClasses,
  type ShareThemeClassSet,
} from "@/components/theme/presetThemes";
import {
  sanitizePublicUrl,
  sanitizePhoneNumber,
  sanitizeMapUrl,
} from "@/lib/public-url-security";

// V2-002: 输出侧 URL 协议白名单。
// 即使数据库里已有污染数据，Renderer 仍然再次校验。
// 禁止 javascript:  / data: / vbscript: / file:。
function sanitizeHref(
  componentType: string,
  itemUrl: string | null | undefined,
  payload: Record<string, unknown> | null,
): { href: string | null; displayFallback: string | null } {
  switch (componentType) {
    case "phone": {
      const phoneRaw = payload?.phone || itemUrl || "";
      const cleaned = sanitizePhoneNumber(typeof phoneRaw === "string" ? phoneRaw.replace(/^tel:/i, "") : "");
      if (cleaned.safe && cleaned.phone) return { href: `tel:${cleaned.phone}`, displayFallback: null };
      return { href: null, displayFallback: "电话号码格式不正确" };
    }
    case "map": {
      const raw = (typeof payload?.map === "string" ? payload.map : itemUrl) || "";
      const cleaned = sanitizeMapUrl(raw);
      if (cleaned.safe && cleaned.url) return { href: cleaned.url, displayFallback: null };
      return { href: null, displayFallback: "地图链接被系统判定为不安全" };
    }
    case "qr": {
      const raw = itemUrl || "";
      const cleaned = sanitizePublicUrl(raw);
      if (cleaned.safe && cleaned.url) return { href: cleaned.url, displayFallback: null };
      return { href: null, displayFallback: "二维码链接被系统判定为不安全" };
    }
    case "wechat":
    case "text":
    case "group-title": {
      return { href: null, displayFallback: null };
    }
    case "link":
    case "shop":
    case "booking":
    default: {
      const raw = itemUrl || "";
      const cleaned = sanitizePublicUrl(raw);
      if (cleaned.safe && cleaned.url) return { href: cleaned.url, displayFallback: null };
      return { href: null, displayFallback: "链接被系统判定为不安全" };
    }
  }
}

export type SharePageTemplate = "business" | "creator" | "conversion";

export type ShareLinkStyle = "solid" | "outline" | "soft";

// V2-005: 支持多类型组件
export type SharePageLink = {
  id: string;
  title: string;
  description?: string | null;
  url?: string | null;
  icon?: string | null;
  type?: string | null;
  // 组件类型（link / text / group-title / qr / wechat / phone / shop / booking / map）
  componentType?: string | null;
  // 组件扩展数据 JSON 字符串
  payload?: string | null;
};

function safeParseJson<T = unknown>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

// 带头像加载错误处理的组件
function SafeAvatar({
  src,
  alt,
  fallbackInitial,
  className,
  avatarClassName,
}: {
  src: string | null | undefined;
  alt: string;
  fallbackInitial: string;
  className: string;
  avatarClassName: string;
}) {
  const [imgError, setImgError] = useState(false);

  if (!src || imgError) {
    return (
      <div className={`grid shrink-0 place-items-center ${className} ${avatarClassName}`}>
        {fallbackInitial.slice(0, 1).toUpperCase()}
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setImgError(true)}
    />
  );
}

function normalizeComponentType(link: SharePageLink): string {
  if (link.componentType) return link.componentType;
  const rawType = (link.type || "").toLowerCase();
  if (["link", "text", "group-title", "qr", "wechat", "phone", "shop", "booking", "map"].includes(rawType)) {
    return rawType;
  }
  return "link";
}

export interface SharePageRendererProps {
  template?: SharePageTemplate;
  username: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  links: SharePageLink[];
  themeName?: string | null;
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
}

function renderLinkIcon(
  iconValue: string | null | undefined,
  defaultClass: string,
): ReactNode {
  const value = (iconValue || "").trim();
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return (
      <span
        className={`grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-black/5 ${defaultClass}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={value} alt="" className="size-full object-cover" />
      </span>
    );
  }
  if (value && /^[\p{L}\p{N}\p{Emoji}]$/u.test(value)) {
    return (
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-xl text-2xl ${defaultClass}`}
      >
        {value}
      </span>
    );
  }
  return (
    <span
      className={`grid size-10 shrink-0 place-items-center rounded-xl ${defaultClass}`}
    >
      <Globe aria-hidden className="size-5" />
    </span>
  );
}

function buildLinkClassSet(
  base: ShareThemeClassSet,
  linkStyle: ShareLinkStyle,
  overrideLinkClassName?: string,
): string {
  if (overrideLinkClassName) return overrideLinkClassName;
  switch (linkStyle) {
    case "outline":
      return "bg-transparent border border-current/30 text-current hover:bg-current/5";
    case "soft":
      return "bg-white/70 border border-white/40 text-current shadow-sm hover:bg-white";
    case "solid":
    default:
      return base.linkClassName;
  }
}

function BrandFoot({ classes }: { classes: ShareThemeClassSet }) {
  return (
    <a
      href={process.env.NEXT_PUBLIC_APP_URL || "https://link168.me"}
      aria-label="由 Link168 提供"
      className={`link168-card-hover mt-5 inline-flex min-h-[40px] items-center gap-2 self-center rounded-full border border-black/10 bg-white/70 px-4 py-1.5 text-sm font-bold shadow-sm transition hover:opacity-80 active:scale-[0.98] ${classes.footerClassName}`}
    >
      由 Link168 提供
    </a>
  );
}

function HeaderActions({
  onQrCodeClick,
  onShareClick,
}: {
  onQrCodeClick?: () => void;
  onShareClick?: () => void;
}) {
  if (!onQrCodeClick && !onShareClick) return null;

  return (
    <div className="flex items-center gap-2">
      {onQrCodeClick ? (
        <button
          onClick={onQrCodeClick}
          className="grid size-10 place-items-center rounded-xl bg-white/70 border border-black/10 shadow-sm hover:bg-white transition-colors active:scale-[0.95]"
          aria-label="二维码"
        >
          <QrCode aria-hidden className="size-5 text-[#2B241E]" />
        </button>
      ) : null}
      {onShareClick ? (
        <button
          onClick={onShareClick}
          className="grid size-10 place-items-center rounded-xl bg-white/70 border border-black/10 shadow-sm hover:bg-white transition-colors active:scale-[0.95]"
          aria-label="分享"
        >
          <Share2 aria-hidden className="size-5 text-[#2B241E]" />
        </button>
      ) : null}
    </div>
  );
}

function renderBusinessLayout(
  props: SharePageRendererProps,
  classes: ShareThemeClassSet,
) {
  const {
    username,
    displayName,
    bio,
    avatarUrl,
    links,
    linkStyle = "solid",
    linkClassName,
    bioFallback = "这个主页还没有简介。",
    showBrandFoot = true,
    reportUrl,
    onQrCodeClick,
    onShareClick,
  } = props;

  const name = displayName || "Link168 名片";
  const initial = name.slice(0, 1).toUpperCase();
  const bioText = bio || bioFallback;

  const hasActions = !!onQrCodeClick || !!onShareClick;

  return (
    <div className="flex flex-col items-center">
      <section
        className={`relative w-full overflow-hidden rounded-2xl p-5 shadow-sm ${classes.cardClassName}`}
      >
        {hasActions ? (
          <div className="absolute right-4 top-4 z-10">
            <HeaderActions
              onQrCodeClick={onQrCodeClick}
              onShareClick={onShareClick}
            />
          </div>
        ) : null}
        <div className="pointer-events-none absolute -right-6 -top-8 size-24 rounded-full bg-[#F2E7D8]/70 blur-2xl" />
        <div className="flex flex-col items-center text-center">
          <SafeAvatar
            src={avatarUrl}
            alt={`${name} 的头像`}
            fallbackInitial={initial}
            className="size-20 shrink-0 rounded-full ring-2 ring-white/60"
            avatarClassName={`text-2xl font-black ring-2 ring-white/60 ${classes.avatarClassName}`}
          />
          <h2 className={`mt-3 truncate text-xl font-black ${classes.nameClassName}`}>
            {name}
          </h2>
          <p className={`mt-0.5 text-xs font-bold ${classes.subClassName}`}>
            @{username || "yourname"}
          </p>
          <p className={`mt-2 text-sm leading-6 line-clamp-3 ${classes.subClassName}`}>
            {bioText}
          </p>
        </div>
      </section>

      <div className="mt-4 w-full space-y-2.5 text-sm">
        {renderComponentList(links, classes, "business", linkStyle, linkClassName)}
      </div>

      {showBrandFoot ? <BrandFoot classes={classes} /> : null}
      {reportUrl ? (
        <Link
          href={reportUrl}
          className={`mt-2 block text-center text-[11px] font-bold opacity-50 hover:opacity-80 transition-opacity ${classes.footerClassName}`}
        >
          举报此主页
        </Link>
      ) : null}
    </div>
  );
}

function renderCreatorLayout(
  props: SharePageRendererProps,
  classes: ShareThemeClassSet,
) {
  const {
    username,
    displayName,
    bio,
    avatarUrl,
    links,
    linkStyle = "soft",
    linkClassName,
    bioFallback = "一个人，一个链接，连接全网。",
    showBrandFoot = true,
    reportUrl,
    onQrCodeClick,
    onShareClick,
  } = props;

  const name = displayName || "Link168 名片";
  const initial = name.slice(0, 1).toUpperCase();
  const bioText = bio || bioFallback;

  const hasActions = !!onQrCodeClick || !!onShareClick;

  return (
    <div className="flex flex-col items-center">
      {hasActions ? (
        <div className="w-full flex justify-end mb-2">
          <HeaderActions
            onQrCodeClick={onQrCodeClick}
            onShareClick={onShareClick}
          />
        </div>
      ) : null}
      <div className="flex flex-col items-center text-center pt-2">
        <SafeAvatar
          src={avatarUrl}
          alt={`${name} 的头像`}
          fallbackInitial={initial}
          className="size-24 shrink-0 rounded-full ring-4 ring-white/70 shadow-lg"
          avatarClassName={`text-3xl font-black ring-4 ring-white/70 shadow-lg ${classes.avatarClassName}`}
        />
        <h2 className={`mt-4 truncate text-2xl font-black ${classes.nameClassName}`}>
          {name}
        </h2>
        <p className={`mt-1 text-xs font-bold ${classes.subClassName}`}>
          @{username || "yourname"}
        </p>
        <p className={`mt-3 max-w-md text-sm leading-6 line-clamp-3 ${classes.subClassName}`}>
          {bioText}
        </p>
      </div>

      <div className="mt-5 w-full space-y-3 text-sm">
        {renderComponentList(links, classes, "creator", linkStyle, linkClassName)}
      </div>

      {showBrandFoot ? <BrandFoot classes={classes} /> : null}
      {reportUrl ? (
        <Link
          href={reportUrl}
          className={`mt-2 block text-center text-[11px] font-bold opacity-50 hover:opacity-80 transition-opacity ${classes.footerClassName}`}
        >
          举报此主页
        </Link>
      ) : null}
    </div>
  );
}

function renderConversionLayout(
  props: SharePageRendererProps,
  classes: ShareThemeClassSet,
) {
  const {
    username,
    displayName,
    bio,
    avatarUrl,
    links,
    linkStyle = "outline",
    linkClassName,
    bioFallback = "点击下方链接，直达目标页面。",
    showBrandFoot = true,
    reportUrl,
    onQrCodeClick,
    onShareClick,
  } = props;

  const name = displayName || "Link168 名片";
  const initial = name.slice(0, 1).toUpperCase();
  const bioText = bio || bioFallback;

  const hasActions = !!onQrCodeClick || !!onShareClick;

  return (
    <div className="flex w-full flex-col">
      <section className={`relative rounded-2xl p-4 shadow-sm ${classes.cardClassName}`}>
        {hasActions ? (
          <div className="absolute right-3 top-3 z-10">
            <HeaderActions
              onQrCodeClick={onQrCodeClick}
              onShareClick={onShareClick}
            />
          </div>
        ) : null}
        <div className="flex w-full items-start gap-4">
          <SafeAvatar
            src={avatarUrl}
            alt={`${name} 的头像`}
            fallbackInitial={initial}
            className="size-16 shrink-0 rounded-2xl"
            avatarClassName={`text-2xl font-black ${classes.avatarClassName}`}
          />
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className={`truncate text-xl font-black ${classes.nameClassName}`}>
              {name}
            </h2>
            <p className={`mt-0.5 text-xs font-bold ${classes.subClassName}`}>
              @{username || "yourname"}
            </p>
            <p className={`mt-2 text-sm leading-5 line-clamp-3 ${classes.subClassName}`}>
              {bioText}
            </p>
          </div>
        </div>
      </section>

      <div className="mt-4 w-full space-y-3 text-sm">
        {renderComponentList(links, classes, "conversion", linkStyle, linkClassName)}
      </div>

      {showBrandFoot ? <BrandFoot classes={classes} /> : null}
      {reportUrl ? (
        <Link
          href={reportUrl}
          className={`mt-2 block text-center text-[11px] font-bold opacity-50 hover:opacity-80 transition-opacity ${classes.footerClassName}`}
        >
          举报此主页
        </Link>
      ) : null}
    </div>
  );
}

export function SharePageRenderer(props: SharePageRendererProps) {
  const {
    template = "business",
    themeName,
    surfaceClassName,
    cardClassName,
  } = props;

  const baseClasses = getThemeClasses(themeName);
  const classes: ShareThemeClassSet = {
    ...baseClasses,
    surfaceClassName: surfaceClassName || baseClasses.surfaceClassName,
    cardClassName: cardClassName || baseClasses.cardClassName,
  };

  switch (template) {
    case "creator":
      return renderCreatorLayout(props, classes);
    case "conversion":
      return renderConversionLayout(props, classes);
    case "business":
    default:
      return renderBusinessLayout(props, classes);
  }
}

function renderComponentItem(
  item: SharePageLink,
  classes: ShareThemeClassSet,
  variant: "business" | "creator" | "conversion",
  linkStyle: ShareLinkStyle,
  overrideLinkClassName?: string,
): ReactNode {
  const componentType = normalizeComponentType(item);
  const finalLinkClass = buildLinkClassSet(classes, linkStyle, overrideLinkClassName);
  const payload = safeParseJson<Record<string, unknown>>(item.payload);

  // V2-002: 协议白名单。污染 URL 不输出可点击 href，仅显示降级文本。
  const safe = sanitizeHref(componentType, item.url, payload);
  const href = safe.href;

  switch (componentType) {
    case "text": {
      return (
        <div
          key={item.id}
          className={`link168-card-hover min-h-14 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-4 py-3 shadow-sm ${classes.subClassName}`}
        >
          {item.title ? <div className="font-black text-[#2B241E]">{item.title}</div> : null}
          {item.description ? (
            <div className="mt-1 text-sm leading-6">{item.description}</div>
          ) : null}
        </div>
      );
    }
    case "group-title": {
      return (
        <div key={item.id} className="flex items-center gap-3 px-1 py-2">
          <span className="h-px flex-1 bg-[#E8DCCB]" />
          <span className={`text-xs font-black uppercase tracking-widest ${classes.subClassName}`}>
            {item.title || "分组"}
          </span>
          <span className="h-px flex-1 bg-[#E8DCCB]" />
        </div>
      );
    }
    case "qr": {
      // 不安全链接：降级为不可点击 div
      if (!href) {
        return (
          <div
            key={item.id}
            className={`link168-card-hover flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3.5 py-3 shadow-sm ${finalLinkClass}`}
          >
            <span className="flex min-w-0 flex-1 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#F3E7D1]">
                <QrCode aria-hidden className="size-5 text-[#8A6A2E]" />
              </span>
              <span className="min-w-0 text-left">
                <span className="block truncate font-black">{item.title || "扫码查看"}</span>
                <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-red-600">{safe.displayFallback || "二维码链接被系统判定为不安全"}</span>
              </span>
            </span>
          </div>
        );
      }
      return (
        <a
          key={item.id}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`link168-card-hover flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3.5 py-3 shadow-sm active:scale-[0.99] ${finalLinkClass}`}
        >
          <span className="flex min-w-0 flex-1 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#F3E7D1]">
              <QrCode aria-hidden className="size-5 text-[#8A6A2E]" />
            </span>
            <span className="min-w-0 text-left">
              <span className="block truncate font-black">{item.title || "扫码查看"}</span>
              {item.description ? <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-[#7A6D5E]">{item.description}</span> : null}
            </span>
          </span>
          <ArrowUpRight aria-hidden className="size-5 shrink-0 opacity-70" />
        </a>
      );
    }
    case "wechat": {
      const wechatId = payload?.wechat_id || payload?.wechat || item.url || "";
      return (
        <div
          key={item.id}
          className={`link168-card-hover flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3.5 py-3 shadow-sm ${finalLinkClass}`}
        >
          <span className="flex min-w-0 flex-1 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#DDE8CD]">
              <MessageCircle aria-hidden className="size-5 text-[#3F5F31]" />
            </span>
            <span className="min-w-0 text-left">
              <span className="block truncate font-black">{item.title || "微信联系"}</span>
              <span className={`mt-0.5 block truncate text-xs leading-5 ${classes.subClassName}`}>
                {wechatId ? `微信号：${wechatId}` : (item.description || "长按复制微信号")}
              </span>
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-[#3F5F31]/10 px-2 py-1 text-[11px] font-black text-[#3F5F31]">
            微信
          </span>
        </div>
      );
    }
    case "phone": {
      if (!href) {
        return (
          <div
            key={item.id}
            className={`link168-card-hover flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3.5 py-3 shadow-sm ${finalLinkClass}`}
          >
            <span className="flex min-w-0 flex-1 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#F3E7D1]">
                <Phone aria-hidden className="size-5 text-[#8A6A2E]" />
              </span>
              <span className="min-w-0 text-left">
                <span className="block truncate font-black">{item.title || "电话联系"}</span>
                <span className="mt-0.5 block truncate text-xs leading-5 text-red-600">{safe.displayFallback || "电话号码格式不正确"}</span>
              </span>
            </span>
          </div>
        );
      }
      return (
        <a
          key={item.id}
          href={href}
          className={`link168-card-hover flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3.5 py-3 shadow-sm active:scale-[0.99] ${finalLinkClass}`}
        >
          <span className="flex min-w-0 flex-1 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#F3E7D1]">
              <Phone aria-hidden className="size-5 text-[#8A6A2E]" />
            </span>
            <span className="min-w-0 text-left">
              <span className="block truncate font-black">{item.title || "电话联系"}</span>
              <span className={`mt-0.5 block truncate text-xs leading-5 ${classes.subClassName}`}>
                {typeof payload?.phone === "string" ? payload.phone : item.url || item.description || "点击拨打"}
              </span>
            </span>
          </span>
          <ArrowUpRight aria-hidden className="size-5 shrink-0 opacity-70" />
        </a>
      );
    }
    case "shop": {
      const price = payload?.price as string | undefined;
      if (!href) {
        return (
          <div
            key={item.id}
            className={`link168-card-hover flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3.5 py-3 shadow-sm ${finalLinkClass}`}
          >
            <span className="flex min-w-0 flex-1 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#F3E7D1]">
                <ShoppingBag aria-hidden className="size-5 text-[#8A6A2E]" />
              </span>
              <span className="min-w-0 text-left">
                <span className="block truncate font-black">{item.title || "商品 / 服务"}</span>
                <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-red-600">{safe.displayFallback || "链接被系统判定为不安全"}</span>
              </span>
            </span>
          </div>
        );
      }
      return (
        <a
          key={item.id}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`link168-card-hover flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3.5 py-3 shadow-sm active:scale-[0.99] ${finalLinkClass}`}
        >
          <span className="flex min-w-0 flex-1 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#F3E7D1]">
              <ShoppingBag aria-hidden className="size-5 text-[#8A6A2E]" />
            </span>
            <span className="min-w-0 text-left">
              <span className="block truncate font-black">{item.title || "商品 / 服务"}</span>
              <span className={`mt-0.5 block line-clamp-2 text-xs leading-5 ${classes.subClassName}`}>
                {item.description || "点击查看详情"}
              </span>
            </span>
          </span>
          {price ? (
            <span className="shrink-0 text-sm font-black text-[#B03A2E]">{price}</span>
          ) : (
            <ArrowUpRight aria-hidden className="size-5 shrink-0 opacity-70" />
          )}
        </a>
      );
    }
    case "booking": {
      const timeSlot = payload?.time as string | undefined;
      if (!href) {
        return (
          <div
            key={item.id}
            className={`link168-card-hover flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3.5 py-3 shadow-sm ${finalLinkClass}`}
          >
            <span className="flex min-w-0 flex-1 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#DDE8CD]">
                <CalendarClock aria-hidden className="size-5 text-[#3F5F31]" />
              </span>
              <span className="min-w-0 text-left">
                <span className="block truncate font-black">{item.title || "预约咨询"}</span>
                <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-red-600">{safe.displayFallback || "链接被系统判定为不安全"}</span>
              </span>
            </span>
          </div>
        );
      }
      return (
        <a
          key={item.id}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`link168-card-hover flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3.5 py-3 shadow-sm active:scale-[0.99] ${finalLinkClass}`}
        >
          <span className="flex min-w-0 flex-1 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#DDE8CD]">
              <CalendarClock aria-hidden className="size-5 text-[#3F5F31]" />
            </span>
            <span className="min-w-0 text-left">
              <span className="block truncate font-black">{item.title || "预约咨询"}</span>
              <span className={`mt-0.5 block line-clamp-2 text-xs leading-5 ${classes.subClassName}`}>
                {timeSlot ? `时间段：${timeSlot}` : (item.description || "点击预约 / 留下联系方式")}
              </span>
            </span>
          </span>
          <ArrowUpRight aria-hidden className="size-5 shrink-0 opacity-70" />
        </a>
      );
    }
    case "map": {
      const address = payload?.address as string | undefined;
      if (!href) {
        return (
          <div
            key={item.id}
            className={`link168-card-hover flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3.5 py-3 shadow-sm ${finalLinkClass}`}
          >
            <span className="flex min-w-0 flex-1 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#F3E7D1]">
                <MapPin aria-hidden className="size-5 text-[#8A6A2E]" />
              </span>
              <span className="min-w-0 text-left">
                <span className="block truncate font-black">{item.title || "地图位置"}</span>
                <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-red-600">{safe.displayFallback || "地图链接被系统判定为不安全"}</span>
              </span>
            </span>
          </div>
        );
      }
      return (
        <a
          key={item.id}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`link168-card-hover flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3.5 py-3 shadow-sm active:scale-[0.99] ${finalLinkClass}`}
        >
          <span className="flex min-w-0 flex-1 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#F3E7D1]">
              <MapPin aria-hidden className="size-5 text-[#8A6A2E]" />
            </span>
            <span className="min-w-0 text-left">
              <span className="block truncate font-black">{item.title || "地图位置"}</span>
              <span className={`mt-0.5 block line-clamp-2 text-xs leading-5 ${classes.subClassName}`}>
                {address || item.description || "点击查看地图"}
              </span>
            </span>
          </span>
          <ArrowUpRight aria-hidden className="size-5 shrink-0 opacity-70" />
        </a>
      );
    }
    case "link":
    default: {
      if (!safe.href) {
        return (
          <div
            key={item.id}
            className={`link168-card-hover flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8] px-3.5 py-3 shadow-sm ${finalLinkClass}`}
          >
            <span className="flex min-w-0 flex-1 items-center gap-3">
              <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${classes.avatarClassName}`}>
                {renderLinkIcon(item.icon, classes.nameClassName)}
              </span>
              <span className="min-w-0 text-left">
                <span className={`block truncate font-black ${classes.nameClassName}`}>{item.title}</span>
                <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-red-600">
                  {safe.displayFallback || "链接被系统判定为不安全"}
                </span>
              </span>
            </span>
          </div>
        );
      }
      // 保持原有普通链接渲染逻辑
      if (variant === "conversion") {
        return (
          <a
            key={item.id}
            href={href ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={`link168-card-hover flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/50 px-4 py-3 shadow-sm transition active:scale-[0.99] ${finalLinkClass}`}
          >
            <span className="flex min-w-0 flex-1 items-center gap-3">
              {renderLinkIcon(item.icon, classes.nameClassName)}
              <span className="min-w-0 text-left">
                <span className={`block truncate font-black ${classes.nameClassName}`}>{item.title}</span>
                {item.description ? (
                  <span className={`mt-0.5 block line-clamp-2 text-xs leading-5 ${classes.subClassName}`}>
                    {item.description}
                  </span>
                ) : null}
              </span>
            </span>
            <ArrowRight aria-hidden className="size-5 shrink-0 opacity-80" />
          </a>
        );
      }
      // business / creator 共用样式
      const outerBorder = variant === "creator" ? "" : 'border border-[#E8DCCB]';
      return (
        <a
          key={item.id}
          href={href ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={`link168-card-hover flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-[#FFFDF8] px-3.5 py-3 shadow-sm active:scale-[0.99] ${outerBorder} ${finalLinkClass}`}
        >
          <span className="flex min-w-0 flex-1 items-center gap-3">
            {renderLinkIcon(item.icon, classes.avatarClassName)}
            <span className="min-w-0 text-left">
              <span className="block truncate font-black">{item.title}</span>
              {item.description ? (
                <span className={`mt-0.5 block line-clamp-2 text-xs leading-5 ${classes.subClassName}`}>
                  {item.description}
                </span>
              ) : null}
            </span>
          </span>
          <ArrowUpRight aria-hidden className="size-5 shrink-0 opacity-70" />
        </a>
      );
    }
  }
}

function renderComponentList(
  links: SharePageLink[],
  classes: ShareThemeClassSet,
  variant: "business" | "creator" | "conversion",
  linkStyle: ShareLinkStyle,
  linkClassName?: string,
): ReactNode {
  if (links.length === 0) {
    return (
      <div className={`rounded-2xl border border-dashed border-[#E8DCCB] bg-[#FFFDF8]/70 px-5 py-10 text-center ${classes.subClassName}`}>
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#DDE8CD]">
          <Globe aria-hidden className="size-7 text-[#6F8F4E]" />
        </div>
        <p className="mt-4 text-base font-black text-[#2B241E]">主页正在搭建中</p>
        <p className="mt-2 text-sm text-[#7A6D5E] leading-6">
          主人很快就会在这里添加精彩内容
          <br />
          敬请期待
        </p>
      </div>
    );
  }
  return links.map((item) => renderComponentItem(item, classes, variant, linkStyle, linkClassName));
}

export function getSurfaceClassForTheme(
  themeName: string | null | undefined,
  override?: string,
): string {
  if (override) return override;
  return getThemeClasses(themeName).surfaceClassName;
}
