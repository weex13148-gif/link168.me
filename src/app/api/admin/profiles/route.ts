import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const PAGE_SIZE = 20;

function normalizeKeyword(raw: unknown) {
  const text = typeof raw === "string" ? raw.trim() : "";
  return text.length > 60 ? text.slice(0, 60) : text;
}

function normalizeVisibility(raw: unknown) {
  if (raw === "public") return "public" as const;
  if (raw === "hidden") return "hidden" as const;
  return "";
}

export async function GET(request: Request) {
  const forbidden = await requireSuperAdmin(request);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
  const keyword = normalizeKeyword(searchParams.get("q"));
  const visibility = normalizeVisibility(searchParams.get("visibility"));

  const whereItems: Array<Record<string, unknown>> = [];
  if (keyword) {
    whereItems.push({
      OR: [
        { username: { contains: keyword, mode: "insensitive" } },
        { displayName: { contains: keyword, mode: "insensitive" } },
        { bio: { contains: keyword, mode: "insensitive" } },
        { user: { email: { contains: keyword, mode: "insensitive" } } },
      ],
    });
  }
  if (visibility === "public") whereItems.push({ isPublic: true });
  if (visibility === "hidden") whereItems.push({ isPublic: false });

  const where = whereItems.length > 0 ? { AND: whereItems } : undefined;

  const [profiles, total] = await Promise.all([
    db.profile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { id: true, email: true, role: true, isSystem: true, emailVerified: true } },
        _count: { select: { links: true } },
      },
    }),
    db.profile.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    profiles: profiles.map((profile) => ({
      id: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      bio: profile.bio,
      theme: profile.theme,
      language: profile.language,
      isPublic: profile.isPublic,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      user: profile.user
        ? {
            id: profile.user.id,
            email: profile.user.email,
            emailVerified: profile.user.emailVerified,
            role: profile.user.role,
            isSystem: Boolean(profile.user.isSystem),
          }
        : null,
      linkCount: profile._count.links,
    })),
  });
}
