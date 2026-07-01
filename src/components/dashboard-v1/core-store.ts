"use client";

import { useCallback, useState, type FormEvent } from "react";
import type { DashboardLink, DashboardProfile, DashboardUser, SaveState } from "@/components/dashboard-v1/types";
import { isTemporaryUsername } from "@/components/dashboard-v1/types";
import { fetchDashboard, fetchPlan, saveAppearanceRequest, saveProfileRequest, uploadAvatarRequest } from "@/components/dashboard-v1/dashboard-api";

const emptyUser: DashboardUser = { email: "", emailVerified: false };

export function useDashboardCore({
  onUnauthorized,
  onLinksLoaded,
  onUpgrade,
  showToast,
}: {
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
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [appearanceSaving, setAppearanceSaving] = useState(false);

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
      const nextProfile = result.profile || null;
      setUser({
        id: result.user?.id,
        email: result.user?.email || "",
        emailVerified: Boolean(result.user?.emailVerified),
        role: result.user?.role,
      });
      setProfile(nextProfile);
      setUsername(nextProfile && !isTemporaryUsername(nextProfile.username) ? nextProfile.username : "");
      setDisplayName(nextProfile?.display_name || "");
      setBio(nextProfile?.bio || "");
      onLinksLoaded(result.links || []);
      setSaveState("saved");

      const plan = await fetchPlan();
      if (plan.ok) setPlanCode(plan.data.planCode);
    } catch {
      setLoadError("网络连接失败，无法加载用户后台。");
    } finally {
      setLoading(false);
    }
  }, [onLinksLoaded, onUnauthorized]);

  function markDirty() {
    setSaveState((current) => current === "saving" ? current : "dirty");
  }

  const saveProfile = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if ((!profile || isTemporaryUsername(profile.username)) && !username.trim()) {
      showToast("请先设置公开主页地址。", "error");
      return;
    }
    setSaveState("saving");
    try {
      const result = await saveProfileRequest({ username, displayName, bio });
      if (!result.ok) {
        setSaveState("error");
        showToast(result.error, "error");
        return;
      }
      setProfile(result.data);
      setUsername(result.data.username);
      setDisplayName(result.data.display_name || "");
      setBio(result.data.bio || "");
      setSaveState("saved");
      showToast("名片资料已保存。");
    } catch {
      setSaveState("error");
      showToast("资料保存失败，请稍后重试。", "error");
    }
  }, [bio, displayName, profile, showToast, username]);

  const uploadAvatar = useCallback(async (file: File | null) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("头像图片不能超过 2MB。", "error");
      return;
    }
    if (!file.type.startsWith("image/")) {
      showToast("请选择图片文件。", "error");
      return;
    }

    setUploadingAvatar(true);
    try {
      const result = await uploadAvatarRequest(file);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      setProfile(result.data);
      showToast("头像已更新。");
    } catch {
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
      if (!result.ok) {
        setSaveState("error");
        if (result.upgradeRequired) onUpgrade();
        showToast(result.error, "error");
        return false;
      }
      setProfile(result.data);
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

  return {
    loading,
    loadError,
    user,
    profile,
    planCode,
    username,
    displayName,
    bio,
    saveState,
    uploadingAvatar,
    appearanceSaving,
    setUsername,
    setDisplayName,
    setBio,
    setSaveState,
    load,
    markDirty,
    saveProfile,
    uploadAvatar,
    saveAppearance,
  };
}
