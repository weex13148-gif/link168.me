import { NextResponse } from "next/server";
import { jeepworkLoginHandler } from "@/lib/jeepwork-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = (await request.json()) as { email?: unknown; password?: unknown };
  } catch {
    return NextResponse.json({ success: false, error: "账号或密码错误。" }, { status: 401 });
  }

  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  return jeepworkLoginHandler(request, email, password);
}
