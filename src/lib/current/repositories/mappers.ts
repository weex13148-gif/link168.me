import type {
  CurrentAuditEntry,
  CurrentBillingAccountRecord,
  CurrentBillingOwner,
  CurrentConsentRecord,
  CurrentIdentityRecord,
  CurrentLifecycleRecord,
  CurrentPageDraftDocument,
  CurrentPageDraftSnapshot,
  CurrentPageRef,
  CurrentPolicyVersionRecord,
  CurrentPublicationSnapshot,
  CurrentPublishedFacts,
  CurrentWorkspaceMemberRecord,
  CurrentWorkspaceRecord,
} from "@/lib/current/contracts";
import { emptyDraftDocument, sanitizeDraftDocument } from "@/lib/current/domain/page";
import { isoString } from "@/lib/current/domain/shared";

type PageRow = {
  id: string;
  workspaceId: string;
  workspace?: { name: string };
  kind: string;
  publicIdentity: string;
  status: string;
  ownerIdentityId: string;
};

type DraftRow = {
  id: string;
  revision: number;
  document: unknown;
  updatedAt: Date;
};

type FactsRow = {
  pageId: string;
  workspaceId: string;
  versionId: string;
  publishedAt: Date;
  profile: unknown;
  sections: unknown;
  offerings: unknown;
  publicContact: unknown;
  responsibleMembers: unknown;
};

export function mapIdentity(row: {
  id: string;
  userId: string;
  username: string;
  normalizedUsername: string;
  displayName: string | null;
  accountStatus: string;
  personalWorkspaceId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CurrentIdentityRecord {
  return {
    identityId: row.id,
    userId: row.userId,
    username: row.username,
    normalizedUsername: row.normalizedUsername,
    displayName: row.displayName,
    accountStatus: row.accountStatus,
    personalWorkspaceId: row.personalWorkspaceId,
    createdAt: isoString(row.createdAt),
    updatedAt: isoString(row.updatedAt),
  };
}

export function mapWorkspace(row: {
  id: string;
  kind: string;
  ownerIdentityId: string;
  defaultLeadIdentityId: string | null;
  slug: string | null;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): CurrentWorkspaceRecord {
  return {
    workspaceId: row.id,
    kind: row.kind as CurrentWorkspaceRecord["kind"],
    ownerIdentityId: row.ownerIdentityId,
    defaultLeadIdentityId: row.defaultLeadIdentityId,
    slug: row.slug,
    name: row.name,
    isActive: row.isActive,
    createdAt: isoString(row.createdAt),
    updatedAt: isoString(row.updatedAt),
  };
}

export function mapMembership(row: {
  id: string;
  workspaceId: string;
  identityId: string;
  role: string;
  status: string;
  invitedAt: Date;
  joinedAt: Date | null;
  disabledAt: Date | null;
  removedAt: Date | null;
}): CurrentWorkspaceMemberRecord {
  return {
    membershipId: row.id,
    workspaceId: row.workspaceId,
    identityId: row.identityId,
    role: row.role as CurrentWorkspaceMemberRecord["role"],
    status: row.status as CurrentWorkspaceMemberRecord["status"],
    invitedAt: isoString(row.invitedAt),
    joinedAt: row.joinedAt ? isoString(row.joinedAt) : null,
    disabledAt: row.disabledAt ? isoString(row.disabledAt) : null,
    removedAt: row.removedAt ? isoString(row.removedAt) : null,
  };
}

export function mapPageRef(row: PageRow): CurrentPageRef {
  return {
    pageId: row.id,
    workspaceId: row.workspaceId,
    workspaceName: row.workspace?.name ?? "CURRENT 工作空间",
    kind: row.kind as CurrentPageRef["kind"],
    status: row.status as CurrentPageRef["status"],
    publicIdentity: row.publicIdentity,
  };
}

export function mapDraftDocument(document: unknown): CurrentPageDraftDocument {
  const draft = sanitizeDraftDocument(document);
  return draft.ok ? draft.value : emptyDraftDocument();
}

export function mapDraftSnapshot(page: PageRow, draft: DraftRow): CurrentPageDraftSnapshot {
  return {
    page: mapPageRef(page),
    draftId: draft.id,
    revision: draft.revision,
    updatedAt: isoString(draft.updatedAt),
    document: mapDraftDocument(draft.document),
  };
}

export function mapPublishedFacts(row: FactsRow): CurrentPublishedFacts {
  const documentResult = sanitizeDraftDocument({
    profile: row.profile,
    sections: row.sections,
    offerings: row.offerings,
    publicContact: row.publicContact,
    seoTitle: null,
    seoDescription: null,
  });
  const document = documentResult.ok ? documentResult.value : emptyDraftDocument();

  return {
    pageId: row.pageId,
    workspaceId: row.workspaceId,
    versionId: row.versionId,
    publishedAt: isoString(row.publishedAt),
    profile: document.profile,
    sections: document.sections,
    offerings: document.offerings,
    publicContact: document.publicContact,
    responsibleMembers: Array.isArray(row.responsibleMembers) ? (row.responsibleMembers as readonly string[]) : [],
  };
}

export function mapPublicationSnapshot(input: {
  page: PageRow;
  draft: DraftRow | null;
  facts: FactsRow | null;
  publishedVersionId: string | null;
}): CurrentPublicationSnapshot {
  return {
    page: mapPageRef(input.page),
    status: input.page.status as CurrentPublicationSnapshot["status"],
    draftId: input.draft?.id ?? null,
    publishedVersionId: input.publishedVersionId,
    publishedFacts: input.facts ? mapPublishedFacts(input.facts) : null,
  };
}

export function mapBillingAccount(input: {
  id: string;
  workspaceId: string;
  scope: string;
  ownerIdentityId: string;
  billingContactIdentity: { userId: string };
  planCode: string;
  status: string;
  graceEndsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): CurrentBillingAccountRecord {
  const owner: CurrentBillingOwner = {
    scope: input.scope === "team" ? "team" : "personal",
    ownerId: input.ownerIdentityId,
    billingContactUserId: input.billingContactIdentity.userId,
  };

  return {
    billingAccountId: input.id,
    workspaceId: input.workspaceId,
    owner,
    planCode: input.planCode,
    status: input.status as CurrentBillingAccountRecord["status"],
    graceEndsAt: input.graceEndsAt ? isoString(input.graceEndsAt) : null,
    createdAt: isoString(input.createdAt),
    updatedAt: isoString(input.updatedAt),
  };
}

export function mapLifecycleRecord(input: {
  id: string;
  subjectType: string;
  subjectId: string;
  state: string;
  scheduledAt: Date;
  restoreDeadlineAt: Date | null;
  purgeDeadlineAt: Date | null;
  legalHoldUntil: Date | null;
  reason: string | null;
}): CurrentLifecycleRecord {
  return {
    recordId: input.id,
    subjectType: input.subjectType as CurrentLifecycleRecord["subjectType"],
    subjectId: input.subjectId,
    state: input.state as CurrentLifecycleRecord["state"],
    scheduledAt: isoString(input.scheduledAt),
    restoreDeadlineAt: input.restoreDeadlineAt ? isoString(input.restoreDeadlineAt) : null,
    purgeDeadlineAt: input.purgeDeadlineAt ? isoString(input.purgeDeadlineAt) : null,
    legalHoldUntil: input.legalHoldUntil ? isoString(input.legalHoldUntil) : null,
    reason: input.reason,
  };
}

export function mapPolicyVersion(input: {
  id: string;
  policyType: string;
  version: string;
  status: string;
  effectiveAt: Date;
  publishedAt: Date | null;
  contentReference: string;
  contentHash: string;
}): CurrentPolicyVersionRecord {
  return {
    policyVersionId: input.id,
    policyType: input.policyType as CurrentPolicyVersionRecord["policyType"],
    version: input.version,
    status: input.status as CurrentPolicyVersionRecord["status"],
    effectiveAt: isoString(input.effectiveAt),
    publishedAt: input.publishedAt ? isoString(input.publishedAt) : null,
    contentReference: input.contentReference,
    contentHash: input.contentHash,
  };
}

export function mapConsentRecord(input: {
  id: string;
  identityId: string | null;
  workspaceId: string | null;
  policyVersionId: string;
  purpose: string;
  dataCategory: string;
  sourceScene: string;
  state: string;
  grantedAt: Date;
  withdrawnAt: Date | null;
}): CurrentConsentRecord {
  return {
    consentId: input.id,
    identityId: input.identityId,
    workspaceId: input.workspaceId,
    policyVersionId: input.policyVersionId,
    purpose: input.purpose,
    dataCategory: input.dataCategory,
    sourceScene: input.sourceScene,
    state: input.state as CurrentConsentRecord["state"],
    grantedAt: isoString(input.grantedAt),
    withdrawnAt: input.withdrawnAt ? isoString(input.withdrawnAt) : null,
  };
}

export function mapAuditEntry(input: {
  id: string;
  actorIdentityId: string | null;
  workspaceId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  idempotencyKey: string | null;
  metadata: unknown;
  createdAt: Date;
}): CurrentAuditEntry {
  return {
    auditId: input.id,
    actorIdentityId: input.actorIdentityId,
    workspaceId: input.workspaceId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    idempotencyKey: input.idempotencyKey,
    createdAt: isoString(input.createdAt),
    metadata:
      typeof input.metadata === "object" && input.metadata !== null && !Array.isArray(input.metadata)
        ? (input.metadata as Record<string, unknown>)
        : {},
  };
}
