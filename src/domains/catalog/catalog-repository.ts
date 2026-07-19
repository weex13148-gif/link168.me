import type {
  CatalogItem,
  CatalogItemKind,
  CatalogItemStatus,
  CatalogModuleType,
} from "@/domains/catalog/catalog-item";
import type { MediaAssetStatus } from "@/domains/media/media-asset";

export type CatalogItemRecord = Readonly<
  CatalogItem & {
    archivedAt: Date | null;
    coverAssetStatus: MediaAssetStatus | null;
    boundModuleTypes: readonly CatalogModuleType[];
  }
>;

export type CatalogFilter = Readonly<{
  kind?: CatalogItemKind;
  status?: CatalogItemStatus;
  includeArchived?: boolean;
}>;

export type CreateCatalogRecordInput = Readonly<{
  kind: CatalogItemKind;
  status: CatalogItemStatus;
  name: string;
  category: string | null;
  description: string | null;
  priceText: string | null;
  coverAssetId: string | null;
  legacyCoverUrl: null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  sortOrder: number;
  allowAiRecommendation: boolean;
}>;

export type UpdateCatalogRecordPatch = Readonly<
  Partial<{
    kind: CatalogItemKind;
    name: string;
    category: string | null;
    description: string | null;
    priceText: string | null;
    coverAssetId: string | null;
    ctaLabel: string | null;
    ctaUrl: string | null;
    allowAiRecommendation: boolean;
  }>
>;

export interface CatalogRepository {
  listOwned(ownerUserId: string, filter?: CatalogFilter): Promise<CatalogItemRecord[]>;
  findOwned(ownerUserId: string, itemId: string): Promise<CatalogItemRecord | null>;
  createOwned(ownerUserId: string, input: CreateCatalogRecordInput): Promise<CatalogItemRecord>;
  updateOwned(
    ownerUserId: string,
    itemId: string,
    patch: UpdateCatalogRecordPatch,
  ): Promise<CatalogItemRecord | null>;
  setStatusOwned(
    ownerUserId: string,
    itemId: string,
    status: "published" | "archived",
    archivedAt: Date | null,
  ): Promise<CatalogItemRecord | null>;
  reorderOwned(ownerUserId: string, orderedIds: readonly string[]): Promise<CatalogItemRecord[]>;
  findPublishedForProfile(profileId: string, itemId: string): Promise<CatalogItemRecord | null>;
}
