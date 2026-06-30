import { NextResponse } from "next/server";
import { sendPasswordResetEmailWithPolicy, RestrictionQueryError } from "@/lib/auth";

export const runtime = "nodejs";

type ForgotPasswordRequest = {
  email?: unknown;
};

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function ipFromRequest(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    ""
  );
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ success: false, error: "服务暂不可用，请稍后重试。" }, { status: 500 });
  }

  let body: ForgotPasswordRequest;
  try {
    body = (await request.json()) as ForgotPasswordRequest;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  if (!email) {
    return NextResponse.json({ success: false, error: "请输入邮箱地址。" }, { status: 400 });
  }

  const ipRaw = ipFromRequest(request);

  try {
    const result = await sendPasswordResetEmailWithPolicy(email, ipRaw);

    if (result.ok) {
      return NextResponse.json({
        success: true,
        message: "如果该邮箱已注册，我们已向其发送重置密码链接。",
      });
    }

    if (result.reason === "rate-limit") {
      return NextResponse.json(
        { success: false, error: `请求过于频繁，请 ${Math.ceil(result.waitSec / 60)} 分钟后重试。` },
        { status: 429 },
      );
    }

    if (result.reason === "send-error") {
      return NextResponse.json(
        { success: false, error: result.detail || "邮件发送失败，请稍后重试。" },
        { status: 502 },
      );
    }

    if (result.reason === "query-error" && result.detail === "该邮箱未注册") {
      return NextResponse.json({
        success: true,
        message: "如果该邮箱已注册，我们已向其发送重置密码链接。",
      });
    }

    return NextResponse.json(
      { success: false, error: "服务暂时不可用，请稍后重试。" },
      { status: 503 },
    );
  } catch (err) {
    if (err instanceof RestrictionQueryError) {
      return NextResponse.json(
        { success: false, error: "服务暂时不可用，请稍后重试。" },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { success: false, error: "服务暂时不可用，请稍后重试。" },
      { status: 500 },
    );
  }
}
