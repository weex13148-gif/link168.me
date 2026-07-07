import { jeepworkLogoutHandler } from "@/lib/jeepwork-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return jeepworkLogoutHandler(request);
}
