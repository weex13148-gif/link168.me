"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Inbox, MessageSquare, CreditCard, Crown, Users, Settings, ArrowLeft, Loader2 } from "lucide-react";
import type { Notification, NotificationType } from "@/lib/notifications/types";

type NotificationsClientProps = {
  initialType?: NotificationType | "all";
};

const typeConfig: Record<NotificationType, { label: string; icon: typeof Bell; tone: string; dotColor: string }> = {
  lead: { label: "客户线索", icon: MessageSquare, tone: "bg-[#FFE6E2] text-[#B42318]", dotColor: "bg-[#B42318]" },
  payment: { label: "支付通知", icon: CreditCard, tone: "bg-[#E8E6FF] text-[#3D48B8]", dotColor: "bg-[#3D48B8]" },
  membership: { label: "会员通知", icon: Crown, tone: "bg-[#F6E7C8] text-[#8C612E]", dotColor: "bg-[#8C612E]" },
  workspace: { label: "工作空间", icon: Users, tone: "bg-[#EAF3FF] text-[#2563EB]", dotColor: "bg-[#2563EB]" },
  system: { label: "系统通知", icon: Settings, tone: "bg-[#F7F1E7] text-[#3F5F31]", dotColor: "bg-[#3F5F31]" },
};

const filterTabs: Array<{ key: NotificationType | "all"; label: string }> = [
  { key: "all", label: "全部" },
  { key: "lead", label: "线索" },
  { key: "payment", label: "支付" },
  { key: "membership", label: "会员" },
  { key: "system", label: "系统" },
];

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

export function NotificationsClient({ initialType = "all" }: NotificationsClientProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<NotificationType | "all">(initialType);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    void loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  async function loadNotifications() {
    setLoading(true);
    try {
      const url = activeFilter === "all"
        ? "/api/notifications"
        : `/api/notifications?type=${activeFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data?.success) {
        setNotifications(data.data || []);
      }
      const summaryRes = await fetch("/api/notifications?summary=true");
      const summaryData = await summaryRes.json();
      if (summaryData?.success) {
        setUnreadCount(summaryData.data.unread || 0);
      }
    } catch {
      // 静默失败
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsRead(id: string, actionUrl?: string) {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // 静默失败
    }
    if (actionUrl) {
      router.push(actionUrl);
    }
  }

  async function handleMarkAllAsRead() {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // 静默失败
    } finally {
      setMarkingAll(false);
    }
  }

  const filteredNotifications = activeFilter === "all"
    ? notifications
    : notifications.filter((n) => n.type === activeFilter);

  return (
    <div className="space-y-5">
      {/* 移动端顶部栏 */}
      <div className="flex items-center justify-between sm:hidden">
        <button
          type="button"
          onClick={() => router.back()}
          className="grid size-10 place-items-center rounded-xl bg-white text-[#2B241E]"
          aria-label="返回"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h2 className="text-base font-black text-[#2B241E]">通知中心</h2>
        <div className="size-10" />
      </div>

      {/* 统计卡片 */}
      <div className="rounded-[24px] border border-[#E8DCCB] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-[#F6E7C8] text-[#8C612E]">
              <Bell className="size-6" />
            </span>
            <div>
              <p className="text-sm text-[#7A6D5E]">未读通知</p>
              <p className="text-2xl font-black text-[#2B241E]">{unreadCount} 条</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={markingAll || unreadCount === 0}
            className="flex items-center gap-1.5 rounded-xl bg-[#F7F1E7] px-3 py-2 text-xs font-black text-[#3F5F31] transition hover:bg-[#E8DCCB] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {markingAll ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
            全部已读
          </button>
        </div>

        {/* 分类标签 */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 sm:gap-3">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveFilter(tab.key)}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-black transition ${
                activeFilter === tab.key
                  ? "bg-[#6F8F4E] text-white shadow-sm shadow-[#6F8F4E]/20"
                  : "bg-[#F7F1E7] text-[#5F5347] hover:bg-[#E8DCCB]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 通知列表 */}
      <div className="rounded-[24px] border border-[#E8DCCB] bg-white shadow-sm">
        {loading ? (
          <div className="grid place-items-center py-16">
            <div className="flex items-center gap-3 text-sm font-bold text-[#7A6D5E]">
              <Loader2 className="size-5 animate-spin text-[#6F8F4E]" />
              正在加载通知…
            </div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="grid place-items-center py-16 px-6 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-[#F7F1E7] text-[#9A8F7E]">
              <Inbox className="size-8" />
            </span>
            <h3 className="mt-4 text-lg font-black text-[#2B241E]">暂无通知</h3>
            <p className="mt-2 text-sm text-[#7A6D5E]">
              {activeFilter === "all" ? "你还没有收到任何通知。" : `暂无${typeConfig[activeFilter as NotificationType]?.label || ""}相关通知。`}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#F0E8DA]">
            {filteredNotifications.map((notification) => {
              const config = typeConfig[notification.type];
              const Icon = config.icon;
              return (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => void handleMarkAsRead(notification.id, notification.actionUrl)}
                    className={`flex w-full gap-3 p-4 text-left transition hover:bg-[#FFF9EF] sm:p-5 ${
                      !notification.read ? "bg-[#FFFDF8]" : ""
                    }`}
                  >
                    <span className={`relative grid size-10 shrink-0 place-items-center rounded-xl ${config.tone}`}>
                      <Icon className="size-5" />
                      {!notification.read ? (
                        <span className={`absolute -right-0.5 -top-0.5 size-2.5 rounded-full ${config.dotColor} ring-2 ring-white`} />
                      ) : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`truncate text-sm ${!notification.read ? "font-black text-[#2B241E]" : "font-bold text-[#5F5347]"}`}>
                          {notification.title}
                        </p>
                        <span className="shrink-0 text-xs text-[#9A8F7E]">
                          {formatTime(notification.createdAt as unknown as string)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#7A6D5E]">
                        {notification.content}
                      </p>
                      {notification.actionUrl ? (
                        <p className="mt-2 text-xs font-black text-[#6F8F4E]">
                          查看详情 →
                        </p>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
