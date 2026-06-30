/**
 * AI Service Config API
 * 路径: /api/workbench/ai-config
 *
 * GET  /api/workbench/ai-config — 获取当前用户的 AI 配置
 * PUT  /api/workbench/ai-config — 创建或更新 AI 配置
 */
import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { newId } from "@/lib/dashboard-data";
import { hasSensitiveContent, sanitizePublicText } from "@/lib/content-safety";

export const runtime = "nodejs";

const VALID_TONES = ["friendly", "professional", "casual", "formal"];
const VALID_MODES = ["mock", "openai", "deepseek", "qwen"];

type RouteContext = { params: Promise<{ id: string }> };

function sanitizeText(raw: unknown, maxLen: number): string {
  if (typeof raw !== "string") return "";
  return sanitizePublicText(raw.trim().slice(0, maxLen)) ?? "";
}

function sanitizeBool(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === "boolean") return raw;
  return fallback;
}

// GET — 获取配置（如果不存在则返回默认值）
export async function GET(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  let config = await db.aiServiceConfig.findUnique({
    where: { userId: user.id },
  });

  if (!config) {
    // 首次访问时返回默认值（不写入数据库）
    return NextResponse.json({
      success: true,
      config: {
        enabled: false,
        assistant_name: "AI 助理",
        welcome_message: "你好！我是 AI 助理，有什么可以帮你？",
        tone: "friendly",
        allow_product_recommendation: true,
        collect_lead: true,
        provider_mode: "mock",
      },
      isDefault: true,
    });
  }

  return NextResponse.json({
    success: true,
    config: {
      id: config.id,
      enabled: config.enabled,
      assistant_name: config.assistantName,
      welcome_message: config.welcomeMessage,
      tone: config.tone,
      allow_product_recommendation: config.allowProductRecommendation,
      collect_lead: config.collectLead,
      provider_mode: config.providerMode,
      created_at: config.createdAt.toISOString(),
      updated_at: config.updatedAt.toISOString(),
    },
    isDefault: false,
  });
}

// PUT — 创建或更新配置
export async function PUT(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: "请求格式不正确。" },
      { status: 400 }
    );
  }

  // 助理名称
  const assistantName = sanitizeText(body.assistant_name, 50);
  if (!assistantName) {
    return NextResponse.json(
      { success: false, error: "请输入 AI 助理名称。" },
      { status: 400 }
    );
  }
  if (hasSensitiveContent(assistantName).detected) {
    return NextResponse.json(
      { success: false, error: "助理名称包含受限关键词。" },
      { status: 400 }
    );
  }

  // 欢迎语
  const welcomeMessage = sanitizeText(body.welcome_message, 500);
  if (!welcomeMessage) {
    return NextResponse.json(
      { success: false, error: "请输入欢迎语。" },
      { status: 400 }
    );
  }
  if (hasSensitiveContent(welcomeMessage).detected) {
    return NextResponse.json(
      { success: false, error: "欢迎语包含受限关键词。" },
      { status: 400 }
    );
  }

  const tone = typeof body.tone === "string" && VALID_TONES.includes(body.tone)
    ? body.tone
    : "friendly";
  const providerMode = typeof body.provider_mode === "string" && VALID_MODES.includes(body.provider_mode)
    ? body.provider_mode
    : "mock";

  const existing = await db.aiServiceConfig.findUnique({
    where: { userId: user.id },
  });

  const data = {
    enabled: sanitizeBool(body.enabled, existing?.enabled ?? false),
    assistantName,
    welcomeMessage,
    tone,
    allowProductRecommendation: sanitizeBool(body.allow_product_recommendation, true),
    collectLead: sanitizeBool(body.collect_lead, true),
    providerMode,
  };

  let config: typeof existing | Awaited<ReturnType<typeof db.aiServiceConfig.create>>;

  if (existing) {
    config = await db.aiServiceConfig.update({
      where: { id: existing.id },
      data,
    });
  } else {
    config = await db.aiServiceConfig.create({
      data: {
        id: newId(),
        userId: user.id,
        ...data,
      },
    });
  }

  return NextResponse.json({
    success: true,
    config: {
      id: config.id,
      enabled: config.enabled,
      assistant_name: config.assistantName,
      welcome_message: config.welcomeMessage,
      tone: config.tone,
      allow_product_recommendation: config.allowProductRecommendation,
      collect_lead: config.collectLead,
      provider_mode: config.providerMode,
      created_at: config.createdAt.toISOString(),
      updated_at: config.updatedAt.toISOString(),
    },
  });
}
