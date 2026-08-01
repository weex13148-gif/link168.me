import crypto from "crypto";
import type { Notification, NotificationType, NotificationSummary } from "./types";

const notificationsByUser = new Map<string, Notification[]>();

function generateId(): string {
  return crypto.randomUUID();
}

export function getNotifications(userId: string, type?: NotificationType): Notification[] {
  const list = notificationsByUser.get(userId) || [];
  let result = list;
  if (type) {
    result = list.filter((n) => n.type === type);
  }
  return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getUnreadCount(userId: string): number {
  const list = notificationsByUser.get(userId) || [];
  return list.filter((n) => !n.read).length;
}

export function getNotificationSummary(userId: string): NotificationSummary {
  const list = notificationsByUser.get(userId) || [];
  const byType: Record<NotificationType, number> = {
    lead: 0,
    payment: 0,
    membership: 0,
    workspace: 0,
    system: 0,
  };
  let unread = 0;
  for (const n of list) {
    byType[n.type] = (byType[n.type] || 0) + 1;
    if (!n.read) unread++;
  }
  return {
    total: list.length,
    unread,
    byType,
  };
}

export function createNotification(
  userId: string,
  data: {
    type: NotificationType;
    title: string;
    content: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
  },
): Notification {
  const notification: Notification = {
    id: generateId(),
    userId,
    type: data.type,
    title: data.title,
    content: data.content,
    read: false,
    createdAt: new Date(),
    actionUrl: data.actionUrl,
    metadata: data.metadata,
  };

  const list = notificationsByUser.get(userId) || [];
  list.unshift(notification);
  notificationsByUser.set(userId, list);

  return notification;
}

export function markAsRead(userId: string, notificationId: string): boolean {
  const list = notificationsByUser.get(userId) || [];
  const n = list.find((item) => item.id === notificationId);
  if (!n) return false;
  n.read = true;
  return true;
}

export function markAllAsRead(userId: string): number {
  const list = notificationsByUser.get(userId) || [];
  let count = 0;
  for (const n of list) {
    if (!n.read) {
      n.read = true;
      count++;
    }
  }
  return count;
}
