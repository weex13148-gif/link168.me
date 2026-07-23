import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canShowPublicProfile, getActiveRestrictions } from "@/lib/auth";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ username: string }>;
};

function escapeVCard(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { username } = await context.params;

  const profile = await db.profile.findUnique({
    where: { username: username.trim().toLowerCase() },
    select: {
      userId: true,
      displayName: true,
      username: true,
      bio: true,
      company: true,
      jobTitle: true,
      phone: true,
      email: true,
      wechat: true,
      city: true,
      address: true,
      website: true,
      socialLinks: true,
      contactVisibility: true,
      isPublic: true,
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (!profile.isPublic) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  try {
    const restrictions = await getActiveRestrictions(profile.userId);
    const visibility = canShowPublicProfile(restrictions);
    if (!visibility.ok) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
  } catch {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const contactIsPublic = profile.contactVisibility === "public";

  // vCard 始终提供公开身份；只有明确公开时才附带联系方式。
  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escapeVCard(profile.displayName || profile.username)}`,
    `N:${escapeVCard(profile.displayName || profile.username)};;;;`,
  ];

  if (profile.company) {
    lines.push(`ORG:${escapeVCard(profile.company)}`);
  }
  if (profile.jobTitle) {
    lines.push(`TITLE:${escapeVCard(profile.jobTitle)}`);
  }
  if (contactIsPublic && profile.phone) {
    lines.push(`TEL;TYPE=CELL:${escapeVCard(profile.phone)}`);
  }
  if (contactIsPublic && profile.email) {
    lines.push(`EMAIL;TYPE=INTERNET:${escapeVCard(profile.email)}`);
  }
  if (contactIsPublic && profile.wechat) {
    lines.push(`X-WECHAT:${escapeVCard(profile.wechat)}`);
  }
  if (contactIsPublic && (profile.city || profile.address)) {
    const parts = ["", "", "", profile.city || "", ""];
    if (profile.address) {
      parts[2] = escapeVCard(profile.address);
    }
    lines.push(`ADR;TYPE=WORK:${parts.join(";")}`);
  }
  if (contactIsPublic && profile.website) {
    lines.push(`URL:${escapeVCard(profile.website)}`);
  }
  if (profile.bio) {
    lines.push(`NOTE:${escapeVCard(profile.bio)}`);
  }

  // 社交链接
  if (contactIsPublic && profile.socialLinks && typeof profile.socialLinks === "object" && profile.socialLinks !== null) {
    const socials = profile.socialLinks as Record<string, string>;
    for (const [platform, url] of Object.entries(socials)) {
      if (typeof url === "string" && url.trim()) {
        lines.push(`X-SOCIALPROFILE;TYPE=${escapeVCard(platform)}:${escapeVCard(url.trim())}`);
      }
    }
  }

  lines.push("END:VCARD");

  const vcard = lines.join("\r\n");

  return new NextResponse(vcard, {
    status: 200,
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(profile.username)}.vcf"`,
    },
  });
}
