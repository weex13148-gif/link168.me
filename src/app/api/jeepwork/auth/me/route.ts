import { NextResponse } from "next/server";
import { getJeepworkSessionUser } from "@/lib/jeepwork-auth";

export const runtime = "nodejs";

// 统一错误响应：{ success: false, data: null, error: { code, message } }
function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error: { code, message } }, { status });
}

export async function GET(request: Request) {
  const user = await getJeepworkSessionUser(request);
  if (!user) {
    return apiError("NOT_AUTHORIZED", "未授权", 404);
  }
  const payload = { id: user.id, email: user.email, role: user.role };
  return NextResponse.json({
    success: true,
    data: payload,
    user: payload,
    error: null,
  });
}
