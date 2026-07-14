export type ComponentType =
  | "link"
  | "text"
  | "group-title"
  | "qr"
  | "wechat"
  | "phone"
  | "email"
  | "address"
  | "product-card"
  | "service-card"
  | "offer"
  | "booking"
  | "quote"
  | "contact-form"
  | "map"
  | "copy-text"
  | "cover-image"
  | "popup-image"
  | "carousel"
  | "ai-chat";

export const ALL_COMPONENT_TYPES: ComponentType[] = [
  "link",
  "text",
  "group-title",
  "qr",
  "wechat",
  "phone",
  "email",
  "address",
  "product-card",
  "service-card",
  "offer",
  "booking",
  "quote",
  "contact-form",
  "map",
  "copy-text",
  "cover-image",
  "popup-image",
  "carousel",
  "ai-chat",
];

export const FREE_COMPONENT_TYPES: ComponentType[] = [
  "link",
  "text",
  "group-title",
  "qr",
  "wechat",
  "phone",
  "email",
  "address",
  "product-card",
  "service-card",
  "offer",
  "booking",
  "quote",
  "contact-form",
  "map",
  "copy-text",
];

export const PAID_COMPONENT_TYPES: ComponentType[] = [
  "cover-image",
  "popup-image",
  "carousel",
  "ai-chat",
];

export function isFreeComponentType(type: string): boolean {
  return FREE_COMPONENT_TYPES.includes(type as ComponentType);
}

export function validateComponentType(type: string): type is ComponentType {
  return ALL_COMPONENT_TYPES.includes(type as ComponentType);
}

export type LeadStatus = "new" | "viewed" | "following_up" | "won" | "closed";

export const LEAD_STATUS_MAP: Record<LeadStatus, string> = {
  new: "新线索",
  viewed: "已查看",
  following_up: "跟进中",
  won: "已成交",
  closed: "已关闭",
};

export const OLD_LEAD_STATUS_MAP: Record<string, LeadStatus> = {
  contacted: "viewed",
  following: "following_up",
  converted: "won",
  qualified: "following_up",
  lost: "closed",
};

export function normalizeLeadStatus(status: string): LeadStatus {
  if (Object.keys(LEAD_STATUS_MAP).includes(status)) {
    return status as LeadStatus;
  }
  return OLD_LEAD_STATUS_MAP[status] || "new";
}

export type LeadSource =
  | "product_card"
  | "service_card"
  | "booking"
  | "offer"
  | "quote"
  | "contact_form"
  | "ai_chat"
  | "human_handoff"
  | "direct";

export const ALL_LEAD_SOURCES: LeadSource[] = [
  "product_card",
  "service_card",
  "booking",
  "offer",
  "quote",
  "contact_form",
  "ai_chat",
  "human_handoff",
  "direct",
];

export function validateLeadSource(source: string): source is LeadSource {
  return ALL_LEAD_SOURCES.includes(source as LeadSource);
}

export type MediaPurpose =
  | "avatar"
  | "background"
  | "cover"
  | "carousel"
  | "popup"
  | "product_cover"
  | "service_cover"
  | "enterprise_logo"
  | "enterprise_public_image"
  | "custom_link_icon";

export const ALL_MEDIA_PURPOSES: MediaPurpose[] = [
  "avatar",
  "background",
  "cover",
  "carousel",
  "popup",
  "product_cover",
  "service_cover",
  "enterprise_logo",
  "enterprise_public_image",
  "custom_link_icon",
];

export function validateMediaPurpose(purpose: string): purpose is MediaPurpose {
  return ALL_MEDIA_PURPOSES.includes(purpose as MediaPurpose);
}

export type IconType = "default" | "emoji" | "custom" | "favicon" | "platform";

export const ALL_ICON_TYPES: IconType[] = [
  "default",
  "emoji",
  "custom",
  "favicon",
  "platform",
];

export function validateIconType(type: string): type is IconType {
  return ALL_ICON_TYPES.includes(type as IconType);
}
