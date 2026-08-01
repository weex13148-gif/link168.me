import { NextResponse } from "next/server";
import { requireDashboardUser } from "@/lib/auth";
import { revalidatePublicProfileByUser } from "@/lib/cache/public-profile";
import { createContactEntryPayload, CONTACT_ENTRY_TYPE, contactChannelLabel } from "@/lib/contact-entries";
import { isPrismaUniqueConflict, isUuid, summarizeWorkspacePublicHost } from "@/lib/contact-entry-domain";
import { hasSensitiveContent, sanitizePublicText } from "@/lib/content-safety";
import { getOwnedProfile, newId } from "@/lib/dashboard-data";
import { db } from "@/lib/db";
import { assertWorkspaceMember, getUserWorkspaces } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ContactEntryRequest = {
  title?: unknown;
  description?: unknown;
  targetUrl?: unknown;
  channel?: unknown;
  workspaceId?: unknown;
};

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function toEntryDto(entry: {
  id: string;
  profileId: string;
  workspaceId: string | null;
  title: string;
  description: string | null;
  url: string;
  payloadJson: string | null;
  isActive: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: entry.id,
    profileId: entry.profileId,
    workspaceId: entry.workspaceId,
    title: entry.title,
    description: entry.description,
    targetUrl: entry.url,
    payload: entry.payloadJson,
    isActive: entry.isActive,
    position: entry.position,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const profile = await getOwnedProfile(user.id);
  if (!profile) {
    return NextResponse.json({ success: false, error: "请先创建个人经营名片。" }, { status: 400 });
  }

  const [personalEntries, workspaces] = await Promise.all([
    db.link.findMany({
      where: { profileId: profile.id, workspaceId: null, type: CONTACT_ENTRY_TYPE },
      orderBy: { position: "asc" },
    }),
    getUserWorkspaces(user.id),
  ]);

  const activeTeamWorkspaces = workspaces
    .filter((workspace) => workspace.workspaceType !== "personal" && workspace.members[0]?.status === "active")
    .map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      workspaceType: workspace.workspaceType,
      role: workspace.members[0]?.role ?? "viewer",
      status: workspace.members[0]?.status ?? "invited",
    }));

  const workspaceIds = activeTeamWorkspaces.map((workspace) => workspace.id);
  const [teamEntries, domains] = workspaceIds.length
    ? await Promise.all([
        db.link.findMany({
          where: { workspaceId: { in: workspaceIds }, type: CONTACT_ENTRY_TYPE },
          orderBy: [{ workspaceId: "asc" }, { position: "asc" }],
        }),
        db.domain.findMany({
          where: { workspaceId: { in: workspaceIds }, status: { not: "unbound" } },
          select: { workspaceId: true, domain: true, status: true },
          orderBy: { createdAt: "desc" },
        }),
      ])
    : [[], []] as const;
  const domainsByWorkspace = new Map<string, Array<{ domain: string; status: string }>>();
  for (const domain of domains) {
    const current = domainsByWorkspace.get(domain.workspaceId) || [];
    current.push(domain);
    domainsByWorkspace.set(domain.workspaceId, current);
  }

  return NextResponse.json({
    success: true,
    personalEntries: personalEntries.map(toEntryDto),
    teamEntries: teamEntries.map(toEntryDto),
    workspaces: activeTeamWorkspaces.map((workspace) => ({
      ...workspace,
      ...summarizeWorkspacePublicHost(domainsByWorkspace.get(workspace.id) || []),
    })),
  });
}

export async function POST(request: Request) {
  const { user, response } = await requireDashboardUser(request);
  if (response || !user) return response;

  const profile = await getOwnedProfile(user.id);
  if (!profile) {
    return NextResponse.json({ success: false, error: "请先创建个人经营名片。" }, { status: 400 });
  }

  let body: ContactEntryRequest;
  try {
    body = await request.json() as ContactEntryRequest;
  } catch {
    return NextResponse.json({ success: false, error: "请求格式不正确。" }, { status: 400 });
  }

  const contact = createContactEntryPayload({ channel: body.channel, targetUrl: body.targetUrl });
  if (!contact.payload) {
    return NextResponse.json({ success: false, error: contact.error }, { status: 400 });
  }

  if (body.workspaceId !== undefined && body.workspaceId !== null && typeof body.workspaceId !== "string") {
    return NextResponse.json({ success: false, error: "工作空间 ID 格式不正确。" }, { status: 400 });
  }
  const workspaceId = text(body.workspaceId, 80) || null;
  if (workspaceId && !isUuid(workspaceId)) {
    return NextResponse.json({ success: false, error: "工作空间 ID 格式不正确。" }, { status: 400 });
  }
  let entryProfile = profile;
  if (workspaceId) {
    const access = await assertWorkspaceMember(workspaceId, user.id, { minRole: "admin", requireActive: true });
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: access.message, code: access.code }, { status: 403 });
    }
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, isActive: true, workspaceType: true, ownerId: true },
    });
    if (!workspace?.isActive || workspace.workspaceType === "personal") {
      return NextResponse.json({ success: false, error: "请选择一个有效的团队工作空间。" }, { status: 400 });
    }
    const ownerProfile = await db.profile.findUnique({ where: { userId: workspace.ownerId } });
    if (!ownerProfile) {
      return NextResponse.json({ success: false, error: "团队所有者尚未创建经营名片，暂时无法发布团队联系入口。" }, { status: 409 });
    }
    entryProfile = ownerProfile;
  } else {
    const existing = await db.link.count({
      where: { profileId: profile.id, workspaceId: null, type: CONTACT_ENTRY_TYPE },
    });
    if (existing > 0) {
      return NextResponse.json({ success: false, error: "个人名片只支持一个微信或企业微信联系入口。" }, { status: 409 });
    }
  }

  const title = sanitizePublicText(text(body.title, 60)) || `${contactChannelLabel(contact.payload.channel)}联系`;
  const description = sanitizePublicText(text(body.description, 200)) || null;
  if (hasSensitiveContent(`${title}\n${description || ""}`).detected) {
    return NextResponse.json({ success: false, error: "联系入口文案包含受限关键词，请修改后再试。" }, { status: 400 });
  }

  const position = await db.link.count({
    where: workspaceId
      ? { workspaceId, type: CONTACT_ENTRY_TYPE }
      : { profileId: profile.id, workspaceId: null, type: CONTACT_ENTRY_TYPE },
  });

  let entry;
  try {
    entry = await db.link.create({
      data: {
        id: newId(),
        profileId: entryProfile.id,
        workspaceId,
        type: CONTACT_ENTRY_TYPE,
        title,
        description,
        url: contact.payload.targetUrl,
        payloadJson: JSON.stringify(contact.payload),
        iconType: "platform",
        iconValue: contact.payload.channel === "wecom" ? "wecom" : "wechat",
        position,
        isActive: true,
      },
    });
  } catch (error) {
    if (!workspaceId && isPrismaUniqueConflict(error)) {
      return NextResponse.json({ success: false, error: "个人名片只支持一个微信或企业微信联系入口。" }, { status: 409 });
    }
    throw error;
  }

  await revalidatePublicProfileByUser(entryProfile.userId);
  return NextResponse.json({ success: true, entry: toEntryDto(entry) });
}
