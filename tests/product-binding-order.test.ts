import fs from "fs";
import path from "path";

const mockDb = {
  product: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
  profile: { findUnique: jest.fn() },
  lead: { create: jest.fn() },
  $transaction: jest.fn(),
};

const mockRequireDashboardUser = jest.fn();
const mockRevalidate = jest.fn();

jest.mock("@/lib/db", () => ({ db: mockDb }));
jest.mock("@/lib/auth", () => ({
  requireDashboardUser: mockRequireDashboardUser,
  getActiveRestrictions: jest.fn(async () => []),
  canShowPublicProfile: jest.fn(() => ({ ok: true })),
}));
jest.mock("@/lib/cache/public-profile", () => ({
  revalidatePublicProfileByUser: mockRevalidate,
}));
jest.mock("@/lib/dashboard-data", () => ({ newId: () => "44444444-4444-4444-8444-444444444444" }));

import {
  ProductBindingError,
  hydrateOwnedActiveProductCardPayload,
  validateCompleteProductOrder,
} from "@/lib/products/binding";
import { POST as reorderProducts } from "@/app/api/dashboard/products/reorder/route";

const userId = "11111111-1111-4111-8111-111111111111";
const productA = "22222222-2222-4222-8222-222222222222";
const productB = "33333333-3333-4333-8333-333333333333";

function request(body: unknown) {
  return new Request("http://localhost/api/dashboard/products/reorder", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("owned product binding and ordering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireDashboardUser.mockResolvedValue({
      user: { id: userId },
      response: null,
    });
    mockDb.product.findFirst.mockResolvedValue({
      id: productA,
      name: "Canonical product",
      category: "咨询",
      description: "Persisted description",
      priceText: "¥299",
      coverImageUrl: "/api/dashboard/media/cover/owner/image.png",
      ctaLabel: "查看详情",
      ctaUrl: "https://example.com/product",
    });
    mockDb.product.findMany.mockResolvedValue([{ id: productA }, { id: productB }]);
    mockDb.product.updateMany.mockResolvedValue({ count: 1 });
    mockDb.$transaction.mockImplementation(async (callback: (tx: typeof mockDb) => unknown) => callback(mockDb));
    mockDb.profile.findUnique.mockResolvedValue({
      id: "55555555-5555-4555-8555-555555555555",
      userId,
      username: "owner",
      isPublic: true,
    });
    mockDb.lead.create.mockImplementation(async ({ data }: { data: unknown }) => data);
  });

  test("hydrates a product card from an owned active Product instead of client fields", async () => {
    await expect(hydrateOwnedActiveProductCardPayload(userId, {
      productId: productA,
      name: "Spoofed name",
      priceText: "¥0",
    })).resolves.toEqual({
      productId: productA,
      name: "Canonical product",
      category: "咨询",
      description: "Persisted description",
      priceText: "¥299",
      coverImageUrl: "/api/dashboard/media/cover/owner/image.png",
      ctaLabel: "查看详情",
      ctaUrl: "https://example.com/product",
    });
    expect(mockDb.product.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: productA, userId, status: "published" },
    }));
  });

  test("rejects missing, inactive, or foreign Product bindings", async () => {
    await expect(hydrateOwnedActiveProductCardPayload(userId, {})).rejects.toMatchObject({
      code: "PRODUCT_ID_REQUIRED",
    });

    mockDb.product.findFirst.mockResolvedValueOnce(null);
    await expect(hydrateOwnedActiveProductCardPayload(userId, { productId: productB })).rejects.toMatchObject({
      code: "PRODUCT_NOT_OWNED_OR_INACTIVE",
    });
  });

  test("requires a complete duplicate-free owned order", () => {
    expect(validateCompleteProductOrder([productB, productA], [productA, productB])).toEqual([productB, productA]);
    expect(() => validateCompleteProductOrder([productA, productA], [productA, productB])).toThrow(ProductBindingError);
    expect(() => validateCompleteProductOrder([productA], [productA, productB])).toThrow(ProductBindingError);
    expect(() => validateCompleteProductOrder([productA, "foreign"], [productA, productB])).toThrow(ProductBindingError);
  });

  test("persists the complete order transactionally", async () => {
    const response = await reorderProducts(request({ productIds: [productB, productA] }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      productIds: [productB, productA],
    });
    expect(mockDb.$transaction).toHaveBeenCalledTimes(1);
    expect(mockDb.product.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: productB, userId },
      data: { sortOrder: 0 },
    });
    expect(mockDb.product.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: productA, userId },
      data: { sortOrder: 1 },
    });
  });

  test("persists the canonical product snapshot on a Lead and rejects invalid products", async () => {
    const { POST } = await import("@/app/api/contact/route");
    const response = await POST(new Request("http://localhost/api/contact", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.90",
      },
      body: JSON.stringify({
        profileId: "55555555-5555-4555-8555-555555555555",
        username: "owner",
        name: "Lead A",
        email: "lead-a@example.com",
        sourceComponent: "product_card",
        sourcePage: "/owner",
        interestedProductId: productA,
      }),
    }));

    expect(response.status).toBe(200);
    expect(mockDb.lead.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        interestedProductId: productA,
        interestedProductName: "Canonical product",
        interestedProductPrice: "¥299",
        interestedProductCategory: "咨询",
      }),
    });

    mockDb.product.findFirst.mockResolvedValueOnce(null);
    const rejected = await POST(new Request("http://localhost/api/contact", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.91",
      },
      body: JSON.stringify({
        profileId: "55555555-5555-4555-8555-555555555555",
        username: "owner",
        name: "Lead B",
        email: "lead-b@example.com",
        sourceComponent: "product_card",
        interestedProductId: productB,
      }),
    }));

    expect(rejected.status).toBe(400);
    await expect(rejected.json()).resolves.toMatchObject({
      success: false,
      error: "所选产品不存在、已下架或不属于当前主页。",
    });
    expect(mockDb.lead.create).toHaveBeenCalledTimes(1);
  });

  test("keeps product selection out of raw UUID inputs and validates both link writes", () => {
    const root = process.cwd();
    const editor = fs.readFileSync(path.join(root, "src/components/dashboard-v1/LinksPanel.tsx"), "utf8");
    const createRoute = fs.readFileSync(path.join(root, "src/app/api/dashboard/links/route.ts"), "utf8");
    const updateRoute = fs.readFileSync(path.join(root, "src/app/api/dashboard/links/[id]/route.ts"), "utf8");
    const contactRoute = fs.readFileSync(path.join(root, "src/app/api/contact/route.ts"), "utf8");
    const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
    const publicPage = fs.readFileSync(path.join(root, "src/app/[username]/page.tsx"), "utf8");

    expect(editor).not.toContain("产品 ID（选填）");
    expect(editor).toContain("选择已上架产品");
    expect(createRoute).toContain("hydrateOwnedActiveProductCardPayload");
    expect(updateRoute).toContain("hydrateOwnedActiveProductCardPayload");
    expect(contactRoute).toContain("interestedProductName: productSnapshot?.name");
    expect(contactRoute).toContain("所选产品不存在、已下架或不属于当前主页");
    expect(schema).toMatch(/interestedProduct\s+Product\?\s+@relation\([^\n]+onDelete: SetNull\)/);
    expect(publicPage).toContain('orderBy: { sortOrder: "asc" }');
  });
});
