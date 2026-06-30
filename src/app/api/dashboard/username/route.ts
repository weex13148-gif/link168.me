import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth";
import {
  checkUsernameAvailability,
  assignUsername,
  MIN_USERNAME_LENGTH,
  MAX_USERNAME_LENGTH,
} from "@/lib/username-registry";
import { hasSensitiveContent } from "@/lib/content-safety";

export const runtime = "nodejs";

type UpdateRequest = { username?: unknown };

// GET: 检查用户名可用性
export async function GET(request: Request) {
  const { user, response } = await requireActiveUser(request);
  if (response || !user) return response;

  const url = new URL(request.url);
  const raw = url.searchParams.get("username") ?? "";

  const availability = await checkUsernameAvailability(raw, user.id);

  return NextResponse.json({
    success: true,
    available: availability.available,
    reason: availability.reason,
    normalized: availability.normalized,
    minLength: MIN_USERNAME_LENGTH,
    maxLength: MAX_USERNAME_LENGTH,
    pending_server_validation: true, // 本地无 DB，仅代码语义验证
  });
}

// PUT: 修改用户名
export async function PUT(request: Request) {
  const { user, response } = await requireActiveUser(request);
  if (response || !user) return response;

  let body: UpdateRequest;
  try {
    body = (await request.json()) as UpdateRequest;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const raw = typeof body.username === "string" ? body.username : "";
  if (!raw.trim()) {
    return NextResponse.json({ success: false, error: "用户名不能为空。" }, { status: 400 });
  }

  // 敏感词检查
  const sensitive = hasSensitiveContent(raw);
  if (sensitive.detected) {
    return NextResponse.json(
      { success: false, error: `用户名包含受限关键词（${sensitive.matches.slice(0, 3).join(" / ")}），请修改后再试。` },
      { status: 400 },
    );
  }

  // 可用性检查
  const availability = await checkUsernameAvailability(raw, user.id);
  if (!availability.available) {
    return NextResponse.json(
      { success: false, error: "该用户名不可用。", reason: availability.reason },
      { status: 409 },
    );
  }

  // 分配用户名
  const result = await assignUsername(user.id, raw);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: "用户名分配失败，请稍后重试。", reason: result.error },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    username: result.username,
    isInitialSet: result.isInitialSet,
    pending_server_validation: true,
  });
}
