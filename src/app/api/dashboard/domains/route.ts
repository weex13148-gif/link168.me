import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { assertWorkspaceMember } from "@/lib/workspace";
import {
  bindWorkspaceDomain,
  verifyWorkspaceDomain,
  unbindWorkspaceDomain,
  getWorkspaceDomains,
  getWorkspaceDomainVerificationInfo,
} from "@/lib/domains";

export const runtime = "nodejs";

// 统一权限校验：要求调用者是 Workspace 的 owner 或 active admin
async function assertDomainManager(request: Request, workspaceId: string) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return { user: null, error: response };

  const access = await assertWorkspaceMember(workspaceId, user.id, {
    minRole: "admin",
    requireActive: true,
  });
  if (!access.allowed || !access.member) {
    return {
      user: null,
      error: NextResponse.json(
        {
          success: false,
          code: access.code,
          message: access.message ?? "无权管理该 Workspace 的域名",
        },
        { status: 403 },
      ),
    };
  }
  return { user, error: null };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get("workspaceId");
    const domainId = url.searchParams.get("domainId");

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, code: "WORKSPACE_ID_REQUIRED", message: "请提供 workspaceId" },
        { status: 400 },
      );
    }

    const { error } = await assertDomainManager(request, workspaceId);
    if (error) return error;

    if (domainId) {
      const domain = await getWorkspaceDomainVerificationInfo(domainId, workspaceId);
      if (!domain) {
        return NextResponse.json(
          { success: false, code: "DOMAIN_NOT_FOUND", message: "域名记录不存在" },
          { status: 404 },
        );
      }
      return NextResponse.json({ success: true, domain });
    }

    const domains = await getWorkspaceDomains(workspaceId);
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
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = body.action as string;
    const workspaceId = body.workspaceId as string;

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, code: "WORKSPACE_ID_REQUIRED", message: "请提供 workspaceId" },
        { status: 400 },
      );
    }

    const { user, error } = await assertDomainManager(request, workspaceId);
    if (error) return error;
    if (!user) {
      return NextResponse.json(
        { success: false, code: "UNAUTHORIZED", message: "未登录" },
        { status: 401 },
      );
    }

    switch (action) {
      case "bind": {
        const domain = body.domain as string;
        if (!domain) {
          return NextResponse.json(
            { success: false, code: "DOMAIN_REQUIRED", message: "请提供要绑定的域名" },
            { status: 400 },
          );
        }
        const result = await bindWorkspaceDomain(domain, workspaceId);
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
        const result = await verifyWorkspaceDomain(domainId, workspaceId);
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
        const success = await unbindWorkspaceDomain(domainId, workspaceId);
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
