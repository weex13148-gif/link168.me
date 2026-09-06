import { acceptCurrentTeamInvitation, getCurrentTeamInvitation } from "@/lib/current/team/page-service";
import { authenticate, invalid, respond, readBody } from "../http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return respond(await getCurrentTeamInvitation(new URL(request.url).searchParams.get("token") ?? ""), "invitation");
}
export async function POST(request: Request) {
  const auth = await authenticate(request, true); if (auth.response) return auth.response;
  const body = await readBody(request, ["token"]);
  if (!body || typeof body.token !== "string" || !/^[a-f0-9]{64}$/.test(body.token)) return invalid();
  return respond(await acceptCurrentTeamInvitation(auth.user!.id, body.token), "team");
}
