import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const PAGE_SIZE = 20;

function normalizeKeyword(raw: unknown) {
  const text = typeof raw === "string" ? raw.trim() : "";
  return text.length > 60 ? text.slice(0, 60) : text;
}

function normalizeRole(raw: unknown) {
  if (typeof raw !== "string") return "";
  if (raw === "user" || raw === "super_admin" || raw === "admin") return raw;
  return "";
}

export async function GET(request: Request) {
  const forbidden = await requireSuperAdmin(request);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
  const keyword = normalizeKeyword(searchParams.get("q"));
  const roleFilter = normalizeRole(searchParams.get("role"));

  const whereItems: Array<Record<string, unknown>> = [];
  if (keyword) {
    whereItems.push({
      OR: [
        { email: { contains: keyword, mode: "insensitive" } },
        { profile: { username: { contains: keyword, mode: "insensitive" } } },
        { profile: { displayName: { contains: keyword, mode: "insensitive" } } },
      ],
    });
  }
  if (roleFilter) whereItems.push({ role: roleFilter });

  const where = whereItems.length > 0 ? { AND: whereItems } : undefined;

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        profile: {
          select: { id: true, username: true, displayName: true, isPublic: true, createdAt: true },
        },
        _count: { select: { sessions: true, aiUsageLogs: true, shortLinks: true } },
      },
    }),
    db.user.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    users: users.map((user) => ({
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role,
      isSystem: Boolean(user.isSystem),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      profile: user.profile
        ? {
            id: user.profile.id,
            username: user.profile.username,
            displayName: user.profile.displayName,
            isPublic: user.profile.isPublic,
            createdAt: user.profile.createdAt,
          }
        : null,
      stats: {
        sessionCount: user._count.sessions,
        shortLinkCount: user._count.shortLinks,
        aiUsageLogCount: user._count.aiUsageLogs,
      },
    })),
  });
}

export async function PATCH(request: Request) {
  const forbidden = await requireSuperAdmin(request);
  if (forbidden) return forbidden;

  const body = (await request.json()) as { id?: unknown; role?: unknown };
  const userId = typeof body.id === "string" ? body.id : "";
  const newRole = normalizeRole(body.role);

  if (!userId) {
    return NextResponse.json({ success: false, error: "缺少用户 ID" }, { status: 400 });
  }
  if (!newRole) {
    return NextResponse.json({ success: false, error: "不支持的角色" }, { status: 400 });
  }

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) {
    return NextResponse.json({ success: false, error: "用户不存在" }, { status: 404 });
  }
  if (target.isSystem) {
    return NextResponse.json({ success: false, error: "系统账号禁止修改角色" }, { status: 400 });
  }

  await db.user.update({ where: { id: userId }, data: { role: newRole } });
  return NextResponse.json({ success: true, message: "角色已更新" });
}
