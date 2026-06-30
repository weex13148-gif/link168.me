"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { Loader2, Monitor, Smartphone, Globe, LogOut, CheckCircle2 } from "lucide-react";

type Session = {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActive: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

function formatDateTime(isoString: string) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

function getDeviceIcon(device: string) {
  if (device.includes("iPhone") || device.includes("iPad") || device.includes("安卓")) {
    return <Smartphone aria-hidden className="size-5 text-[#6F8F4E]" />;
  }
  if (device.includes("Windows") || device.includes("Mac") || device.includes("Linux")) {
    return <Monitor aria-hidden className="size-5 text-[#6F8F4E]" />;
  }
  return <Globe aria-hidden className="size-5 text-[#6F8F4E]" />;
}

export default function AccountSessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void fetchSessions();
  }, []);

  async function fetchSessions() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/sessions");
      const result = (await response.json()) as {
        success?: boolean;
        sessions?: Session[];
        error?: string;
      };
      if (!response.ok || !result.success) {
        setError(result.error || "获取会话列表失败。");
        return;
      }
      setSessions(result.sessions || []);
    } catch {
      setError("网络错误，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevokeSession(sessionId: string) {
    setRevoking(sessionId);
    setMessage("");
    try {
      const response = await fetch("/api/auth/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
        message?: string;
      };
      if (!response.ok || !result.success) {
        setError(result.error || "退出失败，请稍后重试。");
        return;
      }
      setMessage("已退出该设备。");
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      setError("网络错误，请稍后重试。");
    } finally {
      setRevoking(null);
    }
  }

  async function handleRevokeAllOthers() {
    setRevokingAll(true);
    setMessage("");
    try {
      const url = new URL("/api/auth/sessions", window.location.origin);
      url.searchParams.set("action", "all-others");
      const response = await fetch(url, { method: "DELETE" });
      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
        message?: string;
      };
      if (!response.ok || !result.success) {
        setError(result.error || "退出失败，请稍后重试。");
        return;
      }
      setMessage(result.message || "已退出所有其他设备。");
      setSessions((prev) => prev.filter((s) => s.isCurrent));
    } catch {
      setError("网络错误，请稍后重试。");
    } finally {
      setRevokingAll(false);
    }
  }

  const currentSession = sessions.find((s) => s.isCurrent);
  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <main className="relative mx-auto min-h-dvh overflow-hidden px-4 py-6">
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(135deg,#FFFDF8_0%,#F7F1E7_55%,#F2E7D8_100%)]" />
      <div className="absolute left-[-90px] top-24 -z-10 size-48 rounded-full bg-[#DDE8CD]/70 blur-3xl" />
      <div className="absolute bottom-16 right-[-80px] -z-10 size-56 rounded-full bg-[#F2E7D8]/80 blur-3xl" />

      <div className="mx-auto max-w-lg">
        <BrandLogo size="header" />

        <div className="mt-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-[#2B241E]">登录设备</h1>
            <p className="mt-1 text-sm text-[#7A6D5E]">管理你账号的登录状态</p>
          </div>
          <Link
            href="/account/security"
            className="link168-button-press inline-flex min-h-10 items-center justify-center rounded-full border border-[#E8DCCB] bg-[#FFFDF8] px-4 font-black text-[#3F5F31] shadow-sm hover:bg-[#F7F1E7]"
          >
            修改密码
          </Link>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl bg-[#FFF1F0] px-4 py-3 text-sm font-bold text-[#B42318]">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mt-6 rounded-2xl bg-[#DDE8CD] px-4 py-3 text-sm font-bold text-[#3F5F31]">
            {message}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-12 flex flex-col items-center gap-3 text-[#7A6D5E]">
            <Loader2 aria-hidden className="size-8 animate-spin" />
            <p className="text-sm">加载中...</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {currentSession && (
              <section className="rounded-2xl border border-[#6F8F4E]/40 bg-[#DDE8CD]/40 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 aria-hidden className="size-4 text-[#6F8F4E]" />
                  <span className="text-xs font-black text-[#3F5F31]">当前设备</span>
                </div>
                <div className="mt-3 flex items-start gap-3">
                  {getDeviceIcon(currentSession.device)}
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-[#2B241E]">
                      {currentSession.device} · {currentSession.browser}
                    </p>
                    <p className="mt-0.5 text-xs text-[#7A6D5E]">
                      {currentSession.location !== "未知位置" ? currentSession.location : "位置未知"} · 最后活跃 {formatDateTime(currentSession.lastActive)}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {otherSessions.length > 0 && (
              <>
                <div className="mt-6 flex items-center justify-between">
                  <h2 className="text-lg font-black text-[#2B241E]">
                    其他设备（{otherSessions.length}）
                  </h2>
                  <button
                    type="button"
                    disabled={revokingAll}
                    onClick={() => void handleRevokeAllOthers()}
                    className="link168-button-press flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black text-[#B42318] transition hover:bg-[#FFF1F0] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {revokingAll ? (
                      <Loader2 aria-hidden className="size-3.5 animate-spin" />
                    ) : (
                      <LogOut aria-hidden className="size-3.5" />
                    )}
                    退出全部
                  </button>
                </div>

                <div className="grid gap-3">
                  {otherSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-[#E8DCCB] bg-[#FFFDF8]/80 p-4"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {getDeviceIcon(session.device)}
                        <div className="min-w-0">
                          <p className="font-black text-[#2B241E]">
                            {session.device} · {session.browser}
                          </p>
                          <p className="mt-0.5 text-xs text-[#7A6D5E]">
                            {session.location !== "未知位置" ? session.location : "位置未知"} · 最后活跃 {formatDateTime(session.lastActive)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={revoking === session.id}
                        onClick={() => void handleRevokeSession(session.id)}
                        className="link168-button-press shrink-0 flex items-center gap-1.5 rounded-full border border-[#E8DCCB] bg-[#FFFDF8] px-3 py-1.5 text-xs font-black text-[#7A6D5E] transition hover:border-[#B42318] hover:text-[#B42318] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {revoking === session.id ? (
                          <Loader2 aria-hidden className="size-3.5 animate-spin" />
                        ) : (
                          <LogOut aria-hidden className="size-3.5" />
                        )}
                        退出
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {sessions.length === 0 && !loading && (
              <div className="mt-12 flex flex-col items-center gap-3 text-[#7A6D5E]">
                <Monitor aria-hidden className="size-12 text-[#E8DCCB]" />
                <p className="text-sm">暂无其他登录设备</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/dashboard" className="text-sm font-black text-[#3F5F31]">
            返回后台
          </Link>
        </div>
      </div>
    </main>
  );
}
