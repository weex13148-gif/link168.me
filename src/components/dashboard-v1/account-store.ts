"use client";

import { useCallback, useState } from "react";
import type { DashboardSession } from "@/components/dashboard-v1/types";
import {
  changePasswordRequest,
  fetchSessionsRequest,
  resendVerificationRequest,
  revokeOtherSessionsRequest,
  revokeSessionRequest,
} from "@/components/dashboard-v1/dashboard-api";

export function useAccountState(showToast: (message: string, tone?: "success" | "error") => void) {
  const [sessions, setSessions] = useState<DashboardSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const result = await fetchSessionsRequest();
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      setSessions(result.data);
      setSessionsLoaded(true);
    } catch {
      showToast("登录设备加载失败。", "error");
    } finally {
      setSessionsLoading(false);
    }
  }, [showToast]);

  const resendEmail = useCallback(async () => {
    setResendingEmail(true);
    try {
      const result = await resendVerificationRequest();
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      showToast(result.message || "验证码已发送，请检查邮箱。");
    } catch {
      showToast("验证码发送失败，请稍后重试。", "error");
    } finally {
      setResendingEmail(false);
    }
  }, [showToast]);

  const changePassword = useCallback(async (payload: { oldPassword: string; newPassword: string; confirmPassword: string; logoutOtherDevices: boolean }) => {
    setPasswordSaving(true);
    try {
      const result = await changePasswordRequest(payload);
      if (!result.ok) {
        showToast(result.error, "error");
        return false;
      }
      showToast(result.message || "密码修改成功。");
      setSessionsLoaded(false);
      void loadSessions();
      return true;
    } catch {
      showToast("密码修改失败，请稍后重试。", "error");
      return false;
    } finally {
      setPasswordSaving(false);
    }
  }, [loadSessions, showToast]);

  const revokeSession = useCallback(async (sessionId: string) => {
    try {
      const result = await revokeSessionRequest(sessionId);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      setSessions((current) => current.filter((item) => item.id !== sessionId));
      showToast(result.message || "该设备已退出。");
    } catch {
      showToast("退出设备失败。", "error");
    }
  }, [showToast]);

  const revokeOthers = useCallback(async () => {
    try {
      const result = await revokeOtherSessionsRequest();
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      setSessions((current) => current.filter((item) => item.isCurrent));
      showToast(result.message || "其他设备已退出。");
    } catch {
      showToast("退出其他设备失败。", "error");
    }
  }, [showToast]);

  return {
    sessions,
    sessionsLoading,
    sessionsLoaded,
    resendingEmail,
    passwordSaving,
    loadSessions,
    resendEmail,
    changePassword,
    revokeSession,
    revokeOthers,
  };
}
