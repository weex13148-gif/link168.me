import { NextResponse } from "next/server";
import {
  validateEmailVerificationToken,
  consumeEmailVerificationToken,
  sendVerificationEmailWithPolicy,
  RestrictionQueryError,
} from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type ConfirmEmailRequest = {
  token?: unknown;
  resendEmail?: unknown;
};

function ipFromRequest(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    ""
  );
}

export async function POST(request: Request) {
  let body: ConfirmEmailRequest;
  try {
    body = (await request.json()) as ConfirmEmailRequest;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const resendEmail = typeof body.resendEmail === "string" ? body.resendEmail.trim().toLowerCase() : null;
  const ipRaw = ipFromRequest(request);

  if (resendEmail) {
    // 查找用户以获取 userId
    const user = await db.user.findUnique({ where: { email: resendEmail } });
    if (!user || user.emailVerified) {
      // 避免邮箱枚举：统一返回成功文案
      return NextResponse.json({ success: true, message: user?.emailVerified ? "该邮箱已验证，请直接登录。" : "如果该邮箱已注册，我们已重新发送验证链接。" });
    }

    // V2-002: 使用统一发送策略（60秒间隔 / 24h次数 / IP次数 / Token生成 / 发送 / 日志）
    let sentSuccessfully = false;
    try {
      const result = await sendVerificationEmailWithPolicy(user.email, user.id, ipRaw, "verify");
      if (result.ok) {
        sentSuccessfully = true;
      } else if (result.reason === "rate-limit") {
        return NextResponse.json(
          { success: false, error: `发送过于频繁，请 ${Math.ceil((result.waitSec || 60) / 60)} 分钟后重试。` },
          { status: 429 },
        );
      }
    } catch (err) {
      if (err instanceof RestrictionQueryError) {
        return NextResponse.json({ success: false, error: "服务暂时不可用，请稍后重试。" }, { status: 503 });
      }
    }

    return NextResponse.json({
      success: sentSuccessfully,
      message: sentSuccessfully ? "如果该邮箱已注册，我们已重新发送验证链接。" : "邮件发送失败，请稍后重试。",
    });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return NextResponse.json({ success: false, error: "验证链接无效或已过期。" }, { status: 400 });
  }

  const user = await validateEmailVerificationToken(token);
  if (!user) {
    return NextResponse.json({ success: false, error: "验证链接无效或已过期，请重新发起验证。" }, { status: 400 });
  }

  const userId = await consumeEmailVerificationToken(token);
  if (!userId) {
    return NextResponse.json({ success: false, error: "该验证链接已使用或已过期。" }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: "邮箱验证成功！",
  });
}
