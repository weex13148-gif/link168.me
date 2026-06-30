import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { getConversation, deleteConversation } from "@/lib/ai/conversations";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const { id } = await context.params;

  const conversation = await getConversation(user.id, id);
  if (!conversation) {
    return NextResponse.json(
      { success: false, error: "会话不存在或无权访问。" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    conversation: {
      id: conversation.id,
      status: conversation.status,
      created_at: conversation.createdAt.toISOString(),
      updated_at: conversation.updatedAt.toISOString(),
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        credit_cost: m.creditCost,
        source_refs: m.sourceRefs,
        created_at: m.createdAt.toISOString(),
      })),
    },
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const { id } = await context.params;

  const deleted = await deleteConversation(user.id, id);
  if (!deleted) {
    return NextResponse.json(
      { success: false, error: "会话不存在或无权删除。" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true });
}
