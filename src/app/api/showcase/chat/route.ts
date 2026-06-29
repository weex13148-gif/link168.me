import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getAiDailyUsage,
  getAiGlobalDailyUsage,
  getConfig,
  incrementAiUsage,
  isAiTester,
} from "@/lib/app-config";
import { callShowcaseChatProvider, type ShowcaseHistoryMessage } from "@/lib/ai/showcase-chat-provider";
import { detectPromptInjection, hasSensitiveContent, sanitizeUserMessage } from "@/lib/content-safety";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHOWCASE_ASSISTANT = "Link168 AI 经营助手";
const MAX_MESSAGE_LENGTH = 3000;

type ChatPayload = {
  message?: unknown;
  history?: unknown;
};

function normalizeHistory(value: unknown): ShowcaseHistoryMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .slice(-12)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const message = item as { role?: unknown; content?: unknown };
      if ((message.role === "user" || message.role === "assistant") && typeof message.content === "string") {
        return {
          role: message.role,
          content: message.content.slice(0, MAX_MESSAGE_LENGTH),
        };
      }
      return null;
    })
    .filter((item): item is ShowcaseHistoryMessage => item !== null);
}

export async function POST(request: Request) {
  const rl = rateLimit(request, "showcase-chat", 15, 60 * 1000);
  if (!rl.passed) {
    return NextResponse.json({ success: false, error: "消息发送过于频繁，请稍后再试。" }, { status: 429 });
  }

  const { user, response } = await requireUser(request);
  if (response || !user) return response;

  const config = await getConfig();
  const tester = await isAiTester(user.email);
  if (!config.aiEnabled || !tester) {
    return NextResponse.json({ success: false, error: "当前账号暂未开通聊天测试权限。" }, { status: 403 });
  }

  let body: ChatPayload;
  try {
    body = (await request.json()) as ChatPayload;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const rawMessage = typeof body.message === "string" ? body.message.trim() : "";
  if (!rawMessage || rawMessage.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ success: false, error: "请输入 1-3000 字的消息。" }, { status: 400 });
  }

  const injection = detectPromptInjection(rawMessage);
  if (injection.detected) {
    return NextResponse.json({ success: false, error: "该消息包含无法处理的指令，请换一种表达方式。" }, { status: 400 });
  }

  const sensitive = hasSensitiveContent(rawMessage);
  if (sensitive.detected) {
    return NextResponse.json({ success: false, error: "该消息包含暂不支持的内容，请调整后重试。" }, { status: 400 });
  }

  const [userUsage, globalUsage] = await Promise.all([
    getAiDailyUsage(user.id, SHOWCASE_ASSISTANT),
    getAiGlobalDailyUsage(),
  ]);
  if (userUsage.remaining <= 0 || globalUsage.remaining <= 0) {
    return NextResponse.json({ success: false, error: "今日聊天次数已用完，请明天再试。" }, { status: 429 });
  }

  const result = await callShowcaseChatProvider(
    sanitizeUserMessage(rawMessage),
    normalizeHistory(body.history),
  );
  if (!result.ok || !result.text) {
    return NextResponse.json(
      { success: false, error: result.error || "聊天服务暂时不可用。" },
      { status: result.status || 502 },
    );
  }

  const counted = await incrementAiUsage(user.id, SHOWCASE_ASSISTANT);
  if (!counted) {
    return NextResponse.json({ success: false, error: "今日聊天次数已用完，请明天再试。" }, { status: 429 });
  }

  const updatedUsage = await getAiDailyUsage(user.id, SHOWCASE_ASSISTANT);
  return NextResponse.json({
    success: true,
    reply: result.text,
    usage: updatedUsage,
  });
}
