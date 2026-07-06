export type NotificationType = "lead" | "payment" | "membership" | "workspace" | "system";

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
};

export type NotificationSummary = {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
};
