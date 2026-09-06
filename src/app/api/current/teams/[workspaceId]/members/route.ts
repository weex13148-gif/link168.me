import { createCurrentTeamInvitation, removeCurrentTeamMember, revokeCurrentTeamInvitation } from "@/lib/current/team/page-service";
import { authenticate, invalid, respond, isUuid, readBody, type TeamRouteContext } from "../../http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request, context: TeamRouteContext) {
  const auth = await authenticate(request, true); if (auth.response) return auth.response;
  const { workspaceId } = await context.params;
  const body = await readBody(request, ["action", "role"]);
  if (!body || body.action !== "invite" || (body.role !== "admin" && body.role !== "member") || !isUuid(workspaceId)) return invalid();
  return respond(await createCurrentTeamInvitation({ actorUserId: auth.user!.id, workspaceId, role: body.role }), "invitation");
}
export async function PATCH(request: Request, context: TeamRouteContext) {
  const auth = await authenticate(request, true); if (auth.response) return auth.response;
  const { workspaceId } = await context.params;
  const body = await readBody(request, ["action", "memberIdentityId", "successorIdentityId", "invitationId"]);
  if (!body || !isUuid(workspaceId)) return invalid();
  if (body.action === "revoke" && isUuid(body.invitationId) && body.memberIdentityId === undefined && body.successorIdentityId === undefined) return respond(await revokeCurrentTeamInvitation(auth.user!.id, workspaceId, body.invitationId), "result");
  if (body.action !== "remove" || !isUuid(body.memberIdentityId) || (body.successorIdentityId !== undefined && !isUuid(body.successorIdentityId)) || body.invitationId !== undefined) return invalid();
  return respond(await removeCurrentTeamMember({ memberIdentityId: body.memberIdentityId, successorIdentityId: body.successorIdentityId as string | undefined, actorUserId: auth.user!.id, workspaceId }), "result");
}
