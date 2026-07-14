// V2 补充 Profile 模板字段/会员字段
export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  theme: string;
  // V2-004: 用户选择的分享页模板
  template: "business" | "creator" | "conversion" | string;
  language: string;
  custom_theme: string | null;
  is_public: boolean;
  // V2-008: 会员关联
  member_plan_id: string | null;
  membership_end_at: string | null;
  created_at: string;
  updated_at: string;
};

// V2-005: Link 新增 type 与 payload_json 支持
export type ProfileLink = {
  id: string;
  profile_id: string;
  // link / text / group-title / qr / wechat / shop / booking / map / phone
  type: string;
  // 组件扩展数据（微信账号、商品价格、预约时间段等）
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

// V2-006: 客户线索
// 统一新状态：new, viewed, following_up, won, closed
// 历史状态保留兼容：contacted, following, converted, qualified, lost
export type ProfileLead = {
  id: string;
  profile_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  source_component: string | null;
  source_page: string | null;
  status: "new" | "viewed" | "following_up" | "won" | "closed" | "contacted" | "following" | "converted" | "qualified" | "lost" | string;
  handler_note: string | null;
  handled_at: string | null;
  created_at: string;
  updated_at: string;
};

// V2-008: 用户当前会话中的账号信息补充字段
export type CurrentUserExtended = {
  id: string;
  email: string;
  emailVerified: boolean;
  role: "user" | "admin" | "super_admin" | string;
  // V2-002: 冻结原因（FROZEN_EMAIL_UNVERIFIED_30D / FROZEN_ADMIN / BANNED_ADMIN）
  frozenReason: string | null;
  usernameChangesRemaining: number;
};
