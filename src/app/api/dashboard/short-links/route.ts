import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const SLUG_PATTERN = /^[a-z0-9-_]{3,32}$/;

function generateRandomSlug(): string {
  return crypto.randomBytes(6).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6);
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    // 禁止指向常见内网地址
    const hostname = url.hostname.toLowerCase();
    if (["localhost", "127.0.0.1", "::1"].includes(hostname)) return false;
    if (hostname.startsWith("192.168.") || hostname.startsWith("10.") || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const { user, response } = await requireUser(request);
  if (response || !user) return response;

  const shortLinks = await db.shortLink.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, shortLinks });
}

export async function POST(request: NextRequest) {
  // IP 限流：60s 内最多创建 30 个短链
  const rl = rateLimit(request, "short-links:create", 30, 60 * 1000);
  if (!rl.passed) {
    return NextResponse.json(
      { success: false, error: `请求过于频繁，请 ${Math.ceil(rl.resetMs / 1000)} 秒后重试。` },
      { status: 429 },
    );
  }

  const { user, response } = await requireUser(request);
  if (response || !user) return response;

  let body: { targetUrl?: unknown; customSlug?: unknown };
  try {
    body = (await request.json()) as { targetUrl?: unknown; customSlug?: unknown };
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const rawTargetUrl = typeof body.targetUrl === "string" ? body.targetUrl.trim() : "";
  if (!rawTargetUrl || !isValidUrl(rawTargetUrl)) {
    return NextResponse.json({ success: false, error: "请输入合法的 http(s) 链接。" }, { status: 400 });
  }
  const targetUrl = rawTargetUrl;

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

  const shortLink = await db.shortLink.create({
    data: {
      id: crypto.randomUUID(),
      userId: user.id,
      slug,
      targetUrl,
    },
  });

  return NextResponse.json({ success: true, shortLink });
}
