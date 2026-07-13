import { NextResponse, type NextRequest } from "next/server";
import { resolveDomain } from "@/lib/domains";

export async function proxy(request: NextRequest) {
  const adminMatch = request.nextUrl.pathname.match(/^\/(api\/)?admin\//);
  if (adminMatch) {
    return NextResponse.json({ success: false, error: "Not Found" }, { status: 404 });
  }

  const host = request.headers.get("host");
  if (!host) {
    return NextResponse.next();
  }

  const resolved = await resolveDomain(host);
  if (!resolved) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL(`/${resolved.username}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
