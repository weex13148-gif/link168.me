import { NextResponse, type NextRequest } from "next/server";
import { isAdminRequest, isAdminSecretConfigured } from "@/lib/admin-auth";

function adminFailureResponse(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/admin/")) {
    const status = isAdminSecretConfigured() ? 401 : 500;
    const error = isAdminSecretConfigured() ? "Unauthorized." : "ADMIN_SECRET is not configured.";

    return NextResponse.json({ success: false, error }, { status });
  }

  return new NextResponse("Not Found", { status: 404 });
}

export function proxy(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return adminFailureResponse(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
