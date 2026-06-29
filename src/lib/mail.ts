import nodemailer, { type Transporter } from "nodemailer";
import { getConfig } from "@/lib/app-config";

async function getTransporter(): Promise<Transporter | null> {
  const config = await getConfig().catch(() => null);

  const host = config?.mailEnabled && config.smtpHost ? config.smtpHost : process.env.SMTP_HOST;
  const port = config?.mailEnabled && config.smtpPort ? config.smtpPort : Number(process.env.SMTP_PORT || "465");
  const user = config?.mailEnabled && config.smtpUser ? config.smtpUser : process.env.SMTP_USER;
  const pass = config?.mailEnabled && config.smtpPassword ? config.smtpPassword : process.env.SMTP_PASSWORD;

  if (!host || !user || !pass || !Number.isInteger(port) || port < 1 || port > 65535) {
    return null;
  }

  const secureMode = config?.mailEnabled ? config.smtpSecureMode : port === 465 ? "ssl" : "tls";

  return nodemailer.createTransport({
    host,
    port,
    secure: secureMode === "ssl",
    requireTLS: secureMode === "tls",
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    auth: { user, pass },
  });
}

export async function getMailFrom(): Promise<string> {
  const config = await getConfig().catch(() => null);
  if (config?.mailEnabled && config.mailFrom) {
    return config.mailFrom;
  }
  return process.env.MAIL_FROM || `Link168 <${process.env.SMTP_USER || "noreply@link168.me"}>`;
}

export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === "https:" || (process.env.NODE_ENV !== "production" && url.protocol === "http:")) {
        return url.toString().replace(/\/+$/, "");
      }
    } catch {
      // 使用安全默认地址。
    }
  }
  return process.env.NODE_ENV === "production" ? "https://link168.me" : "http://localhost:3000";
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: boolean; mode: "smtp" | "console"; error?: string }> {
  const transporter = await getTransporter();

  if (!transporter) {
    if (process.env.NODE_ENV === "production") {
      return { success: false, mode: "console", error: "邮件服务尚未配置。" };
    }
    console.log(`[MAIL DEV MODE] To: ${options.to}`);
    console.log(`[MAIL DEV MODE] Subject: ${options.subject}`);
    console.log(`[MAIL DEV MODE] Body (first 300 chars): ${options.html.replace(/<[^>]+>/g, " ").slice(0, 300)}...`);
    return { success: true, mode: "console" };
  }

  try {
    const from = await getMailFrom();
    await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]+>/g, " "),
    });
    return { success: true, mode: "smtp" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "邮件发送失败";
    console.error(`[MAIL ERROR] ${message.slice(0, 200)}`);
    return { success: false, mode: "smtp", error: "邮件发送失败，请检查 SMTP 配置。" };
  } finally {
    transporter.close();
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
    body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; background: #F4F6F1; margin: 0; padding: 0; color: #182016; }
    .container { max-width: 520px; margin: 0 auto; padding: 32px 20px; }
    .logo { font-size: 22px; font-weight: 900; color: #587744; margin-bottom: 24px; }
    .card { background: #fff; border: 1px solid #DDE4D8; border-radius: 18px; padding: 28px 24px; box-shadow: 0 8px 24px rgba(24,32,22,0.06); }
    h1 { margin: 0 0 16px 0; font-size: 22px; font-weight: 900; color: #182016; }
    p { line-height: 1.7; margin: 10px 0; font-size: 15px; color: #596457; }
    .btn { display: inline-block; background: #587744; color: #fff; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 900; font-size: 15px; margin: 16px 0; }
    .link-row { word-break: break-all; background: #F4F6F1; padding: 14px; border-radius: 10px; font-size: 13px; color: #667063; }
    .tip { font-size: 13px; color: #667063; }
    .footer { margin-top: 28px; font-size: 12px; color: #8F998C; text-align: center; }
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

export async function sendEmailVerification(email: string, verifyToken: string): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const verifyUrl = `${getAppUrl()}/verify-email?token=${encodeURIComponent(verifyToken)}`;
  const bodyHtml = `
    <h1>欢迎加入 Link168</h1>
    <p>请在 24 小时内点击下方链接，完成邮箱验证：</p>
    <a href="${verifyUrl}" class="btn" target="_blank" rel="noopener">确认我的邮箱</a>
    <p class="tip">如果按钮无法点击，请复制下方链接到浏览器中打开：</p>
    <div class="link-row">${verifyUrl}</div>
    <p class="tip">验证完成后，你的 Link168 主页即可正常使用。</p>`;
  const result = await sendEmail({
    to: email,
    subject: "请验证你的 Link168 邮箱",
    html: wrapInLayout("邮箱验证 · Link168", bodyHtml),
  });
  return { success: result.success, mode: result.mode };
}

export async function sendPasswordReset(email: string, resetToken: string): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const resetUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(resetToken)}`;
  const bodyHtml = `
    <h1>重置你的密码</h1>
    <p>请在 2 小时内点击下方链接完成密码重置：</p>
    <a href="${resetUrl}" class="btn" target="_blank" rel="noopener">重置我的密码</a>
    <p class="tip">如果按钮无法点击，请复制下方链接到浏览器中打开：</p>
    <div class="link-row">${resetUrl}</div>
    <p class="tip">此链接 2 小时后失效。若非本人操作，请忽略本邮件。</p>`;
  const result = await sendEmail({
    to: email,
    subject: "重置你的 Link168 密码",
    html: wrapInLayout("重置密码 · Link168", bodyHtml),
  });
  return { success: result.success, mode: result.mode };
}
