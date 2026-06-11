import { NextResponse } from "next/server";
import { requireAdminAction } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const unauthorized = requireAdminAction(request, "process-report");
  if (unauthorized) {
    return unauthorized;
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ success: false, error: "DATABASE_URL is not configured." }, { status: 500 });
  }

  const { id } = await context.params;
  await db.report.update({
    where: { id },
    data: { status: "已处理" },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request, context: RouteContext) {
  const unauthorized = requireAdminAction(request, "delete-report");
  if (unauthorized) {
    return unauthorized;
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ success: false, error: "DATABASE_URL is not configured." }, { status: 500 });
  }

  const { id } = await context.params;
  await db.report.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
