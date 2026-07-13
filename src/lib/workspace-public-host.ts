import { db } from "@/lib/db";

export async function assertWorkspacePublicHost(workspaceId: string, requestHost: string): Promise<boolean> {
  if (!requestHost) return false;

  const normalizedHost = requestHost.toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");

  const domain = await db.domain.findUnique({
    where: { normalizedDomain },
    select: { workspaceId: true, status: true },
  });

  if (!domain) return false;
  if (domain.status !== "verified") return false;
  if (domain.workspaceId !== workspaceId) return false;

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { isActive: true },
  });

  return workspace?.isActive ?? false;
}
