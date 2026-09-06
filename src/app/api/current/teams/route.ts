import { createCurrentTeam, listCurrentTeamsForActor } from "@/lib/current/team/page-service";
import { authenticate, invalid, respond, readBody, isText } from "./http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const auth = await authenticate(request); if (auth.response) return auth.response;
  return respond(await listCurrentTeamsForActor(auth.user!.id), "teams");
}
export async function POST(request: Request) {
  const auth = await authenticate(request, true); if (auth.response) return auth.response;
  const body = await readBody(request, ["name", "slug", "idempotencyKey"]);
  if (!body || !isText(body.name, 120) || !isText(body.slug, 30) || !isText(body.idempotencyKey, 128)) return invalid();
  return respond(await createCurrentTeam({ name: body.name, slug: body.slug, idempotencyKey: body.idempotencyKey, actorUserId: auth.user!.id }), "team");
}
