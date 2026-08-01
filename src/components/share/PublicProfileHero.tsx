"use client";

import { useState, type CSSProperties } from "react";
import { QrCode, Share2 } from "lucide-react";
import type { CustomTheme } from "@/components/theme/types";
import { BUILT_IN_WALLPAPERS } from "@/components/theme/wallpapers";
import type { PublicProfileIdentity, PublicProfileRenderMode } from "@/components/share/public-profile-types";

const DEFAULT_COVER = "linear-gradient(135deg,#DDE8CD 0%,#F7F1E7 100%)";

function toCssImage(value: string) {
  const trimmed = value.trim();
  if (/^url\(/i.test(trimmed)) return trimmed;
  return `url("${trimmed.replace(/["\\]/g, "")}")`;
}

function buildCoverStyle(custom: CustomTheme | null): CSSProperties {
  if (!custom) return { backgroundImage: DEFAULT_COVER };
  if (custom.backgroundType === "solid") return { backgroundColor: custom.backgroundValue };
  if (custom.backgroundType === "gradient") return { backgroundImage: custom.backgroundValue };
  const wallpaper = BUILT_IN_WALLPAPERS.find((item) => item.src === custom.backgroundValue);
  const fallback = wallpaper?.fallback || DEFAULT_COVER;
  return {
    backgroundColor: "#DDE8CD",
    backgroundImage: `${toCssImage(custom.backgroundValue)}, ${fallback}`,
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
  };
}

function HeaderActions({ onQrCodeClick, onShareClick }: { onQrCodeClick?: () => void; onShareClick?: () => void }) {
  if (!onQrCodeClick && !onShareClick) return null;
  const actionClass = "grid size-10 place-items-center rounded-full border border-white/55 bg-[#FFFDF8]/90 text-[#2B241E] shadow-sm backdrop-blur transition hover:bg-white";
  return (
    <div className="absolute right-4 top-4 z-10 flex gap-2">
      {onQrCodeClick ? <button type="button" onClick={onQrCodeClick} className={actionClass} aria-label="二维码"><QrCode aria-hidden className="size-5" /></button> : null}
      {onShareClick ? <button type="button" onClick={onShareClick} className={actionClass} aria-label="分享"><Share2 aria-hidden className="size-5" /></button> : null}
    </div>
  );
}

function ProfileIdentityMedia({
  name,
  avatarUrl,
  avatarMode,
  avatarFrame,
}: {
  name: string;
  avatarUrl?: string | null;
  avatarMode: CustomTheme["avatarMode"];
  avatarFrame: CustomTheme["avatarFrame"];
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const logoMode = avatarMode === "logo";
  const portraitFrameClass = {
    circle: "rounded-full",
    square: "rounded-none",
    rounded: "rounded-2xl",
    ring: "rounded-full ring-4 ring-white/70",
  }[avatarFrame];

  if (avatarUrl && !imageFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={logoMode ? `${name} 的企业标志` : `${name} 的头像`}
        className={logoMode
          ? "h-16 w-36 rounded-xl border-4 border-[#FFFDF8] bg-white object-contain p-2 shadow-sm"
          : `size-16 border-4 border-[#FFFDF8] bg-white object-cover shadow-sm ${portraitFrameClass}`}
        data-avatar-frame={logoMode ? "logo" : avatarFrame}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      className={logoMode
        ? "grid h-16 w-36 place-items-center rounded-xl border-4 border-[#FFFDF8] bg-[#31543D] text-xl font-black text-white shadow-sm"
        : `grid size-16 place-items-center border-4 border-[#FFFDF8] bg-[#31543D] text-xl font-black text-white shadow-sm ${portraitFrameClass}`}
      data-avatar-frame={logoMode ? "logo" : avatarFrame}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function PublicProfileHero({
  identity,
  customTheme,
  renderMode,
  onQrCodeClick,
  onShareClick,
}: {
  identity: PublicProfileIdentity;
  customTheme: CustomTheme | null;
  renderMode: PublicProfileRenderMode;
  onQrCodeClick?: () => void;
  onShareClick?: () => void;
}) {
  const name = identity.displayName?.trim() || "Link168 名片";
  const descriptor = [identity.jobTitle, identity.company].filter(Boolean).join(" · ");
  const avatarMode = customTheme?.avatarMode || "portrait";
  const avatarFrame = customTheme?.avatarFrame || "circle";
  const imageKey = `${avatarMode}:${identity.avatarUrl || ""}`;

  return (
    <section className="w-full overflow-hidden bg-[#FFFDF8]">
      <div className="relative min-h-[140px] overflow-hidden" style={buildCoverStyle(customTheme)}>
        <span className="absolute left-4 top-4 rounded-full border border-white/50 bg-[#FFFDF8]/85 px-3 py-1.5 text-xs font-black tracking-wide text-[#31543D] backdrop-blur">Link168</span>
        <HeaderActions onQrCodeClick={onQrCodeClick} onShareClick={onShareClick} />
      </div>
      <div data-public-profile-identity className="relative -mt-8 px-5 pb-4" style={{ color: customTheme?.textColor || "#2B241E" }}>
        <ProfileIdentityMedia key={imageKey} name={name} avatarUrl={identity.avatarUrl} avatarMode={avatarMode} avatarFrame={avatarFrame} />
        <div className="mt-3">
          <h1 className="text-xl font-black tracking-tight text-current sm:text-2xl">{name}</h1>
          {descriptor ? <p className="mt-1 text-sm font-bold text-current opacity-75">{descriptor}</p> : null}
          {identity.bio ? <p className="mt-3 max-w-lg text-sm leading-6 text-current opacity-80">{identity.bio}</p> : renderMode === "preview" ? <p className="mt-3 text-sm text-current opacity-60">添加一句业务价值介绍</p> : null}
        </div>
      </div>
    </section>
  );
}
