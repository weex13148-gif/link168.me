import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getAiDailyUsage,
  getAiGlobalDailyUsage,
  getConfig,
  incrementAiUsage,
  isAiTester,
  isAssistantEnabled,
} from "@/lib/app-config";
import {
  getAssistantDefinition,
  AI_ASSISTANT_LIST,
} from "@/lib/ai/assistants";
import {
  callAssistant,
  getProviderConfig,
  isProviderConfigured,
} from "@/lib/ai/provider";
import { rateLimit } from "@/lib/rate-limit";
import { detectPromptInjection, sanitizeUserMessage, hasSensitiveContent } from "@/lib/content-safety";

export const runtime = "nodejs";

type ChatPayload = {
  assistant?: unknown;
  message?: unknown;
  history?: unknown;
};

export async function POST(request: Request) {
  // 0. 全局限流（按 IP，60s 内最多 20 次 AI 请求）
  const rl = rateLimit(request, "enterprise-ai:chat", 20, 60 * 1000);
  if (!rl.passed) {
    return NextResponse.json(
      { success: false, error: `请求过于频繁，请 ${Math.ceil(rl.resetMs / 1000)} 秒后重试。` },
      { status: 429 },
    );
  }

  // 1. 必须登录
  const { user, response: authResponse } = await requireUser(request);
  if (authResponse || !user) {
    return authResponse ?? NextResponse.json({ success: false, error: "未登录。" }, { status: 401 });
  }

  // 2. 必须在 AI 测试白名单
  const tester = await isAiTester(user.email);
  if (!tester) {
    return NextResponse.json(
      { success: false, error: "当前账号不在 AI 内测白名单中，请联系超级管理员开通。" },
      { status: 403 },
    );
  }

  // 3. AI 总开关与该助理开关
  const config = await getConfig();
  if (!config.aiEnabled) {
    return NextResponse.json(
      { success: false, error: "AI 服务尚未启用，请联系超级管理员。" },
      { status: 403 },
    );
  }

  let body: ChatPayload;
  try {
    body = (await request.json()) as ChatPayload;
  } catch {
    return NextResponse.json({ success: false, error: "请求体不是合法 JSON。" }, { status: 400 });
  }

  const rawAssistant = typeof body.assistant === "string" ? body.assistant : "";
  const message = typeof body.message === "string" ? body.message : "";
  const historyRaw = Array.isArray(body.history) ? (body.history as unknown[]) : [];

  const assistantDef = getAssistantDefinition(rawAssistant);
  if (!assistantDef) {
    return NextResponse.json(
      {
        success: false,
        error: `未知的 AI 助手。可用值：${AI_ASSISTANT_LIST.map((a) => a.title).join("、")}。`,
      },
      { status: 400 },
    );
  }

  if (!isAssistantEnabled(config, assistantDef.displayTitle)) {
    return NextResponse.json(
      { success: false, error: "该 AI 助手尚未启用，请联系超级管理员配置后再试。" },
      { status: 403 },
    );
  }

  if (!message || message.length > assistantDef.maxMessageLength) {
    return NextResponse.json(
      { success: false, error: `消息不能为空或超过 ${assistantDef.maxMessageLength} 字。` },
      { status: 400 },
    );
  }

  // 4.1 内容安全：prompt injection 初筛 + 敏感词 + 规范化（去除控制字符等）
  const injection = detectPromptInjection(message);
  if (injection.detected) {
    return NextResponse.json(
      { success: false, error: `检测到潜在的提示词注入风险：${injection.reason}。请重新组织问题。` },
      { status: 400 },
    );
  }

  const sensitive = hasSensitiveContent(message);
  if (sensitive.detected) {
    return NextResponse.json(
      { success: false, error: `消息内容包含受限关键词（${sensitive.matches.slice(0, 3).join(" / ")}），请修改后再试。` },
      { status: 400 },
    );
  }

  const sanitizedMessage = sanitizeUserMessage(message);

  const providerConfig = await getProviderConfig(assistantDef);
  if (!isProviderConfigured(providerConfig)) {
    return NextResponse.json(
      { success: false, error: "AI 服务未配置（API Key / Base URL / Model 缺失）。" },
      { status: 500 },
    );
  }

  // 4. 每日调用次数（单用户）与全局额度
  const perUserUsage = await getAiDailyUsage(user.id, assistantDef.displayTitle);
  if (perUserUsage.remaining <= 0) {
    return NextResponse.json(
      {
        success: false,
        error: `今日调用已达上限（${perUserUsage.used}/${perUserUsage.limit}），请明天再试。`,
        usage: perUserUsage,
      },
      { status: 429 },
    );
  }

  const globalUsage = await getAiGlobalDailyUsage();
  if (globalUsage.remaining <= 0) {
    return NextResponse.json(
      {
        success: false,
        error: "今日 AI 总调用额度已用完，请明天再试。",
        usage: globalUsage,
      },
      { status: 429 },
    );
  }

  const history = historyRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const obj = item as { role?: unknown; content?: unknown };
      const role = obj.role;
      const content = obj.content;
      if ((role === "user" || role === "assistant") && typeof content === "string") {
        return { role: role as "user" | "assistant", content };
      }
      return null;
    })
    .filter(Boolean) as { role: "user" | "assistant"; content: string }[];

  // 5. 调用模型（使用经过安全过滤后的消息
  const result = await callAssistant(assistantDef, sanitizedMessage, history);

  if (!result.ok || !result.reply) {
    return NextResponse.json(
      { success: false, error: result.error || "AI 服务暂时不可用。" },
      { status: result.status ?? 502 },
    );
  }

  // 6. 写入 AiUsageLog
  await incrementAiUsage(user.id, assistantDef.displayTitle);
  const updatedUsage = await getAiDailyUsage(user.id, assistantDef.displayTitle);

  // 7. 构造前端友好的纯文本 reply（同时保留结构化字段）
  const { reply } = result;
  const suggestionsText = reply.suggestions.length
    ? `建议：\n${reply.suggestions.map((s, idx) => `${idx + 1}. ${s}`).join("\n")}`
    : "";
  const replyText = [
    `【摘要】${reply.summary}`,
    "",
    suggestionsText,
    suggestionsText ? "" : null,
    reply.content,
    "",
    reply.disclaimer,
  ]
    .filter((line) => line !== null && line !== undefined)
    .join("\n");

  return NextResponse.json({
    success: true,
    reply: replyText,
    structured: {
      summary: reply.summary,
      suggestions: reply.suggestions,
      content: reply.content,
      disclaimer: reply.disclaimer,
      assistantTitle: reply.assistantTitle,
    },
    usage: updatedUsage,
    providerMeta: result.providerMeta,
  });
}
