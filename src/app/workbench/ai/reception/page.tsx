/**
 * 公开名片访客 AI 接待配置页面
 * 配置 AiServiceConfig（访客侧 AI 客服）
 */
import { redirect } from "next/navigation";
import WorkbenchShell from "@/components/workbench/WorkbenchShell";
import ReceptionConfigClient from "@/components/ai/ReceptionConfigClient";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { db } from "@/lib/db";
import { toCustomerAiReceptionConfig } from "@/lib/ai/reception-config";

export const runtime = "nodejs";

export default async function AiReceptionPage() {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect("/login");

  const [config, profile, productCount] = await Promise.all([
    db.aiServiceConfig.findUnique({ where: { userId: user.id } }),
    db.profile.findUnique({
      where: { userId: user.id },
      select: { id: true, username: true, displayName: true },
    }),
    db.product.count({ where: { userId: user.id, status: "published" } }),
  ]);

  return (
    <WorkbenchShell
      eyebrow="AI Reception"
      title="访客 AI 接待"
      subtitle="配置公开名片的 AI 客服，自动接待访客咨询，引导留资，转化客户线索。"
    >
      <ReceptionConfigClient
        initialConfig={toCustomerAiReceptionConfig(config)}
        profileUsername={profile?.username || null}
        productCount={productCount}
      />
    </WorkbenchShell>
  );
}
