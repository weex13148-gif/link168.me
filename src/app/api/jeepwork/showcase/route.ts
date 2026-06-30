import { NextResponse } from "next/server";
import { requireJeepworkSuperAdmin, getJeepworkSessionUser } from "@/lib/jeepwork-auth";
import {
  DEFAULT_SHOWCASE_CONFIG,
  SHOWCASE_CONFIG_ACTION,
  SHOWCASE_SECTION_LABELS,
  getShowcaseConfig,
  getShowcaseLogs,
  saveShowcaseConfig,
  type ShowcaseSectionKey,
} from "@/lib/showcase";
import { db } from "@/lib/db";
import crypto from "crypto";

export const runtime = "nodejs";

function apiError(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error: { code, message } }, { status });
}

function parseBoolean(value: unknown, fallback = false) {
  return value === true ? true : value === false ? false : fallback;
}

function parseSections(value: unknown) {
  const fallback = DEFAULT_SHOWCASE_CONFIG.sections;
  const result = { ...fallback };
  if (!value || typeof value !== "object") return result;
  for (const key of Object.keys(fallback) as ShowcaseSectionKey[]) {
    const raw = (value as Record<string, unknown>)[key];
    result[key] = parseBoolean(raw, fallback[key]);
  }
  return result;
}

function publicConfig(config: Awaited<ReturnType<typeof getShowcaseConfig>>) {
  return {
    enabled: config.enabled,
    hasPassword: Boolean(config.passwordHash),
    updatedAt: config.updatedAt,
    sections: config.sections,
    sectionLabels: SHOWCASE_SECTION_LABELS,
  };
}

export async function GET(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;
  const config = await getShowcaseConfig();
  const logs = await getShowcaseLogs(100);
  return NextResponse.json({ success: true, data: { config: publicConfig(config), logs }, error: null });
}

export async function PUT(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;
  const actor = await getJeepworkSessionUser(request);

  let body: { enabled?: unknown; sections?: unknown; password?: unknown; confirmPassword?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return apiError("BAD_BODY", "请求体不是合法 JSON", 400);
  }

  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  if (password || confirmPassword) {
    if (password.length < 8) return apiError("WEAK_PASSWORD", "比赛访问密码至少 8 位", 400);
    if (password !== confirmPassword) return apiError("PASSWORD_MISMATCH", "两次输入的访问密码不一致", 400);
  }

  const next = await saveShowcaseConfig({
    enabled: parseBoolean(body.enabled, false),
    sections: parseSections(body.sections),
    password,
  });

  await db.adminAuditLog.create({
    data: {
      id: crypto.randomUUID(),
      actorUserId: actor?.id,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      action: SHOWCASE_CONFIG_ACTION,
      targetType: "competition_showcase",
      targetId: "showcase-config",
      metadataRaw: JSON.stringify({
        enabled: next.enabled,
        sections: next.sections,
        passwordChanged: Boolean(password),
      }),
      userAgent: request.headers.get("user-agent") || "",
      success: true,
    },
  });

  const logs = await getShowcaseLogs(100);
  return NextResponse.json({ success: true, data: { config: publicConfig(next), logs }, error: null });
}
