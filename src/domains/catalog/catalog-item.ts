import { DomainError } from "@/shared/domain-error";
import { err, ok, type Result } from "@/shared/result";

export type CatalogItemKind = "product" | "service";
export type CatalogItemStatus = "draft" | "published" | "archived";
export type CatalogModuleType = "product-card" | "service-card";

export type CatalogItem = Readonly<{
  id: string;
  ownerUserId: string;
  kind: CatalogItemKind;
  status: CatalogItemStatus;
  name: string;
  category: string | null;
  description: string | null;
  priceText: string | null;
  coverAssetId: string | null;
  legacyCoverUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  sortOrder: number;
  allowAiRecommendation: boolean;
}>;

export function parseCatalogItemKind(
  value: unknown,
): Result<CatalogItemKind, DomainError> {
  if (value === "product" || value === "service") {
    return ok(value);
  }
  return err(
    new DomainError("VALIDATION_ERROR", "INVALID_CATALOG_ITEM_KIND", { value }),
  );
}

export function parseCatalogItemStatus(
  value: unknown,
): Result<CatalogItemStatus, DomainError> {
  if (value === "draft" || value === "published" || value === "archived") {
    return ok(value);
  }
  return err(
    new DomainError("VALIDATION_ERROR", "INVALID_CATALOG_ITEM_STATUS", { value }),
  );
}

export function canPublishCatalogItem(
  item: CatalogItem,
): Result<true, DomainError> {
  if (item.status === "archived") {
    return err(
      new DomainError("CONFLICT", "CATALOG_ITEM_ARCHIVED", { itemId: item.id }),
    );
  }
  if (!item.name.trim()) {
    return err(
      new DomainError("VALIDATION_ERROR", "CATALOG_ITEM_NAME_REQUIRED", {
        itemId: item.id,
      }),
    );
  }
  return ok(true);
}

export function assertCatalogModuleKind(
  moduleType: CatalogModuleType,
  itemKind: CatalogItemKind,
): void {
  const expectedKind: CatalogItemKind =
    moduleType === "product-card" ? "product" : "service";
  if (itemKind !== expectedKind) {
    throw new DomainError("CONFLICT", "CATALOG_MODULE_KIND_MISMATCH", {
      moduleType,
      itemKind,
      expectedKind,
    });
  }
}
