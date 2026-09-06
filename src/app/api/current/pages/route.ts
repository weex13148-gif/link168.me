import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { listCurrentPagesForActor } from "@/lib/current/page-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ success: false, code: "UNAUTHORIZED", error: "请先登录。" }, { status: 401 });
  }

  const result = await listCurrentPagesForActor(user.id);
  if (!result.ok) {
    if (result.error.code === "NOT_FOUND") {
      return NextResponse.json({ success: true, pages: [] });
    }
    return NextResponse.json(
      { success: false, code: result.error.code, error: result.error.message },
      { status: result.error.code === "UNAUTHORIZED" ? 401 : 500 },
    );
  }

  return NextResponse.json({ success: true, pages: result.value });
}
