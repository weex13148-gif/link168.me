import {
  assertCatalogModuleKind,
  canPublishCatalogItem,
  type CatalogItemKind,
  type CatalogModuleType,
} from "@/domains/catalog/catalog-item";
import type {
  CatalogFilter,
  CatalogItemRecord,
  CatalogRepository,
} from "@/domains/catalog/catalog-repository";
import {
  normalizeCatalogCtaUrl,
  normalizeCreateCatalogItem,
  normalizeUpdateCatalogItem,
  type CreateCatalogItemInput,
  type UpdateCatalogItemInput,
} from "@/domains/catalog/catalog-validation";
import { DomainError } from "@/shared/domain-error";

export type CatalogServiceOptions = Readonly<{
  now?: () => Date;
}>;

function notFound(itemId: string): DomainError {
  return new DomainError("NOT_FOUND", "CATALOG_ITEM_NOT_FOUND", { itemId });
}

function assertKindSupportsBoundModules(
  kind: CatalogItemKind,
  moduleTypes: readonly CatalogModuleType[],
): void {
  for (const moduleType of moduleTypes) {
    assertCatalogModuleKind(moduleType, kind);
  }
}

function assertPublishable(item: CatalogItemRecord): void {
  const publishable = canPublishCatalogItem(item);
  if (!publishable.ok) throw publishable.error;
  normalizeCatalogCtaUrl(item.ctaUrl);
  if (item.coverAssetId && item.coverAssetStatus !== "approved") {
    throw new DomainError("CONFLICT", "CATALOG_COVER_NOT_APPROVED", {
      itemId: item.id,
      coverAssetId: item.coverAssetId,
      coverAssetStatus: item.coverAssetStatus,
    });
  }
  assertKindSupportsBoundModules(item.kind, item.boundModuleTypes);
}

export class CatalogService {
  private readonly now: () => Date;

  constructor(
    private readonly repository: CatalogRepository,
    options: CatalogServiceOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
  }

  async listCatalogItems(
    ownerUserId: string,
    filter: CatalogFilter = {},
  ): Promise<CatalogItemRecord[]> {
    return this.repository.listOwned(ownerUserId, filter);
  }

  async createCatalogItem(
    ownerUserId: string,
    input: CreateCatalogItemInput,
  ): Promise<CatalogItemRecord> {
    const existing = await this.repository.listOwned(ownerUserId, {
      includeArchived: true,
    });
    const sortOrder = existing.reduce(
      (maximum, item) => Math.max(maximum, item.sortOrder),
      -1,
    ) + 1;
    return this.repository.createOwned(
      ownerUserId,
      normalizeCreateCatalogItem(input, sortOrder),
    );
  }

  async updateCatalogItem(
    ownerUserId: string,
    itemId: string,
    input: UpdateCatalogItemInput,
  ): Promise<CatalogItemRecord> {
    const existing = await this.repository.findOwned(ownerUserId, itemId);
    if (!existing) throw notFound(itemId);
    if (existing.status === "archived") {
      throw new DomainError("CONFLICT", "CATALOG_ITEM_ARCHIVED", { itemId });
    }

    const patch = normalizeUpdateCatalogItem(input);
    if (patch.kind && patch.kind !== existing.kind) {
      assertKindSupportsBoundModules(patch.kind, existing.boundModuleTypes);
    }

    const updated = await this.repository.updateOwned(ownerUserId, itemId, patch);
    if (!updated) throw notFound(itemId);
    return updated;
  }

  async publishCatalogItem(
    ownerUserId: string,
    itemId: string,
  ): Promise<CatalogItemRecord> {
    const existing = await this.repository.findOwned(ownerUserId, itemId);
    if (!existing) throw notFound(itemId);
    assertPublishable(existing);
    if (existing.status === "published") return existing;

    const published = await this.repository.setStatusOwned(
      ownerUserId,
      itemId,
      "published",
      null,
    );
    if (!published) throw notFound(itemId);
    return published;
  }

  async archiveCatalogItem(
    ownerUserId: string,
    itemId: string,
  ): Promise<CatalogItemRecord> {
    const existing = await this.repository.findOwned(ownerUserId, itemId);
    if (!existing) throw notFound(itemId);
    if (existing.status === "archived") return existing;

    const archivedAt = this.now();
    const archived = await this.repository.setStatusOwned(
      ownerUserId,
      itemId,
      "archived",
      archivedAt,
    );
    if (!archived) throw notFound(itemId);
    return archived;
  }

  async reorderCatalogItems(
    ownerUserId: string,
    orderedIds: readonly string[],
  ): Promise<CatalogItemRecord[]> {
    const owned = await this.repository.listOwned(ownerUserId, {
      includeArchived: true,
    });
    const activeIds = owned
      .filter((item) => item.status !== "archived")
      .map((item) => item.id);
    const requested = [...orderedIds];
    const valid = requested.length === activeIds.length
      && new Set(requested).size === requested.length
      && requested.every((id) => activeIds.includes(id));
    if (!valid) {
      throw new DomainError("VALIDATION_ERROR", "INVALID_CATALOG_ORDER", {
        expectedCount: activeIds.length,
        receivedCount: requested.length,
      });
    }
    return this.repository.reorderOwned(ownerUserId, requested);
  }

  async getPublishedCatalogItemForProfile(
    profileId: string,
    itemId: string,
  ): Promise<CatalogItemRecord | null> {
    return this.repository.findPublishedForProfile(profileId, itemId);
  }
}

export type {
  CreateCatalogItemInput,
  UpdateCatalogItemInput,
};
