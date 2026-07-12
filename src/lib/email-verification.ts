import crypto from "node:crypto";
import { hashEmailVerificationCode } from "@/lib/auth-credential-policy";
import { db } from "@/lib/db";
import { sendEmailVerificationCode } from "@/lib/mail";

function hashValue(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeIp(value?: string) {
  const ip = value?.trim();
  return ip && ip !== "unknown" ? ip : "";
}

export type VerificationSendResult =
  | { ok: true; waitSec: number }
  | { ok: false; reason: string; message: string; waitSec?: number };

export async function sendScopedVerificationCodeWithPolicy(
  emailInput: string,
  userIdInput?: string | null,
  ipInput?: string,
): Promise<VerificationSendResult> {
  const email = emailInput.trim().toLowerCase();
  const ip = normalizeIp(ipInput);
  const ipHash = ip ? hashValue(ip) : null;
  const now = new Date();
  const user = userIdInput
    ? await db.user.findUnique({ where: { id: userIdInput }, select: { id: true, email: true, emailVerified: true } })
    : await db.user.findUnique({ where: { email }, select: { id: true, email: true, emailVerified: true } });

  if (!user) return { ok: false, reason: "user-not-found", message: "如果该邮箱已注册，我们会发送验证码。" };
  if (user.emailVerified) return { ok: false, reason: "already-verified", message: "该邮箱已完成验证，请直接登录。" };

  const recent = await db.emailSendLog.findFirst({
    where: { email: user.email, purpose: "verify-code", createdAt: { gte: new Date(now.getTime() - 60_000) } },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    const waitSec = Math.max(1, Math.ceil((60_000 - (now.getTime() - recent.createdAt.getTime())) / 1000));
    return { ok: false, reason: "rate-limit", waitSec, message: `操作过于频繁，请 ${waitSec} 秒后再试。` };
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const tokenHash = hashEmailVerificationCode(user.id, code);
  const tokenId = crypto.randomUUID();
  await db.$transaction([
    db.emailVerificationToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true, usedAt: now },
    }),
    db.emailVerificationToken.create({
      data: {
        id: tokenId,
        userId: user.id,
        tokenHash,
        expiresAt: new Date(now.getTime() + 10 * 60_000),
        sentAt: now,
      },
    }),
  ]);

  const sent = await sendEmailVerificationCode(user.email, code);
  await db.emailSendLog.create({
    data: {
      id: crypto.randomUUID(),
      email: user.email,
      purpose: "verify-code",
      success: sent.success,
      provider: sent.mode,
      errorCode: sent.success ? null : sent.errorCode || "EMAIL_SEND_FAILED",
      ipHash,
    },
  }).catch(() => undefined);

  if (!sent.success) {
    await db.emailVerificationToken.updateMany({
      where: { id: tokenId },
      data: { used: true, usedAt: new Date() },
    }).catch(() => undefined);
    return {
      ok: false,
      reason: sent.errorCode || "send-error",
      message: sent.errorCode === "SMTP_NOT_CONFIGURED"
        ? "邮件服务尚未开启或配置不完整，请稍后重试。"
        : "验证邮件暂时无法发送，请稍后重试。",
    };
  }

  return { ok: true, waitSec: 60 };
}
