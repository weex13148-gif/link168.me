"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function NotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadUnread();
  }, []);

  async function loadUnread() {
    try {
      const res = await fetch("/api/notifications?summary=true");
      const data = await res.json();
      if (data?.success && data.data) {
        setUnreadCount(data.data.unread || 0);
      }
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  }

  function handleClick() {
    router.push("/console/notifications");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--ui-surface-muted)] text-[var(--ui-ink)] transition hover:bg-[var(--ui-line)]"
      aria-label="通知中心"
    >
      <Bell className="size-5" />
      {!loading && unreadCount > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--ui-danger)] px-1 text-[10px] font-black text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </button>
  );
}
