import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireJeepworkSuperAdmin } from "@/lib/jeepwork-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const forbidden = await requireJeepworkSuperAdmin(request);
  if (forbidden) return forbidden;

  const url = new URL(request.url);
  const email = (url.searchParams.get("email") || "").trim().toLowerCase();
  const rawLimit = Number(url.searchParams.get("limit") || "50");
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 100) : 50;

  const user = email
    ? await db.user.findUnique({ where: { email }, select: { id: true, email: true } })
    : null;
  if (email && !user) {
    return NextResponse.json({ success: false, error: { code: "USER_NOT_FOUND", message: "没有找到该邮箱用户。" } }, { status: 404 });
  }

  const rows = await db.aiCreditLedger.findMany({
    where: user ? { account: { userId: user.id } } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      entryType: true,
      amount: true,
      balanceAfter: true,
      idempotencyKey: true,
      referenceType: true,
      referenceId: true,
      reason: true,
      metadata: true,
      createdAt: true,
      account: {
        select: {
          balance: true,
          version: true,
          user: { select: { id: true, email: true } },
        },
      },
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      searchedUser: user,
      entries: rows.map((row) => ({
        id: row.id,
        entryType: row.entryType,
        amount: row.amount,
        balanceAfter: row.balanceAfter,
        currentBalance: row.account.balance,
        accountVersion: row.account.version,
        idempotencyKey: row.idempotencyKey,
        referenceType: row.referenceType,
        referenceId: row.referenceId,
        reason: row.reason,
        metadata: row.metadata,
        userId: row.account.user.id,
        email: row.account.user.email,
        createdAt: row.createdAt.toISOString(),
      })),
    },
  });
}
