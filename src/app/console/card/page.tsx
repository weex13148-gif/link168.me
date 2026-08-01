import DashboardV1Client from "@/components/dashboard-v1/DashboardV1Client";
import ConsoleShell from "@/components/layout/ConsoleShell";

export default function ConsoleCardPage() {
  return <ConsoleShell eyebrow="经营名片" title="编辑名片" subtitle="资料、链接、预览与发布统一在这里完成。"><DashboardV1Client /></ConsoleShell>;
}
