import type { ProfileModuleType } from "./types";
import { isTrustedImageUrl } from "@/lib/upload-storage";
import { sanitizePublicUrl } from "@/lib/public-url-security";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  sanitizedPayload?: unknown;
};

export type LinkPayload = {
  title: string;
  url: string;
  description?: string;
  iconUrl?: string;
};

export type TextPayload = {
  content: string;
};

export type CopyTextPayload = {
  label: string;
  copyContent: string;
  description?: string;
};

export type CoverImagePayload = {
  imageUrl: string;
  alt?: string;
  linkUrl?: string;
};

export type PopupImagePayload = {
  thumbnailUrl: string;
  fullImageUrl: string;
  alt?: string;
};

export type CarouselImageItem = {
  imageUrl: string;
  alt?: string;
  linkUrl?: string;
};

export type CarouselPayload = {
  images: CarouselImageItem[];
};

export type BilibiliVideoPayload = {
  bvid: string;
  title?: string;
  coverUrl?: string;
};

export type YoutubeVideoPayload = {
  videoId: string;
  title?: string;
  coverUrl?: string;
};

export type VideoLinkPayload = {
  url: string;
  title?: string;
  coverUrl?: string;
  platform?: string;
};

export type NeteaseMusicPayload = {
  songId: string;
  title?: string;
  artist?: string;
  coverUrl?: string;
};

export type MusicLinkPayload = {
  url: string;
  title?: string;
  artist?: string;
  coverUrl?: string;
};

export type DividerPayload = {
  style?: "line" | "space";
};

export type AiChatPayload = {
  assistantName?: string;
  greeting?: string;
  tone?: string;
};

export type ProductCardPayload = {
  productId?: string;
  name: string;
  category?: string;
  description?: string;
  priceText?: string;
  coverImageUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

export type ServiceCardPayload = {
  serviceId?: string;
  name: string;
  category?: string;
  description?: string;
  priceText?: string;
  coverImageUrl?: string;
  availability?: string;
  duration?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  allowBooking?: boolean;
};

export type OfferPayload = {
  title: string;
  description?: string;
  originalPrice?: string;
  offerPrice?: string;
  discountText?: string;
  coverImageUrl?: string;
  validFrom?: string;
  validUntil?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  couponCode?: string;
};

export type ShopPayload = Record<string, unknown>;
export type BookingPayload = {
  title?: string;
  description?: string;
  priceText?: string;
  coverImageUrl?: string;
  availability?: string;
  duration?: string;
  requireDate?: boolean;
};
export type QrPayload = Record<string, unknown>;
export type WechatPayload = Record<string, unknown>;
export type PhonePayload = Record<string, unknown>;
export type MapPayload = Record<string, unknown>;
export type GroupTitlePayload = Record<string, unknown>;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isStringOrUndefined(v: unknown): v is string | undefined {
  return v === undefined || typeof v === "string";
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  if (isTrustedImageUrl(url)) return true;
  const cleaned = sanitizePublicUrl(url);
  return cleaned.safe && !!cleaned.url;
}

// bvid 格式：BV 开头，仅允许字母数字，长度 8-32
function isValidBvid(v: string): boolean {
  if (!v) return false;
  return /^BV[a-zA-Z0-9]{6,30}$/.test(v);
}

// YouTube videoId：通常 11 字符，仅 [a-zA-Z0-9_-]，允许 8-32 防止边界
function isValidYoutubeId(v: string): boolean {
  if (!v) return false;
  return /^[a-zA-Z0-9_-]{6,32}$/.test(v);
}

// 网易云 songId：纯数字
function isValidNeteaseSongId(v: string): boolean {
  if (!v) return false;
  return /^\d{1,32}$/.test(v);
}

// 通用 http/https URL 校验
function isValidHttpUrlLike(v: string): boolean {
  if (!v) return false;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function validateLinkPayload(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObject(raw)) {
    return { valid: false, errors: ["payload 必须是对象"] };
  }
  if (!isNonEmptyString(raw.title)) errors.push("title 不能为空");
  if (!isNonEmptyString(raw.url)) errors.push("url 不能为空");
  if (!isStringOrUndefined(raw.description)) errors.push("description 必须是字符串");
  if (!isStringOrUndefined(raw.iconUrl)) errors.push("iconUrl 必须是字符串");
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: LinkPayload = {
    title: (raw.title as string).trim(),
    url: (raw.url as string).trim(),
    description: raw.description ? (raw.description as string).trim() : undefined,
    iconUrl: raw.iconUrl ? (raw.iconUrl as string).trim() : undefined,
  };
  return { valid: true, errors: [], sanitizedPayload: sanitized };
}

function validateTextPayload(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObject(raw)) {
    return { valid: false, errors: ["payload 必须是对象"] };
  }
  if (!isNonEmptyString(raw.content)) errors.push("content 不能为空");
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: TextPayload = { content: (raw.content as string).trim() };
  return { valid: true, errors: [], sanitizedPayload: sanitized };
}

function validateCopyTextPayload(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObject(raw)) {
    return { valid: false, errors: ["payload 必须是对象"] };
  }
  if (!isNonEmptyString(raw.label)) errors.push("label 不能为空");
  if (!isNonEmptyString(raw.copyContent)) errors.push("copyContent 不能为空");
  if (!isStringOrUndefined(raw.description)) errors.push("description 必须是字符串");
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: CopyTextPayload = {
    label: (raw.label as string).trim(),
    copyContent: (raw.copyContent as string).trim(),
    description: raw.description ? (raw.description as string).trim() : undefined,
  };
  return { valid: true, errors: [], sanitizedPayload: sanitized };
}

function validateCoverImagePayload(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObject(raw)) {
    return { valid: false, errors: ["payload 必须是对象"] };
  }
  if (!isNonEmptyString(raw.imageUrl)) errors.push("imageUrl 不能为空");
  if (raw.imageUrl && !isValidImageUrl(raw.imageUrl as string)) errors.push("imageUrl 必须是可信的图片地址");
  if (!isStringOrUndefined(raw.alt)) errors.push("alt 必须是字符串");
  if (!isStringOrUndefined(raw.linkUrl)) errors.push("linkUrl 必须是字符串");
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: CoverImagePayload = {
    imageUrl: (raw.imageUrl as string).trim(),
    alt: raw.alt ? (raw.alt as string).trim() : undefined,
    linkUrl: raw.linkUrl ? (raw.linkUrl as string).trim() : undefined,
  };
  return { valid: true, errors: [], sanitizedPayload: sanitized };
}

function validatePopupImagePayload(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObject(raw)) {
    return { valid: false, errors: ["payload 必须是对象"] };
  }
  if (!isNonEmptyString(raw.thumbnailUrl)) errors.push("thumbnailUrl 不能为空");
  if (raw.thumbnailUrl && !isValidImageUrl(raw.thumbnailUrl as string)) errors.push("thumbnailUrl 必须是可信的图片地址");
  if (!isNonEmptyString(raw.fullImageUrl)) errors.push("fullImageUrl 不能为空");
  if (raw.fullImageUrl && !isValidImageUrl(raw.fullImageUrl as string)) errors.push("fullImageUrl 必须是可信的图片地址");
  if (!isStringOrUndefined(raw.alt)) errors.push("alt 必须是字符串");
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: PopupImagePayload = {
    thumbnailUrl: (raw.thumbnailUrl as string).trim(),
    fullImageUrl: (raw.fullImageUrl as string).trim(),
    alt: raw.alt ? (raw.alt as string).trim() : undefined,
  };
  return { valid: true, errors: [], sanitizedPayload: sanitized };
}

function validateCarouselPayload(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObject(raw)) {
    return { valid: false, errors: ["payload 必须是对象"] };
  }
  const images = raw.images;
  if (!Array.isArray(images)) {
    return { valid: false, errors: ["images 必须是数组"] };
  }
  if (images.length === 0) {
    return { valid: false, errors: ["images 不能为空"] };
  }
  const sanitizedImages: CarouselImageItem[] = [];
  for (let i = 0; i < images.length; i++) {
    const item = images[i];
    if (!isObject(item)) {
      errors.push(`images[${i}] 必须是对象`);
      continue;
    }
    if (!isNonEmptyString(item.imageUrl)) {
      errors.push(`images[${i}].imageUrl 不能为空`);
      continue;
    }
    if (!isValidImageUrl(item.imageUrl as string)) {
      errors.push(`images[${i}].imageUrl 必须是可信的图片地址`);
      continue;
    }
    if (!isStringOrUndefined(item.alt)) {
      errors.push(`images[${i}].alt 必须是字符串`);
      continue;
    }
    if (!isStringOrUndefined(item.linkUrl)) {
      errors.push(`images[${i}].linkUrl 必须是字符串`);
      continue;
    }
    sanitizedImages.push({
      imageUrl: (item.imageUrl as string).trim(),
      alt: item.alt ? (item.alt as string).trim() : undefined,
      linkUrl: item.linkUrl ? (item.linkUrl as string).trim() : undefined,
    });
  }
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: CarouselPayload = { images: sanitizedImages };
  return { valid: true, errors: [], sanitizedPayload: sanitized };
}

function validateBilibiliVideoPayload(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObject(raw)) {
    return { valid: false, errors: ["payload 必须是对象"] };
  }
  if (!isNonEmptyString(raw.bvid)) errors.push("bvid 不能为空");
  else if (!isValidBvid(raw.bvid as string)) errors.push("bvid 格式不正确，应为 BV 开头的字母数字组合");
  if (!isStringOrUndefined(raw.title)) errors.push("title 必须是字符串");
  if (!isStringOrUndefined(raw.coverUrl)) errors.push("coverUrl 必须是字符串");
  else if (raw.coverUrl && !isValidImageUrl(raw.coverUrl as string)) errors.push("coverUrl 必须是可信的图片地址");
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: BilibiliVideoPayload = {
    bvid: (raw.bvid as string).trim(),
    title: raw.title ? (raw.title as string).trim() : undefined,
    coverUrl: raw.coverUrl ? (raw.coverUrl as string).trim() : undefined,
  };
  return { valid: true, errors: [], sanitizedPayload: sanitized };
}

function validateYoutubeVideoPayload(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObject(raw)) {
    return { valid: false, errors: ["payload 必须是对象"] };
  }
  if (!isNonEmptyString(raw.videoId)) errors.push("videoId 不能为空");
  else if (!isValidYoutubeId(raw.videoId as string)) errors.push("videoId 格式不正确，仅允许字母数字和 _-");
  if (!isStringOrUndefined(raw.title)) errors.push("title 必须是字符串");
  if (!isStringOrUndefined(raw.coverUrl)) errors.push("coverUrl 必须是字符串");
  else if (raw.coverUrl && !isValidImageUrl(raw.coverUrl as string)) errors.push("coverUrl 必须是可信的图片地址");
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: YoutubeVideoPayload = {
    videoId: (raw.videoId as string).trim(),
    title: raw.title ? (raw.title as string).trim() : undefined,
    coverUrl: raw.coverUrl ? (raw.coverUrl as string).trim() : undefined,
  };
  return { valid: true, errors: [], sanitizedPayload: sanitized };
}

function validateVideoLinkPayload(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObject(raw)) {
    return { valid: false, errors: ["payload 必须是对象"] };
  }
  if (!isNonEmptyString(raw.url)) errors.push("url 不能为空");
  else if (!isValidHttpUrlLike(raw.url as string)) errors.push("url 必须是 http:// 或 https:// 开头的有效网址");
  if (!isStringOrUndefined(raw.title)) errors.push("title 必须是字符串");
  if (!isStringOrUndefined(raw.coverUrl)) errors.push("coverUrl 必须是字符串");
  else if (raw.coverUrl && !isValidImageUrl(raw.coverUrl as string)) errors.push("coverUrl 必须是可信的图片地址");
  if (!isStringOrUndefined(raw.platform)) errors.push("platform 必须是字符串");
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: VideoLinkPayload = {
    url: (raw.url as string).trim(),
    title: raw.title ? (raw.title as string).trim() : undefined,
    coverUrl: raw.coverUrl ? (raw.coverUrl as string).trim() : undefined,
    platform: raw.platform ? (raw.platform as string).trim() : undefined,
  };
  return { valid: true, errors: [], sanitizedPayload: sanitized };
}

function validateNeteaseMusicPayload(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObject(raw)) {
    return { valid: false, errors: ["payload 必须是对象"] };
  }
  if (!isNonEmptyString(raw.songId)) errors.push("songId 不能为空");
  else if (!isValidNeteaseSongId(raw.songId as string)) errors.push("songId 必须是纯数字");
  if (!isStringOrUndefined(raw.title)) errors.push("title 必须是字符串");
  if (!isStringOrUndefined(raw.artist)) errors.push("artist 必须是字符串");
  if (!isStringOrUndefined(raw.coverUrl)) errors.push("coverUrl 必须是字符串");
  else if (raw.coverUrl && !isValidImageUrl(raw.coverUrl as string)) errors.push("coverUrl 必须是可信的图片地址");
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: NeteaseMusicPayload = {
    songId: (raw.songId as string).trim(),
    title: raw.title ? (raw.title as string).trim() : undefined,
    artist: raw.artist ? (raw.artist as string).trim() : undefined,
    coverUrl: raw.coverUrl ? (raw.coverUrl as string).trim() : undefined,
  };
  return { valid: true, errors: [], sanitizedPayload: sanitized };
}

function validateMusicLinkPayload(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObject(raw)) {
    return { valid: false, errors: ["payload 必须是对象"] };
  }
  if (!isNonEmptyString(raw.url)) errors.push("url 不能为空");
  else if (!isValidHttpUrlLike(raw.url as string)) errors.push("url 必须是 http:// 或 https:// 开头的有效网址");
  if (!isStringOrUndefined(raw.title)) errors.push("title 必须是字符串");
  if (!isStringOrUndefined(raw.artist)) errors.push("artist 必须是字符串");
  if (!isStringOrUndefined(raw.coverUrl)) errors.push("coverUrl 必须是字符串");
  else if (raw.coverUrl && !isValidImageUrl(raw.coverUrl as string)) errors.push("coverUrl 必须是可信的图片地址");
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: MusicLinkPayload = {
    url: (raw.url as string).trim(),
    title: raw.title ? (raw.title as string).trim() : undefined,
    artist: raw.artist ? (raw.artist as string).trim() : undefined,
    coverUrl: raw.coverUrl ? (raw.coverUrl as string).trim() : undefined,
  };
  return { valid: true, errors: [], sanitizedPayload: sanitized };
}

function validateDividerPayload(raw: unknown): ValidationResult {
  if (raw === undefined || raw === null) {
    return { valid: true, errors: [], sanitizedPayload: { style: "line" as const } };
  }
  if (!isObject(raw)) {
    return { valid: false, errors: ["payload 必须是对象"] };
  }
  const style = raw.style;
  if (style !== undefined && style !== "line" && style !== "space") {
    return { valid: false, errors: ["style 必须是 'line' 或 'space'"] };
  }
  const sanitized: DividerPayload = { style: (style as "line" | "space") || "line" };
  return { valid: true, errors: [], sanitizedPayload: sanitized };
}

function validateAiChatPayload(raw: unknown): ValidationResult {
  if (raw === undefined || raw === null) {
    return { valid: true, errors: [], sanitizedPayload: {} };
  }
  if (!isObject(raw)) {
    return { valid: false, errors: ["payload 必须是对象"] };
  }
  const errors: string[] = [];
  if (!isStringOrUndefined(raw.assistantName)) errors.push("assistantName 必须是字符串");
  if (!isStringOrUndefined(raw.greeting)) errors.push("greeting 必须是字符串");
  if (!isStringOrUndefined(raw.tone)) errors.push("tone 必须是字符串");
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: AiChatPayload = {
    assistantName: raw.assistantName ? (raw.assistantName as string).trim() : undefined,
    greeting: raw.greeting ? (raw.greeting as string).trim() : undefined,
    tone: raw.tone ? (raw.tone as string).trim() : undefined,
  };
  return { valid: true, errors: [], sanitizedPayload: sanitized };
}

function validatePassthrough(raw: unknown): ValidationResult {
  if (raw === undefined || raw === null) {
    return { valid: true, errors: [], sanitizedPayload: {} };
  }
  if (!isObject(raw)) {
    return { valid: false, errors: ["payload 必须是对象"] };
  }
  return { valid: true, errors: [], sanitizedPayload: raw };
}

function validateProductCardPayload(raw: unknown): ValidationResult {
  if (raw === undefined || raw === null) {
    return { valid: false, errors: ["payload 不能为空"] };
  }
  if (!isObject(raw)) {
    return { valid: false, errors: ["payload 必须是对象"] };
  }
  const errors: string[] = [];
  if (!isNonEmptyString(raw.name)) errors.push("name 不能为空");
  if (!isStringOrUndefined(raw.productId)) errors.push("productId 必须是字符串");
  if (!isStringOrUndefined(raw.category)) errors.push("category 必须是字符串");
  if (!isStringOrUndefined(raw.description)) errors.push("description 必须是字符串");
  if (!isStringOrUndefined(raw.priceText)) errors.push("priceText 必须是字符串");
  if (raw.coverImageUrl && !isValidImageUrl(raw.coverImageUrl as string)) errors.push("coverImageUrl 必须是可信的图片地址");
  if (!isStringOrUndefined(raw.ctaLabel)) errors.push("ctaLabel 必须是字符串");
  if (raw.ctaUrl && !isValidHttpUrlLike(raw.ctaUrl as string)) errors.push("ctaUrl 必须是有效的 URL");
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: ProductCardPayload = {
    productId: raw.productId ? (raw.productId as string).trim() : undefined,
    name: (raw.name as string).trim(),
    category: raw.category ? (raw.category as string).trim() : undefined,
    description: raw.description ? (raw.description as string).trim() : undefined,
    priceText: raw.priceText ? (raw.priceText as string).trim() : undefined,
    coverImageUrl: raw.coverImageUrl ? (raw.coverImageUrl as string).trim() : undefined,
    ctaLabel: raw.ctaLabel ? (raw.ctaLabel as string).trim() : undefined,
    ctaUrl: raw.ctaUrl ? (raw.ctaUrl as string).trim() : undefined,
  };
  return { valid: true, errors: [], sanitizedPayload: sanitized };
}

function validateServiceCardPayload(raw: unknown): ValidationResult {
  if (raw === undefined || raw === null) {
    return { valid: false, errors: ["payload 不能为空"] };
  }
  if (!isObject(raw)) {
    return { valid: false, errors: ["payload 必须是对象"] };
  }
  const errors: string[] = [];
  if (!isNonEmptyString(raw.name)) errors.push("name 不能为空");
  if (!isStringOrUndefined(raw.serviceId)) errors.push("serviceId 必须是字符串");
  if (!isStringOrUndefined(raw.category)) errors.push("category 必须是字符串");
  if (!isStringOrUndefined(raw.description)) errors.push("description 必须是字符串");
  if (!isStringOrUndefined(raw.priceText)) errors.push("priceText 必须是字符串");
  if (raw.coverImageUrl && !isValidImageUrl(raw.coverImageUrl as string)) errors.push("coverImageUrl 必须是可信的图片地址");
  if (!isStringOrUndefined(raw.availability)) errors.push("availability 必须是字符串");
  if (!isStringOrUndefined(raw.duration)) errors.push("duration 必须是字符串");
  if (!isStringOrUndefined(raw.ctaLabel)) errors.push("ctaLabel 必须是字符串");
  if (raw.ctaUrl && !isValidHttpUrlLike(raw.ctaUrl as string)) errors.push("ctaUrl 必须是有效的 URL");
  if (raw.allowBooking !== undefined && typeof raw.allowBooking !== "boolean") errors.push("allowBooking 必须是布尔值");
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: ServiceCardPayload = {
    serviceId: raw.serviceId ? (raw.serviceId as string).trim() : undefined,
    name: (raw.name as string).trim(),
    category: raw.category ? (raw.category as string).trim() : undefined,
    description: raw.description ? (raw.description as string).trim() : undefined,
    priceText: raw.priceText ? (raw.priceText as string).trim() : undefined,
    coverImageUrl: raw.coverImageUrl ? (raw.coverImageUrl as string).trim() : undefined,
    availability: raw.availability ? (raw.availability as string).trim() : undefined,
    duration: raw.duration ? (raw.duration as string).trim() : undefined,
    ctaLabel: raw.ctaLabel ? (raw.ctaLabel as string).trim() : undefined,
    ctaUrl: raw.ctaUrl ? (raw.ctaUrl as string).trim() : undefined,
    allowBooking: raw.allowBooking !== false,
  };
  return { valid: true, errors: [], sanitizedPayload: sanitized };
}

function validateOfferPayload(raw: unknown): ValidationResult {
  if (raw === undefined || raw === null) {
    return { valid: false, errors: ["payload 不能为空"] };
  }
  if (!isObject(raw)) {
    return { valid: false, errors: ["payload 必须是对象"] };
  }
  const errors: string[] = [];
  if (!isNonEmptyString(raw.title)) errors.push("title 不能为空");
  if (!isStringOrUndefined(raw.description)) errors.push("description 必须是字符串");
  if (!isStringOrUndefined(raw.originalPrice)) errors.push("originalPrice 必须是字符串");
  if (!isStringOrUndefined(raw.offerPrice)) errors.push("offerPrice 必须是字符串");
  if (!isStringOrUndefined(raw.discountText)) errors.push("discountText 必须是字符串");
  if (raw.coverImageUrl && !isValidImageUrl(raw.coverImageUrl as string)) errors.push("coverImageUrl 必须是可信的图片地址");
  if (!isStringOrUndefined(raw.validFrom)) errors.push("validFrom 必须是字符串");
  if (!isStringOrUndefined(raw.validUntil)) errors.push("validUntil 必须是字符串");
  if (!isStringOrUndefined(raw.ctaLabel)) errors.push("ctaLabel 必须是字符串");
  if (raw.ctaUrl && !isValidHttpUrlLike(raw.ctaUrl as string)) errors.push("ctaUrl 必须是有效的 URL");
  if (!isStringOrUndefined(raw.couponCode)) errors.push("couponCode 必须是字符串");
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: OfferPayload = {
    title: (raw.title as string).trim(),
    description: raw.description ? (raw.description as string).trim() : undefined,
    originalPrice: raw.originalPrice ? (raw.originalPrice as string).trim() : undefined,
    offerPrice: raw.offerPrice ? (raw.offerPrice as string).trim() : undefined,
    discountText: raw.discountText ? (raw.discountText as string).trim() : undefined,
    coverImageUrl: raw.coverImageUrl ? (raw.coverImageUrl as string).trim() : undefined,
    validFrom: raw.validFrom ? (raw.validFrom as string).trim() : undefined,
    validUntil: raw.validUntil ? (raw.validUntil as string).trim() : undefined,
    ctaLabel: raw.ctaLabel ? (raw.ctaLabel as string).trim() : undefined,
    ctaUrl: raw.ctaUrl ? (raw.ctaUrl as string).trim() : undefined,
    couponCode: raw.couponCode ? (raw.couponCode as string).trim() : undefined,
  };
  return { valid: true, errors: [], sanitizedPayload: sanitized };
}

const VALIDATORS: Record<ProfileModuleType, (raw: unknown) => ValidationResult> = {
  link: validateLinkPayload,
  text: validateTextPayload,
  "group-title": validatePassthrough,
  qr: validatePassthrough,
  wechat: validatePassthrough,
  phone: validatePassthrough,
  shop: validatePassthrough,
  booking: validatePassthrough,
  map: validatePassthrough,
  "copy-text": validateCopyTextPayload,
  "cover-image": validateCoverImagePayload,
  "popup-image": validatePopupImagePayload,
  carousel: validateCarouselPayload,
  "bilibili-video": validateBilibiliVideoPayload,
  "youtube-video": validateYoutubeVideoPayload,
  "video-link": validateVideoLinkPayload,
  "netease-music": validateNeteaseMusicPayload,
  "music-link": validateMusicLinkPayload,
  divider: validateDividerPayload,
  "ai-chat": validateAiChatPayload,
  "product-card": validateProductCardPayload,
  "service-card": validateServiceCardPayload,
  "offer": validateOfferPayload,
};

export function validateModulePayload(
  type: ProfileModuleType,
  rawPayload: unknown
): ValidationResult {
  const validator = VALIDATORS[type];
  if (!validator) {
    return { valid: false, errors: [`未知的模块类型: ${type}`] };
  }
  return validator(rawPayload);
}

export function isModuleType(value: string): value is ProfileModuleType {
  return value in VALIDATORS;
}
