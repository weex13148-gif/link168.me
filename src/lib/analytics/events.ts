/**
 * 访问事件处理工具库
 * 处理设备解析、IP哈希、事件去重等
 */
import crypto from "crypto";

// 设备类型
export type DeviceType = "mobile" | "desktop" | "tablet" | "unknown";

// 设备信息结构
export interface DeviceInfo {
  device: DeviceType;
  os: string;
  browser: string;
  ua: string | null;
}

/**
 * 解析 User-Agent 获取设备信息
 */
export function parseDeviceInfo(userAgent: string | null): DeviceInfo {
  const ua = (userAgent || "").toLowerCase();

  let device: DeviceType = "desktop";
  if (/mobile|android|iphone|ipod|windows phone|opera mini|webos/i.test(ua)) {
    device = "mobile";
  } else if (/ipad|tablet|playbook|silk/i.test(ua)) {
    device = "tablet";
  }

  let os = "unknown";
  if (/windows/i.test(ua)) os = "windows";
  else if (/mac os x|macintosh/i.test(ua)) os = "macos";
  else if (/android/i.test(ua)) os = "android";
  else if (/iphone|ipad|ipod|ios/i.test(ua)) os = "ios";
  else if (/linux/i.test(ua)) os = "linux";

  let browser = "unknown";
  if (/edg\//i.test(ua)) browser = "edge";
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = "opera";
  else if (/firefox\//i.test(ua)) browser = "firefox";
  else if (/chrome\//i.test(ua)) browser = "chrome";
  else if (/safari\//i.test(ua) || /version\/.*safari/i.test(ua)) browser = "safari";
  else if (/msie|trident/i.test(ua)) browser = "ie";

  return { device, os, browser, ua: userAgent };
}

/**
 * 获取客户端真实IP（支持代理）
 */
export function getClientIp(request: Request | Request): string {
  const headers = request.headers;
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

/**
 * 对IP进行哈希处理（存储用，不可逆）
 * 仅存储哈希，不存储原始IP
 */
export function hashIp(ip: string): string {
  // 加盐哈希，防止彩虹表攻击
  const salt = process.env.IP_HASH_SALT || "link168_default_salt";
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/**
 * 生成访客唯一标识（基于IP + UA的哈希）
 * 用于去重和独立访客统计
 */
export function generateVisitorId(request: Request | Request): string {
  const ip = getClientIp(request);
  const ua = request.headers.get("user-agent") || "unknown";
  const salt = process.env.VISITOR_ID_SALT || "link168_visitor_salt";
  return crypto.createHash("sha256").update(`${salt}:${ip}:${ua}`).digest("hex").slice(0, 32);
}

/**
 * 检测是否为疑似机器人
 * 简单启发式检测，不依赖外部服务
 */
export function isPotentialBot(request: Request | Request): boolean {
  const ua = request.headers.get("user-agent") || "";

  // 空 User-Agent
  if (!ua.trim()) return true;

  // 常见爬虫/机器人特征
  const botPatterns = [
    /bot/i, /crawl/i, /spider/i, /scrape/i,
    /curl/i, /wget/i, /python-requests/i,
    /httpclient/i, /java\//i, /go-http/i,
    /axios/i, /node-fetch/i, /okhttp/i,
  ];

  for (const pattern of botPatterns) {
    if (pattern.test(ua)) return true;
  }

  // 检测到可能是 headless browser
  if (/headless|phantom|selenium|puppeteer/i.test(ua)) {
    return true;
  }

  return false;
}

/**
 * 事件去重键生成
 * 用于幂等性保证
 */
export function generateEventDedupeKey(
  eventType: string,
  profileId: string,
  visitorId: string,
  timestamp: Date
): string {
  // 精确到分钟的时间戳
  const minuteTimestamp = Math.floor(timestamp.getTime() / 60000);
  return crypto
    .createHash("md5")
    .update(`${eventType}:${profileId}:${visitorId}:${minuteTimestamp}`)
    .digest("hex");
}

export function generateEventDedupeId(
  eventType: string,
  profileId: string,
  visitorId: string,
  timestamp: Date,
): string {
  const key = generateEventDedupeKey(eventType, profileId, visitorId, timestamp);
  return `${key.slice(0, 8)}-${key.slice(8, 12)}-${key.slice(12, 16)}-${key.slice(16, 20)}-${key.slice(20)}`;
}

/**
 * 地区信息结构
 */
export interface GeoInfo {
  country: string | null;
  city: string | null;
  region: string | null;
}

/**
 * 简单的地区解析（基于IP）
 * 注意：生产环境应使用 MaxMind GeoIP 或类似服务
 * 此处仅返回结构，实际解析由外部服务完成
 */
export function parseGeoFromIp(_ip: string): GeoInfo {
  // TODO: 接入真实的 IP 地理位置服务
  // 目前返回空，实际数据由调用方填充
  return {
    country: null,
    city: null,
    region: null,
  };
}
