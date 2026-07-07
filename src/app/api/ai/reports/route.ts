// AI 回答举报 API
// 用户可对 AI 的回答提交举报，创建风险事件记录
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { reportAiResponse } from "@/lib/ai/risk-log";

export const runtime = "nodejs";

/**
 * 举报类型枚举
 * - error: 错误信息举报（AI 回复存在事实错误或误导性信息）
 * - illegal: 违法违规举报（涉及违法法规内容）
 * - unsafe: 不安全建议举报（危险或不安全的建议）
 * - privacy: 隐私问题举报（隐私泄露风险）
 * - other: 其他问题
 */
export type ReportType = "error" | "illegal" | "unsafe" | "privacy" | "other";

const VALID_REPORT_TYPES: ReportType[] = ["error", "illegal", "unsafe", "privacy", "other"];

type ReportPayload = {
  assistant?: unknown;
  userMessage?: unknown;
  aiResponse?: unknown;
  reason?: unknown;
  reportType?: unknown; // 新增：举报类型
};

function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

// POST: 用户提交举报
export async function POST(request: Request) {
  const ip = getClientIp(request);

  const { user, response: authResponse } = await requireUser(request);
  if (authResponse || !user) {
    return authResponse ?? NextResponse.json({ success: false, error: "未登录。" }, { status: 401 });
  }

  let body: ReportPayload;
  try {
    body = (await request.json()) as ReportPayload;
  } catch {
    return NextResponse.json({ success: false, error: "请求体不是合法 JSON。" }, { status: 400 });
  }

  const assistant = typeof body.assistant === "string" ? body.assistant.trim() : "";
  const userMessage = typeof body.userMessage === "string" ? body.userMessage : "";
  const aiResponse = typeof body.aiResponse === "string" ? body.aiResponse : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  // 解析举报类型，默认"other"
  let reportType: ReportType = "other";
  if (typeof body.reportType === "string" && VALID_REPORT_TYPES.includes(body.reportType as ReportType)) {
    reportType = body.reportType as ReportType;
  }

  if (!assistant) {
    return NextResponse.json({ success: false, error: "缺少助手名称。" }, { status: 400 });
  }

  if (!reason || reason.length < 5) {
    return NextResponse.json(
      { success: false, error: "举报原因不能少于 5 个字符。" },
      { status: 400 },
    );
  }

  const result = await reportAiResponse({
    reporterUserId: user.id,
    assistant,
    userMessage: userMessage.slice(0, 500),
    aiResponse: aiResponse.slice(0, 2000),
    reason: `[${reportType}] ${reason}`.slice(0, 500), // 将举报类型附加到原因前
    ipAddress: ip,
  });

  if (!result.success) {
    return NextResponse.json({ success: false, error: "举报提交失败，请稍后重试。" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    eventId: result.eventId,
    message: "举报已收到，我们会尽快审核处理。",
  });
}
