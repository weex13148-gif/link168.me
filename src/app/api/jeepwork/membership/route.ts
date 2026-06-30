import { NextResponse } from "next/server";
import { requireSuperAdmin, getCurrentAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { writeAdminAuditLog, AUDIT_ACTION } from "@/lib/admin-audit-log";
import { getPlanDefinition, PlanCode } from "@/lib/billing/plans";
import { getMembershipWithUsage } from "@/lib/billing/membership";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const errorResponse = await requireSuperAdmin(request);
  if (errorResponse) return errorResponse;

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  const email = url.searchParams.get("email");

  if (!userId && !email) {
    return NextResponse.json(
      { success: false, error: "缺少 userId 或 email 参数" },
      { status: 400 }
    );
  }

  try {
    let targetUserId = userId;

    if (email && !userId) {
      const user = await db.user.findUnique({
        where: { email },
      });
      if (!user) {
        return NextResponse.json(
          { success: false, error: "用户不存在" },
          { status: 404 }
        );
      }
      targetUserId = user.id;
    }

    const membership = await getMembershipWithUsage(targetUserId!);

    return NextResponse.json({ success: true, membership });
  } catch (error) {
    console.error("[admin/membership] 查询会员信息失败:", error);
    return NextResponse.json(
      { success: false, error: "查询失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const errorResponse = await requireSuperAdmin(request);
  if (errorResponse) return errorResponse;

  const admin = await getCurrentAdmin(request);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "请求参数无效" },
      { status: 400 }
    );
  }

  const { action } = body;

  if (!action) {
    return NextResponse.json(
      { success: false, error: "缺少 action 参数" },
      { status: 400 }
    );
  }

  switch (action) {
    case "grant":
      return handleGrantMembership(body, admin, request);
    case "extend":
      return handleExtendMembership(body, admin, request);
    case "revoke":
      return handleRevokeMembership(body, admin, request);
    default:
      return NextResponse.json(
        { success: false, error: "无效的 action 参数" },
        { status: 400 }
      );
  }
}

async function handleGrantMembership(
  body: Record<string, unknown>,
  admin: Awaited<ReturnType<typeof getCurrentAdmin>>,
  request: Request
) {
  const { userId, email, planCode, startDate, endDate, reason, isGift } = body;

  if (!userId && !email) {
    return NextResponse.json(
      { success: false, error: "缺少 userId 或 email 参数" },
      { status: 400 }
    );
  }

  const validPlanCodes = ["free", "member_basic", "member_plus", "enterprise"];
  if (!planCode || typeof planCode !== "string" || !validPlanCodes.includes(planCode)) {
    return NextResponse.json(
      { success: false, error: "无效的 planCode" },
      { status: 400 }
    );
  }

  const plan = getPlanDefinition(planCode as PlanCode);
  if (plan.contactSales && planCode !== "enterprise") {
    return NextResponse.json(
      { success: false, error: "企业版需联系销售" },
      { status: 400 }
    );
  }

  try {
    let targetUserId = userId as string;

    if (email && !userId) {
      const user = await db.user.findUnique({
        where: { email: email as string },
      });
      if (!user) {
        return NextResponse.json(
          { success: false, error: "用户不存在" },
          { status: 404 }
        );
      }
      targetUserId = user.id;
    }

    const now = new Date();
    const periodStart = startDate ? new Date(startDate as string) : now;
    const periodEnd = endDate ? new Date(endDate as string) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (periodStart >= periodEnd) {
      return NextResponse.json(
        { success: false, error: "开始时间必须早于结束时间" },
        { status: 400 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      const subscription = await tx.membershipSubscription.upsert({
        where: { userId: targetUserId },
        create: {
          userId: targetUserId,
          planCode: planCode as PlanCode,
          status: "active",
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
        update: {
          planCode: planCode as PlanCode,
          status: "active",
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      });

      if (plan.limits.aiCreditsGrant > 0) {
        const creditAccount = await tx.aiCreditAccount.findUnique({
          where: { userId: targetUserId },
        });

        const idempotencyKey = `grant:manual:${targetUserId}:${planCode}:${Date.now()}`;

        if (creditAccount) {
          await tx.aiCreditAccount.update({
            where: { id: creditAccount.id },
            data: {
              balance: { increment: plan.limits.aiCreditsGrant },
              version: { increment: 1 },
            },
          });
        } else {
          await tx.aiCreditAccount.create({
            data: {
              userId: targetUserId,
              balance: plan.limits.aiCreditsGrant,
              version: 1,
            },
          });
        }

        try {
          await tx.aiCreditLedger.create({
            data: {
              accountId: creditAccount?.id ?? (await tx.aiCreditAccount.findUnique({ where: { userId: targetUserId } }))!.id,
              entryType: "grant",
              amount: plan.limits.aiCreditsGrant,
              balanceAfter: creditAccount ? creditAccount.balance + plan.limits.aiCreditsGrant : plan.limits.aiCreditsGrant,
              idempotencyKey,
              referenceType: "manual",
              referenceId: subscription.id,
              metadata: {
                planCode,
                planName: plan.name,
                isGift: isGift ?? false,
                reason: reason ?? "人工开通",
              },
            },
          });
        } catch {
          // 幂等：已存在则跳过
        }
      }

      return subscription;
    });

    await writeAdminAuditLog(
      {
        actorUserId: admin?.id,
        actorEmail: admin?.email,
        actorRole: admin?.role,
        action: AUDIT_ACTION.UPDATE_SYSTEM_CONFIG,
        targetType: "membership",
        targetId: targetUserId,
        metadata: {
          action: "grant",
          planCode,
          planName: plan.name,
          startDate: periodStart.toISOString(),
          endDate: periodEnd.toISOString(),
          isGift: isGift ?? false,
          reason: reason ?? "人工开通",
        },
        request,
      },
      db
    );

    return NextResponse.json({
      success: true,
      subscription: {
        id: result.id,
        planCode: result.planCode,
        status: result.status,
        currentPeriodStart: result.currentPeriodStart?.toISOString(),
        currentPeriodEnd: result.currentPeriodEnd?.toISOString(),
      },
    });
  } catch (error) {
    console.error("[admin/membership] 人工开通会员失败:", error);
    return NextResponse.json(
      { success: false, error: "操作失败" },
      { status: 500 }
    );
  }
}

async function handleExtendMembership(
  body: Record<string, unknown>,
  admin: Awaited<ReturnType<typeof getCurrentAdmin>>,
  request: Request
) {
  const { userId, email, days, reason } = body;

  if (!userId && !email) {
    return NextResponse.json(
      { success: false, error: "缺少 userId 或 email 参数" },
      { status: 400 }
    );
  }

  if (!days || typeof days !== "number" || days <= 0) {
    return NextResponse.json(
      { success: false, error: "days 必须大于0" },
      { status: 400 }
    );
  }

  try {
    let targetUserId = userId as string;

    if (email && !userId) {
      const user = await db.user.findUnique({
        where: { email: email as string },
      });
      if (!user) {
        return NextResponse.json(
          { success: false, error: "用户不存在" },
          { status: 404 }
        );
      }
      targetUserId = user.id;
    }

    const subscription = await db.membershipSubscription.findUnique({
      where: { userId: targetUserId },
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: "用户没有会员订阅" },
        { status: 404 }
      );
    }

    const now = new Date();
    const currentEnd = subscription.currentPeriodEnd || now;
    const newEnd = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000);

    const updated = await db.membershipSubscription.update({
      where: { userId: targetUserId },
      data: {
        currentPeriodEnd: newEnd,
        status: "active",
      },
    });

    await writeAdminAuditLog(
      {
        actorUserId: admin?.id,
        actorEmail: admin?.email,
        actorRole: admin?.role,
        action: AUDIT_ACTION.UPDATE_SYSTEM_CONFIG,
        targetType: "membership",
        targetId: targetUserId,
        metadata: {
          action: "extend",
          days,
          oldEndDate: currentEnd.toISOString(),
          newEndDate: newEnd.toISOString(),
          reason: reason ?? "延长会员时间",
        },
        request,
      },
      db
    );

    return NextResponse.json({
      success: true,
      subscription: {
        id: updated.id,
        planCode: updated.planCode,
        status: updated.status,
        currentPeriodEnd: updated.currentPeriodEnd?.toISOString(),
      },
    });
  } catch (error) {
    console.error("[admin/membership] 延长会员时间失败:", error);
    return NextResponse.json(
      { success: false, error: "操作失败" },
      { status: 500 }
    );
  }
}

async function handleRevokeMembership(
  body: Record<string, unknown>,
  admin: Awaited<ReturnType<typeof getCurrentAdmin>>,
  request: Request
) {
  const { userId, email, reason } = body;

  if (!userId && !email) {
    return NextResponse.json(
      { success: false, error: "缺少 userId 或 email 参数" },
      { status: 400 }
    );
  }

  try {
    let targetUserId = userId as string;

    if (email && !userId) {
      const user = await db.user.findUnique({
        where: { email: email as string },
      });
      if (!user) {
        return NextResponse.json(
          { success: false, error: "用户不存在" },
          { status: 404 }
        );
      }
      targetUserId = user.id;
    }

    const subscription = await db.membershipSubscription.findUnique({
      where: { userId: targetUserId },
    });

    if (!subscription || subscription.planCode === "free") {
      return NextResponse.json(
        { success: false, error: "用户没有付费会员" },
        { status: 404 }
      );
    }

    const updated = await db.membershipSubscription.update({
      where: { userId: targetUserId },
      data: {
        planCode: "free",
        status: "cancelled",
      },
    });

    await writeAdminAuditLog(
      {
        actorUserId: admin?.id,
        actorEmail: admin?.email,
        actorRole: admin?.role,
        action: AUDIT_ACTION.UPDATE_SYSTEM_CONFIG,
        targetType: "membership",
        targetId: targetUserId,
        metadata: {
          action: "revoke",
          oldPlanCode: subscription.planCode,
          reason: reason ?? "撤销会员",
        },
        request,
      },
      db
    );

    return NextResponse.json({
      success: true,
      subscription: {
        id: updated.id,
        planCode: updated.planCode,
        status: updated.status,
      },
    });
  } catch (error) {
    console.error("[admin/membership] 撤销会员失败:", error);
    return NextResponse.json(
      { success: false, error: "操作失败" },
      { status: 500 }
    );
  }
}
