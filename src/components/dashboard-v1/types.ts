export type DashboardTab = "home" | "profile" | "links" | "appearance" | "share" | "stats" | "account";
export type CardEditorSection = "content" | "style" | "publish";

export type SaveState = "saved" | "dirty" | "saving" | "error";

export type AvatarModerationStatus = "pending" | "pending_manual_review" | "rejected" | "approved" | "legacy_approved";

export function toAvatarModerationStatus(value: string | null | undefined): AvatarModerationStatus {
  if (value === "pending" || value === "pending_manual_review" || value === "rejected" || value === "approved" || value === "legacy_approved") {
    return value;
  }

  return "pending_manual_review";
}

export type DashboardUser = {
  id?: string;
  email: string;
  emailVerified: boolean;
  role?: string;
};

export type DashboardProfile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  avatar_moderation_status: AvatarModerationStatus;
  theme: string;
  template: string;
  language: string;
  custom_theme: string | null;
  is_public: boolean;
  first_published_at: string | null;
  company: string | null;
  job_title: string | null;
  phone: string | null;
  email: string | null;
  wechat: string | null;
  city: string | null;
  address: string | null;
  website: string | null;
  social_links: unknown;
  contact_visibility: string;
  created_at: string;
  updated_at: string;
};

export type DashboardLink = {
  id: string;
  profile_id: string;
  type: string;
  payload_json: string | null;
  title: string;
  url: string;
  description: string | null;
  icon_type: string;
  icon_value: string | null;
  icon_url: string | null;
  position: number;
  is_active: boolean;
  total_clicks: number;
  created_at: string;
  updated_at: string;
};

export type DashboardSession = {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActive: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

export type DashboardResponse = {
  success?: boolean;
  error?: string;
  user?: DashboardUser;
  profile?: DashboardProfile | null;
  links?: DashboardLink[];
  leadsCount?: number;
  meta?: { hasUnverifiedEmail?: boolean };
};

export type EntitlementsResponse = {
  success?: boolean;
  data?: {
    planCode?: string;
    planName?: string;
    planLabel?: string;
    status?: string;
    isPaid?: boolean;
    isLegacyActive?: boolean;
    isGracePeriod?: boolean;
    gracePeriodDays?: number;
    daysRemaining?: number;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    features?: {
      aiEnabled?: boolean;
      advancedModels?: boolean;
      fileUpload?: boolean;
      enterpriseMemory?: boolean;
      removeBranding?: boolean;
      advancedStats?: boolean;
      customDomain?: boolean;
      prioritySupport?: boolean;
    };
    limits?: {
      products?: { max: number; remaining: number };
      knowledgeDocs?: { max: number; remaining: number };
      aiChatsPerMonth?: { max: number; used: number; remaining: number };
      teamSeats?: { max: number };
    };
    customThemes?: string[];
    canUpgrade?: boolean;
  };
  error?: string;
};

export type LinkComponentType =
  | "link"
  | "text"
  | "group-title"
  | "qr"
  | "wechat"
  | "phone"
  | "email"
  | "address"
  | "map"
  | "shop"
  | "booking"
  | "product-card"
  | "service-card"
  | "offer"
  | "quote"
  | "contact-form"
  | "copy-text"
  | "divider"
  | "cover-image"
  | "popup-image"
  | "carousel"
  | "bilibili-video"
  | "youtube-video"
  | "video-link"
  | "netease-music"
  | "music-link"
  | "ai-chat";

export type LinkDraft = {
  title: string;
  url: string;
  description: string;
  iconType: string;
  iconValue: string;
  iconUrl: string;
  componentType?: LinkComponentType;
  payloadJson: string;
};

export const emptyLinkDraft: LinkDraft = {
  title: "",
  url: "",
  description: "",
  iconType: "default",
  iconValue: "",
  iconUrl: "",
  componentType: "link",
  payloadJson: "",
};

export function isTemporaryUsername(username: string | null | undefined) {
  const value = (username || "").trim().toLowerCase();
  return !value || value === "yourname" || /^user-[a-z0-9]{6,}$/i.test(value) || /^u_[a-z0-9]{8,}$/i.test(value);
}

export function publicProfileUrl(username: string | null | undefined) {
  if (isTemporaryUsername(username)) return "";
  return `https://link168.me/${username}`;
}

export function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value.trim());
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && parsed.hostname.includes(".");
  } catch {
    return false;
  }
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("zh-CN", { hour12: false });
}
