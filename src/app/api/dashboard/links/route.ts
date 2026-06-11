import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedProfile, newId, normalizeNullableString, normalizeUrl, toLinkDto } from "@/lib/dashboard-data";

export const runtime = "nodejs";

type CreateLinkRequest = {
  title?: unknown;
  url?: unknown;
  description?: unknown;
};

export async function POST(request: Request) {
  const { user, response } = await requireUser(request);
  if (response || !user) return response;

  const profile = await getOwnedProfile(user.id);
  if (!profile) {
    return NextResponse.json({ success: false, error: "Save profile before adding links." }, { status: 400 });
  }

  let body: CreateLinkRequest;
  try {
    body = (await request.json()) as CreateLinkRequest;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const url = normalizeUrl(body.url);
  if (!title || !url) {
    return NextResponse.json({ success: false, error: "Title and URL are required." }, { status: 400 });
  }

  const position = await db.link.count({ where: { profileId: profile.id } });
  const link = await db.link.create({
    data: {
      id: newId(),
      profileId: profile.id,
      title,
      url,
      description: normalizeNullableString(body.description),
      position,
      isActive: true,
    },
  });

  return NextResponse.json({ success: true, link: toLinkDto(link) });
}
