"use client";

/**
 * useJeepworkLogout — 统一 Jeepwork 后台退出登录交互
 *
 * 替换 18 个页面中各自重复的 window.confirm + fetch /logout + router.replace 模式。
 *
 * 用法：
 *   const logout = useJeepworkLogout(router);
 *   // AdminShell:
 *   onLogout={logout.open}
 *   // 在页面底部渲染：
 *   <logout.Modal />
 *
 * 不修改认证 Cookie、登录 API 或角色判断。
 */

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { ConfirmModal } from "@/components/admin/ConfirmModal";

export function useJeepworkLogout(router: ReturnType<typeof useRouter>) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const openModal = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => setOpen(false), []);

  const confirmLogout = useCallback(async () => {
    setLoading(true);
    try {
      await fetch("/api/jeepwork/auth/logout", { method: "POST" }).catch(() => undefined);
    } finally {
      setLoading(false);
      router.replace("/jeepwork/login");
      router.refresh();
    }
  }, [router]);

  const Modal = (
    <ConfirmModal
      isOpen={open}
      onClose={closeModal}
      onConfirm={confirmLogout}
      loading={loading}
      title="退出管理员后台"
      description="确定要退出当前管理员会话吗？退出后需要重新登录才能继续操作后台。"
      dangerLevel="warn"
    />
  );

  return {
    open: openModal,
    close: closeModal,
    Modal,
  };
}
