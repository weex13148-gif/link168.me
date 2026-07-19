import crypto from "node:crypto";
import { CatalogService } from "@/domains/catalog/catalog-service";
import type {
  CatalogItemRecord,
  CatalogRepository,
  CreateCatalogRecordInput,
  UpdateCatalogRecordPatch,
} from "@/domains/catalog/catalog-repository";

const ownerUserId = "11111111-1111-4111-8111-111111111111";
const profileId = "22222222-2222-4222-8222-222222222222";

function record(overrides: Partial<CatalogItemRecord> = {}): CatalogItemRecord {
  return Object.freeze({
    id: crypto.randomUUID(),
    ownerUserId,
    kind: "product",
    status: "draft",
    name: "产品 A",
    category: null,
    description: null,
    priceText: null,
    coverAssetId: null,
    legacyCoverUrl: null,
    ctaLabel: null,
    ctaUrl: null,
    sortOrder: 0,
    allowAiRecommendation: true,
    archivedAt: null,
    coverAssetStatus: null,
    boundModuleTypes: Object.freeze([]),
    ...overrides,
  });
}

class FakeCatalogRepository implements CatalogRepository {
  items: CatalogItemRecord[] = [];
  createCalls: Array<{ ownerUserId: string; input: CreateCatalogRecordInput }> = [];
  updateCalls: Array<{ ownerUserId: string; itemId: string; patch: UpdateCatalogRecordPatch }> = [];
  statusCalls: Array<{ ownerUserId: string; itemId: string; status: "published" | "archived"; archivedAt: Date | null }> = [];
  reorderCalls: Array<{ ownerUserId: string; orderedIds: readonly string[] }> = [];

  async listOwned(inputOwnerUserId: string) {
    return this.items.filter((item) => item.ownerUserId === inputOwnerUserId);
  }

  async findOwned(inputOwnerUserId: string, itemId: string) {
    return this.items.find((item) => item.ownerUserId === inputOwnerUserId && item.id === itemId) ?? null;
  }

  async createOwned(inputOwnerUserId: string, input: CreateCatalogRecordInput) {
    this.createCalls.push({ ownerUserId: inputOwnerUserId, input });
    const created = record({
      id: crypto.randomUUID(),
      ownerUserId: inputOwnerUserId,
      ...input,
      archivedAt: null,
      coverAssetStatus: null,
      boundModuleTypes: Object.freeze([]),
    });
    this.items.push(created);
    return created;
  }

  async updateOwned(inputOwnerUserId: string, itemId: string, patch: UpdateCatalogRecordPatch) {
    this.updateCalls.push({ ownerUserId: inputOwnerUserId, itemId, patch });
    const index = this.items.findIndex((item) => item.ownerUserId === inputOwnerUserId && item.id === itemId);
    if (index < 0) return null;
    const updated = Object.freeze({ ...this.items[index], ...patch });
    this.items[index] = updated;
    return updated;
  }

  async setStatusOwned(
    inputOwnerUserId: string,
    itemId: string,
    status: "published" | "archived",
    archivedAt: Date | null,
  ) {
    this.statusCalls.push({ ownerUserId: inputOwnerUserId, itemId, status, archivedAt });
    const index = this.items.findIndex((item) => item.ownerUserId === inputOwnerUserId && item.id === itemId);
    if (index < 0) return null;
    const updated = Object.freeze({ ...this.items[index], status, archivedAt });
    this.items[index] = updated;
    return updated;
  }

  async reorderOwned(inputOwnerUserId: string, orderedIds: readonly string[]) {
    this.reorderCalls.push({ ownerUserId: inputOwnerUserId, orderedIds });
    this.items = this.items.map((item) => {
      const index = orderedIds.indexOf(item.id);
      return index < 0 ? item : Object.freeze({ ...item, sortOrder: index });
    });
    return orderedIds.map((id) => this.items.find((item) => item.id === id)!);
  }

  async findPublishedForProfile(inputProfileId: string, itemId: string) {
    if (inputProfileId !== profileId) return null;
    return this.items.find((item) => item.id === itemId && item.status === "published") ?? null;
  }
}

describe("CatalogService", () => {
  test("creates a normalized draft and never writes the legacy cover URL", async () => {
    const repository = new FakeCatalogRepository();
    const service = new CatalogService(repository);

    const created = await service.createCatalogItem(ownerUserId, {
      kind: "product",
      name: "  产品 A  ",
      category: "  SaaS ",
      ctaUrl: "example.com/buy",
      legacyCoverUrl: "https://legacy.example.com/cover.jpg",
    });

    expect(created.status).toBe("draft");
    expect(repository.createCalls[0]).toEqual({
      ownerUserId,
      input: expect.objectContaining({
        kind: "product",
        status: "draft",
        name: "产品 A",
        category: "SaaS",
        ctaUrl: "https://example.com/buy",
        legacyCoverUrl: null,
      }),
    });
  });

  test("hides cross-user records as NOT_FOUND", async () => {
    const repository = new FakeCatalogRepository();
    repository.items = [record()];
    const service = new CatalogService(repository);

    await expect(service.updateCatalogItem(
      "99999999-9999-4999-8999-999999999999",
      repository.items[0].id,
      { name: "越权修改" },
    )).rejects.toMatchObject({ code: "NOT_FOUND", message: "CATALOG_ITEM_NOT_FOUND" });
    expect(repository.updateCalls).toHaveLength(0);
  });

  test("publishes only valid items with approved covers", async () => {
    const repository = new FakeCatalogRepository();
    const item = record({ coverAssetId: crypto.randomUUID(), coverAssetStatus: "pending_review" });
    repository.items = [item];
    const service = new CatalogService(repository);

    await expect(service.publishCatalogItem(ownerUserId, item.id)).rejects.toMatchObject({
      code: "CONFLICT",
      message: "CATALOG_COVER_NOT_APPROVED",
    });

    repository.items[0] = record({ ...item, coverAssetStatus: "approved" });
    const published = await service.publishCatalogItem(ownerUserId, item.id);
    expect(published.status).toBe("published");
    expect(repository.statusCalls.at(-1)).toMatchObject({ status: "published", archivedAt: null });
  });

  test("rejects unsafe CTA URLs at create, update, and publish boundaries", async () => {
    const repository = new FakeCatalogRepository();
    const service = new CatalogService(repository);

    await expect(service.createCatalogItem(ownerUserId, {
      kind: "product",
      name: "危险链接",
      ctaUrl: "javascript:alert(1)",
    })).rejects.toMatchObject({ code: "VALIDATION_ERROR", message: "CATALOG_CTA_URL_UNSAFE" });

    const item = record({ ctaUrl: "javascript:alert(1)" });
    repository.items = [item];
    await expect(service.publishCatalogItem(ownerUserId, item.id)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      message: "CATALOG_CTA_URL_UNSAFE",
    });
  });

  test("rejects kind changes that conflict with bound Product or Service modules", async () => {
    const repository = new FakeCatalogRepository();
    const item = record({ kind: "product", boundModuleTypes: Object.freeze(["product-card"]) });
    repository.items = [item];
    const service = new CatalogService(repository);

    await expect(service.updateCatalogItem(ownerUserId, item.id, { kind: "service" })).rejects.toMatchObject({
      code: "CONFLICT",
      message: "CATALOG_MODULE_KIND_MISMATCH",
    });
  });

  test("archives instead of deleting and retains historical bindings", async () => {
    const now = new Date("2026-07-20T00:00:00.000Z");
    const repository = new FakeCatalogRepository();
    const item = record({ status: "published", boundModuleTypes: Object.freeze(["product-card"]) });
    repository.items = [item];
    const service = new CatalogService(repository, { now: () => now });

    const archived = await service.archiveCatalogItem(ownerUserId, item.id);
    expect(archived).toMatchObject({ id: item.id, status: "archived", archivedAt: now });
    expect(repository.items).toHaveLength(1);
    expect(repository.items[0].boundModuleTypes).toEqual(["product-card"]);
  });

  test("reorders only the complete duplicate-free non-archived owner set", async () => {
    const repository = new FakeCatalogRepository();
    const first = record({ sortOrder: 0 });
    const second = record({ sortOrder: 1 });
    const archived = record({ status: "archived", sortOrder: 2 });
    repository.items = [first, second, archived];
    const service = new CatalogService(repository);

    await expect(service.reorderCatalogItems(ownerUserId, [first.id, first.id])).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      message: "INVALID_CATALOG_ORDER",
    });
    await expect(service.reorderCatalogItems(ownerUserId, [first.id])).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      message: "INVALID_CATALOG_ORDER",
    });

    const reordered = await service.reorderCatalogItems(ownerUserId, [second.id, first.id]);
    expect(reordered.map((item) => [item.id, item.sortOrder])).toEqual([
      [second.id, 0],
      [first.id, 1],
    ]);
  });

  test("reads only published CatalogItems through a profile", async () => {
    const repository = new FakeCatalogRepository();
    const item = record({ status: "published" });
    repository.items = [item];
    const service = new CatalogService(repository);

    await expect(service.getPublishedCatalogItemForProfile(profileId, item.id)).resolves.toMatchObject({ id: item.id });
    await expect(service.getPublishedCatalogItemForProfile("other-profile", item.id)).resolves.toBeNull();
  });
});
