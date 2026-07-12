import { NextRequest } from "next/server";
import {
  GET as getWorkspaceMembers,
  PATCH as patchWorkspaceMember,
  POST as createWorkspaceInvitation,
} from "@/app/api/workspaces/[workspaceId]/members/route";

export const runtime = "nodejs";

type LegacyRouteContext = {
  params: Promise<{ orgId: string }>;
};

function toWorkspaceContext(context: LegacyRouteContext) {
  return {
    params: context.params.then(({ orgId }) => ({ workspaceId: orgId })),
  };
}

/**
 * 旧企业组织成员地址只作为兼容入口。
 * 所有读取、邀请、角色、禁用和移除规则统一由正式 Workspace API 执行，
 * 防止旧接口绕过邮箱邀请并直接激活成员。
 */
export function GET(request: NextRequest, context: LegacyRouteContext) {
  return getWorkspaceMembers(request, toWorkspaceContext(context));
}

export function POST(request: NextRequest, context: LegacyRouteContext) {
  return createWorkspaceInvitation(request, toWorkspaceContext(context));
}

export function PATCH(request: NextRequest, context: LegacyRouteContext) {
  return patchWorkspaceMember(request, toWorkspaceContext(context));
}
