import { NextRequest } from "next/server";
import {
  GET as getWorkspace,
  PATCH as patchWorkspace,
} from "@/app/api/workspaces/[workspaceId]/route";

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
 * 旧企业组织地址只保留兼容能力，正式权限和数据隔离统一由 Workspace API 执行。
 */
export function GET(request: NextRequest, context: LegacyRouteContext) {
  return getWorkspace(request, toWorkspaceContext(context));
}

export function PATCH(request: NextRequest, context: LegacyRouteContext) {
  return patchWorkspace(request, toWorkspaceContext(context));
}
