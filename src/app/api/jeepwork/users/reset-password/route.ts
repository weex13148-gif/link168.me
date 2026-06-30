import { NextResponse } from "next/server";
import { requireJeepworkSuperAdmin } from "@/lib/jeepwork-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  // P0-B: 管理员直接重置密码功能已暂停。
  // 原因：禁止管理员直接设置新密码；所有密码重置必须走用户邮箱找回流程。
  // 待实现：重置前需验证操作者密码、撤销目标 Session、发送安全通知邮件。
  return NextResponse.json(
    { success: false, error: { code: "SECURE_PASSWORD_RESET_REQUIRED", message: "管理员直接重置密码已停用，请使用邮箱找回密码流程" } },
    { status: 409 },
  );
}
