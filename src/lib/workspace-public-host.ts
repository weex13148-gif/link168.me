import { db } from "@/lib/db";
import { normalizeRequestHost } from "@/lib/domains";
import { isPlatformHost, PLATFORM_BASE_DOMAIN } from "@/lib/platform-hosts";

function normalizeWorkspacePublicHost(
  requestHost: string | null | undefined,
): string | null {
  if (!requestHost) return null;
  const normalizedHost = normalizeRequestHost(requestHost);
  if (!normalizedHost) return null;
  if (
    isPlatformHost(normalizedHost) ||
    normalizedHost.endsWith(`.${PLATFORM_BASE_DOMAIN}`)
  ) {
    return null;
  }
  return normalizedHost;
}

export async function assertWorkspacePublicHost(workspaceId: string, requestHost: string): Promise<boolean> {
  const normalizedHost = normalizeWorkspacePublicHost(requestHost);
  if (!normalizedHost) return false;

  const domain = await db.domain.findUnique({
    where: { normalizedDomain: normalizedHost },
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

export async function validateWorkspacePublicRequestHost(
  workspaceId: string,
  rawHost: string | null | undefined,
): Promise<string | null> {
  const normalizedHost = normalizeWorkspacePublicHost(rawHost);
  if (!normalizedHost) return null;
  return (await assertWorkspacePublicHost(workspaceId, normalizedHost))
    ? normalizedHost
    : null;
}
