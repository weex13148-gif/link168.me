import { NextResponse } from "next/server";
import { clearSessionCookie, deleteSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1);

  await deleteSessionToken(token);

  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
