"use client";

import { useCallback, useState, type FormEvent } from "react";
import type { DashboardLink, DashboardProfile, DashboardUser, SaveState } from "@/components/dashboard-v1/types";
import { isTemporaryUsername } from "@/components/dashboard-v1/types";
import { fetchDashboard, fetchPlan, saveAppearanceRequest, saveProfileRequest, uploadAvatarRequest, saveCustomThemeRequest, saveProfileSettingsRequest, deactivateAccountRequest, logoutRequest } from "@/components/dashboard-v1/dashboard-api";
import type { CustomTheme } from "@/components/theme/types";

async function compressAvatarImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.FileReader || !window.Image || !window.HTMLCanvasElement) {
      reject(new Error("Canvas not available"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }

        const targetSize = 512;
        let width = img.width;
        let height = img.height;
        let offsetX = 0;
        let offsetY = 0;

        if (width > height) {
          const ratio = targetSize / height;
          width = Math.round(width * ratio);
          height = targetSize;
          offsetX = Math.round((targetSize - width) / 2);
        } else {
          const ratio = targetSize / width;
          height = Math.round(height * ratio);
          width = targetSize;
          offsetY = Math.round((targetSize - height) / 2);
        }

        canvas.width = targetSize;
        canvas.height = targetSize;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, targetSize, targetSize);
        ctx.drawImage(img, offsetX, offsetY, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Canvas toBlob failed"));
              return;
            }
            const compressedFile = new File([blob], "avatar.jpg", { type: "image/jpeg" });
            resolve(compressedFile);
          },
          "image/jpeg",
          0.85,
        );
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

const emptyUser: DashboardUser = { email: "", emailVerified: false };

type PlanEntitlements = {
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
};

const emptyPlan: PlanEntitlements = {
  planCode: "free",
  planName: "免费版",
  planLabel: "免费版",
  status: "inactive",
  isPaid: false,
  isLegacyActive: false,
  isGracePeriod: false,
  gracePeriodDays: 0,
  daysRemaining: 0,
  currentPeriodStart: null,
  currentPeriodEnd: null,
  features: {},
  limits: {},
  customThemes: [],
  canUpgrade: true,
};

function withAvatarCacheBust(profile: DashboardProfile): DashboardProfile {
  if (!profile.avatar_url) return profile;
  const [base] = profile.avatar_url.split("?");
  const updatedAt = profile.updated_at ? new Date(profile.updated_at).getTime() : Number.NaN;
  const version = Number.isFinite(updatedAt) ? updatedAt : Date.now();
  return { ...profile, avatar_url: `${base}?v=${version}` };
}

export function useDashboardCore({ onUnauthorized, onLinksLoaded, onUpgrade, showToast }: {
  onUnauthorized: () => void;
  onLinksLoaded: (links: DashboardLink[]) => void;
  onUpgrade: () => void;
  showToast: (message: string, tone?: "success" | "error") => void;
}) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [user, setUser] = useState<DashboardUser>(emptyUser);
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [planCode, setPlanCode] = useState("free");
  const [planEntitlements, setPlanEntitlements] = useState<PlanEntitlements>(emptyPlan);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [appearanceSaving, setAppearanceSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const dashboard = await fetchDashboard();
      if (!dashboard.ok) {
        if (dashboard.status === 401) onUnauthorized();
        else setLoadError(dashboard.error);
        return;
      }
      const result = dashboard.data;
      const nextProfile = result.profile ? withAvatarCacheBust(result.profile) : null;
      setUser({ id: result.user?.id, email: result.user?.email || "", emailVerified: Boolean(result.user?.emailVerified), role: result.user?.role });
      setProfile(nextProfile);
      setUsername(nextProfile && !isTemporaryUsername(nextProfile.username) ? nextProfile.username : "");
      setDisplayName(nextProfile?.display_name || "");
      setBio(nextProfile?.bio || "");
      onLinksLoaded(result.links || []);
      setSaveState("saved");
      const plan = await fetchPlan();
      if (plan.ok) {
        setPlanCode(plan.data.planCode);
        setPlanEntitlements(plan.data);
      }
    } catch {
      setLoadError("网络连接失败，无法加载用户后台。");
    } finally {
      setLoading(false);
    }
  }, [onLinksLoaded, onUnauthorized]);

  function markDirty() { setSaveState((current) => current === "saving" ? current : "dirty"); }

  const saveProfile = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if ((!profile || isTemporaryUsername(profile.username)) && !username.trim()) { showToast("请先设置公开主页地址。", "error"); return; }
    setSaveState("saving");
    try {
      const result = await saveProfileRequest({ username, displayName, bio });
      if (!result.ok) { setSaveState("error"); showToast(result.error, "error"); return; }
      const nextProfile = withAvatarCacheBust(result.data);
      setProfile(nextProfile);
      setUsername(nextProfile.username);
      setDisplayName(nextProfile.display_name || "");
      setBio(nextProfile.bio || "");
      setSaveState("saved");
      showToast("名片资料已保存。");
    } catch {
      setSaveState("error");
      showToast("资料保存失败，请稍后重试。", "error");
    }
  }, [bio, displayName, profile, showToast, username]);

  const uploadAvatar = useCallback(async (file: File | null) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast("头像图片不能超过 2MB。", "error"); return; }
    if (!file.type.startsWith("image/")) { showToast("请选择图片文件。", "error"); return; }

    setUploadingAvatar(true);
    setSaveState("saving");
    try {
      let uploadFile = file;
      try {
        uploadFile = await compressAvatarImage(file);
      } catch {
        uploadFile = file;
      }

      const result = await uploadAvatarRequest(uploadFile);
      if (!result.ok) { setSaveState("error"); showToast(result.error, "error"); return; }
      const nextProfile = withAvatarCacheBust(result.data);
      setProfile(nextProfile);
      setUsername(nextProfile.username);
      setDisplayName(nextProfile.display_name || "");
      setBio(nextProfile.bio || "");
      setSaveState("saved");
      showToast("头像已更新，并已同步到预览和公开主页。");
    } catch {
      setSaveState("error");
      showToast("头像上传失败，请稍后重试。", "error");
    } finally {
      setUploadingAvatar(false);
    }
  }, [showToast]);

  const saveAppearance = useCallback(async (theme: string, template: string) => {
    setAppearanceSaving(true);
    setSaveState("saving");
    try {
      const result = await saveAppearanceRequest(theme, template);
      if (!result.ok) { setSaveState("error"); if (result.upgradeRequired) onUpgrade(); showToast(result.error, "error"); return false; }
      setProfile(withAvatarCacheBust(result.data));
      setSaveState("saved");
      showToast("主题和布局已保存。");
      return true;
    } catch {
      setSaveState("error");
      showToast("主题保存失败，请稍后重试。", "error");
      return false;
    } finally {
      setAppearanceSaving(false);
    }
  }, [onUpgrade, showToast]);

  const saveCustomTheme = useCallback(async (customTheme: CustomTheme) => {
    setAppearanceSaving(true);
    setSaveState("saving");
    try {
      const result = await saveCustomThemeRequest(customTheme);
      if (!result.ok) { setSaveState("error"); if (result.upgradeRequired) onUpgrade(); showToast(result.error, "error"); return false; }
      setProfile(withAvatarCacheBust(result.data));
      setSaveState("saved");
      showToast("自定义主题已保存。");
      return true;
    } catch {
      setSaveState("error");
      showToast("自定义主题保存失败，请稍后重试。", "error");
      return false;
    } finally {
      setAppearanceSaving(false);
    }
  }, [onUpgrade, showToast]);

  const saveProfileSettings = useCallback(async (settings: { isPublic?: boolean; language?: string; contactVisibility?: string }) => {
    setAppearanceSaving(true);
    setSaveState("saving");
    try {
      const result = await saveProfileSettingsRequest(settings);
      if (!result.ok) { setSaveState("error"); showToast(result.error, "error"); return false; }
      setProfile(withAvatarCacheBust(result.data));
      setSaveState("saved");
      showToast("设置已保存。");
      return true;
    } catch {
      setSaveState("error");
      showToast("设置保存失败，请稍后重试。", "error");
      return false;
    } finally {
      setAppearanceSaving(false);
    }
  }, [showToast]);

  const refreshEntitlements = useCallback(async () => {
    try {
      const plan = await fetchPlan();
      if (plan.ok) {
        setPlanCode(plan.data.planCode);
        setPlanEntitlements(plan.data);
      }
    } catch {
      // 静默失败，不干扰用户操作
    }
  }, []);

  const deactivateAccount = useCallback(async (password: string) => {
    setDeactivating(true);
    try {
      const result = await deactivateAccountRequest(password);
      if (!result.ok) {
        showToast(result.error || "注销失败，请检查密码。", "error");
        return false;
      }
      showToast("账号已注销，正在退出…");
      await logoutRequest();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return true;
    } catch {
      showToast("注销失败，请稍后重试。", "error");
      return false;
    } finally {
      setDeactivating(false);
    }
  }, [showToast]);

  return {
    loading, loadError, user, profile, planCode, planEntitlements,
    username, displayName, bio, saveState, uploadingAvatar, appearanceSaving, deactivating,
    setUsername, setDisplayName, setBio, setSaveState,
    load, markDirty, saveProfile, uploadAvatar, saveAppearance, saveCustomTheme, saveProfileSettings,
    refreshEntitlements, deactivateAccount,
  };
}
