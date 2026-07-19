import crypto from "node:crypto";
import { PrismaCatalogRepository } from "@/infrastructure/catalog/prisma-catalog-repository";
import { db } from "@/lib/db";

const createdUserIds: string[] = [];

async function createOwner(label: string) {
  const userId = crypto.randomUUID();
  const profileId = crypto.randomUUID();
  createdUserIds.push(userId);
  await db.user.create({
    data: {
      id: userId,
      email: `phase2-catalog-${label}-${userId}@example.com`,
      passwordHash: "test-password-hash",
      emailVerified: true,
      accountStatus: "active",
      profile: {
        create: {
          id: profileId,
          username: `phase2-${label}-${userId.slice(0, 8)}`,
          isPublic: true,
        },
      },
    },
  });
  return { userId, profileId };
}

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await db.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
  }
});

describe("PrismaCatalogRepository", () => {
  test("creates and reads only owner-scoped CatalogItems", async () => {
    const owner = await createOwner("owner");
    const other = await createOwner("other");
    const repository = new PrismaCatalogRepository(db);

    const created = await repository.createOwned(owner.userId, {
      kind: "product",
      status: "draft",
      name: "产品 A",
      category: "SaaS",
      description: null,
      priceText: "¥99",
      coverAssetId: null,
      legacyCoverUrl: null,
      ctaLabel: "查看详情",
      ctaUrl: "https://example.com/product-a",
      sortOrder: 0,
      allowAiRecommendation: true,
    });

    expect(created).toMatchObject({ ownerUserId: owner.userId, status: "draft" });
    await expect(repository.findOwned(owner.userId, created.id)).resolves.toMatchObject({ id: created.id });
    await expect(repository.findOwned(other.userId, created.id)).resolves.toBeNull();
    await expect(repository.listOwned(other.userId)).resolves.toEqual([]);
    await expect(repository.updateOwned(other.userId, created.id, { name: "越权" })).resolves.toBeNull();
  });

  test("hydrates approved cover status and bound module types", async () => {
    const owner = await createOwner("cover");
    const repository = new PrismaCatalogRepository(db);
    const assetId = crypto.randomUUID();
    await db.mediaAsset.create({
      data: {
        id: assetId,
        ownerUserId: owner.userId,
        profileId: owner.profileId,
        purpose: "catalog-cover",
        storageProvider: "local",
        storageKey: `catalog/${owner.userId}/${assetId}.png`,
        originalName: "cover.png",
        mimeType: "image/png",
        sizeBytes: 12,
        checksumSha256: crypto.createHash("sha256").update("cover").digest("hex"),
        status: "approved",
      },
    });

    const item = await repository.createOwned(owner.userId, {
      kind: "product",
      status: "published",
      name: "有封面产品",
      category: null,
      description: null,
      priceText: null,
      coverAssetId: assetId,
      legacyCoverUrl: null,
      ctaLabel: null,
      ctaUrl: null,
      sortOrder: 0,
      allowAiRecommendation: true,
    });
    await db.link.create({
      data: {
        id: crypto.randomUUID(),
        profileId: owner.profileId,
        type: "product-card",
        catalogItemId: item.id,
        title: "产品卡片",
        url: "https://link168.me",
      },
    });

    await expect(repository.findOwned(owner.userId, item.id)).resolves.toMatchObject({
      coverAssetStatus: "approved",
      boundModuleTypes: ["product-card"],
    });
  });

  test("returns published items only through the owning profile", async () => {
    const owner = await createOwner("public");
    const other = await createOwner("public-other");
    const repository = new PrismaCatalogRepository(db);
    const item = await repository.createOwned(owner.userId, {
      kind: "service",
      status: "draft",
      name: "咨询服务",
      category: null,
      description: null,
      priceText: null,
      coverAssetId: null,
      legacyCoverUrl: null,
      ctaLabel: null,
      ctaUrl: null,
      sortOrder: 0,
      allowAiRecommendation: true,
    });

    await expect(repository.findPublishedForProfile(owner.profileId, item.id)).resolves.toBeNull();
    await repository.setStatusOwned(owner.userId, item.id, "published", null);
    await expect(repository.findPublishedForProfile(owner.profileId, item.id)).resolves.toMatchObject({ id: item.id });
    await expect(repository.findPublishedForProfile(other.profileId, item.id)).resolves.toBeNull();
    await repository.setStatusOwned(owner.userId, item.id, "archived", new Date());
    await expect(repository.findPublishedForProfile(owner.profileId, item.id)).resolves.toBeNull();
  });

  test("archives without deleting historical PageModule bindings", async () => {
    const owner = await createOwner("archive");
    const repository = new PrismaCatalogRepository(db);
    const item = await repository.createOwned(owner.userId, {
      kind: "product",
      status: "published",
      name: "历史产品",
      category: null,
      description: null,
      priceText: null,
      coverAssetId: null,
      legacyCoverUrl: null,
      ctaLabel: null,
      ctaUrl: null,
      sortOrder: 0,
      allowAiRecommendation: true,
    });
    const linkId = crypto.randomUUID();
    await db.link.create({
      data: {
        id: linkId,
        profileId: owner.profileId,
        type: "product-card",
        catalogItemId: item.id,
        title: "历史产品卡片",
        url: "https://link168.me",
      },
    });

    await repository.setStatusOwned(owner.userId, item.id, "archived", new Date("2026-07-20T00:00:00.000Z"));
    expect(await db.product.findUnique({ where: { id: item.id }, select: { status: true } })).toEqual({ status: "archived" });
    expect(await db.link.findUnique({ where: { id: linkId }, select: { catalogItemId: true } })).toEqual({ catalogItemId: item.id });
  });

  test("serializes concurrent complete reorders without duplicate positions", async () => {
    const owner = await createOwner("reorder");
    const repository = new PrismaCatalogRepository(db);
    const items = await Promise.all([0, 1, 2].map((sortOrder) => repository.createOwned(owner.userId, {
      kind: "product",
      status: "draft",
      name: `产品 ${sortOrder + 1}`,
      category: null,
      description: null,
      priceText: null,
      coverAssetId: null,
      legacyCoverUrl: null,
      ctaLabel: null,
      ctaUrl: null,
      sortOrder,
      allowAiRecommendation: true,
    })));

    await Promise.all([
      repository.reorderOwned(owner.userId, [items[2].id, items[1].id, items[0].id]),
      repository.reorderOwned(owner.userId, [items[1].id, items[0].id, items[2].id]),
    ]);

    const finalItems = await repository.listOwned(owner.userId);
    expect(finalItems.map((item) => item.sortOrder).sort((a, b) => a - b)).toEqual([0, 1, 2]);
    expect(new Set(finalItems.map((item) => item.sortOrder)).size).toBe(3);
  });

  test("rejects incomplete, duplicate, and cross-owner reorder sets", async () => {
    const owner = await createOwner("invalid-order");
    const other = await createOwner("invalid-order-other");
    const repository = new PrismaCatalogRepository(db);
    const first = await repository.createOwned(owner.userId, {
      kind: "product", status: "draft", name: "A", category: null, description: null, priceText: null,
      coverAssetId: null, legacyCoverUrl: null, ctaLabel: null, ctaUrl: null, sortOrder: 0, allowAiRecommendation: true,
    });
    const second = await repository.createOwned(owner.userId, {
      kind: "product", status: "draft", name: "B", category: null, description: null, priceText: null,
      coverAssetId: null, legacyCoverUrl: null, ctaLabel: null, ctaUrl: null, sortOrder: 1, allowAiRecommendation: true,
    });
    const foreign = await repository.createOwned(other.userId, {
      kind: "product", status: "draft", name: "Foreign", category: null, description: null, priceText: null,
      coverAssetId: null, legacyCoverUrl: null, ctaLabel: null, ctaUrl: null, sortOrder: 0, allowAiRecommendation: true,
    });

    await expect(repository.reorderOwned(owner.userId, [first.id])).rejects.toMatchObject({ message: "INVALID_CATALOG_ORDER" });
    await expect(repository.reorderOwned(owner.userId, [first.id, first.id])).rejects.toMatchObject({ message: "INVALID_CATALOG_ORDER" });
    await expect(repository.reorderOwned(owner.userId, [first.id, foreign.id])).rejects.toMatchObject({ message: "INVALID_CATALOG_ORDER" });
    expect(second.id).not.toBe(first.id);
  });
});
