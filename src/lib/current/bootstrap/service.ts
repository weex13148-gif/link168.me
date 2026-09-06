import "server-only";

import { randomUUID } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import type { CurrentPersonalRuntime, CurrentResult } from "@/lib/current/contracts";
import { currentDb, toJsonValue, type CurrentPrismaClient } from "@/lib/current/data/prisma-current";
import { buildCurrentIdentity } from "@/lib/current/domain/identity";
import { emptyDraftDocument } from "@/lib/current/domain/page";
import { currentErr, currentOk, ensureUuid } from "@/lib/current/domain/shared";

const BOOTSTRAP_MAX_ATTEMPTS = 3;

function isPrismaCode(error: unknown, code: string) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

function uniqueConstraintTargets(error: unknown): string[] {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return [];
  }

  const target = error.meta?.target;
  return Array.isArray(target)
    ? target.filter((value): value is string => typeof value === "string")
    : typeof target === "string"
      ? [target]
      : [];
}

function isUsernameUniqueConstraint(error: unknown) {
  return uniqueConstraintTargets(error).some((target) =>
    ["username", "normalized_username", "public_identity_normalized"].some((field) => target.includes(field)),
  );
}

function initialDraftDocument(identity: { username: string; displayName: string | null }) {
  const document = emptyDraftDocument();
  return {
    ...document,
    profile: {
      ...document.profile,
      displayName: identity.displayName ?? identity.username,
    },
  };
}

async function ensurePersonalRuntimeInTransaction(
  tx: CurrentPrismaClient,
  userId: string,
): Promise<CurrentResult<CurrentPersonalRuntime>> {
  let identity = await tx.currentIdentity.findUnique({ where: { userId } });

  if (!identity) {
    const legacyUser = await tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        profile: { select: { username: true, displayName: true } },
      },
    });

    if (!legacyUser?.profile) {
      return currentErr("NOT_FOUND", "无法为不存在的 legacy User/Profile 初始化 CURRENT runtime。");
    }

    const identityInput = buildCurrentIdentity({
      userId: legacyUser.id,
      username: legacyUser.profile.username,
      displayName: legacyUser.profile.displayName,
    });
    if (!identityInput.ok) return identityInput;

    const usernameOwner = await tx.currentIdentity.findUnique({
      where: { normalizedUsername: identityInput.value.normalizedUsername },
      select: { userId: true },
    });
    if (usernameOwner && usernameOwner.userId !== userId) {
      return currentErr("CONFLICT", "该 username 已被其他 CURRENT identity 占用。", "username");
    }

    identity = await tx.currentIdentity.create({
      data: {
        id: randomUUID(),
        userId: identityInput.value.userId,
        username: identityInput.value.username,
        normalizedUsername: identityInput.value.normalizedUsername,
        displayName: identityInput.value.displayName,
        accountStatus: identityInput.value.accountStatus,
      },
    });
  }

  const personalWorkspaces = await tx.currentWorkspace.findMany({
    where: { kind: "personal", ownerIdentityId: identity.id },
    orderBy: { createdAt: "asc" },
  });
  if (identity.personalWorkspaceId) {
    if (personalWorkspaces.length !== 1 || personalWorkspaces[0]?.id !== identity.personalWorkspaceId) {
      return currentErr("INVALID_STATE", "CURRENT identity 的 personal workspace 指针与拥有的 workspace 不一致。", "personalWorkspaceId");
    }
  } else if (personalWorkspaces.length > 1) {
    return currentErr("INVALID_STATE", "CURRENT personal workspace 存在多个候选记录，无法安全确定运行时。", "personalWorkspaceId");
  }

  let workspace = personalWorkspaces[0] ?? null;

  if (workspace && (workspace.kind !== "personal" || workspace.ownerIdentityId !== identity.id)) {
    return currentErr("INVALID_STATE", "CURRENT personal workspace 关系不一致，无法安全初始化。", "personalWorkspaceId");
  }

  if (!workspace) {
    workspace = await tx.currentWorkspace.create({
      data: {
        id: randomUUID(),
        kind: "personal",
        name: `${identity.displayName ?? identity.username} 的个人空间`,
        ownerIdentityId: identity.id,
        defaultLeadIdentityId: identity.id,
      },
    });
  }

  if (identity.personalWorkspaceId !== workspace.id) {
    identity = await tx.currentIdentity.update({
      where: { id: identity.id },
      data: { personalWorkspaceId: workspace.id },
    });
  }

  if (workspace.defaultLeadIdentityId === null) {
    workspace = await tx.currentWorkspace.update({
      where: { id: workspace.id },
      data: { defaultLeadIdentityId: identity.id },
    });
  } else if (workspace.defaultLeadIdentityId !== identity.id) {
    return currentErr("INVALID_STATE", "CURRENT personal workspace 的默认线索归属不一致，无法安全初始化。", "workspaceId");
  }

  const personalPages = await tx.currentPage.findMany({
    where: { workspaceId: workspace.id, kind: "personal" },
    orderBy: { createdAt: "asc" },
  });
  if (personalPages.some((candidate) => candidate.ownerIdentityId !== identity.id)) {
    return currentErr("INVALID_STATE", "CURRENT personal workspace 包含归属其他 identity 的 personal page。", "pageId");
  }
  if (personalPages.length > 1) {
    return currentErr("INVALID_STATE", "CURRENT personal workspace 存在多个 personal page，无法安全确定运行时。", "pageId");
  }

  let page = personalPages[0] ?? null;

  if (!page) {
    page = await tx.currentPage.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        ownerIdentityId: identity.id,
        kind: "personal",
        publicIdentity: identity.username,
        publicIdentityNormalized: identity.normalizedUsername,
        status: "draft_only",
      },
    });
  } else if (
    page.workspaceId !== workspace.id ||
    page.ownerIdentityId !== identity.id ||
    page.kind !== "personal" ||
    page.publicIdentityNormalized !== identity.normalizedUsername
  ) {
    return currentErr("INVALID_STATE", "CURRENT personal page 关系或公开地址不一致，无法安全初始化。", "pageId");
  }

  let draft = await tx.currentPageDraft.findUnique({ where: { pageId: page.id } });
  if (!draft) {
    draft = await tx.currentPageDraft.create({
      data: {
        id: randomUUID(),
        pageId: page.id,
        revision: 1,
        document: toJsonValue(initialDraftDocument(identity)),
      },
    });
  }

  let billingAccount = await tx.currentBillingAccount.findUnique({ where: { workspaceId: workspace.id } });
  if (!billingAccount) {
    billingAccount = await tx.currentBillingAccount.create({
      data: {
        id: randomUUID(),
        workspaceId: workspace.id,
        scope: "personal",
        ownerIdentityId: identity.id,
        billingContactIdentityId: identity.id,
        planCode: "free",
        status: "active",
      },
    });
  } else if (
    billingAccount.scope !== "personal" ||
    billingAccount.ownerIdentityId !== identity.id ||
    billingAccount.billingContactIdentityId !== identity.id
  ) {
    return currentErr("INVALID_STATE", "CURRENT personal billing account 关系不一致，无法安全初始化。", "billingAccountId");
  }

  return currentOk({
    identityId: identity.id,
    workspaceId: workspace.id,
    pageId: page.id,
    draftId: draft.id,
    billingAccountId: billingAccount.id,
  });
}

export async function ensureCurrentPersonalRuntime(userId: string): Promise<CurrentResult<CurrentPersonalRuntime>> {
  const userIdResult = ensureUuid(userId, "userId");
  if (!userIdResult.ok) return userIdResult;

  for (let attempt = 1; attempt <= BOOTSTRAP_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await currentDb.$transaction(
        (tx) => ensurePersonalRuntimeInTransaction(tx, userId),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      const retryableConflict = isPrismaCode(error, "P2002") || isPrismaCode(error, "P2034");
      if (retryableConflict && attempt < BOOTSTRAP_MAX_ATTEMPTS) continue;

      if (isPrismaCode(error, "P2002")) {
        if (isUsernameUniqueConstraint(error)) {
          return currentErr("CONFLICT", "该 username 已被其他 CURRENT identity 或公开页面占用。", "username");
        }
        return currentErr("CONFLICT", "CURRENT runtime 的唯一约束发生冲突，无法安全初始化。", undefined, false);
      }

      if (isPrismaCode(error, "P2034")) {
        return currentErr("IDEMPOTENCY_ERROR", "CURRENT runtime 初始化在并发重试后仍发生序列化冲突。", undefined, true);
      }

      const message = error instanceof Error && error.message
        ? `CURRENT runtime 初始化失败：${error.message}`
        : "CURRENT runtime 初始化依赖不可用。";
      return currentErr("DEPENDENCY_UNAVAILABLE", message, undefined, isPrismaCode(error, "P2034"));
    }
  }

  return currentErr("IDEMPOTENCY_ERROR", "CURRENT runtime 初始化超过并发重试次数。", undefined, true);
}
