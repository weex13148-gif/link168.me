/**
 * Shared CURRENT contracts for the controlled rebuild.
 *
 * This file intentionally contains product-neutral identifiers and boundaries.
 * Persistence adapters and UI layers must depend on these contracts rather than
 * importing legacy Prisma models directly.
 */

export type CurrentScope = "personal" | "team";

export type CurrentPageKind = "personal" | "team" | "member";

export type CurrentWorkspaceKind = "personal" | "team";

export type CurrentPageStatus =
  | "draft_only"
  | "published"
  | "draft_changes"
  | "publishing"
  | "publish_failed"
  | "disabled";

export type CurrentMembershipRole = "owner" | "admin" | "member";

export type CurrentMembershipStatus = "invited" | "active" | "disabled" | "removed";

export type CurrentLeadStatus = "new" | "contacted" | "closed";

export type CurrentLeadSource = "visitor_ai" | "direct_form" | "enterprise";

export type CurrentLifecycleState =
  | "active"
  | "pending_cancellation"
  | "pending_deletion"
  | "restricted_retention"
  | "restored";

export type CurrentPolicyType =
  | "terms"
  | "privacy"
  | "direct_form"
  | "enterprise_inquiry"
  | "visitor_ai";

export type CurrentPolicyStatus = "draft" | "published" | "retired";

export type CurrentConsentState = "granted" | "withdrawn" | "replaced";

export type CurrentBillingStatus =
  | "active"
  | "grace"
  | "past_due"
  | "cancelled"
  | "frozen";

export type ProviderState = "configured" | "missing" | "invalid" | "unavailable";

export type CurrentLeadRoutingStrategy =
  | "source_member"
  | "offering_default"
  | "workspace_default"
  | "workspace_owner_fallback";

export type CurrentErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INVALID_STATE"
  | "IDEMPOTENCY_ERROR"
  | "RATE_LIMITED"
  | "PROVIDER_UNAVAILABLE"
  | "DEPENDENCY_UNAVAILABLE"
  | "TIMEOUT"
  | "INTERNAL_ERROR";

export interface CurrentError {
  code: CurrentErrorCode;
  message: string;
  field?: string;
  retryable?: boolean;
}

export type CurrentResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: CurrentError };

export interface CurrentActorContext {
  actorUserId: string;
  scope: CurrentScope;
  workspaceId: string;
  role: "owner" | "admin" | "member";
}

export interface CurrentPageRef {
  pageId: string;
  workspaceId: string;
  workspaceName: string;
  kind: CurrentPageKind;
  status: CurrentPageStatus;
  publicIdentity: string;
}

export interface CurrentIdentityRecord {
  identityId: string;
  userId: string;
  username: string;
  normalizedUsername: string;
  displayName: string | null;
  accountStatus: string;
  personalWorkspaceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentWorkspaceRecord {
  workspaceId: string;
  kind: CurrentWorkspaceKind;
  ownerIdentityId: string;
  defaultLeadIdentityId: string | null;
  slug: string | null;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentWorkspaceMemberRecord {
  membershipId: string;
  workspaceId: string;
  identityId: string;
  role: CurrentMembershipRole;
  status: CurrentMembershipStatus;
  invitedAt: string;
  joinedAt: string | null;
  disabledAt: string | null;
  removedAt: string | null;
}

export interface CurrentPageProfile {
  displayName: string;
  headline: string | null;
  bio: string | null;
  avatarUrl: string | null;
  company: string | null;
  jobTitle: string | null;
  location: string | null;
}

export interface CurrentPageSection {
  id: string;
  kind: string;
  title: string | null;
  body: string | null;
  visible: boolean;
  items: readonly Record<string, unknown>[];
}

export interface CurrentOffering {
  id: string;
  name: string;
  summary: string | null;
  priceText: string | null;
  visible: boolean;
  responsibleMemberIds: readonly string[];
}

export interface CurrentPublicContact {
  email: string | null;
  phone: string | null;
  wechat: string | null;
  website: string | null;
}

export interface CurrentPageDraftDocument {
  profile: CurrentPageProfile;
  sections: readonly CurrentPageSection[];
  offerings: readonly CurrentOffering[];
  publicContact: CurrentPublicContact | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface CurrentPageDraftSnapshot {
  page: CurrentPageRef;
  draftId: string;
  revision: number;
  updatedAt: string;
  document: CurrentPageDraftDocument;
}

export interface CurrentPublishedFacts {
  pageId: string;
  workspaceId: string;
  versionId: string;
  publishedAt: string;
  profile: CurrentPageProfile;
  sections: readonly CurrentPageSection[];
  offerings: readonly CurrentOffering[];
  publicContact: CurrentPublicContact | null;
  responsibleMembers: readonly string[];
}

export interface CurrentPublicationSnapshot {
  page: CurrentPageRef;
  status: CurrentPageStatus;
  draftId: string | null;
  publishedVersionId: string | null;
  publishedFacts: CurrentPublishedFacts | null;
}

export interface CurrentPublishCommand {
  pageId: string;
  actor: CurrentActorContext;
  idempotencyKey: string;
}

export interface CurrentPageReadCommand {
  pageId: string;
  actor: CurrentActorContext;
}

export interface CurrentPageDraftWriteCommand {
  pageId: string;
  actor: CurrentActorContext;
  document: unknown;
  expectedRevision?: number;
}

export interface CurrentPagePreviewSnapshot {
  draft: CurrentPageDraftSnapshot;
  publication: CurrentPublicationSnapshot;
}

export interface CurrentLeadInput {
  source: CurrentLeadSource;
  originPageId: string;
  workspaceId: string;
  originPublicIdentity?: string | null;
  originMemberUserId?: string | null;
  originOfferingId?: string | null;
  contact: CurrentLeadContact;
  commercialIntent: string;
  conversationId?: string;
  idempotencyKey?: string;
  offeringId?: string;
  sourceMemberIdentityId?: string;
}

export interface CurrentLeadContact {
  name?: string;
  email?: string;
  phone?: string;
  wechat?: string;
  preferredChannel?: "email" | "phone" | "wechat";
}

export interface CurrentLeadRouting {
  strategy: CurrentLeadRoutingStrategy;
  assigneeUserId: string;
  workspaceId: string;
  rationale: string;
}

export interface CurrentLeadHandoff {
  assigneeUserId: string;
  workspaceId: string;
  status: "pending";
  routedAt: string;
  note: string;
}

export interface CurrentLeadRecord extends CurrentLeadInput {
  leadId: string;
  status: CurrentLeadStatus;
  assigneeUserId: string;
  assigneeIdentityId?: string;
  routingReason?: string;
  routing: CurrentLeadRouting;
  handoff: CurrentLeadHandoff;
  createdAt: string;
}

export interface CurrentBillingOwner {
  scope: CurrentScope;
  ownerId: string;
  billingContactUserId: string;
}

export interface CurrentBillingAccountRecord {
  billingAccountId: string;
  workspaceId: string;
  owner: CurrentBillingOwner;
  planCode: string;
  status: CurrentBillingStatus;
  graceEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentPersonalRuntime {
  identityId: string;
  workspaceId: string;
  pageId: string;
  draftId: string;
  billingAccountId: string;
}

export interface CurrentLifecycleRecord {
  recordId: string;
  subjectType: "identity" | "workspace" | "page";
  subjectId: string;
  state: CurrentLifecycleState;
  scheduledAt: string;
  restoreDeadlineAt: string | null;
  purgeDeadlineAt: string | null;
  legalHoldUntil: string | null;
  reason: string | null;
}

export interface CurrentPolicyVersionRecord {
  policyVersionId: string;
  policyType: CurrentPolicyType;
  version: string;
  status: CurrentPolicyStatus;
  effectiveAt: string;
  publishedAt: string | null;
  contentReference: string;
  contentHash: string;
}

export interface CurrentConsentRecord {
  consentId: string;
  identityId: string | null;
  workspaceId: string | null;
  policyVersionId: string;
  purpose: string;
  dataCategory: string;
  sourceScene: string;
  state: CurrentConsentState;
  grantedAt: string;
  withdrawnAt: string | null;
}

export interface CurrentAuditEntry {
  auditId: string;
  actorIdentityId: string | null;
  workspaceId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  idempotencyKey: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface CurrentProviderStatus {
  provider: string;
  state: ProviderState;
  reason?: string;
}

export interface CurrentIdentityRepository {
  getByUserId(userId: string): Promise<CurrentResult<CurrentIdentityRecord>>;
  getByUsername(username: string): Promise<CurrentResult<CurrentIdentityRecord>>;
}

export interface CurrentWorkspaceRepository {
  getWorkspace(workspaceId: string): Promise<CurrentResult<CurrentWorkspaceRecord>>;
  getMembership(
    workspaceId: string,
    identityId: string,
  ): Promise<CurrentResult<CurrentWorkspaceMemberRecord>>;
}

export interface CurrentPageRepository {
  getPublication(pageId: string): Promise<CurrentResult<CurrentPublicationSnapshot>>;
  getPublicationForActor(
    command: CurrentPageReadCommand,
  ): Promise<CurrentResult<CurrentPublicationSnapshot>>;
  readPublishedFacts(pageId: string): Promise<CurrentResult<CurrentPublishedFacts>>;
  getDraft(pageId: string): Promise<CurrentResult<CurrentPageDraftSnapshot>>;
  getDraftForActor(command: CurrentPageReadCommand): Promise<CurrentResult<CurrentPageDraftSnapshot>>;
  saveDraft(draft: CurrentPageDraftSnapshot): Promise<CurrentResult<CurrentPageDraftSnapshot>>;
  saveDraftForActor(
    command: CurrentPageDraftWriteCommand,
  ): Promise<CurrentResult<CurrentPageDraftSnapshot>>;
  publish(command: CurrentPublishCommand): Promise<CurrentResult<CurrentPublicationSnapshot>>;
  readPublishedFactsByPublicIdentity(publicIdentity: string): Promise<CurrentResult<CurrentPublishedFacts>>;
}

export interface CurrentPageService {
  getOwnerPage(command: CurrentPageReadCommand): Promise<CurrentResult<CurrentPublicationSnapshot>>;
  getOwnerDraft(command: CurrentPageReadCommand): Promise<CurrentResult<CurrentPageDraftSnapshot>>;
  saveOwnerDraft(command: CurrentPageDraftWriteCommand): Promise<CurrentResult<CurrentPageDraftSnapshot>>;
  previewOwner(command: CurrentPageReadCommand): Promise<CurrentResult<CurrentPagePreviewSnapshot>>;
  publishOwner(command: CurrentPublishCommand): Promise<CurrentResult<CurrentPublicationSnapshot>>;
}

export interface CurrentLeadRepository {
  create(input: CurrentLeadInput): Promise<CurrentResult<CurrentLeadRecord>>;
}

export interface CurrentBillingRepository {
  getAccountByWorkspaceId(workspaceId: string): Promise<CurrentResult<CurrentBillingAccountRecord>>;
}

export interface CurrentLifecycleRepository {
  getLatest(
    subjectType: CurrentLifecycleRecord["subjectType"],
    subjectId: string,
  ): Promise<CurrentResult<CurrentLifecycleRecord>>;
}

export interface CurrentConsentRepository {
  listForIdentity(identityId: string): Promise<CurrentResult<readonly CurrentConsentRecord[]>>;
}

export interface CurrentAuditRepository {
  append(entry: Omit<CurrentAuditEntry, "auditId" | "createdAt">): Promise<CurrentResult<CurrentAuditEntry>>;
}
