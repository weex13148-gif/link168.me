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

export type LeadFormPayload = {
  title: string;
  description?: string;
  buttonText?: string;
  messagePlaceholder?: string;
};

export type QuotePayload = LeadFormPayload;
export type ContactFormPayload = LeadFormPayload;

export type ShopPayload = Record<string, unknown>;
export type BookingPayload = {
  title?: string;
  description?: string;
  priceText?: string;
  coverImageUrl?: string;
  availability?: string;
  duration?: string;
  requireDate?: boolean;
  buttonText?: string;
};
export type QrPayload = {
  text?: string;
  url?: string;
  title?: string;
};
export type WechatPayload = {
  wechatId?: string;
  label?: string;
  title?: string;
};
export type PhonePayload = {
  phone?: string;
  label?: string;
  title?: string;
};
export type EmailPayload = {
  email?: string;
  label?: string;
  title?: string;
};
export type AddressPayload = {
  address?: string;
  label?: string;
  title?: string;
};
export type MapPayload = {
  address?: string;
  latitude?: number;
  longitude?: number;
};
export type GroupTitlePayload = {
  title: string;
  subtitle?: string;
};

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

// 邮箱格式校验（基础）
function isValidEmail(v: string): boolean {
  if (!v || v.length > 254) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(v);
}

// 电话格式校验（支持国际格式，长度 7-32）
function isValidPhone(v: string): boolean {
  if (!v) return false;
  const cleaned = v.replace(/[\s\-\(\)]/g, "");
  return /^\+?[\d]{7,32}$/.test(cleaned);
}

// 地址长度校验
function isValidAddress(v: string): boolean {
  if (!v) return true; // 可选
  return v.length >= 2 && v.length <= 300;
}

// 文本长度校验
function isValidTextLength(v: string, min: number, max: number): boolean {
  if (!v) return min === 0;
  const len = v.trim().length;
  return len >= min && len <= max;
}

// 非法脚本和危险协议检测
function hasDangerousContent(v: string): boolean {
  if (!v) return false;
  const dangerous = /<script\b|<\/script>|javascript:|data:text\/html|vbscript:|on\w+\s*=|\{\{.*\}\}|\$\{.*\}/i;
  return dangerous.test(v);
}

// 日期格式校验（YYYY-MM-DD）
function isValidDateString(v: string): boolean {
  if (!v) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function validateLinkPayload(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObject(raw)) {
    return { valid: false, errors: ["payload 必须是对象"] };
  }
  if (!isNonEmptyString(raw.title)) errors.push("title 不能为空");
  if (raw.title && !isValidTextLength(raw.title as string, 1, 100)) errors.push("title 长度必须在 1-100 之间");
  if (raw.title && hasDangerousContent(raw.title as string)) errors.push("title 包含非法内容");
  if (!isNonEmptyString(raw.url)) errors.push("url 不能为空");
  if (raw.url && hasDangerousContent(raw.url as string)) errors.push("url 包含非法内容");
  if (!isStringOrUndefined(raw.description)) errors.push("description 必须是字符串");
  if (!isStringOrUndefined(raw.iconUrl)) errors.push("iconUrl 必须是字符串");
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: LinkPayload = {
    title: (raw.title as string).trim().slice(0, 100),
    url: (raw.url as string).trim().slice(0, 2048),
    description: raw.description ? (raw.description as string).trim().slice(0, 300) : undefined,
    iconUrl: raw.iconUrl ? (raw.iconUrl as string).trim().slice(0, 2048) : undefined,
  };
  return { valid: true, errors: [], sanitizedPayload: sanitized };
}

function validateTextPayload(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObject(raw)) {
    return { valid: false, errors: ["payload 必须是对象"] };
  }
  if (!isNonEmptyString(raw.content)) errors.push("content 不能为空");
  if (raw.content && !isValidTextLength(raw.content as string, 1, 2000)) errors.push("content 长度必须在 1-2000 之间");
  if (raw.content && hasDangerousContent(raw.content as string)) errors.push("content 包含非法内容");
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: TextPayload = { content: (raw.content as string).trim().slice(0, 2000) };
  return { valid: true, errors: [], sanitizedPayload: sanitized };
}

function validateCopyTextPayload(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObject(raw)) {
    return { valid: false, errors: ["payload 必须是对象"] };
  }
  if (!isNonEmptyString(raw.label)) errors.push("label 不能为空");
  if (raw.label && !isValidTextLength(raw.label as string, 1, 100)) errors.push("label 长度必须在 1-100 之间");
  if (!isNonEmptyString(raw.copyContent)) errors.push("copyContent 不能为空");
  if (raw.copyContent && !isValidTextLength(raw.copyContent as string, 1, 1000)) errors.push("copyContent 长度必须在 1-1000 之间");
  if (!isStringOrUndefined(raw.description)) errors.push("description 必须是字符串");
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: CopyTextPayload = {
    label: (raw.label as string).trim().slice(0, 100),
    copyContent: (raw.copyContent as string).trim().slice(0, 1000),
    description: raw.description ? (raw.description as string).trim().slice(0, 300) : undefined,
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
  if (raw.linkUrl && hasDangerousContent(raw.linkUrl as string)) errors.push("linkUrl 包含非法内容");
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: CoverImagePayload = {
    imageUrl: (raw.imageUrl as string).trim().slice(0, 2048),
    alt: raw.alt ? (raw.alt as string).trim().slice(0, 200) : undefined,
    linkUrl: raw.linkUrl ? (raw.linkUrl as string).trim().slice(0, 2048) : undefined,
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
    thumbnailUrl: (raw.thumbnailUrl as string).trim().slice(0, 2048),
    fullImageUrl: (raw.fullImageUrl as string).trim().slice(0, 2048),
    alt: raw.alt ? (raw.alt as string).trim().slice(0, 200) : undefined,
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
    if (item.linkUrl && hasDangerousContent(item.linkUrl as string)) {
      errors.push(`images[${i}].linkUrl 包含非法内容`);
      continue;
    }
    sanitizedImages.push({
      imageUrl: (item.imageUrl as string).trim().slice(0, 2048),
      alt: item.alt ? (item.alt as string).trim().slice(0, 200) : undefined,
      linkUrl: item.linkUrl ? (item.linkUrl as string).trim().slice(0, 2048) : undefined,
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
  if (raw.name && !isValidTextLength(raw.name as string, 1, 100)) errors.push("name 长度必须在 1-100 之间");
  if (raw.name && hasDangerousContent(raw.name as string)) errors.push("name 包含非法内容");
  if (!isStringOrUndefined(raw.productId)) errors.push("productId 必须是字符串");
  if (!isStringOrUndefined(raw.category)) errors.push("category 必须是字符串");
  if (!isStringOrUndefined(raw.description)) errors.push("description 必须是字符串");
  if (!isStringOrUndefined(raw.priceText)) errors.push("priceText 必须是字符串");
  if (raw.coverImageUrl && !isValidImageUrl(raw.coverImageUrl as string)) errors.push("coverImageUrl 必须是可信的图片地址");
  if (!isStringOrUndefined(raw.ctaLabel)) errors.push("ctaLabel 必须是字符串");
  if (raw.ctaUrl && !isValidHttpUrlLike(raw.ctaUrl as string)) errors.push("ctaUrl 必须是有效的 URL");
  if (raw.ctaUrl && hasDangerousContent(raw.ctaUrl as string)) errors.push("ctaUrl 包含非法内容");
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: ProductCardPayload = {
    productId: raw.productId ? (raw.productId as string).trim().slice(0, 64) : undefined,
    name: (raw.name as string).trim().slice(0, 100),
    category: raw.category ? (raw.category as string).trim().slice(0, 50) : undefined,
    description: raw.description ? (raw.description as string).trim().slice(0, 500) : undefined,
    priceText: raw.priceText ? (raw.priceText as string).trim().slice(0, 100) : undefined,
    coverImageUrl: raw.coverImageUrl ? (raw.coverImageUrl as string).trim().slice(0, 2048) : undefined,
    ctaLabel: raw.ctaLabel ? (raw.ctaLabel as string).trim().slice(0, 50) : undefined,
    ctaUrl: raw.ctaUrl ? (raw.ctaUrl as string).trim().slice(0, 2048) : undefined,
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
  if (raw.name && !isValidTextLength(raw.name as string, 1, 100)) errors.push("name 长度必须在 1-100 之间");
  if (raw.name && hasDangerousContent(raw.name as string)) errors.push("name 包含非法内容");
  if (!isStringOrUndefined(raw.serviceId)) errors.push("serviceId 必须是字符串");
  if (!isStringOrUndefined(raw.category)) errors.push("category 必须是字符串");
  if (!isStringOrUndefined(raw.description)) errors.push("description 必须是字符串");
  if (!isStringOrUndefined(raw.priceText)) errors.push("priceText 必须是字符串");
  if (raw.coverImageUrl && !isValidImageUrl(raw.coverImageUrl as string)) errors.push("coverImageUrl 必须是可信的图片地址");
  if (!isStringOrUndefined(raw.availability)) errors.push("availability 必须是字符串");
  if (!isStringOrUndefined(raw.duration)) errors.push("duration 必须是字符串");
  if (!isStringOrUndefined(raw.ctaLabel)) errors.push("ctaLabel 必须是字符串");
  if (raw.ctaUrl && !isValidHttpUrlLike(raw.ctaUrl as string)) errors.push("ctaUrl 必须是有效的 URL");
  if (raw.ctaUrl && hasDangerousContent(raw.ctaUrl as string)) errors.push("ctaUrl 包含非法内容");
  if (raw.allowBooking !== undefined && typeof raw.allowBooking !== "boolean") errors.push("allowBooking 必须是布尔值");
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: ServiceCardPayload = {
    serviceId: raw.serviceId ? (raw.serviceId as string).trim().slice(0, 64) : undefined,
    name: (raw.name as string).trim().slice(0, 100),
    category: raw.category ? (raw.category as string).trim().slice(0, 50) : undefined,
    description: raw.description ? (raw.description as string).trim().slice(0, 500) : undefined,
    priceText: raw.priceText ? (raw.priceText as string).trim().slice(0, 100) : undefined,
    coverImageUrl: raw.coverImageUrl ? (raw.coverImageUrl as string).trim().slice(0, 2048) : undefined,
    availability: raw.availability ? (raw.availability as string).trim().slice(0, 200) : undefined,
    duration: raw.duration ? (raw.duration as string).trim().slice(0, 100) : undefined,
    ctaLabel: raw.ctaLabel ? (raw.ctaLabel as string).trim().slice(0, 50) : undefined,
    ctaUrl: raw.ctaUrl ? (raw.ctaUrl as string).trim().slice(0, 2048) : undefined,
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
  if (raw.title && !isValidTextLength(raw.title as string, 1, 100)) errors.push("title 长度必须在 1-100 之间");
  if (raw.title && hasDangerousContent(raw.title as string)) errors.push("title 包含非法内容");
  if (!isStringOrUndefined(raw.description)) errors.push("description 必须是字符串");
  if (!isStringOrUndefined(raw.originalPrice)) errors.push("originalPrice 必须是字符串");
  if (!isStringOrUndefined(raw.offerPrice)) errors.push("offerPrice 必须是字符串");
  if (!isStringOrUndefined(raw.discountText)) errors.push("discountText 必须是字符串");
  if (raw.coverImageUrl && !isValidImageUrl(raw.coverImageUrl as string)) errors.push("coverImageUrl 必须是可信的图片地址");
  if (!isStringOrUndefined(raw.validFrom)) errors.push("validFrom 必须是字符串");
  if (raw.validFrom && !isValidDateString(raw.validFrom as string)) errors.push("validFrom 格式必须是 YYYY-MM-DD");
  if (!isStringOrUndefined(raw.validUntil)) errors.push("validUntil 必须是字符串");
  if (raw.validUntil && !isValidDateString(raw.validUntil as string)) errors.push("validUntil 格式必须是 YYYY-MM-DD");
  if (raw.validFrom && raw.validUntil && new Date(raw.validFrom as string) > new Date(raw.validUntil as string)) {
    errors.push("validFrom 不能晚于 validUntil");
  }
  if (!isStringOrUndefined(raw.ctaLabel)) errors.push("ctaLabel 必须是字符串");
  if (raw.ctaUrl && !isValidHttpUrlLike(raw.ctaUrl as string)) errors.push("ctaUrl 必须是有效的 URL");
  if (raw.ctaUrl && hasDangerousContent(raw.ctaUrl as string)) errors.push("ctaUrl 包含非法内容");
  if (!isStringOrUndefined(raw.couponCode)) errors.push("couponCode 必须是字符串");
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: OfferPayload = {
    title: (raw.title as string).trim().slice(0, 100),
    description: raw.description ? (raw.description as string).trim().slice(0, 500) : undefined,
    originalPrice: raw.originalPrice ? (raw.originalPrice as string).trim().slice(0, 100) : undefined,
    offerPrice: raw.offerPrice ? (raw.offerPrice as string).trim().slice(0, 100) : undefined,
    discountText: raw.discountText ? (raw.discountText as string).trim().slice(0, 100) : undefined,
    coverImageUrl: raw.coverImageUrl ? (raw.coverImageUrl as string).trim().slice(0, 2048) : undefined,
    validFrom: raw.validFrom ? (raw.validFrom as string).trim() : undefined,
    validUntil: raw.validUntil ? (raw.validUntil as string).trim() : undefined,
    ctaLabel: raw.ctaLabel ? (raw.ctaLabel as string).trim().slice(0, 50) : undefined,
    ctaUrl: raw.ctaUrl ? (raw.ctaUrl as string).trim().slice(0, 2048) : undefined,
    couponCode: raw.couponCode ? (raw.couponCode as string).trim().slice(0, 50) : undefined,
  };
  return { valid: true, errors: [], sanitizedPayload: sanitized };
}

function validateLeadFormPayload(raw: unknown): ValidationResult {
  if (!isObject(raw)) {
    return { valid: false, errors: ["payload 必须是对象"] };
  }
  const errors: string[] = [];
  if (!isNonEmptyString(raw.title)) errors.push("title 不能为空");
  if (raw.title && !isValidTextLength(raw.title as string, 1, 100)) errors.push("title 长度必须在 1-100 之间");
  if (!isStringOrUndefined(raw.description)) errors.push("description 必须是字符串");
  if (raw.description && !isValidTextLength(raw.description as string, 0, 500)) errors.push("description 长度不能超过 500");
  if (!isStringOrUndefined(raw.buttonText)) errors.push("buttonText 必须是字符串");
  if (raw.buttonText && !isValidTextLength(raw.buttonText as string, 0, 50)) errors.push("buttonText 长度不能超过 50");
  if (!isStringOrUndefined(raw.messagePlaceholder)) errors.push("messagePlaceholder 必须是字符串");
  if (raw.messagePlaceholder && !isValidTextLength(raw.messagePlaceholder as string, 0, 120)) errors.push("messagePlaceholder 长度不能超过 120");
  for (const value of [raw.title, raw.description, raw.buttonText, raw.messagePlaceholder]) {
    if (typeof value === "string" && hasDangerousContent(value)) errors.push("payload 包含非法内容");
  }
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: LeadFormPayload = {
    title: (raw.title as string).trim().slice(0, 100),
    description: raw.description ? (raw.description as string).trim().slice(0, 500) : undefined,
    buttonText: raw.buttonText ? (raw.buttonText as string).trim().slice(0, 50) : undefined,
    messagePlaceholder: raw.messagePlaceholder ? (raw.messagePlaceholder as string).trim().slice(0, 120) : undefined,
  };
  return { valid: true, errors: [], sanitizedPayload: sanitized };
}

function validateGroupTitlePayload(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObject(raw)) {
    return { valid: false, errors: ["payload 必须是对象"] };
  }
  if (!isNonEmptyString(raw.title)) errors.push("title 不能为空");
  if (raw.title && !isValidTextLength(raw.title as string, 1, 100)) errors.push("title 长度必须在 1-100 之间");
  if (raw.title && hasDangerousContent(raw.title as string)) errors.push("title 包含非法内容");
  if (!isStringOrUndefined(raw.subtitle)) errors.push("subtitle 必须是字符串");
  if (raw.subtitle && !isValidTextLength(raw.subtitle as string, 0, 200)) errors.push("subtitle 长度不能超过 200");
  if (raw.subtitle && hasDangerousContent(raw.subtitle as string)) errors.push("subtitle 包含非法内容");
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: GroupTitlePayload = {
    title: (raw.title as string).trim().slice(0, 100),
    subtitle: raw.subtitle ? (raw.subtitle as string).trim().slice(0, 200) : undefined,
  };
  return { valid: true, errors: [], sanitizedPayload: sanitized };
}

function validateQrPayload(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObject(raw)) {
    return { valid: false, errors: ["payload 必须是对象"] };
  }
  if (!isStringOrUndefined(raw.text)) errors.push("text 必须是字符串");
  if (!isStringOrUndefined(raw.url)) errors.push("url 必须是字符串");
  if (!isStringOrUndefined(raw.title)) errors.push("title 必须是字符串");
  if (raw.text && !isValidTextLength(raw.text as string, 1, 500)) errors.push("text 长度必须在 1-500 之间");
  if (raw.url && !isValidHttpUrlLike(raw.url as string)) errors.push("url 必须是有效的 http/https 链接");
  if (raw.url && hasDangerousContent(raw.url as string)) errors.push("url 包含非法内容");
  if (raw.title && !isValidTextLength(raw.title as string, 0, 100)) errors.push("title 长度不能超过 100");
  if (!raw.text && !raw.url) errors.push("text 和 url 至少填写一个");
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: QrPayload = {
    text: raw.text ? (raw.text as string).trim().slice(0, 500) : undefined,
    url: raw.url ? (raw.url as string).trim().slice(0, 2048) : undefined,
    title: raw.title ? (raw.title as string).trim().slice(0, 100) : undefined,
  };
  return { valid: true, errors: [], sanitizedPayload: sanitized };
}

function validateWechatPayload(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObject(raw)) {
    return { valid: false, errors: ["payload 必须是对象"] };
  }
  if (!isStringOrUndefined(raw.wechatId)) errors.push("wechatId 必须是字符串");
  if (!isStringOrUndefined(raw.label)) errors.push("label 必须是字符串");
  if (!isStringOrUndefined(raw.title)) errors.push("title 必须是字符串");
  if (raw.wechatId && !isValidTextLength(raw.wechatId as string, 1, 50)) errors.push("wechatId 长度必须在 1-50 之间");
  if (raw.wechatId && hasDangerousContent(raw.wechatId as string)) errors.push("wechatId 包含非法内容");
  if (raw.label && !isValidTextLength(raw.label as string, 0, 50)) errors.push("label 长度不能超过 50");
  if (raw.title && !isValidTextLength(raw.title as string, 0, 100)) errors.push("title 长度不能超过 100");
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: WechatPayload = {
    wechatId: raw.wechatId ? (raw.wechatId as string).trim().slice(0, 50) : undefined,
    label: raw.label ? (raw.label as string).trim().slice(0, 50) : undefined,
    title: raw.title ? (raw.title as string).trim().slice(0, 100) : undefined,
  };
  return { valid: true, errors: [], sanitizedPayload: sanitized };
}

function validatePhonePayload(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObject(raw)) {
    return { valid: false, errors: ["payload 必须是对象"] };
  }
  if (!isStringOrUndefined(raw.phone)) errors.push("phone 必须是字符串");
  if (!isStringOrUndefined(raw.label)) errors.push("label 必须是字符串");
  if (!isStringOrUndefined(raw.title)) errors.push("title 必须是字符串");
  if (raw.phone && !isValidPhone(raw.phone as string)) errors.push("phone 格式不正确");
  if (raw.label && !isValidTextLength(raw.label as string, 0, 50)) errors.push("label 长度不能超过 50");
  if (raw.title && !isValidTextLength(raw.title as string, 0, 100)) errors.push("title 长度不能超过 100");
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: PhonePayload = {
    phone: raw.phone ? (raw.phone as string).trim().slice(0, 32) : undefined,
    label: raw.label ? (raw.label as string).trim().slice(0, 50) : undefined,
    title: raw.title ? (raw.title as string).trim().slice(0, 100) : undefined,
  };
  return { valid: true, errors: [], sanitizedPayload: sanitized };
}

function validateEmailPayload(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObject(raw)) {
    return { valid: false, errors: ["payload 必须是对象"] };
  }
  if (!isStringOrUndefined(raw.email)) errors.push("email 必须是字符串");
  if (raw.email && !isValidEmail(raw.email as string)) errors.push("email 格式不正确");
  if (!isStringOrUndefined(raw.label)) errors.push("label 必须是字符串");
  if (!isStringOrUndefined(raw.title)) errors.push("title 必须是字符串");
  if (raw.label && !isValidTextLength(raw.label as string, 0, 50)) errors.push("label 长度不能超过 50");
  if (raw.title && !isValidTextLength(raw.title as string, 0, 100)) errors.push("title 长度不能超过 100");
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: EmailPayload = {
    email: raw.email ? (raw.email as string).trim().slice(0, 254) : undefined,
    label: raw.label ? (raw.label as string).trim().slice(0, 50) : undefined,
    title: raw.title ? (raw.title as string).trim().slice(0, 100) : undefined,
  };
  return { valid: true, errors: [], sanitizedPayload: sanitized };
}

function validateAddressPayload(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObject(raw)) {
    return { valid: false, errors: ["payload 必须是对象"] };
  }
  if (!isStringOrUndefined(raw.address)) errors.push("address 必须是字符串");
  if (raw.address && !isValidAddress(raw.address as string)) errors.push("address 长度必须在 2-300 之间");
  if (raw.address && hasDangerousContent(raw.address as string)) errors.push("address 包含非法内容");
  if (!isStringOrUndefined(raw.label)) errors.push("label 必须是字符串");
  if (!isStringOrUndefined(raw.title)) errors.push("title 必须是字符串");
  if (raw.label && !isValidTextLength(raw.label as string, 0, 50)) errors.push("label 长度不能超过 50");
  if (raw.title && !isValidTextLength(raw.title as string, 0, 100)) errors.push("title 长度不能超过 100");
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: AddressPayload = {
    address: raw.address ? (raw.address as string).trim().slice(0, 300) : undefined,
    label: raw.label ? (raw.label as string).trim().slice(0, 50) : undefined,
    title: raw.title ? (raw.title as string).trim().slice(0, 100) : undefined,
  };
  return { valid: true, errors: [], sanitizedPayload: sanitized };
}

function validateMapPayload(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObject(raw)) {
    return { valid: false, errors: ["payload 必须是对象"] };
  }
  if (!isStringOrUndefined(raw.address)) errors.push("address 必须是字符串");
  if (raw.address && !isValidAddress(raw.address as string)) errors.push("address 长度必须在 2-300 之间");
  if (raw.address && hasDangerousContent(raw.address as string)) errors.push("address 包含非法内容");
  if (raw.latitude !== undefined && (typeof raw.latitude !== "number" || raw.latitude < -90 || raw.latitude > 90)) {
    errors.push("latitude 必须是 -90 到 90 之间的数字");
  }
  if (raw.longitude !== undefined && (typeof raw.longitude !== "number" || raw.longitude < -180 || raw.longitude > 180)) {
    errors.push("longitude 必须是 -180 到 180 之间的数字");
  }
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: MapPayload = {
    address: raw.address ? (raw.address as string).trim().slice(0, 300) : undefined,
    latitude: raw.latitude !== undefined ? Number(raw.latitude) : undefined,
    longitude: raw.longitude !== undefined ? Number(raw.longitude) : undefined,
  };
  return { valid: true, errors: [], sanitizedPayload: sanitized };
}

function validateBookingPayload(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObject(raw)) {
    return { valid: false, errors: ["payload 必须是对象"] };
  }
  if (!isStringOrUndefined(raw.title)) errors.push("title 必须是字符串");
  if (!isStringOrUndefined(raw.description)) errors.push("description 必须是字符串");
  if (!isStringOrUndefined(raw.priceText)) errors.push("priceText 必须是字符串");
  if (!isStringOrUndefined(raw.availability)) errors.push("availability 必须是字符串");
  if (!isStringOrUndefined(raw.duration)) errors.push("duration 必须是字符串");
  if (!isStringOrUndefined(raw.buttonText)) errors.push("buttonText 必须是字符串");
  if (raw.title && !isValidTextLength(raw.title as string, 0, 100)) errors.push("title 长度不能超过 100");
  if (raw.description && !isValidTextLength(raw.description as string, 0, 500)) errors.push("description 长度不能超过 500");
  if (raw.priceText && !isValidTextLength(raw.priceText as string, 0, 100)) errors.push("priceText 长度不能超过 100");
  if (raw.availability && !isValidTextLength(raw.availability as string, 0, 200)) errors.push("availability 长度不能超过 200");
  if (raw.duration && !isValidTextLength(raw.duration as string, 0, 100)) errors.push("duration 长度不能超过 100");
  if (raw.buttonText && !isValidTextLength(raw.buttonText as string, 0, 50)) errors.push("buttonText 长度不能超过 50");
  if (raw.coverImageUrl && !isValidImageUrl(raw.coverImageUrl as string)) errors.push("coverImageUrl 必须是可信的图片地址");
  if (raw.requireDate !== undefined && typeof raw.requireDate !== "boolean") errors.push("requireDate 必须是布尔值");
  if (errors.length > 0) return { valid: false, errors };
  const sanitized: BookingPayload = {
    title: raw.title ? (raw.title as string).trim().slice(0, 100) : undefined,
    description: raw.description ? (raw.description as string).trim().slice(0, 500) : undefined,
    priceText: raw.priceText ? (raw.priceText as string).trim().slice(0, 100) : undefined,
    coverImageUrl: raw.coverImageUrl ? (raw.coverImageUrl as string).trim().slice(0, 2048) : undefined,
    availability: raw.availability ? (raw.availability as string).trim().slice(0, 200) : undefined,
    duration: raw.duration ? (raw.duration as string).trim().slice(0, 100) : undefined,
    requireDate: raw.requireDate !== undefined ? Boolean(raw.requireDate) : undefined,
    buttonText: raw.buttonText ? (raw.buttonText as string).trim().slice(0, 50) : undefined,
  };
  return { valid: true, errors: [], sanitizedPayload: sanitized };
}

const VALIDATORS: Record<ProfileModuleType, (raw: unknown) => ValidationResult> = {
  link: validateLinkPayload,
  text: validateTextPayload,
  "group-title": validateGroupTitlePayload,
  qr: validateQrPayload,
  wechat: validateWechatPayload,
  phone: validatePhonePayload,
  email: validateEmailPayload,
  address: validateAddressPayload,
  shop: validatePassthrough,
  booking: validateBookingPayload,
  map: validateMapPayload,
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
  quote: validateLeadFormPayload,
  "contact-form": validateLeadFormPayload,
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
