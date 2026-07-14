import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { validateHostForWorkspace } from "@/lib/workspace-public-host";

export const dynamic = "force-dynamic";

type WorkspacePublicPageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function WorkspacePublicPage({ params }: WorkspacePublicPageProps) {
  const { workspaceId } = await params;

  const hostHeaders = await headers();
  const requestHost = hostHeaders.get("host");

  const validation = await validateHostForWorkspace(requestHost, workspaceId);

  if (!validation.valid) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">企业公开主页</h1>
        <p className="mt-2 text-gray-600">工作空间 ID: {workspaceId}</p>
        <p className="mt-1 text-sm text-gray-400">访问域名: {validation.host}</p>
      </div>
    </div>
  );
}