import { NextResponse } from "next/server";
import { createEmailVerificationToken } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type VerifyEmailRequest = {
  action?: unknown;
};

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ success: false, error: "DATABASE_URL is not configured." }, { status: 500 });
  }

  let body: VerifyEmailRequest;
  try {
    body = (await request.json()) as VerifyEmailRequest;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "verify";

  if (action === "verify") {
    return NextResponse.json({ success: true, message: "请使用链接参数进行验证。" });
  }

  return NextResponse.json({ success: false, error: "未知操作。" }, { status: 400 });
}
