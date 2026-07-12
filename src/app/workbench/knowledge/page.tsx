import { redirect } from "next/navigation";
import WorkbenchShell from "@/components/workbench/WorkbenchShell";
import KnowledgeClient from "@/components/knowledge/KnowledgeClient";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkspaceOwnedResourceIds } from "@/lib/workspace/resources";

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

  const enterpriseDocIds = await getWorkspaceOwnedResourceIds("knowledge_doc");
  const [docs, aiConfig] = await Promise.all([
    db.knowledgeDoc.findMany({
      where: {
        userId: user.id,
        ...(enterpriseDocIds.length > 0 ? { id: { notIn: enterpriseDocIds } } : {}),
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.aiServiceConfig.findUnique({ where: { userId: user.id } }),
  ]);

  const formattedDocs = docs.map((doc) => ({
    id: doc.id,
    title: doc.title,
    category: doc.category,
    categoryLabel: doc.category ? CATEGORY_LABELS[doc.category] || doc.category : "未分类",
    content: doc.content,
    sourceType: doc.sourceType,
    isActive: doc.isActive,
    allowAiCitation: doc.allowAiCitation,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }));

  return (
    <WorkbenchShell
      eyebrow="Knowledge Base"
      title="个人资料库"
      subtitle="这里仅管理个人知识文档；企业知识库请从对应企业工作空间进入。"
    >
      <KnowledgeClient initialDocs={formattedDocs} aiEnabled={aiConfig?.enabled ?? false} />
    </WorkbenchShell>
  );
}
