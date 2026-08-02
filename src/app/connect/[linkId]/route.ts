import { NextResponse } from "next/server";
import { canShowPublicProfile, getActiveRestrictions } from "@/lib/auth";
import { CONTACT_ENTRY_TYPE, parseContactEntryPayload } from "@/lib/contact-entries";
import { isAllowedPersonalContactHost, isUuid } from "@/lib/contact-entry-domain";
import { newId } from "@/lib/dashboard-data";
import { db } from "@/lib/db";
import { normalizeRequestHost } from "@/lib/domains";
import { isPlatformHost } from "@/lib/platform-hosts";
import { getClientIp, hashIp, isPotentialBot, parseDeviceInfo } from "@/lib/analytics/events";
import { rateLimit } from "@/lib/rate-limit";
import { validateWorkspacePublicRequestHost } from "@/lib/workspace-public-host";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ linkId: string }> };

const TEAM_LEAD_DEDUPE_WINDOW_MS = 5 * 60 * 1000;

function noStoreRedirect(destination: string | URL) {
  const response = NextResponse.redirect(destination, 302);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

function unavailable(request: Request) {
  return noStoreRedirect(new URL("/", request.url));
}

function resolveRequestHost(request: Request): string | null {
  const rawHost = request.headers.get("host") || new URL(request.url).host;
  const normalizedHost = normalizeRequestHost(rawHost);
  if (normalizedHost) return normalizedHost;

  try {
    const urlHost = new URL(`http://${rawHost}`).hostname.toLowerCase().replace(/\.$/, "");
    return isPlatformHost(urlHost) ? urlHost : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request, context: RouteContext) {
  const { linkId } = await context.params;
  if (!isUuid(linkId)) return unavailable(request);

  const entry = await db.link.findFirst({
    where: { id: linkId, type: CONTACT_ENTRY_TYPE, isActive: true },
    select: {
      id: true,
      profileId: true,
      workspaceId: true,
      title: true,
      payloadJson: true,
      profile: { select: { isPublic: true, userId: true, username: true } },
      workspace: { select: { isActive: true } },
    },
  });
  const payload = entry ? parseContactEntryPayload(entry.payloadJson, entry.workspaceId) : null;
  if (!entry || !payload) return unavailable(request);

  if (entry.workspaceId) {
    if (!entry.workspace?.isActive) return unavailable(request);
    const verifiedHost = await validateWorkspacePublicRequestHost(entry.workspaceId, request.headers.get("host"));
    if (!verifiedHost) return unavailable(request);
  } else {
    const requestHost = resolveRequestHost(request);
    if (!isAllowedPersonalContactHost(requestHost, entry.profile.username)) return unavailable(request);
    if (!entry.profile.isPublic) return unavailable(request);
    const owner = await db.user.findUnique({ where: { id: entry.profile.userId }, select: { emailVerified: true } });
    if (!owner?.emailVerified) return unavailable(request);
    try {
      const restrictions = await getActiveRestrictions(entry.profile.userId);
      if (!canShowPublicProfile(restrictions).ok) return unavailable(request);
    } catch {
      return unavailable(request);
    }
  }

  if (!isPotentialBot(request)) {
    const device = parseDeviceInfo(request.headers.get("user-agent"));
    const visitorIpHash = hashIp(getClientIp(request));

    // A team contact click is a promised shared-pool handoff. The durable
    // LinkClick row is also the dedupe marker: refreshes from the same IP may
    // continue safely without manufacturing another anonymous Lead.
    if (entry.workspaceId) {
      try {
        const recentClick = await db.linkClick.findFirst({
          where: {
            linkId: entry.id,
            ipHash: visitorIpHash,
            createdAt: { gte: new Date(Date.now() - TEAM_LEAD_DEDUPE_WINDOW_MS) },
          },
          select: { id: true },
        });
        if (recentClick) return noStoreRedirect(payload.targetUrl);

        const limited = await rateLimit(
          request,
          `contact-entry:${entry.id}`,
          1,
          TEAM_LEAD_DEDUPE_WINDOW_MS,
        );
        // A concurrent first request may still be committing. Without a
        // durable marker we must not claim that a shared-pool handoff exists.
        if (!limited.passed) {
          return NextResponse.json(
            { success: false, error: "团队联系入口正在处理中，请稍后重试。", code: "LEAD_CAPTURE_PENDING" },
            { status: 503, headers: { "Cache-Control": "private, no-store, max-age=0" } },
          );
        }

        await db.$transaction(async (tx) => {
          await tx.lead.create({
            data: {
              id: newId(),
              profileId: entry.profileId,
              workspaceId: entry.workspaceId,
              contactEntryId: entry.id,
              name: "联系入口访客",
              message: `访客已点击团队${payload.channel === "wecom" ? "企业微信" : "微信"}联系入口：${entry.title}`,
              sourceComponent: "contact_entry",
              sourcePage: `/${entry.profile.username}`,
              status: "new",
            },
          });
          await tx.linkClick.create({
            data: {
              id: newId(),
              linkId: entry.id,
              profileId: entry.profileId,
              device: device.device,
              os: device.os,
              browser: device.browser,
              referer: request.headers.get("referer") || null,
              ipHash: visitorIpHash,
            },
          });
          await tx.link.update({ where: { id: entry.id }, data: { totalClicks: { increment: 1 } } });
        });
      } catch (error) {
        console.error(
          "[contact-entry] failed to persist team handoff",
          error instanceof Error ? error.message : "unknown error",
        );
        return NextResponse.json(
          { success: false, error: "团队联系入口暂时不可用，请稍后重试。", code: "LEAD_CAPTURE_FAILED" },
          { status: 503, headers: { "Cache-Control": "private, no-store, max-age=0" } },
        );
      }
    } else {
      try {
        await db.$transaction(async (tx) => {
          await tx.linkClick.create({
            data: {
              id: newId(),
              linkId: entry.id,
              profileId: entry.profileId,
              device: device.device,
              os: device.os,
              browser: device.browser,
              referer: request.headers.get("referer") || null,
              ipHash: visitorIpHash,
            },
          });
          await tx.link.update({ where: { id: entry.id }, data: { totalClicks: { increment: 1 } } });
        });
      } catch (error) {
        // Personal entry analytics are best-effort; the external contact link
        // remains available even when counters cannot be updated.
        console.error(
          "[contact-entry] failed to persist click analytics",
          error instanceof Error ? error.message : "unknown error",
        );
      }
    }
  }

  return noStoreRedirect(payload.targetUrl);
}
