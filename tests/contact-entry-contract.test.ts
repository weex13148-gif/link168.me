import fs from "node:fs";
import path from "node:path";
import {
  CONTACT_ENTRY_TYPE,
  createContactEntryPayload,
  parseContactEntryPayload,
} from "@/lib/contact-entries";

function source(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("微信/企业微信图形联系入口", () => {
  test("只接受安全的微信或企业微信添加链接，并保留频道信息", () => {
    const accepted = createContactEntryPayload({
      channel: "wecom",
      targetUrl: "https://work.weixin.qq.com/ca/cawcde123",
    });
    expect(accepted.error).toBeNull();
    expect(accepted.payload).toEqual({
      version: 1,
      channel: "wecom",
      targetUrl: "https://work.weixin.qq.com/ca/cawcde123",
    });

    expect(createContactEntryPayload({ channel: "wechat", targetUrl: "javascript:alert(1)" }).payload).toBeNull();
    expect(createContactEntryPayload({ channel: "unknown", targetUrl: "https://example.com/add" }).payload).toBeNull();
  });

  test("公开渲染能将有效负载恢复为个人或团队联系卡", () => {
    const parsed = parseContactEntryPayload(
      JSON.stringify({ version: 1, channel: "wechat", targetUrl: "https://weixin.qq.com/add/example" }),
      "11111111-1111-4111-8111-111111111111",
    );
    expect(parsed).toMatchObject({ channel: "wechat", isTeam: true });
  });

  test("团队扫码和点击通过受控跳转写入共享线索池", () => {
    const connectRoute = source("src/app/connect/[linkId]/route.ts");
    const card = source("src/components/share/ContactEntryCard.tsx");
    expect(connectRoute).toContain(`type: CONTACT_ENTRY_TYPE`);
    expect(connectRoute).toContain("workspaceId: entry.workspaceId");
    expect(connectRoute).toContain("contactEntryId: entry.id");
    expect(connectRoute).toContain("validateWorkspacePublicRequestHost");
    expect(connectRoute).toContain("isAllowedPersonalContactHost(requestHost, entry.profile.username)");
    expect(connectRoute).toContain("const requestHost = resolveRequestHost(request)");
    expect(connectRoute).toContain("isPlatformHost(urlHost)");
    expect(connectRoute).toContain('code: "LEAD_CAPTURE_FAILED"');
    expect(connectRoute).toContain('`contact-entry:${entry.id}`');
    expect(connectRoute).toContain("TEAM_LEAD_DEDUPE_WINDOW_MS");
    expect(connectRoute).toContain("recentClick");
    expect(connectRoute).toContain('code: "LEAD_CAPTURE_PENDING"');
    expect(connectRoute).toContain("status: 503");
    expect(connectRoute).toContain('export const dynamic = "force-dynamic"');
    expect(connectRoute).toContain('"Cache-Control", "private, no-store, max-age=0"');
    expect(card).toContain("/connect/");
    expect(card).toContain("/api/qrcode?url=");
  });

  test("个人入口唯一性和团队领取由数据库约束与事务共同保证", () => {
    const migration = source("prisma/migrations/20260729_add_contact_entries_and_workspace_leads/migration.sql");
    const contactRoute = source("src/app/api/contact-entries/route.ts");
    const leadRoute = source("src/app/api/workspaces/[workspaceId]/leads/[leadId]/route.ts");

    expect(migration).toContain("links_one_personal_contact_entry_per_profile_idx");
    expect(migration).toContain("ON DELETE RESTRICT ON UPDATE CASCADE");
    expect(migration).toContain("leads_claimed_by_user_id_fkey");
    expect(contactRoute).toContain("isPrismaUniqueConflict");
    expect(contactRoute).toContain("entryProfile.userId");
    expect(leadRoute).toContain("await db.$transaction(async (tx)");
    expect(leadRoute).toContain("claimedByUserId: lead.claimedByUserId");
    expect(leadRoute).toContain("status: lead.status");
  });

  test("AI 转人工会交付对应联系卡并创建结构化线索", () => {
    const agent = source("src/lib/ai/commercial-agent.ts");
    const chat = source("src/components/share/modules/AiChatModule.tsx");
    const teamAi = source("src/components/share/TeamAiReception.tsx");
    expect(CONTACT_ENTRY_TYPE).toBe("contact-entry");
    expect(agent).toContain("createHandoffLead");
    expect(agent).toContain("contactEntryId: handoffContact?.id");
    expect(agent).toContain("workspaceId: args.contactEntry?.workspaceId || null");
    expect(chat).toContain('result.data.action?.type === "contact"');
    expect(chat).toContain("onOpenContactEntry");
    expect(teamAi).toContain("handoffContactEntryId={fallbackEntry?.id}");
    expect(agent).toContain("preferredEntryId");
    expect(agent).toContain("link.workspaceId === expectedWorkspaceId");
    expect(agent).toContain("expectedWorkspaceId === null");
  });

  test("团队后台预览只会对已验证域名生成可分享联系卡", () => {
    const card = source("src/components/share/ContactEntryCard.tsx");
    const consoleClient = source("src/components/console/ContactEntriesClient.tsx");
    const route = source("src/app/api/contact-entries/route.ts");
    const publicTeamPage = source("src/app/%5F_w/[workspaceId]/page.tsx");
    const teamAi = source("src/components/share/TeamAiReception.tsx");

    expect(card).toContain("publicBaseUrl?: string | null");
    expect(card).toContain("等待团队域名验证");
    expect(consoleClient).toContain("实时分享预览");
    expect(consoleClient).toContain("团队公开域名");
    expect(route).toContain("summarizeWorkspacePublicHost");
    expect(route).toContain('workspace.members[0]?.status === "active"');
    expect(consoleClient).toContain("leadRequestId");
    expect(consoleClient).toContain("domainRequestId");
    expect(publicTeamPage).toContain("const verifiedHost = await requireWorkspacePublicRequestHost(workspaceId)");
    expect(publicTeamPage).toContain("publicBaseUrl={publicBaseUrl}");
    expect(teamAi).toContain("publicBaseUrl?: string | null");
  });
});
