import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import {
  getCurrentUserFromRequest,
  deactivateUserAccount,
  clearSessionCookie,
} from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type DeactivateRequest = {
  password?: unknown;
  reason?: unknown;
};

export async function POST(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ success: false, error: "请先登录。" }, { status: 401 });
  }

  let body: DeactivateRequest;
  try {
    body = (await request.json()) as DeactivateRequest;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : undefined;

  if (!password) {
    return NextResponse.json({ success: false, error: "请输入密码确认注销。" }, { status: 400 });
  }

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true, accountStatus: true, isSystem: true },
  });

  if (!dbUser) {
    return NextResponse.json({ success: false, error: "用户不存在。" }, { status: 404 });
  }

  if (dbUser.isSystem) {
    return NextResponse.json({ success: false, error: "系统账号不可注销。" }, { status: 403 });
  }

  if (dbUser.accountStatus === "deactivated") {
    return NextResponse.json({ success: false, error: "账号已注销。" }, { status: 403 });
  }

  const valid = await bcrypt.compare(password, dbUser.passwordHash);
  if (!valid) {
    return NextResponse.json({ success: false, error: "密码错误。" }, { status: 401 });
  }

  const success = await deactivateUserAccount(user.id, reason);
  if (!success) {
    return NextResponse.json({ success: false, error: "注销失败，请稍后重试。" }, { status: 500 });
  }

  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
