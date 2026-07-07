import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getJeepworkSessionUser, requireJeepworkAdmin } from "@/lib/jeepwork-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export async function GET(request: Request) {
  const forbidden = await requireJeepworkAdmin(request);
  if (forbidden) return forbidden;

  const actor = await getJeepworkSessionUser(request);
  if (!actor) {
    return NextResponse.json(
      { success: false, data: null, error: { code: "UNAUTHORIZED", message: "未授权" } },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const keyword = (url.searchParams.get("q") || "").trim().slice(0, 80);
  const requestedRole = url.searchParams.get("role") || "";
  const role = actor.role === "super_admin"
    ? requestedRole
    : "user";

  const where = {
    AND: [
      keyword
        ? {
            OR: [
              { email: { contains: keyword, mode: "insensitive" as const } },
              { profile: { username: { contains: keyword, mode: "insensitive" as const } } },
              { profile: { displayName: { contains: keyword, mode: "insensitive" as const } } },
            ],
          }
        : {},
      role === "super_admin" || role === "admin" || role === "user" ? { role } : {},
    ],
  };

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        emailVerified: true,
        role: true,
        isSystem: true,
        createdAt: true,
        profile: { select: { username: true, displayName: true, avatarUrl: true, isPublic: true } },
        membershipSubscription: {
          select: {
            planCode: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            updatedAt: true,
          },
        },
        sessions: {
          orderBy: { lastActive: "desc" },
          take: 1,
          select: { lastActive: true, ipAddress: true },
        },
        freezeRecords: {
          where: { isActive: true },
          take: 5,
          select: { type: true, reason: true, expiresAt: true },
        },
      },
    }),
    db.user.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
        isSystem: Boolean(user.isSystem),
        createdAt: user.createdAt,
        profile: user.profile,
        membership: user.membershipSubscription || {
          planCode: "free",
          status: "inactive",
          currentPeriodStart: null,
          currentPeriodEnd: null,
          updatedAt: null,
        },
        lastLoginAt: user.sessions[0]?.lastActive || null,
        lastLoginIp: actor.role === "super_admin" ? user.sessions[0]?.ipAddress || null : null,
        restrictions: user.freezeRecords,
      })),
      permissions: {
        canManageMembership: true,
        canViewRawIp: actor.role === "super_admin",
        canViewAllRoles: actor.role === "super_admin",
      },
    },
    error: null,
  }, {
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}
