import { NextResponse } from "next/server";

import { getCurrentUserFromRequest } from "@/lib/auth";
import { currentErrorHttpStatus } from "@/lib/current/bootstrap/http";
import { ensureCurrentPersonalRuntime } from "@/lib/current/bootstrap/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ success: false, code: "UNAUTHORIZED", error: "请先登录。" }, { status: 401 });
  }

  const result = await ensureCurrentPersonalRuntime(user.id);
  if (!result.ok) {
    return NextResponse.json(
      { success: false, code: result.error.code, error: result.error.message },
      { status: currentErrorHttpStatus(result.error.code) },
    );
  }

  return NextResponse.json({
    success: true,
    runtime: result.value,
    redirectTo: `/console/pages/${result.value.pageId}`,
  });
}
