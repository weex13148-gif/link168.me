import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { validateWorkspacePublicRequestHost } from "@/lib/workspace-public-host";
import {
  WORKSPACE_ROUTING_HOST_HEADER,
  WORKSPACE_ROUTING_PROOF_HEADER,
  verifyWorkspaceRoutingProof,
} from "@/lib/workspace-routing-proof";

export async function requireWorkspacePublicRequestHost(
  workspaceId: string,
): Promise<string> {
  const requestHeaders = await headers();
  const rawHost = requestHeaders.get(WORKSPACE_ROUTING_HOST_HEADER);
  const proof = requestHeaders.get(WORKSPACE_ROUTING_PROOF_HEADER);
  if (!verifyWorkspaceRoutingProof(workspaceId, rawHost, proof)) notFound();
  const verifiedHost = await validateWorkspacePublicRequestHost(
    workspaceId,
    rawHost,
  );
  if (!verifiedHost) notFound();
  return verifiedHost;
}
