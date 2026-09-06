import type {
  CurrentPageDraftSnapshot,
  CurrentPageProfile,
  CurrentPageSection,
  CurrentPageStatus,
  CurrentPublishedFacts,
} from "@/lib/current/contracts";
import type { CurrentPageRenderModel, CurrentBoundaryProps } from "@/components/current-page/types";
import { sanitizePublicUrl } from "@/lib/public-url-security";

function safePublicUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const result = sanitizePublicUrl(value);
  return result.safe ? result.url : null;
}

function sectionContent(section: CurrentPageSection): string[] {
  return [
    ...(section.body?.trim() ? [section.body.trim()] : []),
    ...section.items.flatMap((item) => {
      const value = item.text ?? item.label ?? item.title ?? item.name;
      return typeof value === "string" && value.trim() ? [value.trim()] : [];
    }),
  ];
}

function profileSummary(profile: CurrentPageProfile) {
  return [profile.company, profile.jobTitle, profile.location].filter(Boolean).join(" · ");
}

function buildModel(input: {
  pageKind: CurrentPageRenderModel["pageKind"];
  pageStatus: CurrentPageStatus;
  pageName: string;
  publicIdentity: string;
  profile: CurrentPageProfile;
  sections: readonly CurrentPageSection[];
  offerings: CurrentPublishedFacts["offerings"];
  publicContact: CurrentPublishedFacts["publicContact"];
  boundary: CurrentBoundaryProps;
}): CurrentPageRenderModel {
  const contacts = input.publicContact
    ? [
        ["邮箱", input.publicContact.email, input.publicContact.email ? `mailto:${input.publicContact.email}` : null],
        ["电话", input.publicContact.phone, input.publicContact.phone ? `tel:${input.publicContact.phone}` : null],
        ["微信", input.publicContact.wechat, null],
        ["网站", input.publicContact.website, safePublicUrl(input.publicContact.website)],
      ].flatMap(([label, value, href]) =>
        typeof value === "string" && value.trim()
          ? [{ label: String(label), value: value.trim(), href: typeof href === "string" ? href : null }]
          : [],
      )
    : [];

  return {
    pageKind: input.pageKind,
    pageStatus: input.pageStatus,
    pageName: input.pageName,
    publicIdentity: input.publicIdentity,
    boundary: input.boundary,
    hero: {
      eyebrow: input.profile.headline,
      title: input.profile.displayName || input.pageName,
      subtitle: profileSummary(input.profile) || null,
      summary: input.profile.bio || "这是一张 CURRENT 个人页面。",
      avatarUrl: safePublicUrl(input.profile.avatarUrl),
      meta: input.profile.location ? [input.profile.location] : [],
    },
    offerings: input.offerings.map((item) => ({
      id: item.id,
      title: item.name,
      summary: item.summary || "暂未填写服务说明。",
      priceLabel: item.priceText,
    })),
    sections: input.sections.map((section) => ({
      id: section.id,
      label: section.title || section.kind,
      description: section.body,
      tone: section.kind === "highlight" ? "highlight" : "default",
      content: sectionContent(section),
    })),
    contacts,
    footer: { brandLabel: "Link168 CURRENT", note: "页面内容来自明确的 boundary。" },
  };
}

export function draftToRenderModel(
  snapshot: CurrentPageDraftSnapshot,
  status: CurrentPageStatus = "draft_only",
): CurrentPageRenderModel {
  return buildModel({
    pageKind: snapshot.page.kind,
    pageStatus: status,
    pageName: snapshot.document.profile.displayName || snapshot.page.publicIdentity,
    publicIdentity: snapshot.page.publicIdentity,
    profile: snapshot.document.profile,
    sections: snapshot.document.sections,
    offerings: snapshot.document.offerings,
    publicContact: snapshot.document.publicContact,
    boundary: {
      source: "draft",
      draftLabel: `Draft revision ${snapshot.revision}`,
      publicWarning: "预览只读取 Draft；Publish 成功前，公开页面不会改变。",
    },
  });
}

export function publishedFactsToRenderModel(
  facts: CurrentPublishedFacts,
  publicIdentity: string,
): CurrentPageRenderModel {
  return buildModel({
    pageKind: "personal",
    pageStatus: "published",
    pageName: facts.profile.displayName || publicIdentity,
    publicIdentity,
    profile: facts.profile,
    sections: facts.sections,
    offerings: facts.offerings,
    publicContact: facts.publicContact,
    boundary: {
      source: "published",
      publishedLabel: "Published 页面",
      publishedVersionLabel: facts.versionId,
      canonicalUrl: `/${publicIdentity}`,
    },
  });
}
