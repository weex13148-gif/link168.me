import crypto from "node:crypto";
import { CatalogService } from "@/domains/catalog/catalog-service";
import { PrismaCatalogRepository } from "@/infrastructure/catalog/prisma-catalog-repository";
import { db } from "@/lib/db";

const createdUserIds: string[] = [];

async function createOwner() {
  const userId = crypto.randomUUID();
  const profileId = crypto.randomUUID();
  createdUserIds.push(userId);
  await db.user.create({
    data: {
      id: userId,
      email: `phase2-catalog-review-${userId}@example.com`,
      passwordHash: "test-password-hash",
      emailVerified: true,
      accountStatus: "active",
      profile: {
        create: {
          id: profileId,
          username: `phase2-review-${userId.slice(0, 8)}`,
          isPublic: false,
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

describe("Catalog Task 2 review regressions", () => {
  test("rejects non-boolean AI recommendation input instead of coercing it", async () => {
    const owner = await createOwner();
    const service = new CatalogService(new PrismaCatalogRepository(db));

    await expect(service.createCatalogItem(owner.userId, {
      kind: "product",
      name: "无效标志产品",
      allowAiRecommendation: "false",
    })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      message: "INVALID_CATALOG_AI_RECOMMENDATION_FLAG",
    });
  });

  test("serializes concurrent creates into unique contiguous sort positions", async () => {
    const owner = await createOwner();
    const service = new CatalogService(new PrismaCatalogRepository(db));

    await Promise.all(
      Array.from({ length: 5 }, (_, index) => service.createCatalogItem(owner.userId, {
        kind: index % 2 === 0 ? "product" : "service",
        name: `并发条目 ${index + 1}`,
      })),
    );

    const items = await service.listCatalogItems(owner.userId);
    const positions = items.map((item) => item.sortOrder).sort((a, b) => a - b);
    expect(positions).toEqual([0, 1, 2, 3, 4]);
    expect(new Set(positions).size).toBe(5);
  });
});
