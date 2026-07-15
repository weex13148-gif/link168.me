import crypto from "node:crypto";

export const WORKSPACE_ROUTING_HOST_HEADER =
  "x-link168-workspace-routing-host";
export const WORKSPACE_ROUTING_PROOF_HEADER =
  "x-link168-workspace-routing-proof";

const ROUTING_CONTEXT = "link168:workspace-routing:v1";
const DEV_ROUTING_SECRET = "link168-workspace-routing-dev-only";

function routingKey(): Buffer | null {
  const explicit = (
    process.env.WORKSPACE_ROUTING_SECRET ||
    process.env.CONFIG_ENCRYPTION_KEY ||
    ""
  ).trim();
  const secret = explicit || (process.env.NODE_ENV === "production" ? "" : DEV_ROUTING_SECRET);
  if (secret.length < 16) return null;
  return crypto
    .createHash("sha256")
    .update(`${ROUTING_CONTEXT}:${secret}`)
    .digest();
}

function routingPayload(workspaceId: string, host: string): string | null {
  const normalizedWorkspaceId = workspaceId.trim();
  const normalizedHost = host.trim().toLowerCase();
  if (!normalizedWorkspaceId || !normalizedHost) return null;
  return `${ROUTING_CONTEXT}\n${normalizedWorkspaceId}\n${normalizedHost}`;
}

export function createWorkspaceRoutingProof(
  workspaceId: string,
  host: string,
): string | null {
  const key = routingKey();
  const payload = routingPayload(workspaceId, host);
  if (!key || !payload) return null;
  return crypto.createHmac("sha256", key).update(payload).digest("base64url");
}

export function verifyWorkspaceRoutingProof(
  workspaceId: string,
  host: string | null | undefined,
  proof: string | null | undefined,
): boolean {
  if (!host || !proof) return false;
  const expected = createWorkspaceRoutingProof(workspaceId, host);
  if (!expected) return false;
  const actualBuffer = Buffer.from(proof);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}
