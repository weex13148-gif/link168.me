import ConsoleShell from "@/components/layout/ConsoleShell";
import DashboardV1Client from "@/components/dashboard-v1/DashboardV1Client";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <ConsoleShell
      eyebrow="Professional Card"
      title="专业名片"
      subtitle="填写业务资料、安排内容、预览手机效果并发布分享。"
    >
      <DashboardV1Client />
    </ConsoleShell>
  );
}
