import { NextResponse } from "next/server";
import { canShowPublicProfile, getActiveRestrictions } from "@/lib/auth";
import { toPublicAiReceptionConfig } from "@/lib/ai/reception-config";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ username: string }>;
};

function unavailable(status = 404) {
  return NextResponse.json(
    { success: false, error: "AI 接待暂未开启。" },
    { status, headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } },
  );
}

export async function GET(_request: Request, context: RouteContext) {
  const { username: rawUsername } = await context.params;
  const username = rawUsername.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!username) return unavailable();

  const profile = await db.profile.findUnique({
    where: { username },
    select: {
      id: true,
      userId: true,
      username: true,
      isPublic: true,
      user: {
        select: {
          emailVerified: true,
          aiServiceConfig: true,
        },
      },
      links: {
        where: { type: "ai-chat", isActive: true },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!profile || !profile.isPublic) return unavailable();
  if (!profile.user.emailVerified) return unavailable(403);
  if (!profile.user.aiServiceConfig?.enabled) return unavailable();
  if (profile.links.length === 0) return unavailable();

  try {
    const restrictions = await getActiveRestrictions(profile.userId);
    if (!canShowPublicProfile(restrictions).ok) return unavailable(403);
  } catch {
    return NextResponse.json(
      { success: false, error: "AI 服务暂不可用，请稍后再试。" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { success: true, config: toPublicAiReceptionConfig(profile.user.aiServiceConfig) },
    { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } },
  );
}
