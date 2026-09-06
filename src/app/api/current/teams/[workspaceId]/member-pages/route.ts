import { ensureCurrentMemberPage } from "@/lib/current/team/page-service";
import { authenticate, invalid, respond, isUuid, readBody, type TeamRouteContext } from "../../http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request, context: TeamRouteContext) {
  const auth = await authenticate(request, true); if (auth.response) return auth.response;
  const { workspaceId } = await context.params;
  const body = await readBody(request, ["memberIdentityId"]);
  if (!body || !isUuid(body.memberIdentityId) || !isUuid(workspaceId)) return invalid();
  return respond(await ensureCurrentMemberPage({ actorUserId: auth.user!.id, workspaceId, memberIdentityId: body.memberIdentityId }), "page");
}
