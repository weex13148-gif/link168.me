import { NextResponse } from "next/server";
import { requireUser, changePassword, revokeAllOtherSessions, SESSION_COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";

type ChangePasswordRequest = {
  oldPassword?: unknown;
  newPassword?: unknown;
  confirmPassword?: unknown;
  logoutOtherDevices?: unknown;
};

export async function POST(request: Request) {
  const { user, response } = await requireUser(request);
  if (response || !user) return response;

  let body: ChangePasswordRequest;
  try {
    body = (await request.json()) as ChangePasswordRequest;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const oldPassword = typeof body.oldPassword === "string" ? body.oldPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  const logoutOtherDevices = body.logoutOtherDevices === true;

  if (!oldPassword) {
    return NextResponse.json({ success: false, error: "请输入当前密码。" }, { status: 400 });
  }

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ success: false, error: "新密码至少需要 8 位。" }, { status: 400 });
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ success: false, error: "两次输入的新密码不一致。" }, { status: 400 });
  }

  if (oldPassword === newPassword) {
    return NextResponse.json({ success: false, error: "新密码不能与当前密码相同。" }, { status: 400 });
  }

  const success = await changePassword(user.id, oldPassword, newPassword);
  if (!success) {
    return NextResponse.json({ success: false, error: "当前密码不正确，修改失败。" }, { status: 401 });
  }

  if (logoutOtherDevices) {
    const currentToken = request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
      ?.slice(SESSION_COOKIE_NAME.length + 1);

    if (currentToken) {
      await revokeAllOtherSessions(user.id, currentToken);
    }
  }

  return NextResponse.json({
    success: true,
    message: logoutOtherDevices ? "密码已修改成功，其他设备已退出。" : "密码已修改成功。",
  });
}
