// V2-002：URL / 电话 / 地图 协议统一安全白名单
// 职责：
//  - API 写入侧对提交的 URL 进行协议校验与规范化
//  - Renderer 输出侧再次校验，防止数据库中已污染的内容被执行
//  - 协议白名单仅允许 http / https / tel / mailto + 受控地图服务参数
//  - 禁止 javascript: / data: / vbscript: / file: / ftp: 等危险协议

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
  const idx = trimmed.indexOf(":");
  if (idx <= 0 || idx > 20) return null;
  return trimmed.slice(0, idx).toLowerCase();
}

// 清洗普通链接（LINK / PRODUCT / BOOKING）：仅 http / https
export function sanitizePublicUrl(raw: string | null | undefined): SanitizedUrl {
  if (!raw || typeof raw !== "string") return { safe: false, url: null, sanitized: false };
  const trimmed = raw.trim();
  if (!trimmed) return { safe: false, url: null, sanitized: false };

  // 无协议：默认添加 https://
  if (!/^[A-Za-z][A-Za-z0-9+\-.]*:/.test(trimmed)) {
    return { safe: true, url: `https://${trimmed}`, sanitized: true, hint: "auto-prepend-https" };
  }

  const protocol = detectProtocol(trimmed);
  if (!protocol) return { safe: false, url: null, sanitized: false };
  if (DANGEROUS_PROTOCOLS.has(protocol)) return { safe: false, url: null, sanitized: false, hint: `blocked-${protocol}` };
  if (!ALLOWED_WEB_PROTOCOLS.has(protocol)) return { safe: false, url: null, sanitized: false, hint: `unsupported-${protocol}` };

  // URL 合法性：使用 WHATWG URL 基础验证
  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname) return { safe: false, url: null, sanitized: false, hint: "no-hostname" };
    return { safe: true, url: parsed.toString(), sanitized: false };
  } catch {
    return { safe: false, url: null, sanitized: false, hint: "invalid-url" };
  }
}

// 清洗电话号码 → 只保留数字与 +-() 符号，渲染时再生成 tel:
export function sanitizePhoneNumber(raw: string | null | undefined): { safe: boolean; phone: string | null; telUrl: string | null } {
  if (!raw || typeof raw !== "string") return { safe: false, phone: null, telUrl: null };
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (cleaned.length < 5 || cleaned.length > 20) return { safe: false, phone: null, telUrl: null };
  return { safe: true, phone: cleaned, telUrl: `tel:${cleaned}` };
}

// 清洗邮箱地址 → 合法邮箱再生成 mailto:
export function sanitizeMailUrl(raw: string | null | undefined): { safe: boolean; mail: string | null; mailtoUrl: string | null } {
  if (!raw || typeof raw !== "string") return { safe: false, mail: null, mailtoUrl: null };
  const mail = raw.trim().toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(mail)) return { safe: false, mail: null, mailtoUrl: null };
  return { safe: true, mail, mailtoUrl: `mailto:${mail}` };
}

// 地图链接：只允许已受控域名的 http / https 链接
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
    return { safe: true, url: parsed.toString(), sanitized: false };
  } catch {
    return { safe: false, url: null, sanitized: false, hint: "invalid-url" };
  }
}

// 二维码：二维码数据本身不自动打开任何外部协议，只允许普通文本与 URL
export function sanitizeQrPayload(raw: string | null | undefined): { safe: boolean; payload: string | null } {
  if (!raw || typeof raw !== "string") return { safe: false, payload: null };
  const trimmed = raw.trim();
  if (!trimmed) return { safe: false, payload: null };
  // 若包含协议前缀：必须 http / https
  if (/^[A-Za-z][A-Za-z0-9+\-.]*:/.test(trimmed)) {
    const protocol = detectProtocol(trimmed);
    if (!protocol) return { safe: false, payload: null };
    if (DANGEROUS_PROTOCOLS.has(protocol)) return { safe: false, payload: null };
    if (!ALLOWED_WEB_PROTOCOLS.has(protocol)) return { safe: false, payload: null };
  }
  // 控制字符清洗
  const clean = trimmed.replace(/[\u0000-\u001F\u007F]/g, "");
  if (clean.length > 2000) return { safe: false, payload: null };
  return { safe: true, payload: clean };
}

// 组件级别：根据 componentType 选择清洗函数
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
    case "link":
    case "shop":
    case "booking":
    default:
      return sanitizePublicUrl(rawUrl);
    case "text":
    case "group-title":
    case "wechat":
      return { safe: true, payload: rawPayload };
  }
}
