import { NextResponse } from "next/server";
import { requireJeepworkAdmin } from "@/lib/jeepwork-auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const PAGE_SIZE = 20;

function normalizeKeyword(raw: unknown) {
  const text = typeof raw === "string" ? raw.trim() : "";
  return text.length > 60 ? text.slice(0, 60) : text;
}

export async function GET(request: Request) {
  const forbidden = await requireJeepworkAdmin(request);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
  const keyword = normalizeKeyword(searchParams.get("q"));
  const visibilityRaw = searchParams.get("visibility");
  const visibility =
    visibilityRaw === "public"
      ? true
      : visibilityRaw === "hidden"
      ? false
      : null;

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
  if (visibility !== null) {
    whereItems.push({ isPublic: visibility });
  }
  const where = whereItems.length > 0 ? { AND: whereItems } : undefined;

  const [profiles, total] = await Promise.all([
    db.profile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { id: true, email: true, role: true, isSystem: true, emailVerified: true } },
        links: { where: { isActive: true }, select: { id: true } },
      },
    }),
    db.profile.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      total,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      profiles: profiles.map((profile) => ({
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        bio: profile.bio,
        isPublic: profile.isPublic,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
        // 安全：管理员后台可查看用户基本信息，但不应暴露敏感字段
        // 邮箱、角色、isSystem 等信息应在用户详情接口中按权限分级返回
        user: profile.user
          ? {
              id: profile.user.id,
              // 安全：列表页不返回邮箱，详情页按权限返回
              emailVerified: profile.user.emailVerified,
              role: profile.user.role,
              isSystem: Boolean(profile.user.isSystem),
            }
          : null,
        linkCount: (profile.links || []).length,
      })),
    },
    error: null,
  });
}

// P0-5: profiles/route.ts 已不再处理写操作。
// 唯一写入口为 profiles/[username]/route.ts。
// 本函数保留并返回明确指引，前端应统一调用 /api/jeepwork/profiles/{username}
export async function PATCH(request: Request) {
  const forbidden = await requireJeepworkAdmin(request);
  if (forbidden) return forbidden;

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "WRITE_ENDPOINT_RELOCATED",
        message: "主页写操作已迁移至 /api/jeepwork/profiles/{username}，请使用 hide-profile / restore-profile 等 action 参数",
      },
    },
    { status: 409 },
  );
}
