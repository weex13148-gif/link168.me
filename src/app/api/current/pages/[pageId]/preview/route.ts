import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { getCurrentPageContext } from "@/lib/current/page-service";
import { PrismaCurrentPageRepository } from "@/lib/current/repositories/prisma-current-page-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ pageId: string }> }) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, code: "UNAUTHORIZED", error: "请先登录。" }, { status: 401 });
  const { pageId } = await params;
  const access = await getCurrentPageContext(user.id, pageId, "read");
  if (!access.ok) return NextResponse.json({ success: false, code: access.error.code, error: access.error.message }, { status: access.error.code === "FORBIDDEN" ? 403 : 404 });
  const repository = new PrismaCurrentPageRepository();
  const [draft, publication] = await Promise.all([repository.getDraft(pageId), repository.getPublication(pageId)]);
  if (!draft.ok) return NextResponse.json({ success: false, code: draft.error.code, error: draft.error.message }, { status: 404 });
  if (!publication.ok) return NextResponse.json({ success: false, code: publication.error.code, error: publication.error.message }, { status: 404 });
  return NextResponse.json({ success: true, draft: draft.value, publication: publication.value });
}
