import { redirect } from "next/navigation";
import WorkbenchShell from "@/components/workbench/WorkbenchShell";
import ReceptionConfigClient from "@/components/ai/ReceptionConfigClient";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { db } from "@/lib/db";
import { toCustomerAiReceptionConfig } from "@/lib/ai/reception-config";

export const runtime = "nodejs";

export default async function WorkbenchAiPage() {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect("/login");

  const [config, profile, productCount] = await Promise.all([
    db.aiServiceConfig.findUnique({
      where: { userId: user.id },
    }),
    db.profile.findUnique({
      where: { userId: user.id },
      select: { username: true },
    }),
    db.product.count({
      where: { userId: user.id, isActive: true },
    }),
  ]);

  return (
    <WorkbenchShell
      eyebrow="AI Reception"
      title="AI 接待"
      subtitle="配置免费预设回复或符合权益的真实 AI 接待；资料不足时引导访客直接联系或留下需求。"
    >
      <ReceptionConfigClient
        initialConfig={toCustomerAiReceptionConfig(config)}
        profileUsername={profile?.username || null}
        productCount={productCount}
      />
    </WorkbenchShell>
  );
}
