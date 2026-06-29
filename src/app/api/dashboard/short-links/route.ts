import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { isPlaceholderHandle } from "@/lib/handle";

export const runtime = "nodejs";

const SLUG_PATTERN = /^[a-z0-9_-]{3,32}$/;
const RESERVED_SLUGS = new Set(["admin", "api", "login", "register", "dashboard", "help", "report"]);
const MAX_TARGET_URL_LENGTH = 2048;

function generateRandomSlug(): string {
  return crypto.randomBytes(9).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (["localhost", "0.0.0.0", "127.0.0.1", "::1"].includes(host)) return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (/^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  return false;
}

function normalizeTargetUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_TARGET_URL_LENGTH) return "";

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    if (!url.hostname || url.username || url.password || isBlockedHostname(url.hostname)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function isUniqueConflict(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}

export async function GET(request: NextRequest) {
  const { user, response } = await requireUser(request);
  if (response || !user) return response;

  const shortLinks = await db.shortLink.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      targetUrl: true,
      totalClicks: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ success: true, shortLinks });
}

export async function POST(request: NextRequest) {
  const rl = rateLimit(request, "short-links:create", 10, 60 * 1000);
  if (!rl.passed) {
    return NextResponse.json(
      { success: false, error: `请求过于频繁，请 ${Math.ceil(rl.resetMs / 1000)} 秒后重试。` },
      { status: 429 },
    );
  }

  const { user, response } = await requireUser(request);
  if (response || !user) return response;

  const profile = await db.profile.findUnique({ where: { userId: user.id }, select: { isPublic: true, username: true } });
  if (!profile || !profile.isPublic || isPlaceholderHandle(profile.username)) {
    return NextResponse.json({ success: false, error: "请先完成并公开主页，再创建短链接。" }, { status: 403 });
  }

  let body: { targetUrl?: unknown; customSlug?: unknown };
  try {
    body = (await request.json()) as { targetUrl?: unknown; customSlug?: unknown };
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const targetUrl = normalizeTargetUrl(body.targetUrl);
  if (!targetUrl) {
    return NextResponse.json({ success: false, error: "请输入可公开访问的 http(s) 链接。" }, { status: 400 });
  }

  const customSlug = typeof body.customSlug === "string" ? body.customSlug.trim().toLowerCase() : "";
  if (customSlug && (!SLUG_PATTERN.test(customSlug) || RESERVED_SLUGS.has(customSlug))) {
    return NextResponse.json(
      { success: false, error: "自定义链接后缀需为 3-32 位小写字母、数字、- 或 _，且不能使用系统保留词。" },
      { status: 400 },
    );
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const slug = customSlug || generateRandomSlug();
    try {
      const shortLink = await db.shortLink.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          slug,
          targetUrl,
        },
        select: {
          id: true,
          slug: true,
          targetUrl: true,
          totalClicks: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return NextResponse.json({ success: true, shortLink });
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
      if (customSlug) {
        return NextResponse.json({ success: false, error: "该链接后缀已被占用，请换一个。" }, { status: 409 });
      }
    }
  }

  return NextResponse.json({ success: false, error: "短链接生成失败，请稍后重试。" }, { status: 503 });
}
