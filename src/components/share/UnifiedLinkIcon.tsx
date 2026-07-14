"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { getPlatformIconUrl, getPlatformByKey, getPlatformEmoji } from "@/lib/link-icons";

export function UnifiedLinkIcon({
  iconType,
  iconValue,
  iconUrl,
  defaultClass,
  size = "size-9",
}: {
  iconType?: string | null;
  iconValue?: string | null;
  iconUrl?: string | null;
  defaultClass?: string;
  size?: string;
}) {
  const [imgError, setImgError] = useState(false);

  const baseClass = `grid shrink-0 place-items-center overflow-hidden rounded-xl border border-black/5 ${size} ${defaultClass || ""}`;

  if (iconType === "custom" && iconUrl) {
    return (
      <span className={baseClass}>
        <img src={iconUrl} alt="" className="size-full object-cover" onError={() => setImgError(true)} />
      </span>
    );
  }

  if (iconType === "platform" && iconValue) {
    const platformIconUrl = getPlatformIconUrl(iconValue);
    const emojiFallback = getPlatformEmoji(iconValue);

    if (!imgError) {
      return (
        <span className={baseClass}>
          <img src={platformIconUrl} alt="" className="size-full object-contain" onError={() => setImgError(true)} />
        </span>
      );
    }
    return <span className={`grid ${size} shrink-0 place-items-center rounded-xl text-xl ${defaultClass || ""}`}>{emojiFallback}</span>;
  }

  if (iconType === "emoji" && iconValue) {
    return <span className={`grid ${size} shrink-0 place-items-center rounded-xl text-xl ${defaultClass || ""}`}>{iconValue}</span>;
  }

  if (iconUrl && (iconType === "favicon" || (!iconType && iconUrl))) {
    return (
      <span className={baseClass}>
        <img src={iconUrl} alt="" className="size-full object-cover" onError={() => setImgError(true)} />
      </span>
    );
  }

  return <span className={`grid ${size} shrink-0 place-items-center rounded-xl ${defaultClass || ""}`}><Globe aria-hidden className="size-5" /></span>;
}

export function getLinkIconProps(iconType: string | null | undefined, iconValue: string | null | undefined, iconUrl: string | null | undefined) {
  if (iconType === "custom" && iconUrl) {
    return { type: "image", value: iconUrl };
  }

  if (iconType === "platform" && iconValue) {
    const platform = getPlatformByKey(iconValue);
    if (platform) {
      return { type: "platform", value: platform.iconPath, label: platform.name };
    }
    return { type: "emoji", value: getPlatformEmoji(iconValue) };
  }

  if (iconType === "emoji" && iconValue) {
    return { type: "emoji", value: iconValue };
  }

  if (iconUrl) {
    return { type: "image", value: iconUrl };
  }

  return { type: "default", value: "🔗" };
}