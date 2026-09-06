import { getCurrentTeamDetail } from "@/lib/current/team/page-service";
import { authenticate, invalid, respond, isUuid, type TeamRouteContext } from "../http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: TeamRouteContext) {
  const auth = await authenticate(request); if (auth.response) return auth.response;
  const { workspaceId } = await context.params;
  if (!isUuid(workspaceId)) return invalid();
  return respond(await getCurrentTeamDetail(auth.user!.id, workspaceId), "team");
}
