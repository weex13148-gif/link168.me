import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDashboardData, newId, normalizeNullableString, normalizeUsername, toProfileDto } from "@/lib/dashboard-data";

export const runtime = "nodejs";

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

  const username = normalizeUsername(body.username);
  if (username.length < 3) {
    return NextResponse.json({ success: false, error: "Username must be at least 3 characters." }, { status: 400 });
  }

  const existingProfile = await db.profile.findUnique({ where: { username } });
  if (existingProfile && existingProfile.userId !== user.id) {
    return NextResponse.json({ success: false, error: "Username is already taken." }, { status: 409 });
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
      username,
      displayName: normalizeNullableString(body.displayName),
      bio: normalizeNullableString(body.bio),
      isPublic: true,
    },
  });

  return NextResponse.json({ success: true, profile: toProfileDto(profile) });
}
