import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { listConversations, createConversation } from "@/lib/ai/conversations";
import { normalizeAssistantTitle } from "@/lib/ai/assistants";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const { searchParams } = new URL(request.url);
  const assistantRaw = searchParams.get("assistant");
  const limit = Math.min(50, parseInt(searchParams.get("limit") || "20", 10));

  const assistant = assistantRaw ? normalizeAssistantTitle(assistantRaw) : undefined;

  const conversations = await listConversations(
    user.id,
    assistant as any,
    limit,
  );

  return NextResponse.json({
    success: true,
    conversations: conversations.map((c) => ({
      id: c.id,
      status: c.status,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
      last_message: c.messages[0]
        ? {
            role: c.messages[0].role,
            content: c.messages[0].content.slice(0, 100),
            created_at: c.messages[0].createdAt,
          }
        : null,
    })),
  });
}

export async function POST(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "请求体不是合法 JSON。" }, { status: 400 });
  }

  const assistantRaw = typeof body.assistant === "string" ? body.assistant : "tax";
  const title = typeof body.title === "string" ? body.title : undefined;

  const assistant = normalizeAssistantTitle(assistantRaw);
  if (!assistant) {
    return NextResponse.json({ success: false, error: "未知的 AI 助手。" }, { status: 400 });
  }

  const conversation = await createConversation(user.id, assistant as any, title);

  return NextResponse.json({
    success: true,
    conversation: {
      id: conversation.id,
      status: conversation.status,
      created_at: conversation.createdAt.toISOString(),
      updated_at: conversation.updatedAt.toISOString(),
    },
  });
}
