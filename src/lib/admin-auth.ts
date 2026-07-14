import { NextResponse } from "next/server";
import { getJeepworkSessionUser } from "@/lib/jeepwork-auth";

// 安全：后台统一错误响应
// 未登录返回 401 Unauthorized
// 权限不足返回 403 Forbidden
// 不暴露具体的权限信息，统一使用通用错误消息
const UNAUTHORIZED = { success: false, error: "Unauthorized." };
const FORBIDDEN = { success: false, error: "Forbidden." };

export async function requireSuperAdmin(request: Request) {
  const user = await getJeepworkSessionUser(request);
  if (!user) {
    return NextResponse.json(UNAUTHORIZED, { status: 401 });
  }
  if (user.role !== "super_admin") {
    return NextResponse.json(FORBIDDEN, { status: 403 });
  }
  return null;
}

// 兼容别名：行为与 requireSuperAdmin 完全一致
export async function requireAdmin(request: Request) {
  return requireSuperAdmin(request);
}

export async function getCurrentAdmin(request: Request) {
  return getJeepworkSessionUser(request);
}
