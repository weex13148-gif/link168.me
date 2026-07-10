// 管理员 AI 权限冻结/解冻 API（仅 super_admin）
// POST: 冻结用户 AI 权限
// DELETE: 解冻用户 AI 权限
import { NextResponse } from "next/server";
import { requireSuperAdmin, getCurrentAdmin } from "@/lib/admin-auth";
import { freezeUserAi, unfreezeUserAi, freezeUserSingleAssistant } from "@/lib/ai/permissions";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type FreezeBody = {
  userId?: unknown;
  type?: unknown;
  reason?: unknown;
  expiresAt?: unknown;
  assistant?: unknown; // 可选：仅冻结单个助手
};

// POST: 冻结用户 AI 权限
export async function POST(request: Request) {
  const superAdminResponse = await requireSuperAdmin(request);
  if (superAdminResponse) return superAdminResponse;
  const admin = await getCurrentAdmin(request);
  if (!admin) return NextResponse.json({ success: false, error: "无法获取管理员信息。" }, { status: 403 });

  let body: FreezeBody;
  try {
    body = (await request.json()) as FreezeBody;
  } catch {
    return NextResponse.json({ success: false, error: "请求体不是合法 JSON。" }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId : "";
  const type = typeof body.type === "string" ? body.type : "AI_FREEZE";
  const reason = typeof body.reason === "string" ? body.reason : "";
  const assistant = typeof body.assistant === "string" ? body.assistant : "";

  if (!userId) {
    return NextResponse.json({ success: false, error: "缺少 userId。" }, { status: 400 });
  }

  // 验证目标用户存在
  const targetUser = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
  if (!targetUser) {
    return NextResponse.json({ success: false, error: "用户不存在。" }, { status: 404 });
  }

  if (!reason) {
    return NextResponse.json({ success: false, error: "缺少冻结原因。" }, { status: 400 });
  }

  let result: { success: boolean; freezeId?: string; error?: string };
  if (assistant) {
    // 仅冻结单个 AI 助手
    result = await freezeUserSingleAssistant(userId, assistant, admin.id, reason);
  } else {
    // 冻结全部 AI 权限
    result = await freezeUserAi(
      userId,
      type as "AI_FREEZE" | "ADMIN_FREEZE_AI" | "SECURITY_RISK_AI",
      reason,
      admin.id,
    );
  }

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: assistant ? `已限制用户 ${targetUser.email} 使用【${assistant}】` : `已限制用户 ${targetUser.email} 使用全部 AI 功能`,
    freezeId: result.freezeId,
  });
}

// DELETE: 解冻用户 AI 权限
export async function DELETE(request: Request) {
  const superAdminResponse = await requireSuperAdmin(request);
  if (superAdminResponse) return superAdminResponse;
  const admin = await getCurrentAdmin(request);
  if (!admin) return NextResponse.json({ success: false, error: "无法获取管理员信息。" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ success: false, error: "缺少 userId 参数。" }, { status: 400 });
  }

  const result = await unfreezeUserAi(userId, admin.id);

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: "已恢复用户 AI 权限。" });
}
