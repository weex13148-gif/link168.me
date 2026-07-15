import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireWorkspacePublicRequestHost } from "@/lib/workspace-public-request";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ workspaceId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { workspaceId } = await params;
  await requireWorkspacePublicRequestHost(workspaceId);
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true, isActive: true },
  });
  if (!workspace || !workspace.isActive) {
    return { title: "员工名片 | Link168" };
  }
  return { title: `员工名片 | ${workspace.name}` };
}

export default async function EnterpriseEmployeesPage({ params }: Props) {
  const { workspaceId } = await params;
  await requireWorkspacePublicRequestHost(workspaceId);
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true, isActive: true },
  });
  if (!workspace || !workspace.isActive) notFound();

  const profiles = await db.workspacePublicProfile.findMany({
    where: { workspaceId, status: "active" },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        include: {
          profile: {
            select: {
              displayName: true,
              jobTitle: true,
              avatarUrl: true,
              bio: true,
              updatedAt: true,
            },
          },
        },
      },
    },
  });

  // 过滤掉用户已被禁用或不再是 active 成员的记录
  const visibleProfiles = profiles.filter((p) => {
    if (p.user?.accountStatus !== "active") return false;
    if (!p.user?.profile) return false;
    return true;
  });

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-8 sm:py-12">
      <header className="border-b border-gray-200 pb-6">
        <Link href="/" className="text-xs text-gray-500 hover:text-[#6F8F4E]">
          ← 返回首页
        </Link>
        <h1 className="mt-3 text-2xl font-black text-gray-900">员工名片</h1>
        <p className="mt-1 text-sm text-gray-500">{workspace.name}</p>
      </header>

      {visibleProfiles.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-16 text-center">
          <p className="text-sm text-gray-400">该企业暂无公开员工名片</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 py-6 sm:grid-cols-2">
          {visibleProfiles.map((profile) => {
            const displayName = profile.user.profile?.displayName || `@${profile.slug}`;
            const avatarUrl = profile.user.profile?.avatarUrl
              ? `${profile.user.profile.avatarUrl.split("?")[0]}?t=${profile.user.profile.updatedAt.getTime()}`
              : null;
            return (
              <li key={profile.id}>
                <Link
                  href={`/${profile.slug}`}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 transition hover:border-[#6F8F4E] hover:bg-[#6F8F4E]/5"
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6F8F4E]/10 text-base font-bold text-[#6F8F4E]">
                      {displayName.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-gray-900">{displayName}</div>
                    {profile.user.profile?.jobTitle ? (
                      <div className="truncate text-xs text-gray-500">
                        {profile.user.profile.jobTitle}
                      </div>
                    ) : null}
                    {profile.user.profile?.bio ? (
                      <div className="truncate text-xs text-gray-400">
                        {profile.user.profile.bio}
                      </div>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
