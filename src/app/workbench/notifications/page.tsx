import { redirect } from "next/navigation";
import { getCurrentUserFromCookies } from "@/lib/auth";
import WorkbenchShell from "@/components/workbench/WorkbenchShell";
import { NotificationsClient } from "@/components/notifications/NotificationsClient";

export default async function WorkbenchNotificationsPage() {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect("/login");

  return (
    <WorkbenchShell
      eyebrow="Notifications"
      title="通知中心"
      subtitle="查看系统消息、客户线索、支付和会员相关的所有通知。"
    >
      <NotificationsClient />
    </WorkbenchShell>
  );
}
