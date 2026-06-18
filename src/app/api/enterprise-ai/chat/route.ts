import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getConfig, isAiTester, getAiDailyUsage, incrementAiUsage } from "@/lib/app-config";

export const runtime = "nodejs";

const ASSISTANT_SYSTEM_PROMPTS: Record<string, string> = {
  "财税助理": "你是一名专业的财税助理，擅长解答发票、成本、税务申报、经营数据分析等问题。请用中文，回答要专业、简洁、有实际建议。",
  "法务助理": "你是一名专业的法务助理，擅长审查协议条款、合同要点和常见合规风险提示。请注意：你不提供法律意见，只做信息梳理。请用中文。",
  "市场调研助理": "你是一名专业的市场调研助理，擅长梳理竞品信息、用户画像、定价策略和市场机会分析。请用中文回答。",
  "设计助理": "你是一名专业的设计助理，擅长提供 Logo、网页、海报、品牌视觉的设计建议。请用中文回答。",
  "社媒运营助理": "你是一名专业的社媒运营助理，擅长为小红书、公众号、抖音、视频号提供内容思路和文案建议。请用中文回答。",
};

const VALID_ASSISTANTS = Object.keys(ASSISTANT_SYSTEM_PROMPTS);

export async function POST(request: Request) {
  const { user, response } = await requireUser(request);
  if (response || !user) return response;

  const config = await getConfig();

  if (!config.aiEnabled) {
    return NextResponse.json({ success: false, error: "AI 服务暂未启用，请联系管理员。" }, { status: 403 });
  }

  const tester = await isAiTester(user.email);
  if (!tester) {
    return NextResponse.json({ success: false, error: "内测中，仅测试账号可用。" }, { status: 403 });
  }

  let body: { assistant?: unknown; message?: unknown; history?: unknown };
  try {
    body = (await request.json()) as { assistant?: unknown; message?: unknown; history?: unknown };
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const assistant = typeof body.assistant === "string" ? body.assistant : "";
  const message = typeof body.message === "string" ? body.message : "";
  const history = Array.isArray(body.history) ? (body.history as { role: string; content: string }[]) : [];

  if (!VALID_ASSISTANTS.includes(assistant)) {
    return NextResponse.json({ success: false, error: "未知的 AI 助理类型。" }, { status: 400 });
  }

  if (!message || message.length > 4000) {
    return NextResponse.json({ success: false, error: "消息不能为空或超过长度限制。" }, { status: 400 });
  }

  if (!config.aiApiKey) {
    return NextResponse.json({ success: false, error: "AI API Key 未配置。" }, { status: 500 });
  }

  const usage = await getAiDailyUsage(user.id, assistant);
  if (usage.remaining <= 0) {
    return NextResponse.json(
      { success: false, error: `今日调用已达上限（${usage.limit} 次），请明天再试。`, usage },
      { status: 429 },
    );
  }

  const systemPrompt = ASSISTANT_SYSTEM_PROMPTS[assistant];
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-10).filter((h) => typeof h.role === "string" && typeof h.content === "string"),
    { role: "user", content: message },
  ];

  const baseUrl = config.aiBaseUrl.endsWith("/") ? config.aiBaseUrl.slice(0, -1) : config.aiBaseUrl;

  try {
    const apiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.aiApiKey}`,
      },
      body: JSON.stringify({
        model: config.aiModel || "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
      cache: "no-store",
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text().catch(() => "");
      return NextResponse.json(
        { success: false, error: `AI 服务返回错误（${apiResponse.status}）。`, detail: process.env.NODE_ENV === "development" ? errorText : undefined },
        { status: 502 },
      );
    }

    const data = (await apiResponse.json()) as { choices?: { message?: { content?: string } }[] };
    const reply = data?.choices?.[0]?.message?.content ?? "AI 未返回有效内容。";

    await incrementAiUsage(user.id, assistant);
    const newUsage = await getAiDailyUsage(user.id, assistant);

    return NextResponse.json({ success: true, reply, usage: newUsage });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: "调用 AI 服务失败，请稍后重试。", detail: process.env.NODE_ENV === "development" ? message : undefined }, { status: 502 });
  }
}
