"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminUsersClient from "@/components/admin/AdminUsersClient";
import AdminUsersDesktopTable from "@/components/admin/AdminUsersDesktopTable";
import AdminShell from "@/components/admin/AdminShell";
import { useJeepworkLogout } from "@/components/admin/useJeepworkLogout";

type AdminUser = { email: string; role: string };

export default function JeepworkUsersPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const logout = useJeepworkLogout(router);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/jeepwork/auth/me", { cache: "no-store" });
        const result = await response.json() as { success?: boolean; user?: AdminUser };
        if (!response.ok || !result.success || !result.user) {
          if (!cancelled) router.replace("/jeepwork/login");
          return;
        }
        if (result.user.role !== "super_admin") {
          if (!cancelled) router.replace("/jeepwork/login");
          return;
        }
        if (!cancelled) setUser(result.user);
      } catch {
        if (!cancelled) router.replace("/jeepwork/login");
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <AdminShell
      currentPageLabel="用户与会员"
      currentUserEmail={user?.email}
      currentUserRole={user?.role}
      onLogout={logout.open}
      pageHeader={{
        eyebrow: "客户与会员",
        title: "用户与会员管理",
        subtitle: user?.role === "super_admin"
          ? "搜索客户，手动开通、续期、调整或注销会员；超级管理员还可以进入高级区域处理角色、冻结、封禁和批量操作。"
          : "搜索普通客户，手动开通、续期、调整或注销会员。所有会员操作都会写入审计日志。",
        highlight: "#5B6FFF",
      }}
    >
      <div className="grid gap-6">
        <AdminUsersDesktopTable currentUserRole={user?.role} />

        {user?.role === "super_admin" ? (
          <details id="advanced-user-management" className="rounded-[24px] border border-[#E8DCCB] bg-white shadow-sm">
            <summary className="cursor-pointer list-none px-5 py-4 text-sm font-black text-[#2B241E] marker:hidden">
              超级管理员高级区：角色、冻结、封禁、批量导出
              <span className="ml-2 text-xs font-bold text-[#7A6D5E]">点击展开</span>
            </summary>
            <div className="border-t border-[#E8DCCB] p-5">
              <AdminUsersClient currentUserEmail={user?.email} />
            </div>
          </details>
        ) : null}
      </div>
      {logout.Modal}
    </AdminShell>
  );
}
