import { NextResponse, type NextRequest } from "next/server";

// 旧 /admin 与 /api/admin 路由统一返回 404。
// 真实的后台入口在 /jeepwork，权限校验由各页面/路由的 Server 代码直接读取 link168_admin_session 完成。
// 这里不做重定向，也不暴露任何提示信息，保持"路径不存在"的统一表现。

export function proxy(request: NextRequest) {
  return NextResponse.json({ success: false, error: "Not Found" }, { status: 404 });
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
