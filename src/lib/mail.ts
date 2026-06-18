import nodemailer, { type Transporter } from "nodemailer";

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "465");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    return null;
  }

  const secure = port === 465;

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return cachedTransporter;
}

export function getMailFrom(): string {
  return process.env.MAIL_FROM || `Link168 <${process.env.SMTP_USER || "noreply@link168.me"}>`;
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000");
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ success: boolean; mode: "smtp" | "console"; error?: string }> {
  const transporter = getTransporter();

  if (!transporter) {
    console.log(`[MAIL DEV MODE] To: ${options.to}`);
    console.log(`[MAIL DEV MODE] Subject: ${options.subject}`);
    console.log(`[MAIL DEV MODE] Body (first 300 chars): ${options.html.replace(/<[^>]+>/g, " ").slice(0, 300)}...`);
    return { success: true, mode: "console" };
  }

  try {
    await transporter.sendMail({
      from: getMailFrom(),
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]+>/g, " "),
    });
    return { success: true, mode: "smtp" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[MAIL ERROR] Failed sending to ${options.to}: ${message}`);
    return { success: false, mode: "smtp", error: message };
  }
}

function wrapInLayout(title: string, bodyHtml: string, footerNote?: string): string {
  const year = new Date().getFullYear();
  const defaultFooter = `此邮件由 Link168 自动发送。如非本人操作，请忽略本邮件。`;
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
    h1 { margin: 0 0 16px 0; font-size: 22px; font-weight: 900; color: #2B241E; }
    p { line-height: 1.7; margin: 10px 0; font-size: 15px; color: #5A4A3B; }
    .btn { display: inline-block; background: #6F8F4E; color: #fff; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 900; font-size: 15px; margin: 16px 0; }
    .link-row { word-break: break-all; background: #F7F1E7; padding: 14px; border-radius: 10px; font-size: 13px; color: #7A6D5E; }
    .tip { font-size: 13px; color: #7A6D5E; }
    .footer { margin-top: 28px; font-size: 12px; color: #A69A8A; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🌿 Link168</div>
    <div class="card">
      ${bodyHtml}
    </div>
    <div class="footer">© ${year} Link168 · ${footerNote || defaultFooter}</div>
  </div>
</body>
</html>`;
}

export async function sendEmailVerification(email: string, verifyToken: string): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const appUrl = getAppUrl();
  const verifyUrl = `${appUrl}/verify-email?token=${encodeURIComponent(verifyToken)}`;

  const bodyHtml = `
    <h1>欢迎加入 Link168 👋</h1>
    <p>请在 24 小时内点击下方链接，完成邮箱验证：</p>
    <a href="${verifyUrl}" class="btn" target="_blank" rel="noopener">确认我的邮箱</a>
    <p class="tip">如果上面的按钮无法点击，请复制下方链接到浏览器中打开：</p>
    <div class="link-row">${verifyUrl}</div>
    <p class="tip">验证完成后，你的 Link168 主页即可正常使用。</p>
  `;

  const result = await sendEmail({
    to: email,
    subject: "请验证你的 Link168 邮箱",
    html: wrapInLayout("邮箱验证 · Link168", bodyHtml),
  });

  return { success: result.success, mode: result.mode };
}

export async function sendPasswordReset(email: string, resetToken: string): Promise<{ success: boolean; mode: "smtp" | "console" }> {
  const appUrl = getAppUrl();
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

  const bodyHtml = `
    <h1>重置你的密码</h1>
    <p>你刚刚请求重置 Link168 的账号密码。请在 2 小时内点击下方链接：</p>
    <a href="${resetUrl}" class="btn" target="_blank" rel="noopener">重置我的密码</a>
    <p class="tip">如果上面的按钮无法点击，请复制下方链接到浏览器中打开：</p>
    <div class="link-row">${resetUrl}</div>
    <p class="tip">⚠️ 此链接 2 小时后失效。若非本人操作，请尽快修改密码以保障账号安全。</p>
  `;

  const result = await sendEmail({
    to: email,
    subject: "重置你的 Link168 密码",
    html: wrapInLayout("重置密码 · Link168", bodyHtml),
  });

  return { success: result.success, mode: result.mode };
}
