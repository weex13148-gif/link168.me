import type {
  CurrentOffering,
  CurrentPageDraftDocument,
  CurrentPageDraftSnapshot,
  CurrentPageRef,
  CurrentPageSection,
  CurrentPublicContact,
  CurrentPublishedFacts,
  CurrentResult,
} from "@/lib/current/contracts";
import {
  currentErr,
  currentOk,
  ensureBoolean,
  ensureOptionalString,
  isRecord,
  issuesToResult,
  normalizeComparableString,
  uniqueStrings,
  type CurrentValidationIssue,
} from "@/lib/current/domain/shared";

export function normalizePublicIdentity(value: unknown): CurrentResult<string> {
  if (typeof value !== "string") {
    return currentErr("VALIDATION_ERROR", "publicIdentity 必须是字符串。", "publicIdentity");
  }

  const normalized = normalizeComparableString(value);
  if (!normalized || normalized.length > 160 || /[\u0000-\u0020]/.test(normalized)) {
    return currentErr("VALIDATION_ERROR", "publicIdentity 格式不合法。", "publicIdentity");
  }

  return currentOk(normalized);
}

function parseProfile(raw: unknown, issues: CurrentValidationIssue[]) {
  const source = isRecord(raw) ? raw : {};
  const displayName = ensureOptionalString(source.displayName, 120);

  if (!displayName) {
    issues.push({ field: "profile.displayName", message: "公开展示名称不能为空。" });
  }

  return {
    displayName: displayName ?? "",
    headline: ensureOptionalString(source.headline, 160),
    bio: ensureOptionalString(source.bio, 5000),
    avatarUrl: ensureOptionalString(source.avatarUrl, 2048),
    company: ensureOptionalString(source.company, 120),
    jobTitle: ensureOptionalString(source.jobTitle, 120),
    location: ensureOptionalString(source.location, 120),
  };
}

function parseSections(raw: unknown, issues: CurrentValidationIssue[]): CurrentPageSection[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.slice(0, 50).map((item, index) => {
    const section = isRecord(item) ? item : {};
    const id = ensureOptionalString(section.id, 64);
    const kind = ensureOptionalString(section.kind, 64);

    if (!id) {
      issues.push({ field: `sections[${index}].id`, message: "section.id 不能为空。" });
    }

    if (!kind) {
      issues.push({ field: `sections[${index}].kind`, message: "section.kind 不能为空。" });
    }

    return {
      id: id ?? `section-${index + 1}`,
      kind: kind ?? "text",
      title: ensureOptionalString(section.title, 120),
      body: ensureOptionalString(section.body, 5000),
      visible: ensureBoolean(section.visible, true),
      items: Array.isArray(section.items)
        ? section.items.filter((entry): entry is Record<string, unknown> => isRecord(entry)).slice(0, 50)
        : [],
    };
  });
}

function parseOfferings(raw: unknown, issues: CurrentValidationIssue[]): CurrentOffering[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.slice(0, 50).map((item, index) => {
    const offering = isRecord(item) ? item : {};
    const id = ensureOptionalString(offering.id, 64);
    const name = ensureOptionalString(offering.name, 120);

    if (!id) {
      issues.push({ field: `offerings[${index}].id`, message: "offering.id 不能为空。" });
    }

    if (!name) {
      issues.push({ field: `offerings[${index}].name`, message: "offering.name 不能为空。" });
    }

    const responsibleMemberIds = Array.isArray(offering.responsibleMemberIds)
      ? uniqueStrings(
          offering.responsibleMemberIds
            .filter((entry): entry is string => typeof entry === "string")
            .map((entry) => entry.trim()),
        )
      : [];

    return {
      id: id ?? `offering-${index + 1}`,
      name: name ?? "",
      summary: ensureOptionalString(offering.summary, 1000),
      priceText: ensureOptionalString(offering.priceText, 120),
      visible: ensureBoolean(offering.visible, true),
      responsibleMemberIds,
    };
  });
}

function parsePublicContact(raw: unknown): CurrentPublicContact | null {
  if (!isRecord(raw)) {
    return null;
  }

  return {
    email: ensureOptionalString(raw.email, 320),
    phone: ensureOptionalString(raw.phone, 40),
    wechat: ensureOptionalString(raw.wechat, 120),
    website: ensureOptionalString(raw.website, 2048),
  };
}

export function emptyDraftDocument(): CurrentPageDraftDocument {
  return {
    profile: {
      displayName: "",
      headline: null,
      bio: null,
      avatarUrl: null,
      company: null,
      jobTitle: null,
      location: null,
    },
    sections: [],
    offerings: [],
    publicContact: null,
    seoTitle: null,
    seoDescription: null,
  };
}

export function sanitizeDraftDocument(raw: unknown): CurrentResult<CurrentPageDraftDocument> {
  if (!isRecord(raw)) {
    return currentErr("VALIDATION_ERROR", "Draft document 必须是对象。", "document");
  }

  const issues: CurrentValidationIssue[] = [];
  const document: CurrentPageDraftDocument = {
    profile: parseProfile(raw.profile, issues),
    sections: parseSections(raw.sections, issues),
    offerings: parseOfferings(raw.offerings, issues),
    publicContact: parsePublicContact(raw.publicContact),
    seoTitle: ensureOptionalString(raw.seoTitle, 120),
    seoDescription: ensureOptionalString(raw.seoDescription, 320),
  };

  const issueResult = issuesToResult<CurrentPageDraftDocument>(issues);
  if (issueResult) {
    return issueResult;
  }

  return currentOk(document);
}

export function validateDraftSnapshot(snapshot: CurrentPageDraftSnapshot): CurrentResult<CurrentPageDraftSnapshot> {
  if (snapshot.revision < 0) {
    return currentErr("VALIDATION_ERROR", "Draft revision 不能为负数。", "revision");
  }

  const documentResult = sanitizeDraftDocument(snapshot.document);
  if (!documentResult.ok) {
    return documentResult;
  }

  return currentOk({
    ...snapshot,
    document: documentResult.value,
  });
}

export function ensurePublishableDraft(page: CurrentPageRef, draft: CurrentPageDraftDocument): CurrentResult<true> {
  if (!page.publicIdentity.trim()) {
    return currentErr("VALIDATION_ERROR", "公开地址不能为空。", "page.publicIdentity");
  }

  if (!draft.profile.displayName.trim()) {
    return currentErr("VALIDATION_ERROR", "发布前必须填写公开展示名称。", "profile.displayName");
  }

  const hasVisibleSection = draft.sections.some(
    (section) => section.visible && Boolean(section.title?.trim() || section.body?.trim() || section.items.length > 0),
  );
  const hasVisibleOffering = draft.offerings.some((offering) => offering.visible && offering.name.trim().length > 0);

  if (!hasVisibleSection && !hasVisibleOffering) {
    return currentErr("VALIDATION_ERROR", "发布前至少需要一个可公开的 section 或 offering。", "document");
  }

  return currentOk(true);
}

export function buildPublishedFactsFromDraft(input: {
  page: CurrentPageRef;
  versionId: string;
  publishedAt: string;
  draft: CurrentPageDraftDocument;
}): CurrentResult<CurrentPublishedFacts> {
  const publishable = ensurePublishableDraft(input.page, input.draft);
  if (!publishable.ok) {
    return publishable;
  }

  const visibleSections = input.draft.sections.filter((section) => section.visible);
  const visibleOfferings = input.draft.offerings.filter((offering) => offering.visible);
  const responsibleMembers = uniqueStrings(
    visibleOfferings.flatMap((offering) => offering.responsibleMemberIds.map((memberId) => memberId.trim())),
  );

  return currentOk({
    pageId: input.page.pageId,
    workspaceId: input.page.workspaceId,
    versionId: input.versionId,
    publishedAt: input.publishedAt,
    profile: input.draft.profile,
    sections: visibleSections,
    offerings: visibleOfferings,
    publicContact: input.draft.publicContact,
    responsibleMembers,
  });
}
