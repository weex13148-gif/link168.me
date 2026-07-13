import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { bindCustomDomain, verifyDomain, unbindDomain, getUserDomains, getDomainVerificationInfo } from "@/lib/domains";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  try {
    const url = new URL(request.url);
    const domainId = url.searchParams.get("domainId");

    if (domainId) {
      const domain = await getDomainVerificationInfo(domainId, user.id);
      if (!domain) {
        return NextResponse.json(
          { success: false, code: "DOMAIN_NOT_FOUND", message: "域名记录不存在" },
          { status: 404 },
        );
      }
      return NextResponse.json({ success: true, domain });
    }

    const domains = await getUserDomains(user.id);
    return NextResponse.json({ success: true, domains });
  } catch (error) {
    console.error("[domains] 获取域名列表失败:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "获取失败" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = body.action as string;

    switch (action) {
      case "bind": {
        const domain = body.domain as string;
        if (!domain) {
          return NextResponse.json(
            { success: false, code: "DOMAIN_REQUIRED", message: "请提供要绑定的域名" },
            { status: 400 },
          );
        }
        const result = await bindCustomDomain(domain, user.id);
        return NextResponse.json({ success: true, domain: result });
      }

      case "verify": {
        const domainId = body.domainId as string;
        if (!domainId) {
          return NextResponse.json(
            { success: false, code: "DOMAIN_ID_REQUIRED", message: "请提供域名 ID" },
            { status: 400 },
          );
        }
        const result = await verifyDomain(domainId, user.id);
        return NextResponse.json({ ...result });
      }

      case "unbind": {
        const domainId = body.domainId as string;
        if (!domainId) {
          return NextResponse.json(
            { success: false, code: "DOMAIN_ID_REQUIRED", message: "请提供域名 ID" },
            { status: 400 },
          );
        }
        const success = await unbindDomain(domainId, user.id);
        if (!success) {
          return NextResponse.json(
            { success: false, code: "UNBIND_FAILED", message: "解绑失败" },
            { status: 403 },
          );
        }
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { success: false, code: "INVALID_ACTION", message: "无效的操作类型" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[domains] 操作失败:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "操作失败" },
      { status: 500 },
    );
  }
}