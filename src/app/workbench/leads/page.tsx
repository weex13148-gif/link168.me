/**
 * Workbench Leads 页面（服务端数据获取 + 客户端交互）
 */
import { redirect } from "next/navigation";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { db } from "@/lib/db";
import WorkbenchShell from "@/components/workbench/WorkbenchShell";
import LeadsClient from "@/components/workbench/LeadsClient";

const HISTORICAL_STATUSES = ["contacted", "following", "converted", "qualified", "lost"] as const;
function isHistoricalStatus(status: string): boolean {
  return HISTORICAL_STATUSES.includes(status as typeof HISTORICAL_STATUSES[number]);
}

export default async function WorkbenchLeadsPage() {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect("/login");

  const profile = await db.profile.findUnique({ where: { userId: user.id } });
  if (!profile) redirect("/dashboard");

  const [leads, stats] = await Promise.all([
    db.lead.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        interestedProduct: {
          select: {
            id: true,
            name: true,
            category: true,
            priceText: true,
            isActive: true,
          },
        },
        followUps: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    }),
    Promise.all([
      db.lead.count({ where: { profileId: profile.id } }),
      db.lead.count({ where: { profileId: profile.id, status: "new" } }),
      db.lead.count({ where: { profileId: profile.id, status: "viewed" } }),
      db.lead.count({ where: { profileId: profile.id, status: "following_up" } }),
      db.lead.count({ where: { profileId: profile.id, status: "won" } }),
      db.lead.count({ where: { profileId: profile.id, status: "closed" } }),
      // 历史状态兼容统计
      db.lead.count({ where: { profileId: profile.id, status: "contacted" } }),
      db.lead.count({ where: { profileId: profile.id, status: "following" } }),
      db.lead.count({ where: { profileId: profile.id, status: "converted" } }),
      db.lead.count({ where: { profileId: profile.id, status: "qualified" } }),
      db.lead.count({ where: { profileId: profile.id, status: "lost" } }),
    ]).then(([total, newCount, viewed, followingUp, won, closed, contacted, following, converted, qualified, lost]) => ({
      total,
      new: newCount,
      viewed,
      following_up: followingUp,
      won,
      closed,
      historical: {
        contacted,
        following,
        converted,
        qualified,
        lost,
      },
    })),
  ]);

  // DTO 转换（与 API 保持一致）
  const leadsDto = leads.map((lead) => ({
    id: lead.id,
    profile_id: lead.profileId,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    message: lead.message,
    source_component: lead.sourceComponent,
    source_page: lead.sourcePage,
    status: lead.status,
    is_historical_status: isHistoricalStatus(lead.status),
    status_is_legacy: false,
    handler_note: lead.handlerNote,
    handled_at: lead.handledAt ? lead.handledAt.toISOString() : null,
    wechat: lead.wechat,
    interested_product_id: lead.interestedProductId,
    interested_product_name: lead.interestedProductName,
    interested_product_price: lead.interestedProductPrice,
    interested_product_category: lead.interestedProductCategory,
    product_snapshot_status: (lead.interestedProduct
      ? (lead.interestedProduct.isActive ? "active" : "inactive")
      : lead.interestedProductId
        ? "deleted"
        : "none") as "none" | "active" | "inactive" | "deleted",
    conversation_id: lead.conversationId,
    notes: lead.notes,
    is_legacy_note: !!lead.notes,
    created_at: lead.createdAt.toISOString(),
    updated_at: lead.updatedAt.toISOString(),
    interested_product: lead.interestedProduct
      ? {
          id: lead.interestedProduct.id,
          name: lead.interestedProduct.name,
          category: lead.interestedProduct.category,
          price_text: lead.interestedProduct.priceText,
          is_active: lead.interestedProduct.isActive,
        }
      : null,
    follow_ups: lead.followUps.map((fu) => ({
      id: fu.id,
      content: fu.content,
      previous_status: fu.previousStatus,
      new_status: fu.newStatus,
      created_by_type: fu.createdByType,
      created_at: fu.createdAt.toISOString(),
    })),
    follow_ups_count: 0,
  }));

  return (
    <WorkbenchShell
      eyebrow="Leads"
      title="客户线索"
      subtitle="收集访客在 AI 对话、联系卡片、产品咨询中留下的联系方式，统一跟进管理。"
    >
      <LeadsClient initialLeads={leadsDto} initialStats={stats} />
    </WorkbenchShell>
  );
}
