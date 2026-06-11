import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOwnedProfile, normalizeNullableString, normalizeUrl, toLinkDto } from "@/lib/dashboard-data";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type UpdateLinkRequest = {
  title?: unknown;
  url?: unknown;
  description?: unknown;
  isActive?: unknown;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { user, response } = await requireUser(request);
  if (response || !user) return response;

  const profile = await getOwnedProfile(user.id);
  if (!profile) {
    return NextResponse.json({ success: false, error: "Profile not found." }, { status: 404 });
  }

  let body: UpdateLinkRequest;
  try {
    body = (await request.json()) as UpdateLinkRequest;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const url = normalizeUrl(body.url);
  if (!title || !url) {
    return NextResponse.json({ success: false, error: "Title and URL are required." }, { status: 400 });
  }

  const { id } = await context.params;
  const result = await db.link.updateMany({
    where: { id, profileId: profile.id },
    data: {
      title,
      url,
      description: normalizeNullableString(body.description),
      isActive: body.isActive === true,
    },
  });

  if (result.count === 0) {
    return NextResponse.json({ success: false, error: "Link not found." }, { status: 404 });
  }

  const link = await db.link.findUniqueOrThrow({ where: { id } });
  return NextResponse.json({ success: true, link: toLinkDto(link) });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { user, response } = await requireUser(request);
  if (response || !user) return response;

  const profile = await getOwnedProfile(user.id);
  if (!profile) {
    return NextResponse.json({ success: false, error: "Profile not found." }, { status: 404 });
  }

  const { id } = await context.params;
  const result = await db.link.deleteMany({ where: { id, profileId: profile.id } });
  if (result.count === 0) {
    return NextResponse.json({ success: false, error: "Link not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
