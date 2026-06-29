import { NextResponse } from "next/server";

export const runtime = "nodejs";

type VerifyEmailRequest = {
  action?: unknown;
};

export async function POST(request: Request) {
  let body: VerifyEmailRequest;
  try {
    body = (await request.json()) as VerifyEmailRequest;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "verify";
  if (action === "verify") {
    return NextResponse.json({ success: true, message: "请使用邮件中的验证链接完成验证。" });
  }

  return NextResponse.json({ success: false, error: "未知操作。" }, { status: 400 });
}
