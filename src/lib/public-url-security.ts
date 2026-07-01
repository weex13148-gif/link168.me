// V1 公共链接安全校验：写入和渲染统一使用同一套规则。

export type SanitizedUrl = {
  safe: boolean;
  url: string | null;
  sanitized: boolean;
  hint?: string;
  phone?: string | null;
  telUrl?: string | null;
};

const DANGEROUS_PROTOCOLS = new Set([
  "javascript",
  "data",
  "vbscript",
  "file",
  "ftp",
  "sftp",
  "blob",
  "about",
]);

const ALLOWED_WEB_PROTOCOLS = new Set(["http", "https"]);

function detectProtocol(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const index = trimmed.indexOf(":");
  if (index <= 0 || index > 20) return null;
  return trimmed.slice(0, index).toLowerCase();
}

function isValidPublicHostname(hostname: string) {
  const host = hostname.trim().toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".local")) return false;
  if (host === "0.0.0.0" || host === "127.0.0.1" || host === "::1") return false;
  if (host.startsWith("10.") || host.startsWith("192.168.") || host.startsWith("169.254.")) return false;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return false;

  // 普通域名必须至少包含一个点，避免把 https://link168/ 之类错误地址保存为有效网址。
  if (!host.includes(".")) return false;
  if (host.startsWith(".") || host.endsWith(".") || host.includes("..")) return false;
  return true;
}

export function sanitizePublicUrl(raw: string | null | undefined): SanitizedUrl {
  if (!raw || typeof raw !== "string") return { safe: false, url: null, sanitized: false, hint: "empty" };
  const trimmed = raw.trim();
  if (!trimmed) return { safe: false, url: null, sanitized: false, hint: "empty" };

  const candidate = /^[A-Za-z][A-Za-z0-9+\-.]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;
  const protocol = detectProtocol(candidate);
  if (!protocol) return { safe: false, url: null, sanitized: false, hint: "missing-protocol" };
  if (DANGEROUS_PROTOCOLS.has(protocol)) return { safe: false, url: null, sanitized: false, hint: `blocked-${protocol}` };
  if (!ALLOWED_WEB_PROTOCOLS.has(protocol)) return { safe: false, url: null, sanitized: false, hint: `unsupported-${protocol}` };

  try {
    const parsed = new URL(candidate);
    if (!isValidPublicHostname(parsed.hostname)) {
      return { safe: false, url: null, sanitized: false, hint: "invalid-hostname" };
    }
    return {
      safe: true,
      url: parsed.toString(),
      sanitized: candidate !== trimmed,
      hint: candidate !== trimmed ? "auto-prepend-https" : undefined,
    };
  } catch {
    return { safe: false, url: null, sanitized: false, hint: "invalid-url" };
  }
}

export function sanitizePhoneNumber(raw: string | null | undefined): { safe: boolean; phone: string | null; telUrl: string | null } {
  if (!raw || typeof raw !== "string") return { safe: false, phone: null, telUrl: null };
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (cleaned.length < 5 || cleaned.length > 20) return { safe: false, phone: null, telUrl: null };
  return { safe: true, phone: cleaned, telUrl: `tel:${cleaned}` };
}

export function sanitizeMailUrl(raw: string | null | undefined): { safe: boolean; mail: string | null; mailtoUrl: string | null } {
  if (!raw || typeof raw !== "string") return { safe: false, mail: null, mailtoUrl: null };
  const mail = raw.trim().toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(mail)) return { safe: false, mail: null, mailtoUrl: null };
  return { safe: true, mail, mailtoUrl: `mailto:${mail}` };
}

const ALLOWED_MAP_HOSTS = new Set([
  "maps.google.com",
  "www.google.com",
  "ditu.amap.com",
  "www.amap.com",
  "uri.amap.com",
  "map.baidu.com",
  "api.map.baidu.com",
  "maps.apple.com",
  "lbs.qq.com",
]);

export function sanitizeMapUrl(raw: string | null | undefined): SanitizedUrl {
  const web = sanitizePublicUrl(raw);
  if (!web.safe || !web.url) return { safe: false, url: null, sanitized: false, hint: "not-http" };
  try {
    const parsed = new URL(web.url);
    if (!ALLOWED_MAP_HOSTS.has(parsed.hostname.toLowerCase())) {
      return { safe: false, url: null, sanitized: false, hint: "unsupported-map-host" };
    }
    return { safe: true, url: parsed.toString(), sanitized: web.sanitized };
  } catch {
    return { safe: false, url: null, sanitized: false, hint: "invalid-url" };
  }
}

export function sanitizeQrPayload(raw: string | null | undefined): { safe: boolean; payload: string | null } {
  if (!raw || typeof raw !== "string") return { safe: false, payload: null };
  const trimmed = raw.trim();
  if (!trimmed) return { safe: false, payload: null };
  if (/^[A-Za-z][A-Za-z0-9+\-.]*:/.test(trimmed)) {
    const protocol = detectProtocol(trimmed);
    if (!protocol || DANGEROUS_PROTOCOLS.has(protocol) || !ALLOWED_WEB_PROTOCOLS.has(protocol)) {
      return { safe: false, payload: null };
    }
    const checked = sanitizePublicUrl(trimmed);
    if (!checked.safe || !checked.url) return { safe: false, payload: null };
    return { safe: true, payload: checked.url };
  }
  const clean = trimmed.replace(/[\u0000-\u001F\u007F]/g, "");
  if (clean.length > 2000) return { safe: false, payload: null };
  return { safe: true, payload: clean };
}

export type LinkComponentType = "link" | "text" | "group-title" | "qr" | "wechat" | "phone" | "shop" | "booking" | "map";

export function sanitizeLinkPayload(componentType: string | null | undefined, rawUrl: string | null | undefined, rawPayload: unknown): SanitizedUrl | { safe: boolean; payload?: unknown } {
  const type = (componentType || "link").toLowerCase();
  switch (type) {
    case "phone": {
      const phone = sanitizePhoneNumber(rawUrl);
      return { safe: phone.safe, url: phone.telUrl, sanitized: true, phone: phone.phone, telUrl: phone.telUrl };
    }
    case "map":
      return sanitizeMapUrl(rawUrl);
    case "qr":
      return sanitizeQrPayload(typeof rawPayload === "string" ? rawPayload : rawUrl);
    case "text":
    case "group-title":
    case "wechat":
      return { safe: true, payload: rawPayload };
    default:
      return sanitizePublicUrl(rawUrl);
  }
}
