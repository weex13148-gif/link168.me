import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { getConfig, getMaskedConfig, updateConfig } from "@/lib/app-config";
import { callShowcaseChatProvider } from "@/lib/ai/showcase-chat-provider";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type UpdatePayload = {
  aiEnabled?: unknown;
  aiBaseUrl?: unknown;
  aiApiKey?: unknown;
  aiDailyLimitTotal?: unknown;
  aiDailyLimitPerUser?: unknown;
  aiTesterEmails?: unknown;
};

function parseEmails(value: unknown) {
  const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,;\n]/) : [];
  return Array.from(
    new Set(
      source
        .map((item) => (typeof item === "string" ? item.trim().toLowerCase() : ""))
        .filter((item) => EMAIL_PATTERN.test(item)),
    ),
  );
}

function parseLimit(value: unknown, fallback: number, maximum: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), 1), maximum);
}

export async function GET(request: Request) {
  const forbidden = await requireSuperAdmin(request);
  if (forbidden) return forbidden;

  const config = await getMaskedConfig();
  return NextResponse.json({
    success: true,
    config: {
      aiEnabled: config.aiEnabled,
      aiBaseUrl: config.aiBaseUrl,
      aiApiKey: config.aiApiKey,
      aiDailyLimitTotal: config.aiDailyLimitTotal,
      aiDailyLimitPerUser: config.aiDailyLimitPerUser,
      aiTesterEmails: config.aiTesterEmails,
    },
  });
}

export async function PUT(request: Request) {
  const forbidden = await requireSuperAdmin(request);
  if (forbidden) return forbidden;

  const rl = rateLimit(request, "admin-chat-settings:update", 20, 60 * 1000);
  if (!rl.passed) {
    return NextResponse.json({ success: false, error: "保存过于频繁，请稍后再试。" }, { status: 429 });
  }

  let body: UpdatePayload;
  try {
    body = (await request.json()) as UpdatePayload;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const current = await getConfig();
  const endpoint = typeof body.aiBaseUrl === "string" ? body.aiBaseUrl.trim() : "";
  if (!endpoint) {
    return NextResponse.json({ success: false, error: "请填写完整的应用调用地址。" }, { status: 400 });
  }

  const patch = {
    aiEnabled: body.aiEnabled === true,
    aiBaseUrl: endpoint,
    aiDailyLimitTotal: parseLimit(body.aiDailyLimitTotal, current.aiDailyLimitTotal, 1_000_000),
    aiDailyLimitPerUser: parseLimit(body.aiDailyLimitPerUser, current.aiDailyLimitPerUser, 100_000),
    aiTesterEmails: parseEmails(body.aiTesterEmails),
  } as const;

  const apiKey = typeof body.aiApiKey === "string" ? body.aiApiKey.trim() : "";
  try {
    await updateConfig(apiKey && !apiKey.includes("****") ? { ...patch, aiApiKey: apiKey } : patch);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "保存失败。" },
      { status: 400 },
    );
  }

  const masked = await getMaskedConfig();
  return NextResponse.json({
    success: true,
    config: {
      aiEnabled: masked.aiEnabled,
      aiBaseUrl: masked.aiBaseUrl,
      aiApiKey: masked.aiApiKey,
      aiDailyLimitTotal: masked.aiDailyLimitTotal,
      aiDailyLimitPerUser: masked.aiDailyLimitPerUser,
      aiTesterEmails: masked.aiTesterEmails,
    },
  });
}

export async function POST(request: Request) {
  const forbidden = await requireSuperAdmin(request);
  if (forbidden) return forbidden;

  const rl = rateLimit(request, "admin-chat-settings:test", 8, 60 * 1000);
  if (!rl.passed) {
    return NextResponse.json({ success: false, error: "测试过于频繁，请稍后再试。" }, { status: 429 });
  }

  const result = await callShowcaseChatProvider("请只回复：连接正常", []);
  if (!result.ok || !result.text) {
    return NextResponse.json(
      { success: false, error: result.error || "连接测试失败。" },
      { status: result.status || 502 },
    );
  }

  return NextResponse.json({ success: true, message: "连接正常，聊天服务可以调用。" });
}
