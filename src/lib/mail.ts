import crypto from "node:crypto";
import nodemailer, { type Transporter } from "nodemailer";
import { getConfig } from "@/lib/app-config";
import { db } from "@/lib/db";

let cachedTransporter: Transporter | null = null;
let cachedSignature = "";

function hashValue(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeIp(value?: string) {
  const ip = value?.trim();
  return ip && ip !== "unknown" ? ip : "";
}

async function getTransporter(): Promise<Transporter | null> {
  const config = await getConfig().catch(() => null);
  const useDatabaseConfig = config?.mailEnabled === true;
  const useEnvironmentConfig = !useDatabaseConfig && process.env.MAIL_ENABLED === "true";

  if (!useDatabaseConfig && !useEnvironmentConfig) return null;

  const host = useDatabaseConfig ? config?.smtpHost : process.env.SMTP_HOST;
  const port = useDatabaseConfig ? config?.smtpPort : Number(process.env.SMTP_PORT || "465");
  const user = useDatabaseConfig ? config?.smtpUser : process.env.SMTP_USER;
  const pass = useDatabaseConfig ? config?.smtpPassword : process.env.SMTP_PASSWORD;
  const secureMode = useDatabaseConfig ? config?.smtpSecureMode : port === 465 ? "ssl" : "tls";

  if (!host || !user || !pass) return null;

  const signature = `${host}:${port}:${user}:${secureMode}:${hashValue(pass).slice(0, 12)}`;
  if (cachedTransporter && cachedSignature === signature) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: secureMode === "ssl",
    requireTLS: secureMode === "tls",
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
  });
  cachedSignature = signature;
  return cachedTransporter;
}

export async function getMailFrom(): Promise<string> {
  const config = await getConfig().catch(() => null);
  if (config?.mailEnabled && config.mailFrom) return config.mailFrom;
  return process.env.MAIL_FROM || `Link168 <${process.env.SMTP_USER || "no-reply@notice.link168.me"}>`;
}

export async function getAppUrl(): Promise<string> {
  const config = await getConfig().catch(() => null);
  if (config?.mailEnabled && config.mailAppUrl) return config.mailAppUrl;
  return process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === "production" ? "https://link168.me" : "http://localhost:3000");
}

function mapMailError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  if (lower.includes("auth") || lower.includes("password") || lower.includes("535")) return "SMTP_AUTH_FAILED";
  if (lower.includes("timeout") || lower.includes("timed out")) return "SMTP_TIMEOUT";
  if (lower.includes("enotfound") || lower.includes("econnrefused") || lower.includes("connect")) return "SMTP_CONNECT_FAILED";
  if (lower.includes("sender") || lower.includes("from")) return "SMTP_SENDER_REJECTED";
  return "SMTP_SEND_FAILED";
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: boolean; mode: "smtp" | "none"; error?: string; errorCode?: string }> {
  const transporter = await getTransporter();
  if (!transporter) {
    return { success: false, mode: "none", error: "邮件服务未开启或配置不完整", errorCode: "SMTP_NOT_CONFIGURED" };
  }

  try {
    await transporter.sendMail({
      from: await getMailFrom(),
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]+>/g, " "),
    });
    return { success: true, mode: "smtp" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[MAIL ERROR] ${mapMailError(error)}: ${message}`);
    return { success: false, mode: "smtp", error: message, errorCode: mapMailError(error) };
  }
}

function wrapInLayout(title: string, bodyHtml: string, footerNote?: string): string {
  const year = new Date().getFullYear();
  const defaultFooter = "此邮件由 Link168 自动发送。如非本人操作，请忽略本邮件。";
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; background: #FFFDF8; margin: 0; padding: 0; color: #2B241E; }
    .container { max-width: 520px; margin: 0 auto; padding: 32px 20px; }
    .logo { font-size: 22px; font-weight: 900; color: #3F5F31; margin-bottom: 24px; }
    .card { background: #fff; border: 1px solid #E8DCCB; border-radius: 16px; padding: 28px 24px; box-shadow: 0 8px 24px rgba(86,68,46,0.06); }
    h1 { margin: 0 0 16px; font-size: 22px; font-weight: 900; color: #2B241E; }
    p { line-height: 1.7; margin: 10px 0; font-size: 15px; color: #5A4A3B; }
    .btn { display: inline-block; background: #6F8F4E; color: #fff !important; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 900; margin: 16px 0; }
    .code { margin: 24px 0; padding: 18px; border-radius: 14px; background: #F2F6ED; color: #355126; text-align: center; font-size: 34px; font-weight: 900; letter-spacing: 10px; }
    .link-row { word-break: break-all; background: #F7F1E7; padding: 14px; border-radius: 10px; font-size: 13px; color: #7A6D5E; }
    .tip { font-size: 13px; color: #7A6D5E; }
    .footer { margin-top: 28px; font-size: 12px; color: #A69A8A; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Link168</div>
    <div class="card">${bodyHtml}</div>
    <div class="footer">© ${year} Link168 · ${footerNote || defaultFooter}</div>
  </div>
</body>
</html>`;
}

export async function sendEmailVerificationCode(email: string, code: string) {
  const bodyHtml = `
    <h1>验证你的 Link168 邮箱</h1>
    <p>你正在注册或验证 Link168 账号，请输入下面的 6 位验证码：</p>
    <div class="code">${code}</div>
    <p><strong>验证码 10 分钟内有效，且只能使用一次。</strong></p>
    <p class="tip">如非本人操作，请忽略本邮件，不要把验证码告诉任何人。</p>
    <p class="tip">Link168 官方域名：link168.me</p>`;
  return sendEmail({
    to: email,
    subject: `${code}｜Link168 邮箱验证码`,
    html: wrapInLayout("邮箱验证 · Link168", bodyHtml),
    text: `你的 Link168 邮箱验证码是：${code}。验证码 10 分钟内有效，且只能使用一次。`,
  });
}

export async function sendEmailVerification(email: string, verifyToken: string) {
  const appUrl = await getAppUrl();
  const verifyUrl = `${appUrl}/verify-email?token=${encodeURIComponent(verifyToken)}`;
  const bodyHtml = `
    <h1>欢迎加入 Link168</h1>
    <p>请点击下方按钮完成邮箱验证：</p>
    <a href="${verifyUrl}" class="btn" target="_blank" rel="noopener">确认我的邮箱</a>
    <p class="tip">按钮无法点击时，请复制下方地址到浏览器：</p>
    <div class="link-row">${verifyUrl}</div>`;
  return sendEmail({ to: email, subject: "请验证你的 Link168 邮箱", html: wrapInLayout("邮箱验证 · Link168", bodyHtml) });
}

export async function sendPasswordReset(email: string, resetToken: string) {
  const appUrl = await getAppUrl();
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
  const bodyHtml = `
    <h1>重置你的密码</h1>
    <p>请在 2 小时内点击下方按钮设置新密码：</p>
    <a href="${resetUrl}" class="btn" target="_blank" rel="noopener">重置我的密码</a>
    <p class="tip">按钮无法点击时，请复制下方地址到浏览器：</p>
    <div class="link-row">${resetUrl}</div>
    <p class="tip">此链接只能使用一次。若非本人操作，请忽略本邮件。</p>`;
  return sendEmail({ to: email, subject: "重置你的 Link168 密码", html: wrapInLayout("重置密码 · Link168", bodyHtml) });
}

export type VerificationSendResult =
  | { ok: true; waitSec: number }
  | { ok: false; reason: string; message: string; waitSec?: number };

export async function sendVerificationCodeWithPolicy(emailInput: string, userIdInput?: string | null, ipInput?: string): Promise<VerificationSendResult> {
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
  const tokenHash = hashValue(code);
  const tokenId = crypto.randomUUID();
  await db.$transaction([
    db.emailVerificationToken.updateMany({ where: { userId: user.id, used: false }, data: { used: true, usedAt: now } }),
    db.emailVerificationToken.create({
      data: { id: tokenId, userId: user.id, tokenHash, expiresAt: new Date(now.getTime() + 10 * 60_000), sentAt: now },
    }),
  ]);

  const sent = await sendEmailVerificationCode(user.email, code);
  await db.emailSendLog.create({
    data: {
      id: crypto.randomUUID(), email: user.email, purpose: "verify-code", success: sent.success,
      provider: sent.mode, errorCode: sent.success ? null : sent.errorCode || "EMAIL_SEND_FAILED", ipHash,
    },
  }).catch(() => undefined);

  if (!sent.success) {
    await db.emailVerificationToken.updateMany({ where: { id: tokenId }, data: { used: true, usedAt: new Date() } }).catch(() => undefined);
    return {
      ok: false,
      reason: sent.errorCode || "send-error",
      message: sent.errorCode === "SMTP_NOT_CONFIGURED" ? "邮件服务尚未开启或配置不完整，请稍后重试。" : "验证邮件暂时无法发送，请稍后重试。",
    };
  }
  return { ok: true, waitSec: 60 };
}
