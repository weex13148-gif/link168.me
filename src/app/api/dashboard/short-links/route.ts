import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { getAnalyticsStats } from "@/lib/analytics/stats";

export const runtime = "nodejs";

const SLUG_PATTERN = /^[a-z0-9-_]{3,32}$/;

// 短链接扩展字段（存储在 payload_json 或独立字段）
// 注意：当前 schema 暂无这些字段，扩展字段使用 jsonb 存储或等待 schema 更新
interface ShortLinkExtensions {
  isEnabled: boolean;
  expiresAt: string | null;
  channelLabel: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  description: string | null;
}

function generateRandomSlug(): string {
  return crypto.randomBytes(6).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6);
}

// 域名黑名单：典型钓鱼 / 恶意软件 / 已知滥用域名。
// 说明：后续可接入第三方 URL 安全 API（Google Safe Browsing / VirusTotal / 腾讯网址安全），
//       这里先做本地启发式拦截。
const MALICIOUS_HOSTNAME_PATTERNS = [
  /(^|\.)phish(ing)?\./i,
  /(^|\.)malware\./i,
  /(^|\.)scam\./i,
  /(^|\.)spy(ware)?\./i,
  /(^|\.)ransom(ware)?\./i,
  /(^|\.)fake-|\.example-test-unsafe\.test$/i,
];

// 内网 / 回环 / 私有网段（Server Side Request Forgery 防护）
function isPrivateHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (["localhost", "localhost.localdomain", "ip6-localhost", "ip6-loopback"].includes(h)) return true;
  if (h === "::1") return true;
  if (h.startsWith("127.")) return true;
  if (h.startsWith("10.")) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)) return true;
  // 常见云环境元数据接口
  if (h === "169.254.169.254" || h === "metadata.google.internal" || h.endsWith(".internal")) return true;
  return false;
}

// 可疑协议：仅允许 http / https
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (!ALLOWED_PROTOCOLS.has(url.protocol)) return false;
    const hostname = url.hostname;
    if (isPrivateHostname(hostname)) return false;
    for (const pattern of MALICIOUS_HOSTNAME_PATTERNS) {
      if (pattern.test(hostname)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const { searchParams } = new URL(request.url);
  const shortLinkId = searchParams.get("id");

  // 如果指定了 ID，返回单条短链接详情
  if (shortLinkId) {
    const shortLink = await db.shortLink.findFirst({
      where: { id: shortLinkId, userId: user.id },
    });
    if (!shortLink) {
      return NextResponse.json({ success: false, error: "短链接不存在。" }, { status: 404 });
    }

    // 获取该短链接的统计
    const profile = await db.profile.findUnique({ where: { userId: user.id } });
    if (!profile) {
      return NextResponse.json({ success: false, error: "用户资料不存在。" }, { status: 400 });
    }

    // TODO: 等待 ShortLinkClick 模型添加后，从该表获取统计
    // 当前使用 LinkClick 统计作为占位

    return NextResponse.json({
      success: true,
      shortLink: {
        id: shortLink.id,
        slug: shortLink.slug,
        targetUrl: shortLink.targetUrl,
        totalClicks: shortLink.totalClicks,
        isEnabled: true, // TODO: 等待 schema 更新
        expiresAt: null, // TODO: 等待 schema 更新
        channelLabel: null, // TODO: 等待 schema 更新
        createdAt: shortLink.createdAt.toISOString(),
        updatedAt: shortLink.updatedAt.toISOString(),
      },
    });
  }

  // 返回用户的全部短链接
  const shortLinks = await db.shortLink.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    shortLinks: shortLinks.map(sl => ({
      id: sl.id,
      slug: sl.slug,
      targetUrl: sl.targetUrl,
      totalClicks: sl.totalClicks,
      isEnabled: true, // TODO: 等待 schema 更新
      expiresAt: null, // TODO: 等待 schema 更新
      channelLabel: null, // TODO: 等待 schema 更新
      createdAt: sl.createdAt.toISOString(),
      updatedAt: sl.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  // IP 限流：60s 内最多创建 30 个短链
  const rl = await rateLimit(request, "short-links:create", 30, 60 * 1000);
  if (!rl.passed) {
    return NextResponse.json(
      { success: false, error: `请求过于频繁，请 ${Math.ceil(rl.resetMs / 1000)} 秒后重试。` },
      { status: 429 },
    );
  }

  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  let body: {
    targetUrl?: unknown;
    customSlug?: unknown;
    channelLabel?: unknown;
    utmSource?: unknown;
    utmMedium?: unknown;
    utmCampaign?: unknown;
    utmContent?: unknown;
    expiresAt?: unknown;
    description?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const rawTargetUrl = typeof body.targetUrl === "string" ? body.targetUrl.trim() : "";
  if (!rawTargetUrl || !isValidUrl(rawTargetUrl)) {
    return NextResponse.json({ success: false, error: "请输入合法的 http(s) 链接。" }, { status: 400 });
  }
  const targetUrl = rawTargetUrl;

  // 验证失效时间
  let expiresAt: Date | null = null;
  if (body.expiresAt) {
    if (typeof body.expiresAt === "string") {
      const parsed = new Date(body.expiresAt);
      if (isNaN(parsed.getTime()) || parsed <= new Date()) {
        return NextResponse.json({ success: false, error: "失效时间必须是未来的日期。" }, { status: 400 });
      }
      expiresAt = parsed;
    }
  }

  // 验证渠道标签长度
  const channelLabel = typeof body.channelLabel === "string" ? body.channelLabel.trim().slice(0, 50) : null;
  const utmSource = typeof body.utmSource === "string" ? body.utmSource.trim().slice(0, 100) : null;
  const utmMedium = typeof body.utmMedium === "string" ? body.utmMedium.trim().slice(0, 100) : null;
  const utmCampaign = typeof body.utmCampaign === "string" ? body.utmCampaign.trim().slice(0, 100) : null;
  const utmContent = typeof body.utmContent === "string" ? body.utmContent.trim().slice(0, 100) : null;
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 200) : null;

  let slug: string;
  const rawCustomSlug = typeof body.customSlug === "string" ? body.customSlug.trim() : "";

  if (rawCustomSlug) {
    if (!SLUG_PATTERN.test(rawCustomSlug)) {
      return NextResponse.json(
        { success: false, error: "自定义链接后缀必须是 3-32 个字符，仅限小写字母、数字、- 和 _。" },
        { status: 400 },
      );
    }
    const existing = await db.shortLink.findUnique({ where: { slug: rawCustomSlug } });
    if (existing) {
      return NextResponse.json({ success: false, error: "该链接后缀已被占用，请换一个。" }, { status: 409 });
    }
    slug = rawCustomSlug;
  } else {
    let attempts = 0;
    let generated = generateRandomSlug();
    while (attempts < 5) {
      const conflict = await db.shortLink.findUnique({ where: { slug: generated } });
      if (!conflict) break;
      generated = generateRandomSlug();
      attempts++;
    }
    slug = generated;
  }

  // TODO: 创建时支持扩展字段（等待 schema 更新）
  const shortLink = await db.shortLink.create({
    data: {
      id: crypto.randomUUID(),
      userId: user.id,
      slug,
      targetUrl,
    },
  });

  return NextResponse.json({
    success: true,
    shortLink: {
      id: shortLink.id,
      slug: shortLink.slug,
      targetUrl: shortLink.targetUrl,
      totalClicks: shortLink.totalClicks,
      isEnabled: true,
      expiresAt: expiresAt?.toISOString() || null,
      channelLabel,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      description,
      createdAt: shortLink.createdAt.toISOString(),
      updatedAt: shortLink.updatedAt.toISOString(),
    },
  });
}
