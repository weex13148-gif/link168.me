import crypto from "crypto";
import { currentDb, toJsonValue, type CurrentPrismaClient } from "@/lib/current/data/prisma-current";
import type { CurrentBillingOwner, CurrentProviderStatus, CurrentResult, ProviderState } from "@/lib/current/contracts";
import { getPaymentAvailability } from "@/lib/billing/payments";
import { getCurrentTeamAccess, getTeamBillingOwner, type CurrentTeamAccess, type TeamDissolutionState } from "@/lib/current/team/service";
import { currentErr, currentFromUnknown, currentOk } from "@/lib/current/team/result";

const TEAM_ORDER_UNAVAILABLE_REASON = "Current Team order/payment/refund abstraction is unavailable until a real provider and Team order persistence are configured.";
type CurrentTransactionClient = CurrentPrismaClient;

export type PersonalBillingSummary = {
  scope: "personal";
  owner: CurrentBillingOwner;
  billingAccountId: string;
  planCode: string;
  status: string;
  creditBalance: number;
  recentLedger: Array<{ ledgerId: string; entryType: string; amount: number; balanceAfter: number; createdAt: string; referenceType: string | null; referenceId: string | null }>;
  providerStatuses: CurrentProviderStatus[];
};

export type TeamCreditPoolSnapshot = { poolId: string; totalQuota: number; usedQuota: number; availableQuota: number; version: number };
export type TeamBillingSummary = {
  scope: "team";
  workspaceId: string;
  owner: CurrentBillingOwner;
  billingAccountId: string;
  planCode: string;
  lifecycle: TeamDissolutionState;
  creditPool: TeamCreditPoolSnapshot;
  recentLedger: Array<{ ledgerId: string; entryType: string; amount: number; balanceAfter: number; createdAt: string; referenceType: string | null; referenceId: string | null }>;
  providerStatuses: CurrentProviderStatus[];
};

export type TeamCreditLedgerOperation = {
  workspaceId: string;
  operationId: string;
  amount: number;
  source: string;
  status: string;
  lifecycleStatus: TeamDissolutionState["status"];
  usedQuota: number;
  availableQuota: number;
};

function buildPersonalOwner(userId: string): CurrentBillingOwner {
  return { scope: "personal", ownerId: userId, billingContactUserId: userId };
}

function providerState(available: boolean, reason?: string): ProviderState {
  if (available) return "configured";
  if (reason && /未完整配置|未配置|缺少/i.test(reason)) return "missing";
  return "unavailable";
}

async function paymentStatuses(): Promise<CurrentProviderStatus[]> {
  const payment = await getPaymentAvailability();
  return [
    { provider: "wechat", state: providerState(payment.wechatAvailable, payment.wechatReason), reason: payment.wechatReason },
    { provider: "alipay", state: providerState(payment.alipayAvailable, payment.alipayReason), reason: payment.alipayReason },
  ];
}

async function ensureAccount(tx: CurrentTransactionClient, input: { workspaceId: string; scope: "personal" | "team"; ownerIdentityId: string; billingContactIdentityId: string }) {
  const existing = await tx.currentBillingAccount.findUnique({ where: { workspaceId: input.workspaceId } });
  if (existing) return existing;
  return tx.currentBillingAccount.create({ data: { id: crypto.randomUUID(), workspaceId: input.workspaceId, scope: input.scope, ownerIdentityId: input.ownerIdentityId, billingContactIdentityId: input.billingContactIdentityId, planCode: "free", status: "active" } });
}

async function accountLedger(accountId: string) {
  return currentDb.currentBillingLedgerEntry.findMany({ where: { billingAccountId: accountId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 20 });
}

function balanceOf(entries: Array<{ balanceAfter: number }> | readonly { balanceAfter: number }[]): number {
  return entries[0]?.balanceAfter ?? 0;
}

export function getPersonalBillingOwner(userId: string): CurrentBillingOwner {
  return buildPersonalOwner(userId);
}

export async function getPersonalBillingSummary(userId: string): Promise<CurrentResult<PersonalBillingSummary>> {
  try {
    const identity = await currentDb.currentIdentity.findUnique({ where: { userId }, select: { id: true, userId: true, personalWorkspaceId: true } });
    if (!identity?.personalWorkspaceId) return currentErr("NOT_FOUND", "Current Personal workspace 不存在。");
    const account = await currentDb.$transaction((tx) => ensureAccount(tx, { workspaceId: identity.personalWorkspaceId!, scope: "personal", ownerIdentityId: identity.id, billingContactIdentityId: identity.id }));
    const ledger = await accountLedger(account.id);
    return currentOk({
      scope: "personal",
      owner: buildPersonalOwner(userId),
      billingAccountId: account.id,
      planCode: account.planCode,
      status: account.status,
      creditBalance: balanceOf(ledger),
      recentLedger: ledger.map((entry) => ({ ledgerId: entry.id, entryType: entry.entryType, amount: entry.amount, balanceAfter: entry.balanceAfter, createdAt: entry.createdAt.toISOString(), referenceType: entry.referenceType, referenceId: entry.referenceId })),
      providerStatuses: await paymentStatuses(),
    });
  } catch (error) {
    return currentFromUnknown(error, "读取 Current Personal billing 失败。", true);
  }
}

export async function getTeamBillingSummary(actorUserId: string, workspaceId: string): Promise<CurrentResult<TeamBillingSummary>> {
  try {
    const access = await getCurrentTeamAccess(actorUserId, workspaceId);
    if (!access.ok) return access;
    const owner = await getTeamBillingOwner(workspaceId);
    if (!owner.ok) return owner;
    const account = await currentDb.$transaction((tx) => ensureAccount(tx, { workspaceId, scope: "team", ownerIdentityId: access.value.workspace.ownerIdentityId, billingContactIdentityId: access.value.workspace.ownerIdentityId }));
    const ledger = await accountLedger(account.id);
    const balance = balanceOf(ledger);
    return currentOk({
      scope: "team",
      workspaceId,
      owner: owner.value,
      billingAccountId: account.id,
      planCode: account.planCode,
      lifecycle: access.value.lifecycle,
      creditPool: { poolId: account.id, totalQuota: Math.max(balance, 0), usedQuota: Math.max(-balance, 0), availableQuota: Math.max(balance, 0), version: ledger.length },
      recentLedger: ledger.map((entry) => ({ ledgerId: entry.id, entryType: entry.entryType, amount: entry.amount, balanceAfter: entry.balanceAfter, createdAt: entry.createdAt.toISOString(), referenceType: entry.referenceType, referenceId: entry.referenceId })),
      providerStatuses: [{ provider: "team_orders", state: "unavailable", reason: TEAM_ORDER_UNAVAILABLE_REASON }, ...(await paymentStatuses())],
    });
  } catch (error) {
    return currentFromUnknown(error, "读取 Current Team billing 失败。", true);
  }
}

async function teamAccount(actorUserId: string, workspaceId: string): Promise<CurrentResult<{ accountId: string; access: CurrentTeamAccess }>> {
  const access = await getCurrentTeamAccess(actorUserId, workspaceId);
  if (!access.ok) return access as CurrentResult<never>;
  const account = await currentDb.$transaction((tx) => ensureAccount(tx, { workspaceId, scope: "team", ownerIdentityId: access.value.workspace.ownerIdentityId, billingContactIdentityId: access.value.workspace.ownerIdentityId }));
  return currentOk({ accountId: account.id, access: access.value });
}

async function appendLedger(tx: CurrentTransactionClient, input: { accountId: string; amount: number; entryType: string; idempotencyKey: string; referenceType: string; referenceId: string; metadata?: Record<string, unknown>; reason?: string }) {
  const existing = await tx.currentBillingLedgerEntry.findFirst({ where: { billingAccountId: input.accountId, idempotencyKey: input.idempotencyKey } });
  if (existing) return existing;
  const latest = await tx.currentBillingLedgerEntry.findFirst({ where: { billingAccountId: input.accountId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  const balanceAfter = (latest?.balanceAfter ?? 0) + input.amount;
  if (balanceAfter < 0) throw new Error("CURRENT_CREDIT_INSUFFICIENT");
  return tx.currentBillingLedgerEntry.create({ data: { id: crypto.randomUUID(), billingAccountId: input.accountId, entryType: input.entryType, amount: input.amount, balanceAfter, idempotencyKey: input.idempotencyKey, referenceType: input.referenceType, referenceId: input.referenceId, metadata: input.metadata ? toJsonValue(input.metadata) : undefined, reason: input.reason } });
}

export async function grantCurrentCredits(params: { userId: string; workspaceId: string; scope: "personal" | "team"; amount: number; idempotencyKey: string; reason: string }): Promise<CurrentResult<{ balanceAfter: number; ledgerId: string }>> {
  try {
    if (!Number.isInteger(params.amount) || params.amount <= 0) return currentErr("VALIDATION_ERROR", "amount 必须是正整数。", { field: "amount" });
    const identity = await currentDb.currentIdentity.findUnique({ where: { userId: params.userId }, select: { id: true, personalWorkspaceId: true } });
    if (!identity) return currentErr("NOT_FOUND", "Current identity 不存在。");
    let workspaceId = params.workspaceId;
    let ownerIdentityId = identity.id;
    if (params.scope === "team") {
      const access = await getCurrentTeamAccess(params.userId, params.workspaceId);
      if (!access.ok) return access;
      if (access.value.lifecycle.creditsFrozen) return currentErr("FORBIDDEN", "Team credits 已冻结。");
      ownerIdentityId = access.value.workspace.ownerIdentityId;
    } else if (identity.personalWorkspaceId !== params.workspaceId) {
      return currentErr("FORBIDDEN", "Personal credits 不能写入其他 workspace。");
    }
    const entry = await currentDb.$transaction(async (tx) => {
      const account = await ensureAccount(tx, { workspaceId, scope: params.scope, ownerIdentityId, billingContactIdentityId: ownerIdentityId });
      return appendLedger(tx, { accountId: account.id, amount: params.amount, entryType: "grant", idempotencyKey: params.idempotencyKey, referenceType: "credit_grant", referenceId: params.idempotencyKey, reason: params.reason });
    });
    return currentOk({ balanceAfter: entry.balanceAfter, ledgerId: entry.id });
  } catch (error) {
    return currentFromUnknown(error, "Current credit grant 失败。", true);
  }
}

export async function reserveTeamCredits(params: { actorUserId: string; workspaceId: string; operationId: string; amount: number; source: string; metadata?: Record<string, unknown> }): Promise<CurrentResult<TeamCreditLedgerOperation>> {
  try {
    if (!Number.isInteger(params.amount) || params.amount <= 0) return currentErr("VALIDATION_ERROR", "amount 必须是正整数。", { field: "amount" });
    const result = await teamAccount(params.actorUserId, params.workspaceId);
    if (!result.ok) return result;
    if (result.value.access.lifecycle.creditsFrozen) return currentErr("FORBIDDEN", "Team credits 已冻结。");
    const entry = await currentDb.$transaction((tx) => appendLedger(tx, { accountId: result.value.accountId, amount: -params.amount, entryType: "reserve", idempotencyKey: `reserve:${params.operationId}`, referenceType: "team_credit", referenceId: params.operationId, metadata: { source: params.source, ...(params.metadata ?? {}) } }));
    return currentOk({ workspaceId: params.workspaceId, operationId: params.operationId, amount: params.amount, source: params.source, status: "reserved", lifecycleStatus: result.value.access.lifecycle.status, usedQuota: Math.max(-entry.balanceAfter, 0), availableQuota: Math.max(entry.balanceAfter, 0) });
  } catch (error) {
    if (error instanceof Error && error.message === "CURRENT_CREDIT_INSUFFICIENT") return currentErr("CONFLICT", "Team credit balance 不足。", { field: "amount" });
    return currentFromUnknown(error, "预扣 Current Team credits 失败。", true);
  }
}

export async function settleTeamCredits(params: { actorUserId: string; workspaceId: string; operationId: string }): Promise<CurrentResult<TeamCreditLedgerOperation>> {
  try {
    const result = await teamAccount(params.actorUserId, params.workspaceId);
    if (!result.ok) return result;
    if (result.value.access.lifecycle.creditsFrozen) return currentErr("FORBIDDEN", "Team credits 已冻结。");
    const entry = await currentDb.currentBillingLedgerEntry.findFirst({ where: { billingAccountId: result.value.accountId, entryType: "reserve", referenceType: "team_credit", referenceId: params.operationId } });
    if (!entry) return currentErr("NOT_FOUND", "找不到对应的 Team credit reservation。", { field: "operationId" });
    const settled = await currentDb.$transaction((tx) => appendLedger(tx, { accountId: result.value.accountId, amount: 0, entryType: "settle", idempotencyKey: `settle:${params.operationId}`, referenceType: "team_credit", referenceId: params.operationId }));
    return currentOk({ workspaceId: params.workspaceId, operationId: params.operationId, amount: Math.abs(entry.amount), source: typeof entry.metadata === "object" && entry.metadata && "source" in entry.metadata ? String((entry.metadata as Record<string, unknown>).source) : "unknown", status: "succeeded", lifecycleStatus: result.value.access.lifecycle.status, usedQuota: Math.max(-settled.balanceAfter, 0), availableQuota: Math.max(settled.balanceAfter, 0) });
  } catch (error) {
    return currentFromUnknown(error, "结算 Current Team credits 失败。", true);
  }
}

export async function refundTeamCredits(params: { actorUserId: string; workspaceId: string; operationId: string }): Promise<CurrentResult<TeamCreditLedgerOperation>> {
  try {
    const result = await teamAccount(params.actorUserId, params.workspaceId);
    if (!result.ok) return result;
    const entry = await currentDb.currentBillingLedgerEntry.findFirst({ where: { billingAccountId: result.value.accountId, entryType: "reserve", referenceType: "team_credit", referenceId: params.operationId } });
    if (!entry) return currentErr("NOT_FOUND", "找不到对应的 Team credit reservation。", { field: "operationId" });
    const refunded = await currentDb.$transaction((tx) => appendLedger(tx, { accountId: result.value.accountId, amount: Math.abs(entry.amount), entryType: "refund", idempotencyKey: `refund:${params.operationId}`, referenceType: "team_credit", referenceId: params.operationId }));
    return currentOk({ workspaceId: params.workspaceId, operationId: params.operationId, amount: Math.abs(entry.amount), source: "refund", status: "refunded", lifecycleStatus: result.value.access.lifecycle.status, usedQuota: Math.max(-refunded.balanceAfter, 0), availableQuota: Math.max(refunded.balanceAfter, 0) });
  } catch (error) {
    return currentFromUnknown(error, "退回 Current Team credits 失败。", true);
  }
}

export async function createTeamBillingOrderUnavailable(actorUserId: string, workspaceId: string): Promise<CurrentResult<{ owner: CurrentBillingOwner; reason: string }>> {
  const access = await getCurrentTeamAccess(actorUserId, workspaceId);
  if (!access.ok) return access;
  const owner = await getTeamBillingOwner(workspaceId);
  if (!owner.ok) return owner;
  return currentErr("PROVIDER_UNAVAILABLE", TEAM_ORDER_UNAVAILABLE_REASON, { field: "workspaceId" });
}
