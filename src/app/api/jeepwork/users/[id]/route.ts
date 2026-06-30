import { NextResponse } from "next/server";
import { requireJeepworkSuperAdmin } from "@/lib/jeepwork-auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error: { code, message } }, { status });
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  const { id: userId } = await context.params;

  if (!userId) return apiError("BAD_PARAMS", "缺少用户 ID", 400);

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      profile: {
        select: {
          id: true,
          username: true,
          displayName: true,
          isPublic: true,
          createdAt: true,
        },
      },
      usernameHistory: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      freezeRecords: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      _count: {
        select: { sessions: true, shortLinks: true, aiUsageLogs: true },
      },
    },
  });

  if (!user) return apiError("NOT_FOUND", "用户不存在", 404);

  // 获取该用户的最近操作审计日志（最近50条）
  const auditLogs = await db.adminAuditLog.findMany({
    where: { targetId: userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      actorEmail: true,
      actorRole: true,
      action: true,
      targetType: true,
      targetId: true,
      success: true,
      metadataRaw: true,
      ipHash: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role,
      isSystem: user.isSystem,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      profile: user.profile,
      usernameHistory: user.usernameHistory.map((h) => ({
        id: h.id,
        username: h.username,
        normalizedUsername: h.normalizedUsername,
        createdAt: h.createdAt,
      })),
      restrictions: user.freezeRecords.map((r) => ({
        id: r.id,
        type: r.type,
        reason: r.reason,
        source: r.source,
        isActive: r.isActive,
        startsAt: r.startsAt,
        expiresAt: r.expiresAt,
        clearedAt: r.clearedAt,
        createdAt: r.createdAt,
      })),
      stats: {
        sessionCount: user._count.sessions,
        shortLinkCount: user._count.shortLinks,
        aiUsageLogCount: user._count.aiUsageLogs,
      },
      recentAuditLogs: auditLogs.map((log) => ({
        id: log.id,
        actorEmail: log.actorEmail,
        actorRole: log.actorRole,
        action: log.action,
        success: log.success,
        metadataRaw: log.metadataRaw,
        ipHash: log.ipHash ? "(已屏蔽)" : null,
        createdAt: log.createdAt,
      })),
    },
    error: null,
  });
}
