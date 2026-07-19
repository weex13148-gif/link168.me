import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { readAvatarAsset } from "@/infrastructure/media/avatar-read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function privateError(error: string, status: number) {
  return NextResponse.json(
    { error },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const viewer = await getCurrentUserFromRequest(request);
  const result = await readAvatarAsset({
    username,
    viewerUserId: viewer?.id ?? null,
  });

  if (!result.ok) return privateError(result.error, result.status);

  return new NextResponse(new Uint8Array(result.data), {
    headers: {
      "Content-Type": result.mimeType,
      "Cache-Control": result.ownerPreview
        ? "private, no-store"
        : "public, max-age=86400, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
