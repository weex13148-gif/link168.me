import crypto from "crypto";
import { db } from "@/lib/db";

export function toProfileDto(profile: {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  theme: string;
  template: string;
  language: string;
  customTheme: string | null;
  isPublic: boolean;
  company: string | null;
  jobTitle: string | null;
  phone: string | null;
  email: string | null;
  wechat: string | null;
  city: string | null;
  address: string | null;
  website: string | null;
  socialLinks: unknown;
  contactVisibility: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: profile.id,
    username: profile.username,
    display_name: profile.displayName,
    bio: profile.bio,
    avatar_url: profile.avatarUrl,
    theme: profile.theme,
    template: profile.template,
    language: profile.language,
    custom_theme: profile.customTheme,
    is_public: profile.isPublic,
    company: profile.company,
    job_title: profile.jobTitle,
    phone: profile.phone,
    email: profile.email,
    wechat: profile.wechat,
    city: profile.city,
    address: profile.address,
    website: profile.website,
    social_links: profile.socialLinks,
    contact_visibility: profile.contactVisibility,
    created_at: profile.createdAt.toISOString(),
    updated_at: profile.updatedAt.toISOString(),
  };
}

export function toLinkDto(link: {
  id: string;
  profileId: string;
  type: string;
  payloadJson: string | null;
  title: string;
  url: string;
  description: string | null;
  iconType: string;
  iconValue: string | null;
  iconUrl: string | null;
  position: number;
  isActive: boolean;
  totalClicks: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: link.id,
    profile_id: link.profileId,
    type: link.type,
    payload_json: link.payloadJson,
    title: link.title,
    url: link.url,
    description: link.description,
    icon_type: link.iconType,
    icon_value: link.iconValue,
    icon_url: link.iconUrl,
    position: link.position,
    is_active: link.isActive,
    total_clicks: link.totalClicks,
    created_at: link.createdAt.toISOString(),
    updated_at: link.updatedAt.toISOString(),
  };
}

// V2-006: 客户线索 DTO
export function toLeadDto(lead: {
  id: string;
  profileId: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  sourceComponent: string | null;
  sourcePage: string | null;
  status: string;
  handlerNote: string | null;
  handledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: lead.id,
    profile_id: lead.profileId,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    message: lead.message,
    source_component: lead.sourceComponent,
    source_page: lead.sourcePage,
    status: lead.status,
    handler_note: lead.handlerNote,
    handled_at: lead.handledAt ? lead.handledAt.toISOString() : null,
    created_at: lead.createdAt.toISOString(),
    updated_at: lead.updatedAt.toISOString(),
  };
}

export function normalizeUsername(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") : "";
}

export function normalizeNullableString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function normalizeUrl(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export async function getDashboardData(userId: string) {
  // V2: profile 显式 include template 与会员字段
  const profile = await db.profile.findUnique({
    where: { userId },
    include: { links: { orderBy: { position: "asc" } } },
  });

  // V2-006: 同时拉取最新 20 条线索用于 Dashboard 摘要
  const leads = profile
    ? await db.lead.findMany({
        where: { profileId: profile.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    : [];

  return {
    profile: profile ? toProfileDto(profile) : null,
    links: profile ? profile.links.map(toLinkDto) : [],
    leads: leads.map(toLeadDto),
    leadsCount: leads.length,
  };
}

export async function getOwnedProfile(userId: string) {
  return db.profile.findUnique({ where: { userId } });
}

// V2-006: 用户 Dashboard 获取线索列表
export async function getOwnedLeads(profileId: string, take = 50) {
  const leads = await db.lead.findMany({
    where: { profileId },
    orderBy: { createdAt: "desc" },
    take,
  });
  return leads.map(toLeadDto);
}

export function newId() {
  return crypto.randomUUID();
}

// V2-007: Product DTO
export function toProductDto(product: {
  id: string;
  userId: string;
  name: string;
  category: string | null;
  description: string | null;
  priceText: string | null;
  coverImageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  sortOrder: number;
  status: string;
  allowAiRecommendation: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: product.id,
    user_id: product.userId,
    name: product.name,
    category: product.category,
    description: product.description,
    price_text: product.priceText,
    cover_image_url: product.coverImageUrl,
    cta_label: product.ctaLabel,
    cta_url: product.ctaUrl,
    sort_order: product.sortOrder,
    is_active: product.status === "published",
    allow_ai_recommendation: product.allowAiRecommendation,
    created_at: product.createdAt.toISOString(),
    updated_at: product.updatedAt.toISOString(),
  };
}

// V2-007: KnowledgeDoc DTO
export function toKnowledgeDocDto(doc: {
  id: string;
  userId: string;
  title: string;
  category: string | null;
  content: string;
  sourceType: string;
  isActive: boolean;
  allowAiCitation: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: doc.id,
    user_id: doc.userId,
    title: doc.title,
    category: doc.category,
    content: doc.content,
    source_type: doc.sourceType,
    is_active: doc.isActive,
    allow_ai_citation: doc.allowAiCitation,
    created_at: doc.createdAt.toISOString(),
    updated_at: doc.updatedAt.toISOString(),
  };
}

// V2-007: Lead V2 DTO (含 workbench_core 扩展字段)
export function toLeadV2Dto(lead: {
  id: string;
  profileId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  sourceComponent: string | null;
  sourcePage: string | null;
  status: string;
  handlerNote: string | null;
  handledAt: Date | null;
  wechat: string | null;
  interestedProductId: string | null;
  conversationId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: lead.id,
    profile_id: lead.profileId,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    message: lead.message,
    source_component: lead.sourceComponent,
    source_page: lead.sourcePage,
    status: lead.status,
    handler_note: lead.handlerNote,
    handled_at: lead.handledAt ? lead.handledAt.toISOString() : null,
    wechat: lead.wechat,
    interested_product_id: lead.interestedProductId,
    conversation_id: lead.conversationId,
    notes: lead.notes,
    created_at: lead.createdAt.toISOString(),
    updated_at: lead.updatedAt.toISOString(),
  };
}

// Lead V3 DTO (含产品信息)
export function toLeadWithProductDto(lead: {
  id: string;
  profileId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  sourceComponent: string | null;
  sourcePage: string | null;
  status: string;
  handlerNote: string | null;
  handledAt: Date | null;
  wechat: string | null;
  interestedProductId: string | null;
  conversationId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  interestedProduct?: {
    id: string;
    name: string;
    category: string | null;
    priceText: string | null;
    isActive: boolean;
  } | null;
}) {
  return {
    id: lead.id,
    profile_id: lead.profileId,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    message: lead.message,
    source_component: lead.sourceComponent,
    source_page: lead.sourcePage,
    status: lead.status,
    handler_note: lead.handlerNote,
    handled_at: lead.handledAt ? lead.handledAt.toISOString() : null,
    wechat: lead.wechat,
    interested_product_id: lead.interestedProductId,
    conversation_id: lead.conversationId,
    notes: lead.notes,
    created_at: lead.createdAt.toISOString(),
    updated_at: lead.updatedAt.toISOString(),
    interested_product: lead.interestedProduct
      ? {
          id: lead.interestedProduct.id,
          name: lead.interestedProduct.name,
          category: lead.interestedProduct.category,
          price_text: lead.interestedProduct.priceText,
          is_active: lead.interestedProduct.isActive,
        }
      : null,
  };
}
