import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { sanitizePublicUrl } from "@/lib/public-url-security";
import dns from "dns";
import { promisify } from "util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQUEST_TIMEOUT = 5000;
const MAX_RESPONSE_SIZE = 100 * 1024;

const lookupAsync = promisify(dns.lookup);

function isPrivateIp(ip: string): boolean {
  if (!ip) return true;

  if (ip === "127.0.0.1" || ip === "localhost" || ip === "::1") return true;

  if (ip === "169.254.169.254") return true;

  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return true;

  if (parts[0] === 10) return true;

  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

  if (parts[0] === 192 && parts[1] === 168) return true;

  if (parts[0] === 0) return true;

  return false;
}

async function resolveHostname(hostname: string): Promise<string> {
  try {
    const result = await lookupAsync(hostname);
    return result.address;
  } catch {
    throw new Error("无法解析域名");
  }
}

async function fetchFaviconWithTimeout(url: string, timeout: number): Promise<{ buffer: Buffer; contentType: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Link168 Favicon Fetcher)",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType && !contentType.startsWith("image/") && !contentType.includes("octet-stream")) {
      throw new Error("无效的内容类型");
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
      throw new Error("文件过大");
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("无法读取响应");

    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalSize += value.length;
        if (totalSize > MAX_RESPONSE_SIZE) {
          throw new Error("文件过大");
        }
        chunks.push(value);
      }
    }

    const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    return { buffer, contentType: contentType || "image/x-icon" };
  } finally {
    clearTimeout(timeoutId);
  }
}

function bufferToDataUrl(buffer: Buffer, contentType: string): string {
  const base64 = buffer.toString("base64");
  return `data:${contentType};base64,${base64}`;
}

export async function POST(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  let body: { url?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const rawUrl = typeof body.url === "string" ? body.url.trim() : "";
  if (!rawUrl) {
    return NextResponse.json({ success: false, error: "请提供网址。" }, { status: 400 });
  }

  const cleaned = sanitizePublicUrl(rawUrl);
  if (!cleaned.safe || !cleaned.url) {
    return NextResponse.json({ success: false, error: "网址格式不正确。" }, { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(cleaned.url);
  } catch {
    return NextResponse.json({ success: false, error: "网址格式不正确。" }, { status: 400 });
  }

  if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
    return NextResponse.json({ success: false, error: "仅支持 http 或 https 协议。" }, { status: 400 });
  }

  const hostname = targetUrl.hostname;

  try {
    const ip = await resolveHostname(hostname);
    if (isPrivateIp(ip)) {
      return NextResponse.json({ success: false, error: "无法访问该网址。" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ success: false, error: "无法解析域名。" }, { status: 400 });
  }

  const faviconUrls = [
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`,
    `${targetUrl.protocol}//${targetUrl.host}/favicon.ico`,
  ];

  let lastError: Error | null = null;

  for (const faviconUrl of faviconUrls) {
    try {
      let fetchUrl = faviconUrl;

      if (!faviconUrl.startsWith("https://www.google.com/s2/favicons")) {
        const favUrl = new URL(faviconUrl);
        const favIp = await resolveHostname(favUrl.hostname);
        if (isPrivateIp(favIp)) {
          continue;
        }
      }

      const { buffer, contentType } = await fetchFaviconWithTimeout(fetchUrl, REQUEST_TIMEOUT);

      if (buffer.length < 100) {
        continue;
      }

      const dataUrl = bufferToDataUrl(buffer, contentType || "image/x-icon");

      return NextResponse.json({
        success: true,
        favicon: dataUrl,
        source: faviconUrl.startsWith("https://www.google.com/s2/favicons") ? "google" : "direct",
      });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      continue;
    }
  }

  return NextResponse.json({
    success: false,
    error: "无法获取网站图标，请稍后重试。",
    details: lastError?.message,
  }, { status: 400 });
}
