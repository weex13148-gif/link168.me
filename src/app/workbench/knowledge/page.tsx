/**
 * 统一企业资料库页面
 * 支持 7 种资料类型：company / product / faq / brand_voice / customer_profile / sop / document
 */
import { redirect } from "next/navigation";
import WorkbenchShell from "@/components/workbench/WorkbenchShell";
import KnowledgeClient from "@/components/knowledge/KnowledgeClient";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const CATEGORY_LABELS: Record<string, string> = {
  company: "公司资料",
  product: "产品资料",
  faq: "FAQ",
  brand_voice: "品牌语气",
  customer_profile: "客户画像",
  sop: "SOP",
  document: "文档资料",
};

export default async function KnowledgePage() {
  const user = await getCurrentUserFromCookies();
  if (!user) redirect("/login");

  const [docs, aiConfig] = await Promise.all([
    db.knowledgeDoc.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
    }),
    db.aiServiceConfig.findUnique({ where: { userId: user.id } }),
  ]);

  const aiEnabled = aiConfig?.enabled ?? false;

  const formattedDocs = docs.map((d) => ({
    id: d.id,
    title: d.title,
    category: d.category,
    categoryLabel: d.category ? CATEGORY_LABELS[d.category] || d.category : "未分类",
    content: d.content,
    sourceType: d.sourceType,
    isActive: d.isActive,
    allowAiCitation: d.allowAiCitation,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));

  return (
    <WorkbenchShell
      eyebrow="Knowledge Base"
      title="统一企业资料库"
      subtitle="集中管理公司资料、产品资料、FAQ、品牌语气、客户画像、SOP 和文档，让 AI 助手更懂你的业务。"
    >
      <KnowledgeClient initialDocs={formattedDocs} aiEnabled={aiEnabled} />
    </WorkbenchShell>
  );
}
