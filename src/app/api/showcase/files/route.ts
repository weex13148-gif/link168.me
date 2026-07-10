import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SHOWCASE_COOKIE_NAME, getShowcaseConfig, hasValidShowcaseCookie } from "@/lib/showcase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getShowcaseConfig();
  const cookieStore = await cookies();
  const authed = hasValidShowcaseCookie(cookieStore.get(SHOWCASE_COOKIE_NAME)?.value, config);

  if (!config.enabled) {
    return NextResponse.json({ success: false, data: null, error: { code: "SHOWCASE_DISABLED", message: "比赛展示中心暂未启用" } }, { status: 403 });
  }
  if (!authed) {
    return NextResponse.json({ success: false, data: null, error: { code: "PASSWORD_REQUIRED", message: "需要输入比赛访问密码" } }, { status: 401 });
  }

  const files = await db.competitionFile.findMany({
    where: { isDeleted: false },
    orderBy: [{ isCurrentMain: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      purpose: true,
      description: true,
      isCurrentMain: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      files: files.map((file) => ({ ...file, createdAt: file.createdAt.toISOString() })),
    },
    error: null,
  });
}
