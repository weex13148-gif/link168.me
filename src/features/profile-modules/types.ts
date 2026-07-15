export type ProfileModuleType =
  | "link"
  | "text"
  | "group-title"
  | "qr"
  | "wechat"
  | "phone"
  | "email"
  | "address"
  | "shop"
  | "booking"
  | "map"
  | "copy-text"
  | "cover-image"
  | "popup-image"
  | "carousel"
  | "bilibili-video"
  | "youtube-video"
  | "video-link"
  | "netease-music"
  | "music-link"
  | "divider"
  | "ai-chat"
  | "product-card"
  | "service-card"
  | "offer"
  | "quote"
  | "contact-form";

export type ProfileModuleCategory =
  | "basic"
  | "image"
  | "video"
  | "audio"
  | "commerce"
  | "ai"
  | "other"
  | "contact"
  | "content";

export type ProfileModuleDefinition = {
  type: ProfileModuleType;
  label: string;
  description: string;
  iconName: string;
  category: ProfileModuleCategory;
  free: boolean;
};
