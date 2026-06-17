import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDashboardData, newId, normalizeNullableString, normalizeUsername, toProfileDto } from "@/lib/dashboard-data";
import { HANDLE_FORMAT_ERROR, HANDLE_RESERVED_ERROR, isPlaceholderHandle, normalizeHandle, validateHandle } from "@/lib/handle";

export const runtime = "nodejs";

const DASHBOARD_HANDLE_FORMAT_ERROR = "公开地址只能使用小写字母、数字、下划线和短横线，长度 3-30 位";
const DASHBOARD_HANDLE_RESERVED_ERROR = "该公开地址不可使用，请换一个";
const DASHBOARD_HANDLE_LOCKED_ERROR = "公开地址已锁定，暂不支持修改。";

type SaveProfileRequest = {
  username?: unknown;
  displayName?: unknown;
  bio?: unknown;
};

export async function GET(request: Request) {
  const { user, response } = await requireUser(request);
  if (response || !user) return response;

  const data = await getDashboardData(user.id);
  return NextResponse.json({ success: true, user, ...data });
}

export async function PUT(request: Request) {
  const { user, response } = await requireUser(request);
  if (response || !user) return response;

  let body: SaveProfileRequest;
  try {
    body = (await request.json()) as SaveProfileRequest;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const profileByUser = await db.profile.findUnique({ where: { userId: user.id } });
  const currentUsername = profileByUser?.username || "";
  const requestedUsername = normalizeHandle(body.username);
  const canCompleteUsername = !profileByUser || isPlaceholderHandle(currentUsername);

  let username = currentUsername;

  if (canCompleteUsername) {
    const handleResult = validateHandle(body.username);
    if (!handleResult.success) {
      const error =
        handleResult.error === HANDLE_RESERVED_ERROR
          ? DASHBOARD_HANDLE_RESERVED_ERROR
          : handleResult.error === HANDLE_FORMAT_ERROR
            ? DASHBOARD_HANDLE_FORMAT_ERROR
            : handleResult.error;
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    username = handleResult.handle;
  } else if (requestedUsername && requestedUsername !== normalizeUsername(currentUsername)) {
    return NextResponse.json({ success: false, error: DASHBOARD_HANDLE_LOCKED_ERROR }, { status: 403 });
  }

  const existingProfile = await db.profile.findUnique({ where: { username } });
  if (existingProfile && existingProfile.userId !== user.id) {
    return NextResponse.json({ success: false, error: "该公开地址已被占用" }, { status: 409 });
  }

  const profile = await db.profile.upsert({
    where: { userId: user.id },
    create: {
      id: newId(),
      userId: user.id,
      username,
      displayName: normalizeNullableString(body.displayName),
      bio: normalizeNullableString(body.bio),
      isPublic: true,
    },
    update: {
      displayName: normalizeNullableString(body.displayName),
      bio: normalizeNullableString(body.bio),
      isPublic: true,
      ...(canCompleteUsername ? { username } : {}),
    },
  });

  return NextResponse.json({ success: true, profile: toProfileDto(profile) });
}
