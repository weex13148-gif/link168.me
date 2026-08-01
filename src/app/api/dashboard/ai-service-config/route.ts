import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { revalidatePublicProfileByUser } from "@/lib/cache/public-profile";
import { db } from "@/lib/db";
import {
  normalizeAiReceptionConfig,
  toCustomerAiReceptionConfig,
} from "@/lib/ai/reception-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const config = await db.aiServiceConfig.findUnique({ where: { userId: user.id } });
  return NextResponse.json(
    { success: true, config: toCustomerAiReceptionConfig(config) },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}

export async function PUT(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  let normalized;
  try {
    normalized = normalizeAiReceptionConfig(body);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "配置内容不正确。" },
      { status: 400 },
    );
  }

  const data = {
    enabled: normalized.enabled,
    assistantName: normalized.assistantName,
    welcomeMessage: normalized.welcomeMessage,
    tone: normalized.tone,
    allowProductRecommendation: normalized.allowProductRecommendation,
    collectLead: normalized.collectLead,
    allowReport: normalized.allowReport,
    allowTransferToHuman: normalized.allowTransferToHuman,
    privacyNoticeText: normalized.privacyNoticeText,
    quickActionsJson: normalized.quickActionsJson,
  };

  const saved = await db.aiServiceConfig.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });

  await revalidatePublicProfileByUser(user.id);

  return NextResponse.json(
    { success: true, config: toCustomerAiReceptionConfig(saved) },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
