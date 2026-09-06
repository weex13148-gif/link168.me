import type {
  CurrentLeadInput,
  CurrentLeadContact,
  CurrentLeadRecord,
  CurrentLeadRouting,
  CurrentPublishedFacts,
  CurrentResult,
  CurrentWorkspaceMemberRecord,
  CurrentWorkspaceRecord,
} from "@/lib/current/contracts";
import { currentErr, currentOk, ensureOptionalString, isRecord } from "@/lib/current/domain/shared";

export interface CurrentLeadRoutingDecision {
  assigneeIdentityId: string;
  routingReason: "member_page" | "offering_default" | "workspace_default" | "workspace_owner";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s-]{5,30}$/;

export function normalizeLeadContact(raw: unknown): CurrentResult<CurrentLeadContact> {
  if (!isRecord(raw)) {
    return currentErr("VALIDATION_ERROR", "Lead contact 必须是对象。", "contact");
  }

  const contact: CurrentLeadContact = {
    name: ensureOptionalString(raw.name, 120) ?? undefined,
    email: ensureOptionalString(raw.email, 320) ?? undefined,
    phone: ensureOptionalString(raw.phone, 40) ?? undefined,
    wechat: ensureOptionalString(raw.wechat, 120) ?? undefined,
  };

  if (contact.email && !EMAIL_RE.test(contact.email)) {
    return currentErr("VALIDATION_ERROR", "邮箱格式无效。", "contact.email");
  }

  if (contact.phone && !PHONE_RE.test(contact.phone)) {
    return currentErr("VALIDATION_ERROR", "手机号格式无效。", "contact.phone");
  }

  if (!contact.email && !contact.phone && !contact.wechat) {
    return currentErr("VALIDATION_ERROR", "至少需要一种有效联系方式。", "contact");
  }

  return currentOk(contact);
}

export function validateLeadInput(input: CurrentLeadInput): CurrentResult<CurrentLeadInput> {
  const contactResult = normalizeLeadContact(input.contact);
  if (!contactResult.ok) {
    return contactResult;
  }

  const commercialIntent = input.commercialIntent.trim();
  if (commercialIntent.length < 4) {
    return currentErr("VALIDATION_ERROR", "商业意图描述过短，无法形成正式 Lead。", "commercialIntent");
  }

  return currentOk({
    ...input,
    commercialIntent,
    contact: contactResult.value,
  });
}

function extractOfferingMemberIds(facts: CurrentPublishedFacts, offeringId: string | undefined): string[] {
  if (!offeringId) {
    return [];
  }

  const matched = facts.offerings.find((offering) => offering.id === offeringId);
  if (!matched) {
    return [];
  }

  return [...matched.responsibleMemberIds];
}

export function routeLead(input: {
  lead: CurrentLeadInput;
  facts: CurrentPublishedFacts;
  workspace: CurrentWorkspaceRecord;
  activeMembers: readonly CurrentWorkspaceMemberRecord[];
}): CurrentResult<CurrentLeadRoutingDecision> {
  const activeMemberIds = new Set(input.activeMembers.filter((member) => member.status === "active").map((member) => member.identityId));

  if (input.lead.sourceMemberIdentityId && activeMemberIds.has(input.lead.sourceMemberIdentityId)) {
    return currentOk({
      assigneeIdentityId: input.lead.sourceMemberIdentityId,
      routingReason: "member_page",
    });
  }

  const offeringMemberIds = extractOfferingMemberIds(input.facts, input.lead.offeringId);
  const activeOfferingOwner = offeringMemberIds.find((memberId) => activeMemberIds.has(memberId));
  if (activeOfferingOwner) {
    return currentOk({
      assigneeIdentityId: activeOfferingOwner,
      routingReason: "offering_default",
    });
  }

  if (input.workspace.defaultLeadIdentityId && activeMemberIds.has(input.workspace.defaultLeadIdentityId)) {
    return currentOk({
      assigneeIdentityId: input.workspace.defaultLeadIdentityId,
      routingReason: "workspace_default",
    });
  }

  return currentOk({
    assigneeIdentityId: input.workspace.ownerIdentityId,
    routingReason: "workspace_owner",
  });
}

export function buildLeadRecord(input: {
  leadId: string;
  createdAt: string;
  lead: CurrentLeadInput;
  assigneeUserId: string;
  assigneeIdentityId: string;
  routingReason: string;
}): CurrentLeadRecord {
  const strategy = input.routingReason === "member_page"
    ? "source_member"
    : input.routingReason === "workspace_owner"
      ? "workspace_owner_fallback"
      : input.routingReason as CurrentLeadRouting["strategy"];
  const routedAt = input.createdAt;
  return {
    ...input.lead,
    leadId: input.leadId,
    status: "new",
    assigneeUserId: input.assigneeUserId,
    assigneeIdentityId: input.assigneeIdentityId,
    routingReason: input.routingReason,
    routing: {
      strategy,
      assigneeUserId: input.assigneeUserId,
      workspaceId: input.lead.workspaceId,
      rationale: input.routingReason,
    },
    handoff: {
      assigneeUserId: input.assigneeUserId,
      workspaceId: input.lead.workspaceId,
      status: "pending",
      routedAt,
      note: `Lead routed via ${strategy} and awaits human follow-up.`,
    },
    createdAt: input.createdAt,
  };
}
