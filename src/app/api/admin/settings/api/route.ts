import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { getMaskedConfig, updateConfig, getConfig, DEFAULT_CONFIG, getAiDailyUsage, isAiTester } from "@/lib/app-config";
import { db } from "@/lib/db";
import { ROLE_SUPER_ADMIN } from "@/lib/auth";

export const runtime = "nodejs";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KNOWN_ASSISTANTS = ["财税助理", "法务助理", "市场调研助理", "设计助理", "社媒运营助理"];

export async function GET(request: Request) {
  const forbidden = await requireSuperAdmin(request);
  if (forbidden) return forbidden;

  const config = await getMaskedConfig();
  return NextResponse.json({ success: true, config });
}

function validateAndCoerce(body: Record<string, unknown>) {
  const aiEnabled = body.aiEnabled === true;
  const aiBaseUrl = typeof body.aiBaseUrl === "string" ? body.aiBaseUrl.trim() : DEFAULT_CONFIG.aiBaseUrl;
  const aiModel = typeof body.aiModel === "string" ? body.aiModel.trim() : DEFAULT_CONFIG.aiModel;
  const aiApiKeyRaw = typeof body.aiApiKey === "string" ? body.aiApiKey.trim() : "";
  const aiApiKey = aiApiKeyRaw && !aiApiKeyRaw.includes("****") ? aiApiKeyRaw : "";

  let aiTesterEmails: string[] = [];
  if (Array.isArray(body.aiTesterEmails)) {
    aiTesterEmails = (body.aiTesterEmails as string[])
      .map((e) => (typeof e === "string" ? e.trim().toLowerCase() : ""))
      .filter((e) => EMAIL_REGEX.test(e));
  } else if (typeof body.aiTesterEmails === "string") {
    aiTesterEmails = body.aiTesterEmails
      .split(/[,;\n]/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => EMAIL_REGEX.test(e));
  }

  const aiDailyLimitRaw = Number(body.aiDailyLimitPerUser);
  const aiDailyLimitPerUser = Number.isNaN(aiDailyLimitRaw) || aiDailyLimitRaw < 1 ? 50 : Math.min(aiDailyLimitRaw, 10000);
  const emailEnabled = body.emailEnabled === true;
  const paymentEnabled = body.paymentEnabled === true;

  const storageProviderRaw = String(body.storageProvider ?? "local").toLowerCase();
  const storageProvider = (["local", "s3", "cloudinary"] as const).includes(storageProviderRaw as "local" | "s3" | "cloudinary")
    ? (storageProviderRaw as "local" | "s3" | "cloudinary")
    : "local";

  return {
    aiEnabled,
    aiBaseUrl,
    aiModel,
    aiApiKey,
    aiTesterEmails,
    aiDailyLimitPerUser,
    emailEnabled,
    paymentEnabled,
    storageProvider,
  };
}

export async function PUT(request: Request) {
  const forbidden = await requireSuperAdmin(request);
  if (forbidden) return forbidden;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const validated = validateAndCoerce(body);
  await updateConfig(validated);
  const config = await getMaskedConfig();

  return NextResponse.json({ success: true, config });
}

export async function POST(request: Request) {
  const forbidden = await requireSuperAdmin(request);
  if (forbidden) return forbidden;

  let body: { action?: unknown; email?: unknown };
  try {
    body = (await request.json()) as { action?: unknown; email?: unknown };
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.action === "test-email") {
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ success: false, error: "邮箱格式不正确。" }, { status: 400 });
    }
    const tester = await isAiTester(email);
    const user = await db.user.findUnique({ where: { email } });
    const usageByAssistant = !user
      ? KNOWN_ASSISTANTS.map((a) => ({ assistant: a, used: 0, limit: 0, remaining: 0 }))
      : await Promise.all(
          KNOWN_ASSISTANTS.map(async (assistant) => {
            const usage = await getAiDailyUsage(user.id, assistant);
            return { assistant, ...usage };
          }),
        );
    return NextResponse.json({ success: true, email, isTester: tester, userId: user?.id ?? null, usage: usageByAssistant });
  }

  if (body.action === "promote-super-admin") {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ success: false, error: "邮箱格式不正确。" }, { status: 400 });
    }
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ success: false, error: "该邮箱尚未注册。" }, { status: 404 });
    }
    await db.user.update({ where: { id: user.id }, data: { role: ROLE_SUPER_ADMIN } });
    return NextResponse.json({ success: true, message: `已将 ${email} 提升为超级管理员。` });
  }

  if (body.action === "test-ai-connection") {
    const config = await getConfig();
    if (!config.aiApiKey) {
      return NextResponse.json({ success: false, error: "API Key 未配置。" }, { status: 400 });
    }
    const baseUrl = config.aiBaseUrl.endsWith("/") ? config.aiBaseUrl.slice(0, -1) : config.aiBaseUrl;
    try {
      const apiResponse = await fetch(`${baseUrl}/models`, {
        method: "GET",
        headers: { Authorization: `Bearer ${config.aiApiKey}` },
        cache: "no-store",
      });
      if (!apiResponse.ok) {
        return NextResponse.json({ success: false, error: `AI 服务测试失败（${apiResponse.status}）。` }, { status: 502 });
      }
      return NextResponse.json({ success: true, message: `成功连接到 ${config.aiBaseUrl}（${config.aiModel}）。` });
    } catch {
      return NextResponse.json({ success: false, error: "无法连接到 AI 服务。" }, { status: 502 });
    }
  }

  return NextResponse.json({ success: false, error: "未知操作。" }, { status: 400 });
}
