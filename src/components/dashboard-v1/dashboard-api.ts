import type {
  DashboardLink,
  DashboardProfile,
  DashboardResponse,
  DashboardSession,
  EntitlementsResponse,
  LinkDraft,
} from "@/components/dashboard-v1/types";

export type ApiResult<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; status: number; upgradeRequired?: boolean };

async function readJson<T>(response: Response) {
  try {
    return await response.json() as T;
  } catch {
    return {} as T;
  }
}

export async function fetchDashboard(): Promise<ApiResult<DashboardResponse>> {
  const response = await fetch("/api/dashboard", { cache: "no-store" });
  const data = await readJson<DashboardResponse>(response);
  if (!response.ok || !data.user) return { ok: false, error: data.error || "用户后台加载失败。", status: response.status };
  return { ok: true, data };
}

export async function fetchPlan(): Promise<ApiResult<{
  planCode: string;
  planName: string;
  planLabel: string;
  status: string;
  isPaid: boolean;
  isLegacyActive: boolean;
  isGracePeriod: boolean;
  gracePeriodDays: number;
  daysRemaining: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  features: Record<string, boolean>;
  limits: Record<string, unknown>;
  customThemes: string[];
  canUpgrade: boolean;
}>> {
  const response = await fetch("/api/dashboard/entitlements", { cache: "no-store" });
  const data = await readJson<EntitlementsResponse>(response);
  if (!response.ok || !data.success || !data.data) return { ok: false, error: data.error || "版本信息加载失败。", status: response.status };
  return {
    ok: true,
    data: {
      planCode: data.data.planCode || "free",
      planName: data.data.planName || "免费版",
      planLabel: data.data.planLabel || "免费版",
      status: data.data.status || "inactive",
      isPaid: Boolean(data.data.isPaid),
      isLegacyActive: Boolean(data.data.isLegacyActive),
      isGracePeriod: Boolean(data.data.isGracePeriod),
      gracePeriodDays: data.data.gracePeriodDays || 0,
      daysRemaining: data.data.daysRemaining || 0,
      currentPeriodStart: data.data.currentPeriodStart ?? null,
      currentPeriodEnd: data.data.currentPeriodEnd ?? null,
      features: (data.data.features as Record<string, boolean>) || {},
      limits: data.data.limits || {},
      customThemes: data.data.customThemes || [],
      canUpgrade: data.data.canUpgrade ?? true,
    },
  };
}

export async function saveProfileRequest(payload: { username: string; displayName: string; bio: string }): Promise<ApiResult<DashboardProfile>> {
  const response = await fetch("/api/dashboard", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await readJson<{ success?: boolean; profile?: DashboardProfile; error?: string; message?: string }>(response);
  if (!response.ok || !data.success || !data.profile) return { ok: false, error: data.error || "资料保存失败。", status: response.status };
  return { ok: true, data: data.profile, message: data.message };
}

export async function uploadAvatarRequest(file: File): Promise<ApiResult<DashboardProfile>> {
  const formData = new FormData();
  formData.append("avatar", file);
  const response = await fetch("/api/dashboard/avatar", { method: "POST", body: formData, cache: "no-store" });
  const data = await readJson<{ success?: boolean; profile?: DashboardProfile; error?: string }>(response);
  if (!response.ok || !data.success || !data.profile) return { ok: false, error: data.error || "头像上传失败。", status: response.status };
  return { ok: true, data: data.profile };
}

function buildPayload(draft: LinkDraft): string | undefined {
  const ct = draft.componentType || "link";

  if (draft.payloadJson) {
    return draft.payloadJson;
  }

  switch (ct) {
    case "text":
      return JSON.stringify({ content: draft.description || draft.title });
    case "group-title":
      return JSON.stringify({ title: draft.title, description: draft.description });
    case "wechat":
      return JSON.stringify({ wechat: draft.url });
    case "qr":
      return JSON.stringify({ qr: draft.url });
    case "phone":
      return JSON.stringify({ phone: draft.url.replace(/^tel:/i, "") });
    case "map":
      return JSON.stringify({ map: draft.url, address: "" });
    case "divider":
      return JSON.stringify({ style: "line" });
    case "copy-text":
    case "cover-image":
    case "popup-image":
    case "carousel":
    case "bilibili-video":
    case "youtube-video":
    case "video-link":
    case "netease-music":
    case "music-link":
    case "ai-chat":
    case "product-card":
      return JSON.stringify({ name: draft.title, description: draft.description });
    case "service-card":
      return JSON.stringify({ name: draft.title, description: draft.description });
    case "offer":
      return JSON.stringify({ title: draft.title, description: draft.description });
    case "shop":
    case "booking":
      return draft.payloadJson || JSON.stringify({});
    case "link":
    default:
      return undefined;
  }
}

export async function createLinkRequest(draft: LinkDraft): Promise<ApiResult<DashboardLink>> {
  const response = await fetch("/api/dashboard/links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: draft.title,
      url: draft.url,
      description: draft.description,
      iconType: draft.iconType,
      iconValue: draft.iconValue,
      iconUrl: draft.iconUrl,
      iconModerationStatus: draft.iconModerationStatus,
      componentType: draft.componentType,
      payload: buildPayload(draft),
    }),
  });
  const data = await readJson<{ success?: boolean; link?: DashboardLink; error?: string; upgradeRequired?: boolean }>(response);
  if (!response.ok || !data.success || !data.link) return { ok: false, error: data.error || "内容创建失败。", status: response.status, upgradeRequired: data.upgradeRequired };
  return { ok: true, data: data.link };
}

export async function updateLinkRequest(link: DashboardLink, draft: LinkDraft, isActive = link.is_active): Promise<ApiResult<DashboardLink>> {
  const response = await fetch(`/api/dashboard/links/${link.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: draft.title,
      url: draft.url,
      description: draft.description,
      isActive,
      iconType: draft.iconType,
      iconValue: draft.iconValue,
      iconUrl: draft.iconUrl,
      iconModerationStatus: draft.iconModerationStatus,
      componentType: draft.componentType || link.type || "link",
      payload: buildPayload(draft),
    }),
  });
  const data = await readJson<{ success?: boolean; link?: DashboardLink; error?: string }>(response);
  if (!response.ok || !data.success || !data.link) return { ok: false, error: data.error || "内容保存失败。", status: response.status };
  return { ok: true, data: data.link };
}

export async function deleteLinkRequest(linkId: string): Promise<ApiResult<null>> {
  const response = await fetch(`/api/dashboard/links/${linkId}`, { method: "DELETE" });
  const data = await readJson<{ success?: boolean; error?: string }>(response);
  if (!response.ok || !data.success) return { ok: false, error: data.error || "删除失败。", status: response.status };
  return { ok: true, data: null };
}

export async function reorderLinksRequest(linkIds: string[]): Promise<ApiResult<null>> {
  const response = await fetch("/api/dashboard/links/reorder", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ linkIds }) });
  const data = await readJson<{ success?: boolean; error?: string }>(response);
  if (!response.ok || !data.success) return { ok: false, error: data.error || "排序保存失败。", status: response.status };
  return { ok: true, data: null };
}

export async function saveAppearanceRequest(theme: string, template: string): Promise<ApiResult<DashboardProfile>> {
  const response = await fetch("/api/dashboard/appearance", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme, template }) });
  const data = await readJson<{ success?: boolean; profile?: DashboardProfile; error?: string; message?: string; upgradeRequired?: boolean }>(response);
  if (!response.ok || !data.success || !data.profile) return { ok: false, error: data.error || "主题保存失败。", status: response.status, upgradeRequired: data.upgradeRequired };
  return { ok: true, data: data.profile, message: data.message };
}

export async function saveCustomThemeRequest(customTheme: unknown): Promise<ApiResult<DashboardProfile>> {
  const response = await fetch("/api/dashboard/appearance", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customTheme }) });
  const data = await readJson<{ success?: boolean; profile?: DashboardProfile; error?: string; message?: string; upgradeRequired?: boolean }>(response);
  if (!response.ok || !data.success || !data.profile) return { ok: false, error: data.error || "自定义主题保存失败。", status: response.status, upgradeRequired: data.upgradeRequired };
  return { ok: true, data: data.profile, message: data.message };
}

export async function saveProfileSettingsRequest(settings: { isPublic?: boolean; language?: string; contactVisibility?: string }): Promise<ApiResult<DashboardProfile>> {
  const response = await fetch("/api/dashboard/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
  const data = await readJson<{ success?: boolean; profile?: DashboardProfile; error?: string; message?: string }>(response);
  if (!response.ok || !data.success || !data.profile) return { ok: false, error: data.error || "设置保存失败。", status: response.status };
  return { ok: true, data: data.profile, message: data.message };
}

export async function fetchSessionsRequest(): Promise<ApiResult<DashboardSession[]>> {
  const response = await fetch("/api/auth/sessions", { cache: "no-store" });
  const data = await readJson<{ success?: boolean; sessions?: DashboardSession[]; error?: string }>(response);
  if (!response.ok || !data.success) return { ok: false, error: data.error || "登录设备加载失败。", status: response.status };
  return { ok: true, data: data.sessions || [] };
}

export async function resendVerificationRequest(): Promise<ApiResult<null>> {
  const response = await fetch("/api/auth/verify-email", { method: "POST" });
  const data = await readJson<{ success?: boolean; error?: string; message?: string }>(response);
  if (!response.ok || !data.success) return { ok: false, error: data.error || "验证码发送失败。", status: response.status };
  return { ok: true, data: null, message: data.message };
}

export async function changePasswordRequest(payload: { oldPassword: string; newPassword: string; confirmPassword: string; logoutOtherDevices: boolean }): Promise<ApiResult<null>> {
  const response = await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await readJson<{ success?: boolean; error?: string; message?: string }>(response);
  if (!response.ok || !data.success) return { ok: false, error: data.error || "密码修改失败。", status: response.status };
  return { ok: true, data: null, message: data.message };
}

export async function revokeSessionRequest(sessionId: string): Promise<ApiResult<null>> {
  const response = await fetch("/api/auth/sessions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) });
  const data = await readJson<{ success?: boolean; error?: string; message?: string }>(response);
  if (!response.ok || !data.success) return { ok: false, error: data.error || "退出设备失败。", status: response.status };
  return { ok: true, data: null, message: data.message };
}

export async function revokeOtherSessionsRequest(): Promise<ApiResult<null>> {
  const response = await fetch("/api/auth/sessions?action=all-others", { method: "DELETE" });
  const data = await readJson<{ success?: boolean; error?: string; message?: string }>(response);
  if (!response.ok || !data.success) return { ok: false, error: data.error || "退出其他设备失败。", status: response.status };
  return { ok: true, data: null, message: data.message };
}

export async function logoutRequest() {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
}

export async function deactivateAccountRequest(password: string): Promise<ApiResult<null>> {
  const response = await fetch("/api/auth/deactivate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const data = await readJson<{ success?: boolean; error?: string; message?: string }>(response);
  if (!response.ok || !data.success) return { ok: false, error: data.error || "注销失败。", status: response.status };
  return { ok: true, data: null, message: data.message };
}
