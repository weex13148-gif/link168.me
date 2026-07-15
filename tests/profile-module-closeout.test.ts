import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  allowedIconTypes,
  detectPlatformIcon,
  getDefaultIconForUrl,
  getPlatformIconOptions,
  resolvePlatformIcon,
} from "@/lib/link-icons";
import { getModuleDefinition } from "@/features/profile-modules/registry";
import { validateModulePayload } from "@/features/profile-modules/validators";

const root = process.cwd();

const mockDb = {
  link: {
    count: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  profile: { findUnique: jest.fn() },
  product: { findFirst: jest.fn() },
  lead: { create: jest.fn() },
  $transaction: jest.fn(),
};
const mockGetOwnedProfile = jest.fn();
const mockRevalidate = jest.fn();

jest.mock("@/lib/auth", () => ({
  requireDashboardUser: jest.fn(async () => ({
    user: { id: "owner-1", email: "owner@example.com" },
    response: null,
  })),
  getActiveRestrictions: jest.fn(async () => []),
  canShowPublicProfile: jest.fn(() => ({ ok: true })),
}));

jest.mock("@/lib/db", () => ({ db: mockDb }));

jest.mock("@/lib/dashboard-data", () => ({
  getOwnedProfile: (...args: unknown[]) => mockGetOwnedProfile(...args),
  newId: () => "link-new",
  normalizeNullableString: (value: unknown) =>
    typeof value === "string" ? value.trim() || null : null,
  toLinkDto: (value: unknown) => value,
}));

jest.mock("@/lib/cache/public-profile", () => ({
  revalidatePublicProfileByUser: (...args: unknown[]) => mockRevalidate(...args),
}));

jest.mock("@/lib/billing/entitlements", () => ({
  getUserEntitlements: jest.fn(async () => ({
    hasActiveMembership: false,
    isGracePeriod: false,
  })),
}));

describe("platform link icons", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOwnedProfile.mockResolvedValue({ id: "profile-1", userId: "owner-1" });
    mockDb.link.count.mockResolvedValue(0);
    mockDb.link.create.mockImplementation(async ({ data }: { data: unknown }) => data);
    mockDb.link.findFirst.mockResolvedValue({
      id: "link-1",
      profileId: "profile-1",
      type: "link",
      title: "LinkedIn",
      url: "https://linkedin.com/in/owner",
      description: null,
      iconType: "platform",
      iconValue: "linkedin",
      iconUrl: null,
      payloadJson: null,
      isActive: true,
    });
    mockDb.link.update.mockImplementation(async ({ data }: { data: unknown }) => ({
      id: "link-1",
      ...data as Record<string, unknown>,
    }));
  });

  test("platform is a persisted allowlisted icon type", () => {
    expect(allowedIconTypes).toContain("platform");
    expect(getPlatformIconOptions().map((option) => option.key)).toEqual([
      "wechat",
      "douyin",
      "xiaohongshu",
      "bilibili",
      "youtube",
      "linkedin",
      "instagram",
      "facebook",
      "x",
    ]);
  });

  test.each([
    ["https://mp.weixin.qq.com/s/example", "wechat"],
    ["https://www.douyin.com/user/example", "douyin"],
    ["https://www.xiaohongshu.com/user/profile/example", "xiaohongshu"],
    ["https://b23.tv/example", "bilibili"],
    ["https://youtu.be/example", "youtube"],
    ["https://www.linkedin.com/in/example", "linkedin"],
    ["https://instagram.com/example", "instagram"],
    ["https://facebook.com/example", "facebook"],
    ["https://x.com/example", "x"],
  ])("detects %s as %s", (url, expected) => {
    expect(detectPlatformIcon(url)).toBe(expected);
    expect(getDefaultIconForUrl(url)).toMatchObject({
      iconType: "platform",
      iconValue: expected,
    });
  });

  test("renders only local allowlisted assets", () => {
    expect(resolvePlatformIcon("linkedin")).toMatch(/^\/platform-logos\//);
    expect(resolvePlatformIcon("https://attacker.example/icon.svg")).toBeNull();
    expect(resolvePlatformIcon("../secrets.svg")).toBeNull();

    for (const option of getPlatformIconOptions()) {
      const publicPath = resolvePlatformIcon(option.key);
      expect(publicPath).not.toBeNull();
      expect(fs.existsSync(path.join(root, "public", publicPath!.slice(1)))).toBe(true);
    }
  });

  test("unknown URLs use the generic link icon", () => {
    expect(detectPlatformIcon("https://example.com/path")).toBeNull();
    expect(getDefaultIconForUrl("https://example.com/path")).toEqual({
      iconType: "default",
      iconValue: "",
      label: "通用链接",
    });
  });

  test("create API persists an allowlisted platform key", async () => {
    const { POST } = await import("@/app/api/dashboard/links/route");
    const response = await POST(new Request("http://localhost/api/dashboard/links", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "LinkedIn",
        url: "https://linkedin.com/in/owner",
        iconType: "platform",
        iconValue: "linkedin",
      }),
    }));

    expect(response.status).toBe(200);
    expect(mockDb.link.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        iconType: "platform",
        iconValue: "linkedin",
        iconUrl: null,
      }),
    });
  });

  test("create API rejects remote image injection as a platform key", async () => {
    const { POST } = await import("@/app/api/dashboard/links/route");
    const response = await POST(new Request("http://localhost/api/dashboard/links", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Unsafe",
        url: "https://example.com",
        iconType: "platform",
        iconValue: "https://attacker.example/icon.svg",
      }),
    }));

    expect(response.status).toBe(400);
    expect(mockDb.link.create).not.toHaveBeenCalled();
  });

  test("manual platform selection survives an unrelated URL change", async () => {
    const { PATCH } = await import("@/app/api/dashboard/links/[id]/route");
    const response = await PATCH(new Request("http://localhost/api/dashboard/links/link-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: "https://youtube.com/watch?v=example",
        iconType: "platform",
        iconValue: "linkedin",
      }),
    }), { params: Promise.resolve({ id: "link-1" }) });

    expect(response.status).toBe(200);
    expect(mockDb.link.update).toHaveBeenCalledWith({
      where: { id: "link-1" },
      data: expect.objectContaining({
        url: "https://youtube.com/watch?v=example",
        iconType: "platform",
        iconValue: "linkedin",
      }),
    });
  });
});

describe("quote and contact-form modules", () => {
  const profileId = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOwnedProfile.mockResolvedValue({ id: "profile-1", userId: "owner-1" });
    mockDb.link.count.mockResolvedValue(2);
    mockDb.link.create.mockImplementation(async ({ data }: { data: unknown }) => data);
    mockDb.link.findFirst.mockResolvedValue({
      id: "module-1",
      profileId: "profile-1",
      type: "quote",
      title: "获取报价",
      url: "https://link168.me",
      description: null,
      iconType: "default",
      iconValue: null,
      iconUrl: null,
      payloadJson: JSON.stringify({ title: "获取报价" }),
      isActive: true,
    });
    mockDb.link.findMany.mockResolvedValue([
      { id: "module-1", position: 0 },
      { id: "module-2", position: 1 },
    ]);
    mockDb.link.update.mockImplementation(async ({ data }: { data: unknown }) => ({
      id: "module-1",
      ...data as Record<string, unknown>,
    }));
    mockDb.link.deleteMany.mockResolvedValue({ count: 1 });
    mockDb.$transaction.mockImplementation(async (operations: Array<Promise<unknown>>) => Promise.all(operations));
    mockDb.profile.findUnique.mockResolvedValue({
      id: profileId,
      userId: "owner-1",
      username: "owner",
      isPublic: true,
    });
    mockDb.product.findFirst.mockResolvedValue(null);
    mockDb.lead.create.mockImplementation(async ({ data }: { data: { id: string } }) => ({ id: data.id }));
  });

  test("both modules are formal free definitions with validated payloads", () => {
    expect(getModuleDefinition("quote")?.free).toBe(true);
    expect(getModuleDefinition("contact-form")?.free).toBe(true);
    expect(validateModulePayload("quote", {
      title: "获取项目报价",
      description: "告诉我们你的需求",
      buttonText: "提交报价需求",
    }).valid).toBe(true);
    expect(validateModulePayload("contact-form", {
      title: "联系我",
      description: "留下联系方式",
      buttonText: "提交联系信息",
    }).valid).toBe(true);
  });

  test.each([
    ["quote", { title: "获取项目报价", description: "请描述需求", buttonText: "提交报价需求" }],
    ["contact-form", { title: "联系我", description: "留下联系方式", buttonText: "提交联系信息" }],
  ])("%s supports owner create, edit, hide, restore, reorder, and delete", async (componentType, payload) => {
    const collectionRoute = await import("@/app/api/dashboard/links/route");
    const itemRoute = await import("@/app/api/dashboard/links/[id]/route");
    const reorderRoute = await import("@/app/api/dashboard/links/reorder/route");

    const createResponse = await collectionRoute.POST(new Request("http://localhost/api/dashboard/links", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: payload.title,
        componentType,
        payload: JSON.stringify(payload),
      }),
    }));
    expect(createResponse.status).toBe(200);
    expect(mockDb.link.create).toHaveBeenLastCalledWith({
      data: expect.objectContaining({ type: componentType, payloadJson: JSON.stringify(payload) }),
    });

    mockDb.link.findFirst.mockResolvedValueOnce({
      id: "module-1",
      profileId: "profile-1",
      type: componentType,
      title: payload.title,
      url: "https://link168.me",
      description: null,
      iconType: "default",
      iconValue: null,
      iconUrl: null,
      payloadJson: JSON.stringify(payload),
      isActive: true,
    });
    const updatedTitle = payload.title + "新版";
    const updateResponse = await itemRoute.PATCH(new Request("http://localhost/api/dashboard/links/module-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: updatedTitle,
        componentType,
        payload: JSON.stringify({ ...payload, title: updatedTitle }),
        isActive: false,
      }),
    }), { params: Promise.resolve({ id: "module-1" }) });
    expect(updateResponse.status).toBe(200);
    expect(mockDb.link.update).toHaveBeenLastCalledWith({
      where: { id: "module-1" },
      data: expect.objectContaining({ type: componentType, isActive: false }),
    });

    const restoreResponse = await itemRoute.PATCH(new Request("http://localhost/api/dashboard/links/module-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ componentType, isActive: true }),
    }), { params: Promise.resolve({ id: "module-1" }) });
    expect(restoreResponse.status).toBe(200);
    expect(mockDb.link.update).toHaveBeenLastCalledWith({
      where: { id: "module-1" },
      data: expect.objectContaining({ isActive: true }),
    });

    const reorderResponse = await reorderRoute.PATCH(new Request("http://localhost/api/dashboard/links/reorder", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ linkIds: ["module-2", "module-1"] }),
    }));
    expect(reorderResponse.status).toBe(200);
    expect(mockDb.$transaction).toHaveBeenCalled();

    const deleteResponse = await itemRoute.DELETE(
      new Request("http://localhost/api/dashboard/links/module-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "module-1" }) },
    );
    expect(deleteResponse.status).toBe(200);
  });

  test("a non-owner cannot modify a module", async () => {
    mockDb.link.findFirst.mockResolvedValueOnce(null);
    const { PATCH } = await import("@/app/api/dashboard/links/[id]/route");
    const response = await PATCH(new Request("http://localhost/api/dashboard/links/foreign", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "越权修改", componentType: "quote" }),
    }), { params: Promise.resolve({ id: "foreign" }) });

    expect(response.status).toBe(404);
    expect(mockDb.link.update).not.toHaveBeenCalled();
  });

  test.each([
    ["quote", "获取报价", "提交报价需求"],
    ["contact-form", "联系表单", "提交联系信息"],
  ])("%s renders its persisted form through the shared public and preview renderer", async (componentType, title, buttonText) => {
    const { SharePageRenderer } = await import("@/components/share/SharePageRenderer");
    const html = renderToStaticMarkup(createElement(SharePageRenderer, {
      profileId,
      username: "owner",
      displayName: "Owner",
      showBrandFoot: false,
      links: [{
        id: "module-1",
        title,
        componentType,
        payload: JSON.stringify({ title, buttonText }),
      }],
    }));

    expect(html).toContain(title);
    expect(html).toContain(buttonText);
    expect(html).toContain("<form");
    expect(html).not.toContain("未知模块类型");
  });

  test.each([
    ["quote", "quote", "报价咨询组件"],
    ["contact-form", "contact_form", "联系表单组件"],
  ])("%s submission persists a real Lead and returns its ID", async (_moduleType, sourceComponent, componentTitle) => {
    const { POST } = await import("@/app/api/contact/route");
    const response = await POST(new Request("http://localhost/api/contact", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": sourceComponent === "quote" ? "203.0.113.10" : "203.0.113.11",
      },
      body: JSON.stringify({
        profileId,
        username: "owner",
        sourceComponent,
        sourcePage: "/owner",
        componentTitle,
        name: "测试客户",
        phone: sourceComponent === "quote" ? "13800138001" : "13800138002",
        message: "需要进一步沟通",
      }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true, leadId: "link-new" });
    expect(mockDb.profile.findUnique).toHaveBeenLastCalledWith({ where: { id: profileId } });
    expect(mockDb.lead.create).toHaveBeenLastCalledWith({
      data: expect.objectContaining({
        id: "link-new",
        profileId,
        name: "测试客户",
        sourceComponent,
        sourcePage: "/owner",
        phone: sourceComponent === "quote" ? "13800138001" : "13800138002",
        message: expect.stringContaining(componentTitle),
      }),
    });
  });

  test("public submission requires a name and at least one valid contact method", async () => {
    const { POST } = await import("@/app/api/contact/route");
    const noName = await POST(new Request("http://localhost/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.12" },
      body: JSON.stringify({ profileId, username: "owner", sourceComponent: "contact_form", phone: "13800138003" }),
    }));
    const noContact = await POST(new Request("http://localhost/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.13" },
      body: JSON.stringify({ profileId, username: "owner", sourceComponent: "contact_form", name: "只有姓名" }),
    }));

    expect(noName.status).toBe(400);
    expect(noContact.status).toBe(400);
    expect(mockDb.lead.create).not.toHaveBeenCalled();
  });

  test("honeypot submissions are rejected instead of reporting fake success", async () => {
    const { POST } = await import("@/app/api/contact/route");
    const response = await POST(new Request("http://localhost/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.14" },
      body: JSON.stringify({
        profileId,
        username: "owner",
        sourceComponent: "contact_form",
        name: "Bot",
        phone: "13800138004",
        website: "https://spam.example",
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ success: false });
    expect(mockDb.lead.create).not.toHaveBeenCalled();
  });
});
