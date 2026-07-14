import { NextResponse, type NextRequest } from "next/server";

const WORKSPACE_PUBLIC_ROUTE = /^\/__w\/[^/]+(\/.*)?$/;

const PLATFORM_HOSTS = new Set([
  "link168.me",
  "www.link168.me",
  "localhost",
  "127.0.0.1",
]);

function getNormalizedHost(host: string | null | undefined): string {
  if (!host) return "";
  const normalized = host.trim().toLowerCase();
  const portIndex = normalized.lastIndexOf(":");
  if (portIndex > normalized.lastIndexOf("]")) {
    return normalized.slice(0, portIndex);
  }
  return normalized;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/")) {
    return NextResponse.json({ success: false, error: "Not Found" }, { status: 404 });
  }

  if (WORKSPACE_PUBLIC_ROUTE.test(pathname)) {
    const host = getNormalizedHost(request.headers.get("host"));

    if (PLATFORM_HOSTS.has(host)) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    if (!host) {
      return NextResponse.json({ error: "Bad Request" }, { status: 400 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/__w/:path*"],
};
