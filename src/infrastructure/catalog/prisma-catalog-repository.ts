import crypto from "node:crypto";
import type {
  CatalogFilter,
  CatalogItemRecord,
  CatalogRepository,
  CreateCatalogRecordInput,
  UpdateCatalogRecordPatch,
} from "@/domains/catalog/catalog-repository";
import type {
  CatalogItemKind,
  CatalogItemStatus,
  CatalogModuleType,
} from "@/domains/catalog/catalog-item";
import type { MediaAssetStatus } from "@/domains/media/media-asset";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { DomainError } from "@/shared/domain-error";

const catalogInclude = {
  coverAsset: { select: { status: true } },
  pageModules: { select: { type: true } },
} satisfies Prisma.ProductInclude;

type CatalogRow = Prisma.ProductGetPayload<{ include: typeof catalogInclude }>;
type CatalogDbClient = Pick<
  PrismaClient,
  "product" | "profile" | "mediaAsset" | "$transaction"
>;

function mapRow(row: CatalogRow): CatalogItemRecord {
  const boundModuleTypes = row.pageModules
    .map((module) => module.type)
    .filter(
      (type): type is CatalogModuleType =>
        type === "product-card" || type === "service-card",
    );

  return Object.freeze({
    id: row.id,
    ownerUserId: row.userId,
    kind: row.kind as CatalogItemKind,
    status: row.status as CatalogItemStatus,
    name: row.name,
    category: row.category,
    description: row.description,
    priceText: row.priceText,
    coverAssetId: row.coverAssetId,
    legacyCoverUrl: row.coverImageUrl,
    ctaLabel: row.ctaLabel,
    ctaUrl: row.ctaUrl,
    sortOrder: row.sortOrder,
    allowAiRecommendation: row.allowAiRecommendation,
    archivedAt: row.archivedAt,
    coverAssetStatus: row.coverAsset?.status as MediaAssetStatus | null ?? null,
    boundModuleTypes: Object.freeze([...new Set(boundModuleTypes)]),
  });
}

function assertCompleteOrder(
  orderedIds: readonly string[],
  ownedIds: readonly string[],
): void {
  const requested = [...orderedIds];
  const owned = new Set(ownedIds);
  const valid = requested.length === ownedIds.length
    && new Set(requested).size === requested.length
    && requested.every((id) => owned.has(id));
  if (!valid) {
    throw new DomainError("VALIDATION_ERROR", "INVALID_CATALOG_ORDER", {
      expectedCount: ownedIds.length,
      receivedCount: requested.length,
    });
  }
}

async function assertOwnedCoverAsset(
  client: Pick<PrismaClient, "mediaAsset">,
  ownerUserId: string,
  coverAssetId: string | null | undefined,
): Promise<void> {
  if (!coverAssetId) return;
  const asset = await client.mediaAsset.findFirst({
    where: {
      id: coverAssetId,
      ownerUserId,
      purpose: "catalog-cover",
      status: { not: "deleted" },
    },
    select: { id: true },
  });
  if (!asset) {
    throw new DomainError("NOT_FOUND", "CATALOG_COVER_NOT_OWNED", {
      coverAssetId,
    });
  }
}

export class PrismaCatalogRepository implements CatalogRepository {
  constructor(private readonly client: CatalogDbClient = db) {}

  async listOwned(
    ownerUserId: string,
    filter: CatalogFilter = {},
  ): Promise<CatalogItemRecord[]> {
    const where: Prisma.ProductWhereInput = { userId: ownerUserId };
    if (filter.kind) where.kind = filter.kind;
    if (filter.status) where.status = filter.status;
    else if (filter.includeArchived === false) where.status = { not: "archived" };

    const rows = await this.client.product.findMany({
      where,
      include: catalogInclude,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(mapRow);
  }

  async findOwned(
    ownerUserId: string,
    itemId: string,
  ): Promise<CatalogItemRecord | null> {
    const row = await this.client.product.findFirst({
      where: { id: itemId, userId: ownerUserId },
      include: catalogInclude,
    });
    return row ? mapRow(row) : null;
  }

  async createOwned(
    ownerUserId: string,
    input: CreateCatalogRecordInput,
  ): Promise<CatalogItemRecord> {
    return this.client.$transaction(async (tx) => {
      await assertOwnedCoverAsset(tx, ownerUserId, input.coverAssetId);
      const row = await tx.product.create({
        data: {
          id: crypto.randomUUID(),
          userId: ownerUserId,
          kind: input.kind,
          status: input.status,
          name: input.name,
          category: input.category,
          description: input.description,
          priceText: input.priceText,
          coverImageUrl: null,
          coverAssetId: input.coverAssetId,
          ctaLabel: input.ctaLabel,
          ctaUrl: input.ctaUrl,
          sortOrder: input.sortOrder,
          allowAiRecommendation: input.allowAiRecommendation,
        },
        include: catalogInclude,
      });
      return mapRow(row);
    });
  }

  async updateOwned(
    ownerUserId: string,
    itemId: string,
    patch: UpdateCatalogRecordPatch,
  ): Promise<CatalogItemRecord | null> {
    return this.client.$transaction(async (tx) => {
      const existing = await tx.product.findFirst({
        where: { id: itemId, userId: ownerUserId },
        select: { id: true },
      });
      if (!existing) return null;
      if (Object.prototype.hasOwnProperty.call(patch, "coverAssetId")) {
        await assertOwnedCoverAsset(tx, ownerUserId, patch.coverAssetId);
      }

      const row = await tx.product.update({
        where: { id: itemId },
        data: patch,
        include: catalogInclude,
      });
      return mapRow(row);
    });
  }

  async setStatusOwned(
    ownerUserId: string,
    itemId: string,
    status: "published" | "archived",
    archivedAt: Date | null,
  ): Promise<CatalogItemRecord | null> {
    return this.client.$transaction(async (tx) => {
      const claimed = await tx.product.updateMany({
        where: { id: itemId, userId: ownerUserId },
        data: { status, archivedAt },
      });
      if (claimed.count !== 1) return null;
      const row = await tx.product.findUniqueOrThrow({
        where: { id: itemId },
        include: catalogInclude,
      });
      return mapRow(row);
    });
  }

  async reorderOwned(
    ownerUserId: string,
    orderedIds: readonly string[],
  ): Promise<CatalogItemRecord[]> {
    return this.client.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`catalog:${ownerUserId}`}))`;
      const owned = await tx.product.findMany({
        where: { userId: ownerUserId, status: { not: "archived" } },
        select: { id: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
      assertCompleteOrder(orderedIds, owned.map((item) => item.id));

      for (const [sortOrder, id] of orderedIds.entries()) {
        const updated = await tx.product.updateMany({
          where: { id, userId: ownerUserId, status: { not: "archived" } },
          data: { sortOrder },
        });
        if (updated.count !== 1) {
          throw new DomainError("CONFLICT", "CATALOG_ORDER_CHANGED", { id });
        }
      }

      const rows = await tx.product.findMany({
        where: { id: { in: [...orderedIds] }, userId: ownerUserId },
        include: catalogInclude,
      });
      const byId = new Map(rows.map((row) => [row.id, mapRow(row)]));
      return orderedIds.map((id) => {
        const item = byId.get(id);
        if (!item) throw new DomainError("CONFLICT", "CATALOG_ORDER_CHANGED", { id });
        return item;
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  async findPublishedForProfile(
    profileId: string,
    itemId: string,
  ): Promise<CatalogItemRecord | null> {
    const profile = await this.client.profile.findUnique({
      where: { id: profileId },
      select: { userId: true },
    });
    if (!profile) return null;
    const row = await this.client.product.findFirst({
      where: {
        id: itemId,
        userId: profile.userId,
        status: "published",
      },
      include: catalogInclude,
    });
    return row ? mapRow(row) : null;
  }
}
