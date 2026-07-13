import { NextResponse, type NextRequest } from "next/server";
import { resolveDomain, WORKSPACE_RESERVED_SLUGS } from "@/lib/domains";

// proxy.ts 在 Next.js 16 中始终运行于 Node.js runtime，可安全使用 Prisma Node Client
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

// 企业官网保留路径 → 内部路由映射
// 这些路径不能被员工注册为 slug，且对应企业官网专属页面
const ENTERPRISE_ROUTE_MAP: Record<string, string> = {
  products: "products",
  services: "services",
  contact: "contact",
  about: "about",
  team: "team",
  employees: "employees",
  ai: "ai",
};

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 静态资源直接放行
  for (const staticPath of STATIC_PATHS) {
    if (pathname.startsWith(staticPath)) {
      return NextResponse.next();
    }
  }

  // 屏蔽 /admin 和 /api/admin
  const adminMatch = pathname.match(/^\/(api\/)?admin\//);
  if (adminMatch) {
    return NextResponse.json({ success: false, error: "Not Found" }, { status: 404 });
  }

  const host = request.headers.get("host");
  if (!host) {
    return NextResponse.next();
  }

  const normalizedHost = host.toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");

  // 系统保留主机：主站、www、app、api、admin 等
  if (RESERVED_HOSTS.has(normalizedHost)) {
    return NextResponse.next();
  }

  // 本地开发环境
  if (normalizedHost === "localhost" || normalizedHost.startsWith("127.0.0.")) {
    return NextResponse.next();
  }

  // 非域名主机（如局域网主机名）直接放行
  if (!normalizedHost.includes(".")) {
    return NextResponse.next();
  }

  // 解析域名
  const resolved = await resolveDomain(normalizedHost);
  if (!resolved) {
    return NextResponse.json({ success: false, error: 'Not Found' }, { status: 404 });
  }

  if (resolved.kind === "personal-subdomain") {
    // username.link168.me 个人主页
    // 根路径 rewrite 到 /[username]，保持原有个人主页行为
    if (pathname === "/") {
      return NextResponse.rewrite(new URL(`/${resolved.username}`, request.url));
    }
    // 个人子域名下的其他路径不强制 rewrite（保持 NextResponse.next）
    return NextResponse.next();
  }

  // 企业自定义域名
  if (resolved.kind === "workspace") {
    const workspaceId = resolved.workspaceId;

    // 根路径 → 企业官网首页
    if (pathname === "/") {
      return NextResponse.rewrite(new URL(`/__w/${workspaceId}`, request.url));
    }

    // 拆分路径第一段
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) {
      return NextResponse.rewrite(new URL(`/__w/${workspaceId}`, request.url));
    }

    const firstSegment = segments[0];

    // 企业官网保留路径（products / contact / about 等）
    if (WORKSPACE_RESERVED_SLUGS.has(firstSegment)) {
      const enterpriseRoute = ENTERPRISE_ROUTE_MAP[firstSegment];
      if (enterpriseRoute) {
        // 映射到对应企业官网页面
        const restPath = segments.slice(1).join("/");
        const targetPath = restPath
          ? `/__w/${workspaceId}/${enterpriseRoute}/${restPath}`
          : `/__w/${workspaceId}/${enterpriseRoute}`;
        return NextResponse.rewrite(new URL(targetPath, request.url));
      }
      // 其他系统保留路径（admin/api/login 等）不 rewrite，保持原样
      return NextResponse.next();
    }

    // 非保留路径第一段 → 视为员工名片 slug
    // 由 /__w/[workspaceId]/p/[slug] 页面解析，不存在则 404
    if (segments.length === 1) {
      return NextResponse.rewrite(
        new URL(`/__w/${workspaceId}/p/${firstSegment}`, request.url),
      );
    }

    // 多段路径暂不支持 rewrite（避免误伤），保持原样
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
