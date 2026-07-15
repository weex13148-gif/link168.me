type VisitFixture = {
  profileId: string;
  createdAt: Date;
  isBot: boolean;
};

type ClickFixture = {
  profileId: string;
  createdAt: Date;
  linkType: string;
};

type LeadFixture = {
  profileId: string;
  createdAt: Date;
  sourceComponent: string;
  status: string;
};

const profileVisits: VisitFixture[] = [];
const linkClicks: ClickFixture[] = [];
const leads: LeadFixture[] = [];

function inRange(createdAt: Date, range: { gte?: Date; lt?: Date } | undefined) {
  return (!range?.gte || createdAt >= range.gte) && (!range?.lt || createdAt < range.lt);
}

const mockDb = {
  profileVisit: {
    count: jest.fn(async ({ where }: { where: Record<string, any> }) =>
      profileVisits.filter((row) =>
        row.profileId === where.profileId
        && (where.isBot === undefined || row.isBot === where.isBot)
        && inRange(row.createdAt, where.createdAt)
      ).length),
  },
  linkClick: {
    count: jest.fn(async ({ where }: { where: Record<string, any> }) =>
      linkClicks.filter((row) =>
        row.profileId === where.profileId
        && inRange(row.createdAt, where.createdAt)
        && (!where.link?.type?.in || where.link.type.in.includes(row.linkType))
      ).length),
  },
  lead: {
    count: jest.fn(async ({ where }: { where: Record<string, any> }) =>
      leads.filter((row) =>
        row.profileId === where.profileId
        && inRange(row.createdAt, where.createdAt)
        && (!where.sourceComponent?.in || where.sourceComponent.in.includes(row.sourceComponent))
        && (!where.status || row.status === where.status)
      ).length),
  },
};

jest.mock("@/lib/db", () => ({ db: mockDb }));

import { calculateConversionFunnel, getCoreMvpMetrics } from "@/lib/analytics/stats";

describe("four core MVP metrics", () => {
  const profileId = "profile-a";
  const from = new Date("2026-07-01T00:00:00.000Z");
  const to = new Date("2026-08-01T00:00:00.000Z");

  beforeEach(() => {
    jest.clearAllMocks();
    profileVisits.length = 0;
    linkClicks.length = 0;
    leads.length = 0;

    for (let index = 0; index < 10; index += 1) {
      profileVisits.push({
        profileId,
        createdAt: new Date(from.getTime() + (index + 1) * 60_000),
        isBot: false,
      });
    }
    profileVisits.push(
      { profileId, createdAt: new Date(from.getTime() + 20 * 60_000), isBot: true },
      { profileId, createdAt: new Date(from.getTime() + 21 * 60_000), isBot: true },
      { profileId, createdAt: to, isBot: false },
      { profileId: "profile-b", createdAt: new Date(from.getTime() + 22 * 60_000), isBot: false },
    );

    linkClicks.push(
      { profileId, createdAt: new Date(from.getTime() + 30 * 60_000), linkType: "phone" },
      { profileId, createdAt: new Date(from.getTime() + 31 * 60_000), linkType: "email" },
      { profileId, createdAt: new Date(from.getTime() + 32 * 60_000), linkType: "wechat" },
      { profileId, createdAt: new Date(from.getTime() + 33 * 60_000), linkType: "link" },
      { profileId, createdAt: to, linkType: "phone" },
      { profileId: "profile-b", createdAt: new Date(from.getTime() + 34 * 60_000), linkType: "phone" },
    );

    leads.push(
      { profileId, createdAt: new Date(from.getTime() + 40 * 60_000), sourceComponent: "contact_form", status: "won" },
      { profileId, createdAt: new Date(from.getTime() + 41 * 60_000), sourceComponent: "quote", status: "won" },
      { profileId, createdAt: new Date(from.getTime() + 42 * 60_000), sourceComponent: "ai-chat", status: "new" },
      { profileId, createdAt: new Date(from.getTime() + 43 * 60_000), sourceComponent: "product_card", status: "following" },
      { profileId, createdAt: to, sourceComponent: "quote", status: "won" },
      { profileId: "profile-b", createdAt: new Date(from.getTime() + 44 * 60_000), sourceComponent: "quote", status: "won" },
    );
  });

  test("derives visits, consultations, leads, and conversions from their canonical records", async () => {
    await expect(getCoreMvpMetrics(profileId, { from, to })).resolves.toEqual({
      visits: 10,
      consultations: 7,
      leads: 4,
      conversions: 2,
    });

    expect(mockDb.profileVisit.count).toHaveBeenCalledWith({
      where: {
        profileId,
        isBot: false,
        createdAt: { gte: from, lt: to },
      },
    });
    expect(mockDb.linkClick.count).toHaveBeenCalledWith({
      where: {
        profileId,
        createdAt: { gte: from, lt: to },
        link: { type: { in: ["phone", "email", "wechat"] } },
      },
    });
  });

  test("rejects invalid ranges instead of returning misleading metrics", async () => {
    await expect(getCoreMvpMetrics(profileId, { from: to, to: from })).rejects.toThrow(
      "Invalid analytics range",
    );
  });

  test("uses the same canonical metrics for the dashboard funnel", async () => {
    const funnel = await calculateConversionFunnel({ profileId, range: "30d" });

    expect(funnel.steps.map(({ name, count }) => ({ name, count }))).toEqual([
      { name: "页面访问", count: 10 },
      { name: "咨询互动", count: 7 },
      { name: "有效线索", count: 4 },
      { name: "已成交", count: 2 },
    ]);
    expect(funnel.totalLeads).toBe(4);
    expect(funnel.overallConversionRate).toBe(20);
  });
});
