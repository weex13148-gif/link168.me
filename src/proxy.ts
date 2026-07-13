import { NextResponse, type NextRequest } from "next/server";
import { resolveDomain } from "@/lib/domains";

const BASE_DOMAIN = "link168.me";

const RESERVED_HOSTS = new Set([
  BASE_DOMAIN,
  `www.${BASE_DOMAIN}`,
  `app.${BASE_DOMAIN}`,
  `api.${BASE_DOMAIN}`,
  `admin.${BASE_DOMAIN}`,
  `workbench.${BASE_DOMAIN}`,
  `dashboard.${BASE_DOMAIN}`,
]);

const STATIC_PATHS = [
  "/_next/static",
  "/_next/image",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  for (const staticPath of STATIC_PATHS) {
    if (pathname.startsWith(staticPath)) {
      return NextResponse.next();
    }
  }

  const adminMatch = pathname.match(/^\/(api\/)?admin\//);
  if (adminMatch) {
    return NextResponse.json({ success: false, error: "Not Found" }, { status: 404 });
  }

  const host = request.headers.get("host");
  if (!host) {
    return NextResponse.next();
  }

  const normalizedHost = host.toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");

  if (RESERVED_HOSTS.has(normalizedHost)) {
    return NextResponse.next();
  }

  if (normalizedHost === "localhost" || normalizedHost.startsWith("127.0.0.")) {
    return NextResponse.next();
  }

  if (!(normalizedHost === BASE_DOMAIN || normalizedHost.endsWith(`.${BASE_DOMAIN}`)) && !normalizedHost.includes(".")) {
    return NextResponse.next();
  }

  const resolved = await resolveDomain(normalizedHost);
  if (!resolved) {
    return NextResponse.next();
  }

  if (pathname === "/") {
    return NextResponse.rewrite(new URL(`/${resolved.username}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};