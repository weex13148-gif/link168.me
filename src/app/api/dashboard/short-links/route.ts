import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const SLUG_PATTERN = /^[a-z0-9-_]{3,32}$/;

function generateRandomSlug(): string {
  return crypto.randomBytes(6).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6);
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
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
  const { user, response } = await requireUser(request);
  if (response || !user) return response;

  let body: { targetUrl?: unknown; customSlug?: unknown };
  try {
    body = (await request.json()) as { targetUrl?: unknown; customSlug?: unknown };
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const targetUrl = typeof body.targetUrl === "string" ? body.targetUrl.trim() : "";
  if (!targetUrl || !isValidUrl(targetUrl)) {
    return NextResponse.json({ success: false, error: "A valid http(s) target URL is required." }, { status: 400 });
  }

  let slug: string;
  const rawCustomSlug = typeof body.customSlug === "string" ? body.customSlug.trim() : "";

  if (rawCustomSlug) {
    if (!SLUG_PATTERN.test(rawCustomSlug)) {
      return NextResponse.json(
        { success: false, error: "Custom slug must be 3-32 characters and contain only a-z, 0-9, - and _." },
        { status: 400 },
      );
    }
    const existing = await db.shortLink.findUnique({ where: { slug: rawCustomSlug } });
    if (existing) {
      return NextResponse.json({ success: false, error: "Slug is already in use." }, { status: 409 });
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
