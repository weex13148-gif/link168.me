export const allowedIconTypes = ["default", "emoji", "custom", "platform"] as const;

export type AllowedIconType = (typeof allowedIconTypes)[number];

export type PlatformIconKey =
  | "wechat"
  | "douyin"
  | "xiaohongshu"
  | "bilibili"
  | "youtube"
  | "linkedin"
  | "instagram"
  | "facebook"
  | "x";

type PlatformIconOption = {
  key: PlatformIconKey;
  label: string;
  hostnames: string[];
};

export type ResolvedLinkIcon =
  | { iconType: "platform"; iconValue: PlatformIconKey; label: string }
  | { iconType: "default"; iconValue: ""; label: "通用链接" };

const PLATFORM_ICON_OPTIONS: PlatformIconOption[] = [
  { key: "wechat", label: "微信", hostnames: ["weixin.qq.com", "wechat.com"] },
  { key: "douyin", label: "抖音", hostnames: ["douyin.com", "iesdouyin.com"] },
  { key: "xiaohongshu", label: "小红书", hostnames: ["xiaohongshu.com", "xhslink.com"] },
  { key: "bilibili", label: "哔哩哔哩", hostnames: ["bilibili.com", "b23.tv"] },
  { key: "youtube", label: "YouTube", hostnames: ["youtube.com", "youtu.be"] },
  { key: "linkedin", label: "LinkedIn", hostnames: ["linkedin.com"] },
  { key: "instagram", label: "Instagram", hostnames: ["instagram.com", "instagr.am"] },
  { key: "facebook", label: "Facebook", hostnames: ["facebook.com", "fb.com"] },
  { key: "x", label: "X", hostnames: ["x.com", "twitter.com", "t.co"] },
];

const PLATFORM_ICON_PATHS: Record<PlatformIconKey, string> = {
  wechat: "/platform-logos/wechat.svg",
  douyin: "/platform-logos/douyin.svg",
  xiaohongshu: "/platform-logos/xiaohongshu.svg",
  bilibili: "/platform-logos/bilibili.svg",
  youtube: "/platform-logos/youtube.svg",
  linkedin: "/platform-logos/linkedin.svg",
  instagram: "/platform-logos/instagram.svg",
  facebook: "/platform-logos/facebook.svg",
  x: "/platform-logos/x.svg",
};

const PLATFORM_ICON_KEYS = new Set<PlatformIconKey>(
  PLATFORM_ICON_OPTIONS.map((option) => option.key),
);

export const DEFAULT_LINK_ICON: ResolvedLinkIcon = {
  iconType: "default",
  iconValue: "",
  label: "通用链接",
};

export function isPlatformIconKey(value: unknown): value is PlatformIconKey {
  return typeof value === "string" && PLATFORM_ICON_KEYS.has(value as PlatformIconKey);
}

export function normalizePlatformIconKey(value: unknown): PlatformIconKey | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return isPlatformIconKey(normalized) ? normalized : null;
}

export function resolvePlatformIcon(value: string | null | undefined): string | null {
  const key = normalizePlatformIconKey(value);
  return key ? PLATFORM_ICON_PATHS[key] : null;
}

export function getPlatformIconOptions(): ReadonlyArray<Pick<PlatformIconOption, "key" | "label">> {
  return PLATFORM_ICON_OPTIONS.map(({ key, label }) => ({ key, label }));
}

function hostnameMatches(hostname: string, allowedHostname: string): boolean {
  return hostname === allowedHostname || hostname.endsWith(`.${allowedHostname}`);
}

export function detectPlatformIcon(url: string): PlatformIconKey | null {
  if (!url) return null;

  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return null;
  }

  for (const option of PLATFORM_ICON_OPTIONS) {
    if (option.hostnames.some((allowed) => hostnameMatches(hostname, allowed))) {
      return option.key;
    }
  }
  return null;
}

export function getDefaultIconForUrl(url: string): ResolvedLinkIcon {
  const key = detectPlatformIcon(url);
  if (!key) return DEFAULT_LINK_ICON;
  const option = PLATFORM_ICON_OPTIONS.find((candidate) => candidate.key === key);
  return {
    iconType: "platform",
    iconValue: key,
    label: option?.label || key,
  };
}
