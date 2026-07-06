import { redirect } from "next/navigation";
import WorkbenchShell from "@/components/workbench/WorkbenchShell";
import ShortLinksClient from "@/components/workbench/ShortLinksClient";
import { db } from "@/lib/db";

async function getShortLinks(userId: string) {
  const shortLinks = await db.shortLink.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      targetUrl: true,
      totalClicks: true,
      isEnabled: true,
      channelLabel: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return shortLinks.map(sl => ({
    id: sl.id,
    slug: sl.slug,
    targetUrl: sl.targetUrl,
    totalClicks: sl.totalClicks,
    isEnabled: sl.isEnabled,
    channelLabel: sl.channelLabel,
    expiresAt: sl.expiresAt ? sl.expiresAt.toISOString() : null,
    createdAt: sl.createdAt.toISOString(),
    updatedAt: sl.updatedAt.toISOString(),
  }));
}

export default async function WorkbenchShortLinksPage() {
  const { getCurrentUserFromCookies } = await import("@/lib/auth");
  const user = await getCurrentUserFromCookies();
  if (!user) {
    redirect("/login");
  }

  const shortLinks = await getShortLinks(user.id);

  return (
    <WorkbenchShell
      eyebrow="Short Links"
      title="短链接管理"
      subtitle="创建、管理短链接，追踪流量来源和转化数据。"
    >
      <ShortLinksClient initialShortLinks={shortLinks} />
    </WorkbenchShell>
  );
}
