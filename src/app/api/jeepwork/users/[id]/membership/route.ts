import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AUDIT_ACTION, writeAdminAuditLog } from "@/lib/admin-audit-log";
import { getJeepworkSessionUser, requireJeepworkAdmin } from "@/lib/jeepwork-auth";
import { getPlanDefinition, type PlanCode } from "@/lib/billing/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MANUAL_PLAN_CODES = [
  "member_plus",
  "pro",
  "enterprise",
  "enterprise_pro_plus",
] as const satisfies readonly PlanCode[];

type ManualPlanCode = (typeof MANUAL_PLAN_CODES)[number];
type GrantMode = "replace" | "extend";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function apiError(code: string, message: string, status = 400) {
  return NextResponse.json(
    { success: false, data: null, error: { code, message } },
    { status, headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}

function apiSuccess(data: Record<string, unknown>) {
  return NextResponse.json(
    { success: true, data, error: null },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}

function normalizePlanCode(value: unknown): ManualPlanCode | null {
  return MANUAL_PLAN_CODES.includes(value as ManualPlanCode) ? value as ManualPlanCode : null;
}

function normalizeReason(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 300) : "";
}

function normalizeDurationDays(value: unknown) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 3650) return null;
  return parsed;
}

function normalizeMode(value: unknown): GrantMode {
  return value === "extend" ? "extend" : "replace";
}

async function loadTarget(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      isSystem: true,
      membershipSubscription: {
        select: {
          id: true,
          planCode: true,
          status: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });
}

function targetPermissionError(target: Awaited<ReturnType<typeof loadTarget>>) {
  if (!target) return apiError("NOT_FOUND", "用户不存在。", 404);
  if (target.isSystem) return apiError("SYSTEM_ACCOUNT", "系统账号不能手动调整会员。", 403);
  if (target.role !== "user") return apiError("CUSTOMER_ONLY", "只能给普通客户账号添加或注销会员。", 403);
  return null;
}

export async function GET(request: Request, context: RouteContext) {
  const forbidden = await requireJeepworkAdmin(request);
  if (forbidden) return forbidden;

  const { id } = await context.params;
  const target = await loadTarget(id);
  const permissionError = targetPermissionError(target);
  if (permissionError) return permissionError;

  return apiSuccess({
    user: {
      id: target!.id,
      email: target!.email,
    },
    membership: target!.membershipSubscription
      ? {
          planCode: target!.membershipSubscription.planCode,
          planName: getPlanDefinition(target!.membershipSubscription.planCode).name,
          status: target!.membershipSubscription.status,
          currentPeriodStart: target!.membershipSubscription.currentPeriodStart?.toISOString() ?? null,
          currentPeriodEnd: target!.membershipSubscription.currentPeriodEnd?.toISOString() ?? null,
          updatedAt: target!.membershipSubscription.updatedAt.toISOString(),
        }
      : {
          planCode: "free",
          planName: "免费版",
          status: "inactive",
          currentPeriodStart: null,
          currentPeriodEnd: null,
          updatedAt: null,
        },
    plans: MANUAL_PLAN_CODES.map((planCode) => {
      const plan = getPlanDefinition(planCode);
      return {
        planCode,
        planName: plan.name,
        aiCreditsGrant: plan.limits.aiCreditsGrant,
      };
    }),
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const forbidden = await requireJeepworkAdmin(request);
  if (forbidden) return forbidden;

  const actor = await getJeepworkSessionUser(request);
  if (!actor) return apiError("UNAUTHORIZED", "未授权。", 401);

  const { id } = await context.params;
  let body: {
    planCode?: unknown;
    durationDays?: unknown;
    mode?: unknown;
    reason?: unknown;
    grantCredits?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return apiError("BAD_BODY", "请求体必须是合法 JSON。", 400);
  }

  const planCode = normalizePlanCode(body.planCode);
  const durationDays = normalizeDurationDays(body.durationDays);
  const mode = normalizeMode(body.mode);
  const reason = normalizeReason(body.reason);
  const grantCredits = body.grantCredits !== false;

  if (!planCode) return apiError("INVALID_PLAN", "请选择允许手动开通的会员套餐。", 400);
  if (!durationDays) return apiError("INVALID_DURATION", "会员天数必须是 1 至 3650 天的整数。", 400);
  if (!reason) return apiError("REASON_REQUIRED", "请填写手动开通或调整会员的原因。", 400);

  const target = await loadTarget(id);
  const permissionError = targetPermissionError(target);
  if (permissionError) return permissionError;

  const now = new Date();
  const existing = target!.membershipSubscription;
  const sameActivePlan = Boolean(
    existing
    && existing.status === "active"
    && existing.planCode === planCode
    && existing.currentPeriodEnd
    && existing.currentPeriodEnd > now,
  );
  const extendFrom = mode === "extend" && sameActivePlan && existing?.currentPeriodEnd
    ? existing.currentPeriodEnd
    : now;
  const periodStart = mode === "extend" && sameActivePlan && existing?.currentPeriodStart
    ? existing.currentPeriodStart
    : now;
  const periodEnd = new Date(extendFrom.getTime() + durationDays * 86_400_000);
  const plan = getPlanDefinition(planCode);
  const operationId = crypto.randomUUID();

  try {
    const result = await db.$transaction(async (tx) => {
      const subscription = await tx.membershipSubscription.upsert({
        where: { userId: target!.id },
        create: {
          userId: target!.id,
          planCode,
          status: "active",
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
        update: {
          planCode,
          status: "active",
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      });

      let creditBalance: number | null = null;
      let creditsGranted = 0;
      if (grantCredits && plan.limits.aiCreditsGrant > 0) {
        creditsGranted = plan.limits.aiCreditsGrant;
        const account = await tx.aiCreditAccount.upsert({
          where: { userId: target!.id },
          create: {
            userId: target!.id,
            balance: creditsGranted,
            version: 1,
          },
          update: {
            balance: { increment: creditsGranted },
            version: { increment: 1 },
          },
          select: { id: true, balance: true },
        });
        creditBalance = account.balance;

        await tx.aiCreditLedger.create({
          data: {
            id: crypto.randomUUID(),
            accountId: account.id,
            entryType: "grant",
            amount: creditsGranted,
            balanceAfter: account.balance,
            idempotencyKey: `grant:admin:${operationId}`,
            referenceType: "admin_membership",
            referenceId: subscription.id,
            reason: `管理员手动开通 ${plan.name}`,
            metadata: {
              actorUserId: actor.id,
              actorRole: actor.role,
              targetUserId: target!.id,
              planCode,
              durationDays,
              mode,
            },
          },
        });
      }

      const audit = await writeAdminAuditLog({
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: AUDIT_ACTION.GRANT_USER_MEMBERSHIP,
        targetType: "user",
        targetId: target!.id,
        metadata: {
          targetEmail: target!.email,
          oldPlanCode: existing?.planCode ?? "free",
          oldStatus: existing?.status ?? "inactive",
          oldPeriodEnd: existing?.currentPeriodEnd?.toISOString() ?? null,
          newPlanCode: planCode,
          newPlanName: plan.name,
          newPeriodStart: periodStart.toISOString(),
          newPeriodEnd: periodEnd.toISOString(),
          durationDays,
          mode,
          reason,
          creditsGranted,
        },
        request,
        success: true,
      }, tx);
      if (!audit.ok) throw new Error(`AUDIT_WRITE_FAILED:${audit.reason}`);

      return {
        subscription,
        creditsGranted,
        creditBalance,
      };
    });

    return apiSuccess({
      message: `已为 ${target!.email} 开通 ${plan.name}，有效期至 ${periodEnd.toLocaleString("zh-CN", { hour12: false })}。`,
      membership: {
        planCode: result.subscription.planCode,
        planName: plan.name,
        status: result.subscription.status,
        currentPeriodStart: result.subscription.currentPeriodStart?.toISOString() ?? null,
        currentPeriodEnd: result.subscription.currentPeriodEnd?.toISOString() ?? null,
      },
      creditsGranted: result.creditsGranted,
      creditBalance: result.creditBalance,
    });
  } catch (error) {
    console.error("[jeepwork/membership] manual grant failed", error);
    await writeAdminAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: AUDIT_ACTION.GRANT_USER_MEMBERSHIP,
      targetType: "user",
      targetId: target!.id,
      metadata: {
        targetEmail: target!.email,
        planCode,
        durationDays,
        mode,
        reason,
        failure: error instanceof Error ? error.message : "unknown_error",
      },
      request,
      success: false,
    });
    return apiError("MEMBERSHIP_UPDATE_FAILED", "会员开通失败，数据没有生效，请稍后重试。", 500);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const forbidden = await requireJeepworkAdmin(request);
  if (forbidden) return forbidden;

  const actor = await getJeepworkSessionUser(request);
  if (!actor) return apiError("UNAUTHORIZED", "未授权。", 401);

  const { id } = await context.params;
  let body: { reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return apiError("BAD_BODY", "请求体必须是合法 JSON。", 400);
  }
  const reason = normalizeReason(body.reason);
  if (!reason) return apiError("REASON_REQUIRED", "请填写注销会员的原因。", 400);

  const target = await loadTarget(id);
  const permissionError = targetPermissionError(target);
  if (permissionError) return permissionError;

  const existing = target!.membershipSubscription;
  if (!existing || existing.planCode === "free" || existing.status !== "active") {
    return apiError("NO_ACTIVE_MEMBERSHIP", "该客户当前没有可注销的有效会员。", 409);
  }

  const now = new Date();
  try {
    await db.$transaction(async (tx) => {
      await tx.membershipSubscription.update({
        where: { userId: target!.id },
        data: {
          planCode: "free",
          status: "cancelled",
          currentPeriodEnd: now,
        },
      });

      const audit = await writeAdminAuditLog({
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: AUDIT_ACTION.REVOKE_USER_MEMBERSHIP,
        targetType: "user",
        targetId: target!.id,
        metadata: {
          targetEmail: target!.email,
          oldPlanCode: existing.planCode,
          oldPlanName: getPlanDefinition(existing.planCode).name,
          oldStatus: existing.status,
          oldPeriodStart: existing.currentPeriodStart?.toISOString() ?? null,
          oldPeriodEnd: existing.currentPeriodEnd?.toISOString() ?? null,
          revokedAt: now.toISOString(),
          reason,
          creditsRetained: true,
        },
        request,
        success: true,
      }, tx);
      if (!audit.ok) throw new Error(`AUDIT_WRITE_FAILED:${audit.reason}`);
    });

    return apiSuccess({
      message: `已注销 ${target!.email} 的会员权益。历史订单、额度流水和审计记录均已保留。`,
      membership: {
        planCode: "free",
        planName: "免费版",
        status: "cancelled",
        currentPeriodStart: existing.currentPeriodStart?.toISOString() ?? null,
        currentPeriodEnd: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("[jeepwork/membership] manual revoke failed", error);
    await writeAdminAuditLog({
      actorUserId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: AUDIT_ACTION.REVOKE_USER_MEMBERSHIP,
      targetType: "user",
      targetId: target!.id,
      metadata: {
        targetEmail: target!.email,
        oldPlanCode: existing.planCode,
        reason,
        failure: error instanceof Error ? error.message : "unknown_error",
      },
      request,
      success: false,
    });
    return apiError("MEMBERSHIP_REVOKE_FAILED", "会员注销失败，数据没有生效，请稍后重试。", 500);
  }
}
